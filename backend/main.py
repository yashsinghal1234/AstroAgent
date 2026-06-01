import sys
import os
# Ensure backend directory is in path so local imports resolve correctly
sys.path.append(os.path.dirname(__file__))

import json
import asyncio
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from datetime import datetime

# Import LangChain / LangGraph components
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage

# Import our compiled agent
from agent import astro_agent

app = FastAPI(title="Aradhana AstroAgent API", version="1.0.0")

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatMessage(BaseModel):
    role: str # "user" or "assistant"
    content: str

class ChatPayload(BaseModel):
    messages: List[ChatMessage]
    birth_details: Optional[Dict[str, Any]] = None # date, time, place

@app.get("/api/health")
def health_check():
    return {"status": "ok", "time": datetime.now().isoformat()}

@app.post("/api/chat")
async def chat_endpoint(payload: ChatPayload):
    # Parse incoming payload
    # Format messages for LangChain
    formatted_messages = []
    for msg in payload.messages:
        if msg.role == "user":
            formatted_messages.append(HumanMessage(content=msg.content))
        else:
            formatted_messages.append(AIMessage(content=msg.content))
            
    # Set up initial state
    initial_state = {
        "messages": formatted_messages,
        "birth_details": payload.birth_details or {},
        "natal_chart": {},
        "current_transits": {},
        "current_intent": "casual",
        "logs": []
    }
    
    # We will stream the results using Server-Sent Events (SSE)
    async def sse_generator():
        # Keep track of what we have sent to avoid duplication
        seen_logs = set()
        chart_sent = False
        
        try:
            # We use astream_events v2 to intercept node logs and chat model streaming tokens!
            # Since astream_events is async, it works perfectly in FastAPI
            async for event in astro_agent.astream_events(initial_state, version="v2"):
                event_type = event.get("event")
                
                # Check for intermediate logs and chart outputs from node completions
                if event_type == "on_chain_end":
                    # Retrieve the latest output from the event data
                    state_data = event.get("data", {})
                    output = state_data.get("output", {}) if isinstance(state_data, dict) else {}
                    
                    if isinstance(output, dict):
                        # Yield new logs
                        node_logs = output.get("logs", [])
                        for log in node_logs:
                            if log not in seen_logs:
                                seen_logs.add(log)
                                yield f"event: log\ndata: {json.dumps(log)}\n\n"
                                await asyncio.sleep(0.01)
                                
                        # Check if a chart was computed and send it
                        natal_chart = output.get("natal_chart", {})
                        if natal_chart and not chart_sent:
                            # Also copy coordinates back to details
                            updated_details = output.get("birth_details", {})
                            yield f"event: chart\ndata: {json.dumps({'chart': natal_chart, 'birth_details': updated_details})}\n\n"
                            chart_sent = True
                            await asyncio.sleep(0.01)
                
                # Intercept the expert LLM response streaming tokens
                if event_type == "on_chat_model_stream":
                    # Make sure it's the stream from the expert node's final generation
                    metadata = event.get("metadata", {})
                    if metadata.get("langgraph_node") == "expert":
                        chunk = event.get("data", {}).get("chunk")
                        if chunk and chunk.content:
                            yield f"event: token\ndata: {json.dumps(chunk.content)}\n\n"
                            await asyncio.sleep(0.005)
                        
            # Finally, yield a completed signal
            yield "event: complete\ndata: {}\n\n"
            
        except Exception as e:
            # Yield error event
            yield f"event: error\ndata: {json.dumps(str(e))}\n\n"
            
    return StreamingResponse(sse_generator(), media_type="text/event-stream")

if __name__ == "__main__":
    import uvicorn
    # Load .env file if present
    from dotenv import load_dotenv
    load_dotenv()
    
    port = int(os.environ.get("PORT", 8000))
    print(f"Starting server on port {port}...")
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
