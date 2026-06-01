import React, { useState, useEffect, useRef, useMemo } from "react";
import { 
  Sparkles, Send, MapPin, Calendar, Clock, 
  HelpCircle, ShieldAlert, ArrowRight, RefreshCw,
  Compass, Info, User, CheckCircle2, AlertCircle
} from "lucide-react";

// Determinsitic stars generator for celestial backdrop
function Starfield() {
  const stars = useMemo(() => {
    const seeded = (n) => {
      const x = Math.sin(n * 999.13) * 43758.5453;
      return x - Math.floor(x);
    };
    return Array.from({ length: 80 }, (_, i) => ({
      top: seeded(i + 1) * 100,
      left: seeded(i + 50) * 100,
      size: seeded(i + 99) * 2 + 0.6,
      delay: seeded(i + 7) * 5,
      dur: seeded(i + 3) * 4 + 3,
    }));
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden z-0">
      {stars.map((s, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-amber-100/60 animate-twinkle"
          style={{
            top: `${s.top}%`,
            left: `${s.left}%`,
            width: `${s.size}px`,
            height: `${s.size}px`,
            "--delay": `${s.delay}s`,
            "--duration": `${s.dur}s`,
          }}
        />
      ))}
    </div>
  );
}

// --- Beautiful SVG Radial Natal Chart Wheel Component ---
function NatalChartWheel({ chart, ascendant }) {
  const [hoveredPlanet, setHoveredPlanet] = useState(null);

  if (!chart || !chart.planets) {
    return (
      <div className="h-[280px] w-[280px] rounded-full border border-dashed border-amber-500/20 flex flex-col items-center justify-center text-center p-6 relative bg-white/[0.01]">
        <Compass className="h-12 w-12 text-amber-500/30 animate-pulse mb-3" />
        <p className="text-xs font-mono tracking-wider text-slate-500">AWAITING CELESTIAL ALIGNMENT</p>
        <p className="text-[10px] text-slate-600 mt-1">Submit your birth details to generate natal wheel</p>
      </div>
    );
  }

  const planets = chart.planets;
  const ascDeg = ascendant?.longitude || 0;
  
  // Center of SVG
  const cx = 150;
  const cy = 150;
  const r_outer = 135;
  const r_middle = 115;
  const r_inner = 88;

  const zodiacAbbrev = [
    "ARI", "TAU", "GEM", "CAN", "LEO", "VIR",
    "LIB", "SCO", "SAG", "CAP", "AQU", "PIS"
  ];
  
  const zodiacSymbols = [
    "♈", "♉", "♊", "♋", "♌", "♍",
    "♎", "♏", "♐", "♑", "♒", "♓"
  ];
  
  // Color codes for planets
  const planetColors = {
    Sun: "#FBBF24", // amber
    Moon: "#F8FAFC", // slate-50
    Mercury: "#38BDF8", // sky-400
    Venus: "#F472B6", // pink-400
    Mars: "#F87171", // red-400
    Jupiter: "#C084FC", // purple-400
    Saturn: "#818CF8", // indigo-400
    Rahu: "#34D399", // emerald-400
    Ketu: "#FB7185"  // rose-400
  };

  const planetSymbols = {
    Sun: "☉",
    Moon: "☽",
    Mercury: "☿",
    Venus: "♀",
    Mars: "♂",
    Jupiter: "♃",
    Saturn: "♄",
    Rahu: "☊",
    Ketu: "☋"
  };

  // Convert longitude (0-360) to SVG coordinates (x, y) relative to center, rotated so Ascendant is at 180 degrees (left)
  const getCoordinates = (longitude, radius) => {
    // Standard astrological display puts Ascendant at 9 o'clock (180 deg).
    const angle_deg = (longitude - ascDeg + 180) % 360;
    const angle_rad = (angle_deg * Math.PI) / 180;
    const x = cx + radius * Math.cos(angle_rad);
    const y = cy + radius * Math.sin(angle_rad); // SVG y goes down
    return { x, y, angle_deg };
  };

  // Anti-collision: group planets by angular closeness and offset radius
  const sortedPlanets = Object.entries(planets).map(([name, val]) => ({
    name,
    ...val,
    originalRadius: r_inner + 12
  }));

  // Sort by longitude
  sortedPlanets.sort((a, b) => a.longitude - b.longitude);

  // Group close planets and apply radial offsets
  for (let i = 0; i < sortedPlanets.length; i++) {
    let cluster = [sortedPlanets[i]];
    for (let j = i + 1; j < sortedPlanets.length; j++) {
      let diff = Math.abs(sortedPlanets[j].longitude - sortedPlanets[i].longitude);
      if (diff > 180) diff = 360 - diff;
      if (diff < 8) {
        cluster.push(sortedPlanets[j]);
        i = j; // Skip in outer loop
      } else {
        break;
      }
    }
    if (cluster.length > 1) {
      cluster.forEach((planet, index) => {
        // Offset each planet in the cluster radially to avoid overlap
        const offset = (index - (cluster.length - 1) / 2) * 12;
        planet.radius = r_inner + 14 + offset;
      });
    } else {
      cluster[0].radius = r_inner + 14;
    }
  }

  // Draw ticks around the outer ring
  const ticks = [];
  for (let d = 0; d < 360; d += 5) {
    const isMajor = d % 30 === 0;
    const innerR = r_outer - (isMajor ? 6 : 3);
    const pStart = getCoordinates(d, innerR);
    const pEnd = getCoordinates(d, r_outer);
    ticks.push(
      <line
        key={d}
        x1={pStart.x}
        y1={pStart.y}
        x2={pEnd.x}
        y2={pEnd.y}
        stroke={isMajor ? "rgba(245, 158, 11, 0.4)" : "rgba(245, 158, 11, 0.15)"}
        strokeWidth={isMajor ? 1 : 0.6}
      />
    );
  }

  // Calculate aspects between planets (harmonious trines/sextiles, challenging squares/oppositions)
  const aspectLines = [];
  for (let i = 0; i < sortedPlanets.length; i++) {
    for (let j = i + 1; j < sortedPlanets.length; j++) {
      const p1 = sortedPlanets[i];
      const p2 = sortedPlanets[j];
      
      let diff = Math.abs(p1.longitude - p2.longitude);
      if (diff > 180) diff = 360 - diff;
      
      let strokeColor = null;
      let strokeDash = null;
      
      // Conjunctions (0 deg) are handled by stacking, so we don't draw lines
      // Sextile (60 deg, tolerance +/- 6)
      // Square (90 deg, tolerance +/- 6)
      // Trine (120 deg, tolerance +/- 6)
      // Opposition (180 deg, tolerance +/- 6)
      if (Math.abs(diff - 120) < 6) { // Trine (Harmonious, emerald)
        strokeColor = "rgba(16, 185, 129, 0.15)"; 
      } else if (Math.abs(diff - 90) < 6) { // Square (Challenging, red/rose)
        strokeColor = "rgba(248, 113, 113, 0.15)"; 
      } else if (Math.abs(diff - 180) < 6) { // Opposition (Tension, amber)
        strokeColor = "rgba(245, 158, 11, 0.15)"; 
      } else if (Math.abs(diff - 60) < 5) { // Sextile (Opportunistic, sky)
        strokeColor = "rgba(56, 189, 248, 0.12)";
        strokeDash = "2,2";
      }
      
      if (strokeColor) {
        // Draw aspect line inside the inner radius circle
        const c1 = getCoordinates(p1.longitude, r_inner - 10);
        const c2 = getCoordinates(p2.longitude, r_inner - 10);
        aspectLines.push(
          <line
            key={`aspect-${p1.name}-${p2.name}`}
            x1={c1.x}
            y1={c1.y}
            x2={c2.x}
            y2={c2.y}
            stroke={strokeColor}
            strokeWidth="0.8"
            strokeDasharray={strokeDash}
          />
        );
      }
    }
  }

  return (
    <div className="relative flex flex-col items-center select-none w-full">
      <svg width="300" height="300" className="drop-shadow-[0_0_20px_rgba(245,158,11,0.08)]">
        <defs>
          <filter id="neon-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          
          <radialGradient id="space-grad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#1e1b4b" stopOpacity="0.1" />
            <stop offset="70%" stopColor="#0f172a" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#020617" stopOpacity="0.9" />
          </radialGradient>

          <radialGradient id="hub-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={hoveredPlanet ? planetColors[hoveredPlanet.name] : "#f59e0b"} stopOpacity={hoveredPlanet ? "0.15" : "0.03"} />
            <stop offset="100%" stopColor="#000" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Space Backdrop */}
        <circle cx={cx} cy={cy} r={r_outer} fill="url(#space-grad)" stroke="rgba(245, 158, 11, 0.2)" strokeWidth="1" />
        <circle cx={cx} cy={cy} r={r_middle} fill="none" stroke="rgba(245, 158, 11, 0.1)" strokeWidth="0.8" />
        
        {/* Draw outer tick marks */}
        {ticks}

        {/* Draw faint aspect lines connecting planets in the background */}
        {aspectLines}

        {/* Draw 12 Zodiac House/Sign Lines (30 deg slices) */}
        {Array.from({ length: 12 }).map((_, i) => {
          const deg = i * 30;
          const start = getCoordinates(deg, r_inner);
          const end = getCoordinates(deg, r_outer);
          const textPos = getCoordinates(deg + 15, r_middle);
          
          return (
            <g key={i}>
              {/* House Dividers */}
              <line 
                x1={start.x} 
                y1={start.y} 
                x2={end.x} 
                y2={end.y} 
                stroke="rgba(245, 158, 11, 0.08)" 
                strokeWidth="1" 
                strokeDasharray="2, 2"
              />
              {/* Sign label text */}
              <text 
                x={textPos.x} 
                y={textPos.y + 3} 
                fill="rgba(253, 230, 138, 0.5)" 
                fontSize="8.5" 
                fontFamily="monospace"
                textAnchor="middle"
                className="font-bold tracking-tighter"
                transform={`rotate(${textPos.angle_deg - 180}, ${textPos.x}, ${textPos.y})`}
              >
                {zodiacSymbols[i]} {zodiacAbbrev[i]}
              </text>
            </g>
          );
        })}

        {/* Dynamic Center Glassmorphic HUD */}
        <circle cx={cx} cy={cy} r={r_inner} fill="url(#hub-glow)" stroke="rgba(245, 158, 11, 0.15)" strokeWidth="1" />
        <circle cx={cx} cy={cy} r={r_inner - 6} fill="rgba(15, 23, 42, 0.6)" stroke="rgba(245, 158, 11, 0.05)" strokeWidth="1" />

        {/* Highlight the Ascendant (Left Horizon) Line */}
        <line 
          x1={cx - r_outer} 
          y1={cy} 
          x2={cx - r_inner} 
          y2={cy} 
          stroke="#F59E0B" 
          strokeWidth="2.5" 
          strokeLinecap="round"
          filter="url(#neon-glow)"
        />
        <text x={cx - r_outer - 14} y={cy + 3} fill="#F59E0B" fontSize="9" fontFamily="monospace" fontWeight="bold">ASC</text>

        {/* Plot Planets */}
        {sortedPlanets.map((p) => {
          const coords = getCoordinates(p.longitude, p.radius);
          const isHovered = hoveredPlanet?.name === p.name;
          
          return (
            <g 
              key={p.name} 
              className="group cursor-pointer"
              onMouseEnter={() => setHoveredPlanet(p)}
              onMouseLeave={() => setHoveredPlanet(null)}
            >
              {/* Invisible larger hover trigger area */}
              <circle 
                cx={coords.x} 
                cy={coords.y} 
                r="12" 
                fill="transparent" 
              />
              {/* Pulsing ring if hovered */}
              {isHovered && (
                <circle 
                  cx={coords.x} 
                  cy={coords.y} 
                  r="8" 
                  fill="none" 
                  stroke={planetColors[p.name]} 
                  strokeWidth="1.5" 
                  className="animate-ping opacity-60"
                />
              )}
              {/* Outer planet boundary */}
              <circle 
                cx={coords.x} 
                cy={coords.y} 
                r={isHovered ? "6" : "4.5"} 
                fill={planetColors[p.name]} 
                className="transition-all duration-300 ease-out shadow-lg"
                filter={isHovered ? "url(#neon-glow)" : ""}
              />
              {/* Planet Glyph/Letter inside dot */}
              <text 
                x={coords.x} 
                y={coords.y + 2.5} 
                fill="#000" 
                fontSize="6.5" 
                fontWeight="bold"
                textAnchor="middle"
                className="select-none pointer-events-none"
              >
                {p.name.slice(0, 1)}
              </text>
              {/* Floating label for planet */}
              <text 
                x={coords.x} 
                y={coords.y - 8} 
                fill={planetColors[p.name]} 
                fontSize="8" 
                fontFamily="monospace" 
                fontWeight={isHovered ? "bold" : "normal"}
                textAnchor="middle"
                className={`transition-all duration-200 pointer-events-none select-none ${isHovered ? "opacity-100 scale-110" : "opacity-75"}`}
              >
                {planetSymbols[p.name]} {p.name.slice(0, 2).toUpperCase()}
              </text>
            </g>
          );
        })}

        {/* HUD TEXT IN CENTER */}
        {hoveredPlanet ? (
          <g className="transition-all duration-300 ease-in-out">
            <text x={cx} y={cy - 16} fill={planetColors[hoveredPlanet.name]} fontSize="26" textAnchor="middle" filter="url(#neon-glow)" className="select-none font-bold">
              {planetSymbols[hoveredPlanet.name]}
            </text>
            <text x={cx} y={cy + 8} fill="#F8FAFC" fontSize="12" fontFamily="serif" letterSpacing="1.2" textAnchor="middle" fontWeight="bold" className="select-none">
              {hoveredPlanet.name}
            </text>
            <text x={cx} y={cy + 25} fill="rgba(253, 230, 138, 0.85)" fontSize="9" fontFamily="monospace" textAnchor="middle" className="select-none">
              {hoveredPlanet.formatted}
            </text>
            <text x={cx} y={cy + 38} fill="rgba(148, 163, 184, 0.8)" fontSize="8" fontFamily="monospace" textAnchor="middle" className="select-none tracking-widest">
              HOUSE {hoveredPlanet.house}
            </text>
          </g>
        ) : (
          <g className="transition-all duration-300 ease-in-out">
            <text x={cx} y={cy - 12} fill="rgba(245, 158, 11, 0.35)" fontSize="32" textAnchor="middle" className="select-none animate-pulse">
              ✧
            </text>
            <text x={cx} y={cy + 12} fill="rgba(253, 230, 138, 0.55)" fontSize="9.5" fontFamily="monospace" letterSpacing="3.5" textAnchor="middle" className="select-none font-bold">
              ARADHANA
            </text>
            <text x={cx} y={cy + 28} fill="rgba(148, 163, 184, 0.7)" fontSize="7.5" fontFamily="monospace" textAnchor="middle" className="select-none tracking-wide">
              {ascendant ? `ASC: ${ascendant.sign.toUpperCase()}` : "AWAITING ALIGNMENT"}
            </text>
            <text x={cx} y={cy + 38} fill="rgba(148, 163, 184, 0.5)" fontSize="7" fontFamily="monospace" textAnchor="middle" className="select-none tracking-wider">
              HOVER PLANETS
            </text>
          </g>
        )}

        {/* Center Golden Bindu/Dot */}
        <circle cx={cx} cy={cy} r="2.5" fill="#F59E0B" />
      </svg>

      {/* Chart Metadata */}
      {ascendant && (
        <div className="mt-3 text-center bg-amber-500/[0.03] border border-amber-500/10 px-4 py-1.5 rounded-full backdrop-blur-sm shadow-sm">
          <p className="text-xs font-serif text-slate-300">
            Ascendant: <span className="text-amber-400 font-semibold">{ascendant.formatted}</span>
          </p>
        </div>
      )}
    </div>
  );
}

// --- Main App Component ---
export default function App() {
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem("astroagent_messages");
    return saved ? JSON.parse(saved) : [
      {
        role: "assistant",
        content: "Salutations, traveler of the cosmos. I am Aradhana, your spiritual companion. Here, we observe the stars not as rigid rulers of destiny, but as gentle mirrors reflecting your inner potential. Share your birth details, and together we shall look into the celestial map of your arrival."
      }
    ];
  });

  const [inputMessage, setInputMessage] = useState("");
  
  // Birth details state
  const [birthDetails, setBirthDetails] = useState(() => {
    const saved = localStorage.getItem("astroagent_birth_details");
    return saved ? JSON.parse(saved) : { date: "", time: "", place: "" };
  });

  const [natalChart, setNatalChart] = useState(() => {
    const saved = localStorage.getItem("astroagent_natal_chart");
    return saved ? JSON.parse(saved) : null;
  });

  const [logs, setLogs] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [activeStep, setActiveStep] = useState(""); // Classification, Geocoding, Calculation, Interpretation
  const [isFormOpen, setIsFormOpen] = useState(true);
  const [activeMobileTab, setActiveMobileTab] = useState(() => {
    const saved = localStorage.getItem("astroagent_natal_chart");
    return saved ? "chat" : "chart";
  });
  
  const messagesEndRef = useRef(null);

  useEffect(() => {
    localStorage.setItem("astroagent_messages", JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem("astroagent_birth_details", JSON.stringify(birthDetails));
  }, [birthDetails]);

  useEffect(() => {
    if (natalChart) {
      localStorage.setItem("astroagent_natal_chart", JSON.stringify(natalChart));
    } else {
      localStorage.removeItem("astroagent_natal_chart");
    }
  }, [natalChart]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText, logs]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setBirthDetails(prev => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!birthDetails.date || !birthDetails.place) {
      alert("Please fill in at least Date of Birth and City of Birth.");
      return;
    }
    
    // Warm notification in chat
    const userMsg = {
      role: "user",
      content: `Please set my birth details to Date: ${birthDetails.date}, Time: ${birthDetails.time || '12:00'}, Location: ${birthDetails.place}.`
    };
    
    // Save snapshot of current details, then immediately clear state so form fields are emptied
    const detailsToSend = { ...birthDetails };
    setBirthDetails({ date: "", time: "", place: "" });
    
    setMessages(prev => [...prev, userMsg]);
    setIsStreaming(true);
    setStreamingText("");
    setLogs([]);
    setActiveStep("Classifying Request");

    try {
      await streamAgentResponse([...messages, userMsg], detailsToSend);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: `I encountered a cosmic connection error: "${err.message}".\n\nPlease check if your backend FastAPI server is running on http://localhost:8000 and that your browser is not blocking the connection. If you just restarted the server, please hard-refresh the page (Ctrl+F5).`
      }]);
      setIsStreaming(false);
    }
  };

  const sendQuery = async (queryText) => {
    if (!queryText.trim()) return;

    const userMsg = { role: "user", content: queryText };
    setMessages(prev => [...prev, userMsg]);
    setInputMessage("");
    setIsStreaming(true);
    setStreamingText("");
    setLogs([]);
    setActiveStep("Consulting Oracle");

    try {
      await streamAgentResponse([...messages, userMsg], birthDetails);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: `I encountered a cosmic static error: "${err.message}".\n\nPlease check if your backend FastAPI server is running on http://localhost:8000. If you just restarted the server, please hard-refresh the page (Ctrl+F5).`
      }]);
      setIsStreaming(false);
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;
    sendQuery(inputMessage);
  };

  // --- Real-time POST Streaming Parser for FastAPI SSE endpoint ---
  const streamAgentResponse = async (chatHistory, details) => {
    const apiHost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
      ? "http://localhost:8000"
      : ""; // Dynamic for local or live Vercel deployments
    
    const response = await fetch(`${apiHost}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: chatHistory,
        birth_details: details.place ? details : null
      })
    });

    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    let streamError = "";
    let accumulatedText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      
      let boundary = buffer.indexOf("\n\n");
      while (boundary !== -1) {
        const chunk = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        
        // Parse SSE formatted strings
        const lines = chunk.split("\n");
        let eventType = "";
        let dataVal = "";
        
        for (const line of lines) {
          if (line.startsWith("event: ")) {
            eventType = line.replace("event: ", "").trim();
          } else if (line.startsWith("data: ")) {
            dataVal = line.replace("data: ", "").trim();
          }
        }
        
        if (eventType && dataVal) {
          try {
            const parsedData = JSON.parse(dataVal);
            
            if (eventType === "log") {
              setLogs(prev => [...prev, parsedData]);
              // Update step indicators
              if (parsedData.includes("geocode_place")) {
                setActiveStep("Resolving Latitude/Longitude");
              } else if (parsedData.includes("compute_birth_chart")) {
                setActiveStep("Calculating Planetary Degrees");
              } else if (parsedData.includes("transits")) {
                setActiveStep("Correlating Current Transits");
              } else if (parsedData.includes("reading")) {
                setActiveStep("Translating Stellar Signatures");
              }
            } else if (eventType === "token") {
              accumulatedText += parsedData;
              setStreamingText(accumulatedText);
            } else if (eventType === "chart") {
              setNatalChart(parsedData.chart);
              setActiveMobileTab("chart");
              if (parsedData.birth_details) {
                // Keep values updated with resolved name/coordinates
                setBirthDetails(prev => ({
                  ...prev,
                  place: parsedData.birth_details.resolved_place || prev.place,
                  date: parsedData.birth_details.date || prev.date,
                  time: parsedData.birth_details.time || prev.time
                }));
              }
            } else if (eventType === "complete") {
              setIsStreaming(false);
            } else if (eventType === "error") {
              streamError = parsedData;
              setLogs(prev => [...prev, `Misalignment: ${parsedData}`]);
              setIsStreaming(false);
            }
          } catch (e) {
            console.error("Failed parsing event data", e);
          }
        }
        boundary = buffer.indexOf("\n\n");
      }
    }
    
    // Finalize state
    setIsStreaming(false);
    
    let finalContent = "";
    if (streamError) {
      finalContent = `I encountered a stellar misalignment while connecting to the cosmic intelligence: "${streamError}".\n\nTo resolve this, please make sure you have created a \`.env\` file in the \`backend\` folder containing your valid Gemini API key:\n\`GEMINI_API_KEY="AIzaSy..."\``;
    } else {
      finalContent = accumulatedText || "I have aligned your cosmic coordinates. How else may I guide you today?";
    }

    setMessages(prev => [...prev, {
      role: "assistant",
      content: finalContent
    }]);
    setStreamingText("");
    setActiveStep("");
  };

  const handleClearHistory = () => {
    if (confirm("Are you sure you want to clear your chart data and chat history?")) {
      setMessages([
        {
          role: "assistant",
          content: "Salutations, traveler of the cosmos. I am Aradhana, your spiritual companion. Share your birth details, and together we shall look into the celestial map of your arrival."
        }
      ]);
      setBirthDetails({ date: "", time: "", place: "" });
      setNatalChart(null);
      setLogs([]);
      setActiveMobileTab("chart");
      setIsFormOpen(true);
    }
  };

  // Suggested questions
  const suggestions = [
    "What does my Sun sign say about my life goals?",
    "Explain the emotional traits of my Moon sign.",
    "What energy do today's transits bring to my chart?",
    "Explain the strengths shown in my 10th house."
  ];

  return (
    <div className="min-h-screen relative flex flex-col font-body bg-indigo-950 overflow-hidden text-slate-100 selection:bg-amber-400/20">
      <Starfield />
      
      {/* Background Zodiac Orbit Decoration */}
      <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full border border-amber-500/[0.04] pointer-events-none z-0 animate-drift">
        <div className="absolute inset-8 rounded-full border border-amber-500/[0.03]" />
        <div className="absolute inset-20 rounded-full border border-amber-500/[0.02]" />
      </div>

      {/* HEADER */}
      <header className="relative z-10 border-b border-amber-500/10 bg-slate-950/60 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-slate-950 font-bold shadow-[0_0_15px_rgba(245,158,11,0.3)]">
            ✧
          </div>
          <div>
            <h1 className="font-serif text-lg tracking-wider text-amber-100 flex items-center gap-2">
              ARADHANA <span className="text-[10px] uppercase font-mono tracking-[0.25em] text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded">ASTROAGENT</span>
            </h1>
            <p className="text-[10px] font-mono text-slate-500 tracking-[0.1em]">YOUR COGNITIVE SPIRITUAL COMPANION</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleClearHistory} 
            className="text-[10px] font-mono tracking-widest text-slate-400 hover:text-red-400/80 transition-colors uppercase border border-slate-800 hover:border-red-950 px-3 py-1.5 rounded-md"
          >
            Clear Sky Map
          </button>
        </div>
      </header>

      {/* CORE WORKSPACE */}
      <main className="relative z-10 flex-1 flex flex-col lg:grid lg:grid-cols-[380px_1fr] h-[calc(100vh-73px)] max-h-[calc(100vh-73px)] overflow-hidden">
        
        {/* MOBILE TAB BAR SELECTOR */}
        <div className="flex lg:hidden border-b border-amber-500/10 bg-slate-950/80 backdrop-blur-sm p-1 shrink-0 z-20">
          <button 
            type="button"
            onClick={() => setActiveMobileTab("chat")}
            className={`flex-1 py-3 text-[11px] font-mono uppercase tracking-widest flex items-center justify-center gap-1.5 border-b-2 transition-all ${
              activeMobileTab === "chat" 
                ? "border-amber-500 text-amber-300 font-bold bg-amber-500/5 shadow-[inset_0_-2px_10px_rgba(245,158,11,0.05)]" 
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            💬 Divine Chat
          </button>
          <button 
            type="button"
            onClick={() => setActiveMobileTab("chart")}
            className={`flex-1 py-3 text-[11px] font-mono uppercase tracking-widest flex items-center justify-center gap-1.5 border-b-2 transition-all ${
              activeMobileTab === "chart" 
                ? "border-amber-500 text-amber-300 font-bold bg-amber-500/5 shadow-[inset_0_-2px_10px_rgba(245,158,11,0.05)]" 
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            🪐 Astro Chart
          </button>
        </div>
        
        {/* LEFT PANEL: Birth details and Natal visualizer */}
        <section className={`border-r border-amber-500/10 bg-slate-950/45 backdrop-blur-sm p-6 overflow-y-auto flex-col items-center gap-6 scrollbar-thin w-full lg:w-auto h-full ${activeMobileTab === "chart" ? "flex" : "hidden lg:flex"}`}>
          
          {/* TAB HEADER */}
          <div className="w-full flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="font-serif text-sm uppercase tracking-widest text-amber-200/90 flex items-center gap-2">
              <Compass className="h-4 w-4 text-amber-500" /> Natal Alignment
            </h2>
            <button 
              onClick={() => setIsFormOpen(!isFormOpen)} 
              className="text-[10px] font-mono tracking-widest text-amber-400/70 hover:text-amber-300 transition-colors uppercase"
            >
              {isFormOpen ? "Hide Form" : "Set Details"}
            </button>
          </div>

          {/* BIRTH FORM */}
          {isFormOpen && (
            <form onSubmit={handleFormSubmit} className="w-full bg-white/[0.015] border border-amber-500/10 rounded-xl p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                  <Calendar className="h-3 w-3 text-amber-500/70" /> Date of Birth
                </label>
                <input 
                  type="date" 
                  name="date" 
                  value={birthDetails.date} 
                  onChange={handleFormChange}
                  required 
                  className="w-full bg-slate-900/80 border border-slate-800 focus:border-amber-500/40 rounded-lg p-2.5 text-sm outline-none text-slate-200 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                    <Clock className="h-3 w-3 text-amber-500/70" /> Birth Time
                  </label>
                  <input 
                    type="time" 
                    name="time" 
                    value={birthDetails.time} 
                    onChange={handleFormChange}
                    className="w-full bg-slate-900/80 border border-slate-800 focus:border-amber-500/40 rounded-lg p-2.5 text-sm outline-none text-slate-200 transition-colors"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                    <MapPin className="h-3 w-3 text-amber-500/70" /> Birth City
                  </label>
                  <input 
                    type="text" 
                    name="place" 
                    value={birthDetails.place} 
                    onChange={handleFormChange}
                    placeholder="e.g. New Delhi"
                    required 
                    className="w-full bg-slate-900/80 border border-slate-800 focus:border-amber-500/40 rounded-lg p-2.5 text-sm outline-none text-slate-200 transition-colors placeholder:text-slate-600"
                  />
                </div>
              </div>

              <button 
                type="submit" 
                className="w-full bg-gradient-to-r from-amber-600 to-amber-500 text-slate-950 font-mono tracking-widest uppercase text-xs py-3 rounded-lg shadow-lg hover:shadow-amber-500/10 hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <Sparkles className="h-3.5 w-3.5" /> Cast Natal Chart
              </button>
            </form>
          )}

          {/* RADIUS CHART WHEEL */}
          <NatalChartWheel chart={natalChart} ascendant={natalChart?.ascendant} />

          {/* PLANETARY COORDINATES DETAILS */}
          {natalChart && natalChart.planets && (
            <div className="w-full space-y-3">
              <h3 className="text-[10px] font-mono uppercase tracking-widest text-slate-400 border-b border-slate-800 pb-1.5 flex items-center gap-1.5 select-none">
                <Compass className="h-3.5 w-3.5 text-amber-500" /> Celestial Coordinates
              </h3>
              <div className="grid grid-cols-2 gap-2.5 w-full">
                {Object.entries(natalChart.planets).map(([name, p]) => {
                  const colors = {
                    Sun: "#FBBF24", Moon: "#F8FAFC", Mercury: "#38BDF8", Venus: "#F472B6", Mars: "#F87171", Jupiter: "#C084FC", Saturn: "#818CF8", Rahu: "#34D399", Ketu: "#FB7185"
                  };
                  const symbols = {
                    Sun: "☉", Moon: "☽", Mercury: "☿", Venus: "♀", Mars: "♂", Jupiter: "♃", Saturn: "♄", Rahu: "☊", Ketu: "☋"
                  };
                  return (
                    <div 
                      key={name} 
                      className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.015] border border-amber-500/[0.03] hover:border-amber-500/15 hover:bg-white/[0.03] transition-all duration-300 shadow-sm relative group overflow-hidden"
                    >
                      <div className="absolute left-0 top-0 h-full w-[2px] bg-amber-500/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      
                      <div className="flex flex-col min-w-0">
                        <span className="font-mono text-slate-400 text-[9px] uppercase tracking-wider leading-none">{name}</span>
                        <span className="text-[11.5px] font-serif font-bold text-slate-200 truncate mt-1 leading-none">{p.sign}</span>
                        <span className="text-[8.5px] font-mono text-slate-500 mt-1 leading-none">{p.degrees}°{p.minutes}'</span>
                      </div>
                      
                      <div className="flex flex-col items-end shrink-0 gap-1.5 ml-2">
                        <span className="text-xs select-none leading-none" style={{ color: colors[name] || '#FFF' }}>
                          {symbols[name] || '✧'}
                        </span>
                        <span className="bg-amber-500/10 text-amber-400 text-[8.5px] font-mono px-1 py-0.2 rounded font-bold leading-none">H{p.house}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SAFETY ADVISORY DISCLAIMER */}
          <div className="w-full bg-gradient-to-br from-amber-500/[0.01] to-transparent border border-amber-500/15 rounded-xl p-4 flex gap-3 text-xs leading-relaxed text-slate-400 mt-auto relative overflow-hidden backdrop-blur-sm shrink-0">
            <div className="absolute top-0 right-0 w-12 h-12 bg-amber-500/[0.015] rounded-full blur-xl pointer-events-none" />
            <ShieldAlert className="h-4.5 w-4.5 text-amber-500/70 shrink-0 mt-0.5 animate-pulse" />
            <div>
              <p className="font-serif text-amber-300/90 font-semibold mb-1 tracking-wide">Celestial Reflection Advisory</p>
              Astrology serves as a mirror for self-reflection and spiritual growth. Readings should never substitute certified medical advice, legal counsel, or financial decisions.
            </div>
          </div>

        </section>

        {/* RIGHT PANEL: Chat Workspace */}
        <section className={`flex-col h-full overflow-hidden bg-slate-950/20 flex-1 ${activeMobileTab === "chat" ? "flex" : "hidden lg:flex"}`}>
          
          {/* MESSAGES LISTING */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
            {messages.map((msg, i) => (
              <div 
                key={i} 
                className={`flex gap-4 ${msg.role === "user" ? "flex-row-reverse" : ""} max-w-3xl ${msg.role === "user" ? "ml-auto" : "mr-auto"}`}
              >
                {/* Avatar */}
                <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                  msg.role === "user" 
                    ? "bg-slate-800 text-amber-400 border border-amber-500/20 shadow-md" 
                    : "bg-gradient-to-tr from-amber-600 to-amber-400 text-slate-950 shadow-[0_0_10px_rgba(245,158,11,0.2)]"
                }`}>
                  {msg.role === "user" ? <User className="h-4 w-4" /> : "✧"}
                </div>
                
                {/* Bubble */}
                <div className="space-y-1.5 max-w-[85%]">
                  <div className={`text-xs font-mono uppercase tracking-widest text-slate-500 ${msg.role === "user" ? "text-right" : ""}`}>
                    {msg.role === "user" ? "Seeker" : "Aradhana"}
                  </div>
                  <div className={`rounded-2xl px-5 py-3.5 leading-relaxed border ${
                    msg.role === "user" 
                      ? "bg-amber-950/30 border-amber-500/10 text-amber-50/90 rounded-tr-none text-sm md:text-[15px]" 
                      : "bg-white/[0.025] border-amber-500/[0.05] text-slate-200 rounded-tl-none font-serif text-[15.5px] sm:text-[16.5px] leading-relaxed tracking-wide"
                  }`}>
                    <p className="whitespace-pre-line">{msg.content}</p>
                  </div>
                </div>
              </div>
            ))}

            {/* Premium Onboarding CTA Card if Chart is not cast yet */}
            {!natalChart && (
              <div className="max-w-md mx-auto p-6 rounded-2xl bg-gradient-to-br from-amber-500/[0.03] to-transparent border border-amber-500/10 backdrop-blur-sm shadow-xl text-center space-y-4 my-6 animate-fadeIn">
                <div className="h-10 w-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-400 text-lg select-none">
                  🪐
                </div>
                <div className="space-y-1.5">
                  <h4 className="font-serif text-sm font-semibold text-amber-100 tracking-wide">Cast Your Birth Map</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed px-4">
                    Aradhana requires your date, time, and city of birth to align with the stars and provide personalized guidance.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveMobileTab("chart");
                    setIsFormOpen(true);
                  }}
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-600 to-amber-500 text-slate-950 font-mono tracking-widest uppercase text-[10px] px-5 py-2.5 rounded-lg font-bold shadow-lg hover:shadow-amber-500/10 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  Configure Birth Details 👉
                </button>
              </div>
            )}

            {/* STEAMING TEXT / LOADER STATE */}
            {isStreaming && (
              <div className="flex gap-4 max-w-3xl mr-auto animate-fadeIn">
                <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-amber-600 to-amber-400 text-slate-950 flex items-center justify-center text-xs font-bold animate-pulse shrink-0 shadow-[0_0_10px_rgba(245,158,11,0.2)]">
                  ✧
                </div>
                <div className="space-y-3 flex-1">
                  <div className="text-xs font-mono uppercase tracking-widest text-slate-500 flex items-center gap-2 select-none">
                    Aradhana
                    <span className="flex h-1.5 w-1.5 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
                    </span>
                    {activeStep && (
                      <span className="text-[9px] text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded font-bold uppercase tracking-wider">{activeStep}</span>
                    )}
                  </div>

                  {/* ACTIVE STEPS LOG CONSOLE (Collapsible, premium aesthetic) */}
                  {logs.length > 0 && (
                    <div className="bg-slate-950/75 border border-slate-900/60 rounded-xl p-4 font-mono text-[10px] leading-relaxed text-slate-400 space-y-1.5 max-w-[85%] drop-shadow-sm select-none transition-all duration-300">
                      <div className="text-[9px] text-amber-400/90 border-b border-slate-900 pb-1.5 mb-2 font-bold flex items-center gap-1.5">
                        <RefreshCw className="h-2.5 w-2.5 animate-spin text-amber-500" /> CELESTIAL ENGINE COMPUTATIONS...
                      </div>
                      {logs.map((log, idx) => (
                        <div key={idx} className="flex gap-1.5">
                          <span className="text-amber-500/30 select-none">›</span>
                          <span>{log}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Live Streaming Bubble or ChatGPT-style Bouncing Dots */}
                  {streamingText ? (
                    <div className="rounded-2xl rounded-tl-none px-5 py-3.5 bg-white/[0.025] border border-amber-500/[0.05] text-slate-200 font-serif text-[15.5px] sm:text-[16.5px] leading-relaxed tracking-wide max-w-[85%] relative shadow-md">
                      <p className="whitespace-pre-line">
                        {streamingText}
                        <span className="inline-block w-1.5 h-3.5 ml-1 bg-amber-400 animate-pulse align-middle rounded-sm"></span>
                      </p>
                    </div>
                  ) : (
                    /* ChatGPT-style Bouncing Dots typing indicator */
                    <div className="inline-flex space-x-1.5 items-center px-5 py-3 font-bold bg-white/[0.025] border border-amber-500/[0.05] rounded-2xl rounded-tl-none w-20 justify-center shadow-md select-none">
                      <div className="w-1.5 h-1.5 bg-amber-400/80 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-1.5 h-1.5 bg-amber-400/80 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-1.5 h-1.5 bg-amber-400/80 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* FLOATING ACTION SUGGESTIONS */}
          {!isStreaming && (
            <div className="px-6 py-2 bg-slate-950/20 z-10 border-t border-slate-900/20">
              <div className="max-w-3xl mx-auto flex flex-wrap gap-2 justify-center">
                {suggestions.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => sendQuery(s)}
                    className="text-[11px] font-serif border border-slate-800 hover:border-amber-500/20 bg-slate-900/40 hover:bg-amber-500/[0.02] text-slate-400 hover:text-amber-200 px-3.5 py-2 rounded-full transition-all duration-200"
                  >
                    ✦ {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* CHAT INPUT AREA */}
          <div className="p-6 border-t border-amber-500/10 bg-slate-950/60 backdrop-blur-md z-10 relative">
            <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto relative flex items-center">
              <input 
                type="text" 
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                disabled={isStreaming}
                placeholder="Ask about your planetary charts, transits, or general astrological meanings..."
                className="w-full bg-slate-900/80 border border-slate-800 focus:border-amber-500/40 outline-none text-slate-100 rounded-full px-6 py-4 text-sm pr-16 transition-colors shadow-inner placeholder:text-slate-600 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || isStreaming}
                className="absolute right-2 p-3 bg-gradient-to-r from-amber-600 to-amber-500 text-slate-950 hover:brightness-110 active:scale-95 duration-150 transition-all rounded-full flex items-center justify-center shadow-lg disabled:opacity-30 disabled:pointer-events-none"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>

        </section>

      </main>
    </div>
  );
}
