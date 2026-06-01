import os
import json
from typing import Dict, Any, List, Annotated, TypedDict
from datetime import datetime
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, SystemMessage
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages

# Import our tools
from tools import geocode_place, compute_birth_chart, get_daily_transits, knowledge_lookup

# Define Agent State
class AstroState(TypedDict):
    messages: Annotated[List[BaseMessage], add_messages]
    birth_details: Dict[str, Any]      # Keys: date, time, place, lat, lng, timezone
    natal_chart: Dict[str, Any]        # calculated planets, houses, ascendant
    current_transits: Dict[str, Any]   # current planetary transits
    current_intent: str                # e.g., "chart_reading", "daily_horoscope", "general_question", "casual"
    logs: List[str]                     # Tool execution logs to stream to the UI

# Helper to initialize the LLM
def get_llm():
    # Supports Gemini, OpenAI, Anthropic, Hugging Face, Groq, or OpenRouter
    if os.environ.get("GEMINI_API_KEY"):
        return ChatGoogleGenerativeAI(
            model="gemini-1.5-flash",
            temperature=0.3,
            google_api_key=os.environ.get("GEMINI_API_KEY")
        )
    elif os.environ.get("OPENAI_API_KEY"):
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(model="gpt-4o-mini", temperature=0.3)
    elif os.environ.get("ANTHROPIC_API_KEY"):
        from langchain_anthropic import ChatAnthropic
        return ChatAnthropic(model="claude-3-5-sonnet-latest", temperature=0.3)
    elif os.environ.get("GROQ_API_KEY"):
        from langchain_openai import ChatOpenAI
        groq_model = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")
        return ChatOpenAI(
            model=groq_model,
            openai_api_key=os.environ.get("GROQ_API_KEY"),
            openai_api_base="https://api.groq.com/openai/v1",
            temperature=0.3
        )
    elif os.environ.get("OPENROUTER_API_KEY"):
        from langchain_openai import ChatOpenAI
        or_model = os.environ.get("OPENROUTER_MODEL", "google/gemma-2-9b-it:free")
        return ChatOpenAI(
            model=or_model,
            openai_api_key=os.environ.get("OPENROUTER_API_KEY"),
            openai_api_base="https://openrouter.ai/api/v1",
            temperature=0.3
        )
    elif os.environ.get("HUGGINGFACE_API_KEY") or os.environ.get("HUGGINGFACEHUB_API_TOKEN"):
        from langchain_openai import ChatOpenAI
        hf_key = os.environ.get("HUGGINGFACE_API_KEY") or os.environ.get("HUGGINGFACEHUB_API_TOKEN")
        hf_model = os.environ.get("HUGGINGFACE_MODEL", "Qwen/Qwen2.5-72B-Instruct")
        return ChatOpenAI(
            model=hf_model,
            openai_api_key=hf_key,
            openai_api_base="https://api-inference.huggingface.co/v1",
            temperature=0.3
        )
    else:
        # Fallback/Placeholder so it doesn't crash on startup, but will notify of missing API key
        return ChatGoogleGenerativeAI(model="gemini-1.5-flash", google_api_key="MISSING_KEY")

# --- Node 1: Intent Classifier & Detail Extractor ---
def intent_classifier_node(state: AstroState) -> Dict[str, Any]:
    messages = state.get("messages", [])
    if not messages:
        return {"current_intent": "casual"}
        
    last_user_message = messages[-1].content
    
    # We will use the LLM to classify intent and extract birth details if they are in the user query text
    prompt = ChatPromptTemplate.from_messages([
        ("system", (
            "You are the brain of 'Aradhana', an AI astrology companion.\n"
            "Your job is two-fold:\n"
            "1. Classify the user's latest query into exactly one of these categories:\n"
            "   - 'chart_reading': The user is asking about their birth chart, planetary placements, houses, or general natal characteristics.\n"
            "   - 'daily_horoscope': The user is asking about current energy, transit effects, or what today/this week holds for them.\n"
            "   - 'general_question': The user is asking a general astrology theory question (e.g. 'what is a houses?', 'what does Saturn mean?').\n"
            "   - 'casual': The user is greeting you, saying thank you, or having small talk.\n"
            "   - 'off_topic': The user is asking about something completely unrelated to spirituality, self-reflection, or astrology (e.g. coding, financial investment, clinical medical questions).\n\n"
            "2. Extract birth details from the user's message if they have shared them in the text. Look for:\n"
            "   - date: Date of birth (format as YYYY-MM-DD)\n"
            "   - time: Time of birth (format as HH:MM, default to '12:00' if not specified)\n"
            "   - place: City/Location of birth\n\n"
            "Respond in JSON format with two keys:\n"
            "{{\n"
            "  \"intent\": \"category_name\",\n"
            "  \"birth_details\": {{\"date\": \"YYYY-MM-DD\", \"time\": \"HH:MM\", \"place\": \"City Name\"}} or null if not provided in the text\n"
            "}}\n"
            "Respond with ONLY the JSON object. Do not include any other markdown or conversational text."
        )),
        ("human", "{user_query}")
    ])
    
    llm = get_llm()
    chain = prompt | llm
    
    try:
        response = chain.invoke({"user_query": last_user_message})
        res_text = response.content.strip()
        if res_text.startswith("```"):
            res_text = res_text.split("```")[1]
            if res_text.startswith("json"):
                res_text = res_text[4:]
        res_json = json.loads(res_text.strip())
        intent = res_json.get("intent", "casual").strip().lower()
        extracted_details = res_json.get("birth_details")
    except Exception as e:
        intent = "casual"
        extracted_details = None
        
    # Clean intent output
    valid_intents = ["chart_reading", "daily_horoscope", "general_question", "casual", "off_topic"]
    matched_intent = "casual"
    for v in valid_intents:
        if v in intent:
            matched_intent = v
            break
            
    updates = {"current_intent": matched_intent}
    
    # If birth details were extracted, update state
    if extracted_details and extracted_details.get("date") and extracted_details.get("place"):
        if not extracted_details.get("time"):
            extracted_details["time"] = "12:00"
        updates["birth_details"] = extracted_details
        
    return updates

# --- Node 2: Ask Birth Details ---
def ask_birth_details_node(state: AstroState) -> Dict[str, Any]:
    # Formulate a warm response asking the user for their birth date, time, and location
    msg = AIMessage(
        content=(
            "To unlock the wisdom of your stars, I will need a few details about the moment you entered this world. "
            "Please share your **Date of Birth** (e.g., Oct 25, 1995), exact **Time of Birth** (if known), and **City of Birth**.\n\n"
            "*(You can also use the quick form on the left to set these details instantly!)*"
        )
    )
    return {
        "messages": [msg],
        "logs": ["Warmly requested birth details from the user."]
    }

# --- Node 3: Compute Chart ---
def compute_chart_node(state: AstroState) -> Dict[str, Any]:
    birth_details = state.get("birth_details", {})
    place = birth_details.get("place")
    bdate = birth_details.get("date")
    btime = birth_details.get("time", "12:00") # Default to noon if time is unknown
    
    logs = []
    
    # Step 1: Geocode place
    logs.append(f"Calling tool geocode_place for location: {place}...")
    geo_res = geocode_place(place)
    if not geo_res["success"]:
        return {
            "messages": [AIMessage(content=f"I couldn't quite find the coordinates for '{place}'. Could you double-check the spelling or try a larger nearby city?")],
            "logs": logs + [f"Geocoding failed: {geo_res.get('error')}"]
        }
        
    lat = geo_res["lat"]
    lng = geo_res["lng"]
    tz_name = geo_res["timezone"]
    resolved_place = geo_res["place_name"]
    logs.append(f"Successfully resolved to {resolved_place} (Lat: {lat:.4f}, Lng: {lng:.4f}, Timezone: {tz_name})")
    
    # Step 2: Compute birth chart
    logs.append(f"Calling tool compute_birth_chart (Date: {bdate}, Time: {btime})...")
    chart_res = compute_birth_chart(bdate, btime, lat, lng, tz_name)
    if not chart_res["success"]:
        return {
            "messages": [AIMessage(content="I encountered a cosmic misalignment while computing your natal chart. Please make sure the date is formatted as YYYY-MM-DD and time as HH:MM.")],
            "logs": logs + [f"Chart computation failed: {chart_res.get('error')}"]
        }
        
    logs.append("Planetary and house coordinate calculations completed successfully using JPL DE421 ephemeris.")
    
    # Update birth_details with coordinates and timezone
    updated_birth_details = {
        **birth_details,
        "lat": lat,
        "lng": lng,
        "timezone": tz_name,
        "resolved_place": resolved_place
    }
    
    return {
        "birth_details": updated_birth_details,
        "natal_chart": chart_res,
        "logs": logs
    }

# --- Node 4: Astrology Expert ---
def astrology_expert_node(state: AstroState) -> Dict[str, Any]:
    intent = state.get("current_intent")
    messages = state.get("messages", [])
    birth_details = state.get("birth_details", {})
    natal_chart = state.get("natal_chart", {})
    
    logs = []
    
    # Load knowledge references for grounding
    last_user_message = messages[-1].content
    logs.append(f"Calling tool knowledge_lookup for query grounding...")
    lookup_res = knowledge_lookup(last_user_message)
    matches = lookup_res.get("matches", [])
    kb_grounding = "\n".join(matches) if matches else "No matching references found. Rely on standard Vedic/Western principles."
    
    # If the intent is daily horoscope or transit-related, compute transits (use fallback if no lat/lng)
    transits_str = "No active transits calculated."
    is_transit_query = (intent == "daily_horoscope") or ("transit" in last_user_message.lower())
    if is_transit_query:
        today_str = datetime.now().strftime("%Y-%m-%d")
        lat = birth_details.get("lat", 51.5074) # default to London
        lng = birth_details.get("lng", -0.1278) # default to London
        logs.append(f"Calling tool get_daily_transits for date: {today_str}...")
        transit_res = get_daily_transits(today_str, lat, lng)
        if transit_res["success"]:
            # Format transits
            t_planets = transit_res["planets"]
            formatted_t = []
            for p_name, p_val in t_planets.items():
                formatted_t.append(f"- {p_name} is transiting in {p_val['formatted']}")
            transits_str = "\n".join(formatted_t)
            logs.append("Transit calculations completed.")
            
    # System prompt crafting
    system_prompt = (
        "You are 'Aradhana AI', a warm, compassionate, and deeply wise spiritual companion and professional astrologer.\n"
        "Your mission is to guide seekers toward self-reflection, mindfulness, and personal growth using astrology as a mirror for the soul.\n\n"
        
        "### ASTROLOGER PERSPECTIVE & TONE\n"
        "- Speak with gentle warmth, spiritual reverence, and clear psychological insight.\n"
        "- Ground your interpretations in genuine Vedic/Western astrological frameworks.\n"
        "- Highlight opportunities for self-improvement and emotional support rather than rigid destiny.\n\n"
        
        "### CRITICAL SAFETY GUARDRAILS\n"
        "- **Astrology is for reflection and guidance only.**\n"
        "- **NEVER** present your readings as absolute medical, physical, legal, or financial certainty.\n"
        "- If a user asks about medical issues (e.g. illnesses, diagnoses, prescriptions like antibiotics), legal outcomes (e.g. court trials), or stock market picks (e.g. tech stocks), warmly decline and state:\n"
        "  'Astrology serves as a beautiful mirror for self-reflection and spiritual alignment, but it should never replace the guidance of certified professionals in medicine, law, or finance. I encourage you to consult a licensed specialist for this concern.'\n"
        "- If the user's query is classified as 'off_topic', warmly decline and explain:\n"
        "  'As your spiritual companion, my purpose is to guide you through the celestial mirror of self-reflection. I cannot answer queries outside the realm of astrology and spirituality (such as writing computer code, investing in stocks, or medical diagnoses). I encourage you to consult a professional specialist for these matters. How else may I guide you on your journey today?'\n\n"
        
        "### REFERENCE GROUNDING (RAG)\n"
        "Use these verified reference notes to keep your descriptions accurate:\n"
        f"{kb_grounding}\n\n"
        
        "### USER CHART DATA\n"
    )
    
    if birth_details.get("place"):
        # We have computed their chart
        sun_sign = natal_chart.get("planets", {}).get("Sun", {}).get("formatted", "Unknown")
        moon_sign = natal_chart.get("planets", {}).get("Moon", {}).get("formatted", "Unknown")
        asc_sign = natal_chart.get("ascendant", {}).get("formatted", "Unknown")
        
        # Details of all planets
        planets_details = []
        for p_name, p_val in natal_chart.get("planets", {}).items():
            planets_details.append(f"- {p_name}: {p_val['formatted']} in House {p_val.get('house')}")
            
        planets_str = "\n".join(planets_details)
        
        system_prompt += (
            f"User Birth Place: {birth_details['resolved_place']}\n"
            f"User Birth Time: {birth_details['date']} at {birth_details['time']}\n"
            f"Ascendant (Lagna): {asc_sign}\n"
            f"Sun Sign: {sun_sign}\n"
            f"Moon Sign: {moon_sign}\n"
            f"Natal Placements:\n{planets_str}\n\n"
            f"Current Transits today ({datetime.now().strftime('%Y-%m-%d')}):\n{transits_str}\n"
        )
    else:
        system_prompt += "No birth chart computed yet. Ask the user for their birth date, time, and location if they wish to have a personal reading.\n"
        
    if intent == "off_topic":
        system_prompt += (
            "\n### HANDLING OFF-TOPIC QUESTIONS:\n"
            "The user's query is completely unrelated to astrology, spirituality, or self-reflection.\n"
            "Warmly explain that as their spiritual companion, your purpose is to guide them through the celestial mirror of self-reflection. Decline to answer their query (whether coding, financial, or medical), and advise them that for such specialized matters they should consult a professional or a licensed specialist.\n"
        )

    # Invoke LLM
    llm_prompt = ChatPromptTemplate.from_messages([
        SystemMessage(content=system_prompt),
        MessagesPlaceholder(variable_name="messages")
    ])
    
    llm = get_llm()
    chain = llm_prompt | llm
    response = chain.invoke({"messages": messages})
    
    return {
        "messages": [response],
        "logs": logs + ["Generated astrological reading response."]
    }

# --- Routing Logic ---
def route_intent(state: AstroState) -> str:
    intent = state.get("current_intent")
    birth_details = state.get("birth_details", {})
    natal_chart = state.get("natal_chart", {})
    
    # If birth details are provided but the chart hasn't been computed yet, always compute it
    if birth_details.get("place") and birth_details.get("date") and not natal_chart:
        return "compute_chart"
        
    # If the user is asking about chart or horoscope but we don't have birth details, prompt them
    if intent in ["chart_reading", "daily_horoscope"]:
        last_msg = state.get("messages", [])[-1].content.lower()
        # Check if the query is a general question or definition rather than asking to cast/calculate their chart
        is_general = any(w in last_msg for w in ["what does", "what is", "how does", "explain", "difference between", "characteristics of", "what are", "is astrology"])
        
        if not is_general and (not birth_details.get("place") or not birth_details.get("date")):
            return "ask_details"
            
    # For casual greetings, theory questions, off-topic, or if chart is already computed
    return "expert"

# --- Build the Graph ---
workflow = StateGraph(AstroState)

# Add Nodes
workflow.add_node("intent_classifier", intent_classifier_node)
workflow.add_node("ask_details", ask_birth_details_node)
workflow.add_node("compute_chart", compute_chart_node)
workflow.add_node("expert", astrology_expert_node)

# Add Edges
workflow.add_edge(START, "intent_classifier")

workflow.add_conditional_edges(
    "intent_classifier",
    route_intent,
    {
        "ask_details": "ask_details",
        "compute_chart": "compute_chart",
        "expert": "expert"
    }
)

workflow.add_edge("compute_chart", "expert")
workflow.add_edge("ask_details", END)
workflow.add_edge("expert", END)

# Compile
astro_agent = workflow.compile()
