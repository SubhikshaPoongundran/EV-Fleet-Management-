import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Map as MapIcon, Navigation, Truck, BarChart3, AlertTriangle, CheckCircle, Clock, MapPin, Menu, 
  Sparkles, MessageSquare, Send, Loader2, Plus, Zap, Eye, Database, ExternalLink, UserPlus, User, X, 
  MessageCircle, BrainCircuit, Siren, Cpu, Activity, Radio, Crosshair, Terminal, Settings, Key, LogOut, 
  Sun, Moon, Plug, Cpu as ChipIcon
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

// --- Styles & Fonts Injection ---
const GlobalStyles = ({ isDarkMode }) => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=Rajdhani:wght@500;600;700&display=swap');
    
    body {
      background-color: ${isDarkMode ? '#09090b' : '#f1f5f9'};
      color: ${isDarkMode ? '#e4e4e7' : '#1e293b'};
      font-family: 'Rajdhani', sans-serif;
      transition: background-color 0.3s ease, color 0.3s ease;
    }
    
    .font-mono { font-family: 'JetBrains Mono', monospace; }
    
    ::-webkit-scrollbar { width: 8px; height: 8px; }
    ::-webkit-scrollbar-track { background: ${isDarkMode ? '#18181b' : '#e2e8f0'}; }
    ::-webkit-scrollbar-thumb { background: ${isDarkMode ? '#3f3f46' : '#94a3b8'}; border-radius: 4px; }
    ::-webkit-scrollbar-thumb:hover { background: #06b6d4; }

    .tech-border {
      position: relative;
      background: ${isDarkMode ? 'rgba(24, 24, 27, 0.6)' : 'rgba(255, 255, 255, 0.7)'};
      border: 1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'};
      backdrop-filter: blur(12px);
      box-shadow: ${isDarkMode ? 'none' : '0 4px 6px -1px rgba(0, 0, 0, 0.1)'};
      transition: all 0.3s ease;
    }
    .tech-border::before {
      content: '';
      position: absolute;
      top: -1px; left: -1px;
      width: 12px; height: 12px;
      border-top: 2px solid #06b6d4;
      border-left: 2px solid #06b6d4;
    }
    .tech-border::after {
      content: '';
      position: absolute;
      bottom: -1px; right: -1px;
      width: 12px; height: 12px;
      border-bottom: 2px solid #06b6d4;
      border-right: 2px solid #06b6d4;
    }
    
    /* CUSTOM TOOLTIP STYLING */
    .tech-tooltip {
      background: ${isDarkMode ? 'rgba(16, 16, 20, 0.95)' : 'rgba(255, 255, 255, 0.95)'} !important;
      border: 1px solid ${isDarkMode ? 'rgba(6, 182, 212, 0.5)' : 'rgba(0, 0, 0, 0.2)'} !important;
      border-radius: 6px !important;
      backdrop-filter: blur(8px) !important;
      color: ${isDarkMode ? '#e4e4e7' : '#1e293b'} !important;
      font-family: 'JetBrains Mono', monospace !important;
      font-size: 11px !important;
      padding: 6px 10px !important;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5) !important;
      opacity: 1 !important;
    }
    
    .tech-tooltip::before {
      border-top-color: ${isDarkMode ? 'rgba(6, 182, 212, 0.5)' : 'rgba(0, 0, 0, 0.2)'} !important;
    }

    .bg-grid-pattern {
      background-image: linear-gradient(${isDarkMode ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.05)'} 1px, transparent 1px),
      linear-gradient(90deg, ${isDarkMode ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.05)'} 1px, transparent 1px);
      background-size: 30px 30px;
    }

    .scan-overlay {
      background: linear-gradient(to bottom, transparent, rgba(6, 182, 212, 0.05), transparent);
      animation: scanline 6s linear infinite;
      pointer-events: none;
    }

    @keyframes scanline { 0% { transform: translateY(-100%); } 100% { transform: translateY(100%); } }
    
    .clip-tech { clip-path: polygon(0 0, 100% 0, 100% 85%, 95% 100%, 0 100%); }
    
    .custom-car-icon { transition: all 0.3s ease; cursor: pointer !important; }
    
    .station-icon { transition: all 0.3s ease; cursor: pointer !important; }
    
    .suggested-station {
      animation: bounce-pulse 2s infinite;
      z-index: 1000 !important;
    }
    @keyframes bounce-pulse {
      0%, 100% { transform: scale(1.1) translateY(-5px); filter: drop-shadow(0 5px 5px rgba(34, 197, 94, 0.5)); }
      50% { transform: scale(1.2) translateY(-10px); filter: drop-shadow(0 15px 10px rgba(34, 197, 94, 0.8)); }
    }

    .connector-line-safe { animation: dash 1.5s linear infinite; stroke: #22c55e; stroke-width: 3; opacity: 0.8; }
    .connector-line-risk { animation: dash 0.5s linear infinite; stroke: #ef4444; stroke-width: 3; opacity: 0.8; }
    @keyframes dash { to { stroke-dashoffset: -20; } }
  `}</style>
);

// --- Gemini & Leaflet Setup ---
const GEMINI_MODEL = "gemini-2.5-flash-preview-09-2025"; 

const callGemini = async (prompt, systemInstruction, currentKey) => {
  if (!currentKey) return "ACCESS DENIED: MISSING API KEY. CONFIGURE IN SETTINGS.";

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${currentKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          systemInstruction: { parts: [{ text: systemInstruction }] },
          safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
          ]
        }),
      }
    );
    const data = await response.json();
    if (data.error) return `⚠️ SYSTEM ERR: ${data.error.message}`;
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "NO DATA AVAILABLE.";
  } catch (error) { return "⚠️ NETWORK FAILURE: UPLINK OFFLINE."; }
};

const loadLeaflet = () => {
  return new Promise((resolve, reject) => {
    if (window.L) { resolve(window.L); return; }
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => resolve(window.L);
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

const INITIAL_DRIVERS = [
  { id: 'D001', name: 'Rajesh Kumar', vehicle: 'TN-01-AB-1234', rating: 4.8, phone: '+91 98765 43210', experience: '5 Years', license: 'TN012015000123' },
  { id: 'D002', name: 'Priya Sundar', vehicle: 'TN-09-XY-5678', rating: 4.9, phone: '+91 98765 43211', experience: '3 Years', license: 'TN092018000456' },
  { id: 'D003', name: 'Karthik Raja', vehicle: 'TN-10-ZZ-9988', rating: 4.5, phone: '+91 98765 43212', experience: '7 Years', license: 'TN102012000789' },
  { id: 'D004', name: 'Senthil Vel', vehicle: 'TN-22-MM-1122', rating: 4.2, phone: '+91 98765 43213', experience: '2 Years', license: 'TN222019000321' },
  { id: 'D005', name: 'Hardware Pilot', vehicle: 'ev_car_01', rating: 5.0, phone: '+91 99999 88888', experience: '1 Year', license: 'TN322023000999' },
  { id: 'D006', name: 'Sim Pilot', vehicle: 'TN-01-HARDWARE', rating: 5.0, phone: 'N/A', experience: 'AI', license: 'AI-CORE-01' },
];

const ANALYTICS_DATA = [
  { name: 'MON', trips: 40 }, { name: 'TUE', trips: 30 }, { name: 'WED', trips: 55 },
  { name: 'THU', trips: 45 }, { name: 'FRI', trips: 80 }, { name: 'SAT', trips: 95 }, { name: 'SUN', trips: 60 },
];
const PIE_DATA = [{ name: 'Active', value: 4 }, { name: 'Idle', value: 2 }, { name: 'Maint', value: 1 }];
const COLORS = ['#06b6d4', '#eab308', '#ef4444']; 

// --- CUSTOM DATA: Extended Tamil Nadu EV Charging Stations ---
// NOTE: Set to empty array to force fetching from Server
const CUSTOM_STATIONS = [];

// --- Helpers ---
const getLocationName = (coords) => {
  if (!coords) return 'UNKNOWN';
  const parts = coords.split(',');
  if (parts.length !== 2) return coords;
  const lat = parseFloat(parts[0]).toFixed(3);
  const lng = parseFloat(parts[1]).toFixed(3);
  return `LAT:${lat} LNG:${lng}`;
};

const getVehicleColor = (id) => {
  const colors = ['#06b6d4', '#3b82f6', '#8b5cf6', '#14b8a6', '#f59e0b']; 
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

const getDriverName = (vehicleId, driversList) => {
  const driver = driversList.find(d => d.vehicle === vehicleId);
  return driver ? driver.name : 'UNMANNED';
};

const getDistanceFromLatLonInKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371; 
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
  return parseFloat((R * c).toFixed(1));
};

// --- Theme Hook ---
const useTheme = () => {
  const [isDarkMode, setIsDarkMode] = useState(true);
  
  const theme = useMemo(() => ({
    bg: isDarkMode ? 'bg-black' : 'bg-slate-50',
    panel: isDarkMode ? 'bg-zinc-900/50' : 'bg-white',
    panelSolid: isDarkMode ? 'bg-zinc-900' : 'bg-white',
    border: isDarkMode ? 'border-zinc-700' : 'border-slate-200',
    text: isDarkMode ? 'text-zinc-200' : 'text-slate-800',
    textMuted: isDarkMode ? 'text-zinc-500' : 'text-slate-500',
    input: isDarkMode ? 'bg-black border-zinc-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900',
    hover: isDarkMode ? 'hover:bg-zinc-800' : 'hover:bg-slate-100',
    sidebar: isDarkMode ? 'bg-zinc-950/90 border-zinc-800' : 'bg-white/90 border-slate-200',
    chartGrid: isDarkMode ? '#333' : '#e2e8f0',
    chartText: isDarkMode ? '#a1a1aa' : '#64748b'
  }), [isDarkMode]);

  return { isDarkMode, setIsDarkMode, theme };
};

const LoginScreen = ({ onLogin, theme }) => {
  const [id, setId] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');
  const handleLogin = (e) => {
    e.preventDefault();
    if (id === 'admin' && pass === 'raspberry') onLogin();
    else setError('ACCESS DENIED: INVALID CREDENTIALS');
  };
  return (
    <div className={`min-h-screen ${theme.bg} bg-grid-pattern flex items-center justify-center p-4 relative overflow-hidden`}>
      <div className="absolute inset-0 bg-gradient-to-t from-cyan-900/10 to-transparent pointer-events-none"></div>
      <div className={`${theme.panel} backdrop-blur-xl p-10 rounded-xl border border-cyan-500/30 shadow-[0_0_50px_rgba(6,182,212,0.15)] w-full max-w-md relative clip-tech`}>
        <div className="absolute top-0 left-0 w-full h-1 bg-cyan-500"></div>
        <div className="flex justify-center mb-8">
            <div className="p-5 bg-cyan-500/10 rounded-full border border-cyan-500 text-cyan-400 animate-pulse">
              <BrainCircuit size={56} />
            </div>
        </div>
        <h2 className={`text-4xl font-bold ${theme.text} text-center mb-2 tracking-widest`}>EV-<span className="text-cyan-500">FLEET</span></h2>
        <p className={`text-center ${theme.textMuted} font-mono text-sm mb-10 tracking-[0.2em]`}>SECURE TERMINAL ACCESS V2.5</p>
        
        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-1.5">
            <label className="text-xs text-cyan-500 font-mono uppercase tracking-wider font-bold">Operator ID</label>
            <input type="text" value={id} onChange={(e) => setId(e.target.value)} className={`w-full p-4 text-sm font-mono focus:border-cyan-500 outline-none transition-colors rounded-sm ${theme.input}`} placeholder="ENTER ID" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-cyan-500 font-mono uppercase tracking-wider font-bold">Passcode</label>
            <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} className={`w-full p-4 text-sm font-mono focus:border-cyan-500 outline-none transition-colors rounded-sm ${theme.input}`} placeholder="••••••••" />
          </div>
          {error && <div className="bg-red-900/20 border border-red-500/50 p-3 text-red-500 text-xs font-mono text-center flex items-center justify-center gap-2 font-bold"><AlertTriangle size={16}/> {error}</div>}
          <button type="submit" className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-4 text-sm uppercase tracking-wider transition-all hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] clip-tech">
            Initialize Session
          </button>
        </form>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, subtext, icon: Icon, color, theme }) => (
  <div className={`tech-border p-6 relative group overflow-hidden transition-all ${theme.hover}`}>
    <div className={`absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity ${color}`}>
        <Icon size={80} strokeWidth={1} />
    </div>
    <div className="relative z-10">
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-1.5 rounded-md ${color.replace('text-', 'bg-')}/10`}>
          <Icon size={18} className={color} />
        </div>
        <p className={`${theme.textMuted} text-xs uppercase tracking-widest font-mono font-bold`}>{title}</p>
      </div>
      <h3 className={`text-4xl font-bold ${theme.text} mt-1 font-mono tracking-tighter`}>{value}</h3>
      <p className={`text-xs mt-3 font-mono ${color} border-l-2 pl-3 border-current opacity-90 font-semibold`}>{subtext}</p>
    </div>
    <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
  </div>
);

const FleetAIChat = ({ drivers, apiKey, theme }) => {
  const [messages, setMessages] = useState([{ role: 'ai', text: 'SYSTEM ONLINE. FLEET ADVISOR READY. AWAITING QUERY...' }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);
    const systemContext = `You are a Futuristic Logistics AI named 'CORTEX'. Speak concisely, technically, and use industrial terminology. Current Fleet Data: ${JSON.stringify(drivers)}`;
    const aiResponse = await callGemini(userMsg, systemContext, apiKey);
    setMessages(prev => [...prev, { role: 'ai', text: aiResponse }]);
    setLoading(false);
  };

  return (
    <div className={`h-[650px] flex flex-col ${theme.panelSolid} border ${theme.border} rounded-lg shadow-xl overflow-hidden relative`}>
      <div className={`absolute top-0 left-0 w-1.5 h-full ${theme.bg} border-r ${theme.border}`}></div>
      <div className="absolute top-4 right-4 flex gap-1.5">
        <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></div>
        <div className={`w-2.5 h-2.5 ${theme.bg} rounded-full border border-gray-500`}></div>
      </div>

      <div className={`p-5 border-b ${theme.border} ${theme.bg}/50 flex justify-between items-center ml-2`}>
        <h3 className="font-bold text-cyan-500 flex items-center gap-2.5 tracking-widest text-sm font-mono">
          <BrainCircuit className="text-cyan-500" size={20} /> CORTEX AI INTERFACE
        </h3>
      </div>
      <div className={`flex-1 overflow-y-auto p-6 space-y-6 font-mono text-sm ml-2 bg-opacity-50`}>
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-4 border-l-4 shadow-sm rounded-r-md ${
              m.role === 'user' 
                ? 'border-cyan-500 bg-cyan-500/10 text-cyan-600 dark:text-cyan-100' 
                : 'border-purple-500 bg-purple-500/10 text-purple-600 dark:text-purple-200'
            }`}>
              <div className="text-[10px] opacity-60 mb-1.5 uppercase font-bold tracking-wider">{m.role === 'user' ? 'OPERATOR' : 'CORTEX CORE'}</div>
              <div className="leading-relaxed">{m.text}</div>
            </div>
          </div>
        ))}
        {loading && <div className="text-cyan-500 text-xs ml-4 flex items-center gap-2 animate-pulse font-bold"><Loader2 className="animate-spin" size={14}/> PROCESSING NEURAL REQUEST...</div>}
        <div ref={endRef} />
      </div>
      <div className={`p-4 border-t ${theme.border} ${theme.bg} flex gap-3 ml-2`}>
        <div className="flex-1 relative">
            <Terminal className="absolute left-3 top-3.5 text-gray-400" size={18}/>
            <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} className={`w-full ${theme.input} pl-10 pr-4 py-3 font-mono text-sm outline-none rounded-md`} placeholder="ENTER COMMAND..." />
        </div>
        <button onClick={handleSend} disabled={loading} className="bg-cyan-600 hover:bg-cyan-500 text-white px-6 rounded-md shadow-lg transition-colors"><Send size={20} /></button>
      </div>
    </div>
  );
};

export default function App() {
  const { isDarkMode, setIsDarkMode, theme } = useTheme();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [fleetTab, setFleetTab] = useState('vehicles');
  
  // Settings State
  const [userApiKey, setUserApiKey] = useState(localStorage.getItem('gemini_api_key') || '');
  const handleSaveKey = (e) => {
    e.preventDefault();
    localStorage.setItem('gemini_api_key', userApiKey);
    alert("SECURE KEY STORED.");
  };

  const [vehicles, setVehicles] = useState({});
  const [trips, setTrips] = useState([]);
  
  // Drivers State
  const [drivers, setDrivers] = useState(INITIAL_DRIVERS);
  const [isAddDriverOpen, setIsAddDriverOpen] = useState(false);
  const [newDriver, setNewDriver] = useState({ name: '', phone: '', license: '', experience: '', vehicle: '' });

  // AI Modal States
  const [tripBriefing, setTripBriefing] = useState(null);
  const [briefingLoading, setBriefingLoading] = useState(false);

  // --- NEW: Global Stations State & Selection ---
  const [globalStations, setGlobalStations] = useState([]);
  const [suggestedStations, setSuggestedStations] = useState([]); 
  const [selectedCarId, setSelectedCarId] = useState(null); // Track which car is clicked

  const [mockTrips] = useState([
    { id: 'T-5521', vehicle: 'TN-01-AB-1234', from: 'Chennai Central', to: 'T. Nagar', status: 'Completed', time: '10:42 AM' },
    { id: 'T-5520', vehicle: 'TN-09-XY-5678', from: 'Anna Nagar', to: 'Marina Beach', status: 'Completed', time: '09:15 AM' },
  ]);
  
  const [analytics, setAnalytics] = useState({ weekly: [], pie: [], totalTrips: 0, totalDistance: 0 });
  const [theftAlerts, setTheftAlerts] = useState(0);
  
  // Trip Planning
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [peekModal, setPeekModal] = useState(false); 
  const [selectedDriver, setSelectedDriver] = useState('');
  const [startCoords, setStartCoords] = useState('13.0827, 80.2707'); 
  const [endCoords, setEndCoords] = useState('13.0405, 80.2337'); 
  const [calculatedRoute, setCalculatedRoute] = useState(null);
  const [routeDistance, setRouteDistance] = useState(null);
  const [isRouting, setIsRouting] = useState(false);
  const [isAutoAssigning, setIsAutoAssigning] = useState(false); // NEW STATE
  const [isAutoDispatchMode, setIsAutoDispatchMode] = useState(false); // NEW: Auto-Pilot Toggle

  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});
  const stationMarkersRef = useRef([]); 
  const stationLinesRef = useRef([]); // To store connector lines
  const polylinesRef = useRef([]);
  const previewPolylineRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);

  const API_BASE_URL = `http://${window.location.hostname}:8080`;

  // --- INIT: Fetch Real Charging Network (OSM) + Robust Fallback ---
  useEffect(() => {
    const fetchStations = async () => {
      // 1. Use Custom Data if provided
      if (CUSTOM_STATIONS.length > 0) {
        console.log("Using Custom Station Data provided by user.");
        setGlobalStations(CUSTOM_STATIONS);
        return;
      }

      // 2. Fetch from OSM
      try {
        console.log("Attempting to fetch real charging stations from Overpass API...");
        const query = `
          [out:json];
          node(around:30000, 13.0827, 80.2707)["amenity"="charging_station"];
          out;
        `;
        const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.elements && data.elements.length > 0) {
            console.log(`Found ${data.elements.length} real stations.`);
            const realStations = data.elements.map(node => ({
              id: `OSM-${node.id}`,
              name: node.tags.name || node.tags.operator || "Public Charger",
              lat: node.lat,
              lng: node.lon,
              status: 'Available', 
              power: parseInt(node.tags.amperage) || 50,
              type: node.tags.socket_type || 'Type 2'
            }));
            setGlobalStations(realStations);
        } else {
            // Try fetching from our server's internal DB if OSM fails
            console.log("OSM empty, trying server backup...");
            try {
               const serverRes = await fetch(`${API_BASE_URL}/api/stations`);
               if(serverRes.ok) {
                   const serverData = await serverRes.json();
                   setGlobalStations(serverData);
               } else {
                   throw new Error("Server stations not available");
               }
            } catch(serverErr) {
               throw new Error("No stations found in OSM response or Server.");
            }
        }
      } catch (err) {
        console.warn("Real Data fetch failed or empty. Generating SIMULATED Fallback Network.", err);
        // 3. Fallback Simulation
        const stations = [];
        const baseLat = 13.0827;
        const baseLng = 80.2707;
        for(let i=0; i<30; i++) {
           const latOffset = (Math.random() - 0.5) * 0.15; 
           const lngOffset = (Math.random() - 0.5) * 0.15;
           stations.push({
             id: `SIM-ST-${i}`,
             name: `ChargeGrid Node-${100+i}`,
             lat: baseLat + latOffset,
             lng: baseLng + lngOffset,
             status: Math.random() > 0.3 ? 'Available' : 'Busy',
             power: Math.random() > 0.5 ? 120 : 60,
             type: 'Simulation Fallback'
           });
        }
        setGlobalStations(stations);
      }
    };
    fetchStations();
  }, []);

  // Poll Server with Enhanced Logging
  useEffect(() => {
    if (!isAuthenticated) return;
    const fetchData = async () => {
      try {
        const vRes = await fetch(`${API_BASE_URL}/api/fleet-status`);
        const vData = await vRes.json();
        setVehicles(vData);
        
        const thefts = Object.values(vData).filter(v => v.status === 'theft').length;
        setTheftAlerts(thefts);

        const tRes = await fetch(`${API_BASE_URL}/api/trips`);
        const tData = await tRes.json();
        setTrips(tData);
        const aRes = await fetch(`${API_BASE_URL}/api/analytics`);
        const aData = await aRes.json();
        setAnalytics(aData);

      } catch (e) {
        console.error(`[SYNC] ❌ Connection Failed: ${e.message}`);
      }
    };
    const interval = setInterval(fetchData, 1000);
    return () => clearInterval(interval);
  }, [isAuthenticated, API_BASE_URL]);

  // Leaflet Init
  useEffect(() => {
    if (activeTab !== 'map' || !isAuthenticated) return;
    let mounted = true;
    
    loadLeaflet().then((L) => {
      if (!mounted || mapInstanceRef.current || !mapRef.current) return;
      
      const map = L.map(mapRef.current).setView([13.0827, 80.2707], 13);
      
      const tileUrl = isDarkMode 
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

      L.tileLayer(tileUrl, { 
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 19
      }).addTo(map);
      
      // Click map background to deselect car
      map.on('click', () => {
        setSelectedCarId(null);
      });
      
      mapInstanceRef.current = map;
      
      // FIX: Robust Invalidating Size with Observer
      const resizeObserver = new ResizeObserver(() => {
         if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize();
      });
      if (mapRef.current) resizeObserver.observe(mapRef.current);
      
      setMapReady(true);
      return () => {
         if (mapRef.current) resizeObserver.unobserve(mapRef.current);
      };
    }).catch(err => console.error("Leaflet load failed", err));

    return () => { 
      mounted = false; 
      if(mapInstanceRef.current) { 
        mapInstanceRef.current.remove(); 
        mapInstanceRef.current = null; 
        markersRef.current = {}; 
        polylinesRef.current = [];
        stationMarkersRef.current = [];
        stationLinesRef.current = [];
        setMapReady(false);
      }
    };
  }, [activeTab, isAuthenticated, isDarkMode]);

  // Leaflet Updates (Vehicles, Trips, Dynamic Stations)
  useEffect(() => {
    if (activeTab !== 'map' || !mapInstanceRef.current || !window.L || !mapReady) return;
    const map = mapInstanceRef.current;
    const L = window.L;

    // --- 1. Draw Vehicles ---
    Object.entries(vehicles).forEach(([id, data]) => {
      const driverName = getDriverName(id, drivers);
      const vehicleColor = getVehicleColor(id);
      
      const isTheft = data.status === 'theft';
      const statusColor = isTheft ? '#ef4444' : (data.status==='active'?'#06b6d4':'#f59e0b');
      const iconPulseClass = isTheft ? 'animate-ping' : '';
      const bgColor = isDarkMode ? '#09090b' : '#ffffff';
      const textColor = isDarkMode ? '#ffffff' : '#0f172a';
      
      const isSelected = selectedCarId === id;
      const borderStyle = isSelected ? `2px solid ${isDarkMode ? '#fff' : '#000'}` : `1px solid ${statusColor}`;
      const scaleTransform = isSelected ? 'scale(1.2)' : 'scale(1)';

      const popupContent = `
        <div style="font-family:'JetBrains Mono', monospace; min-width: 220px; background: ${bgColor}; color: ${textColor}; border: ${borderStyle}; padding: 12px; border-radius: 4px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:10px; border-bottom: 1px solid ${isDarkMode ? '#333' : '#e5e7eb'}; padding-bottom: 8px;">
              <div style="width:10px; height:10px; border-radius:50%; background-color:${statusColor}; box-shadow: 0 0 8px ${statusColor}"></div>
              <b style="font-size: 15px; letter-spacing: 0.5px;">${id}</b>
          </div>
          <span style="color: #94a3b8; font-size: 11px; text-transform: uppercase; font-weight:600;">Operator: ${driverName}</span><br/>
          <div style="margin-top: 10px; font-size: 12px; display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
            <div style="color:${statusColor}; font-weight: bold; grid-column: span 2; margin-bottom:4px;">STATUS: ${data.status.toUpperCase()}</div>
            <div style="color:#94a3b8;">SoC:</div><div style="text-align:right; font-weight:bold;">${data.soc}%</div>
          </div>
        </div>
      `;
      
      const svgFill = isTheft ? '#ef4444' : vehicleColor;
      const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${svgFill}" stroke="${isDarkMode ? 'rgba(0,0,0,0.8)' : 'white'}" stroke-width="1.5" width="40" height="40" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3)); transform: ${scaleTransform}"><path d="M12 2L2 22l10-3 10 3L12 2z"/></svg>`;

      if (markersRef.current[id]) {
        markersRef.current[id].setLatLng([data.lat, data.lng]).setPopupContent(popupContent);
        // Correct Car Anchor: [20, 20] is the center of the 40x40 box
        const icon = L.divIcon({ className: `custom-car-icon ${iconPulseClass}`, html: svgIcon, iconSize: [40, 40], iconAnchor: [20, 20], popupAnchor: [0, -20] });
        markersRef.current[id].setIcon(icon);
      } else {
        const icon = L.divIcon({ className: `custom-car-icon ${iconPulseClass}`, html: svgIcon, iconSize: [40, 40], iconAnchor: [20, 20], popupAnchor: [0, -20] });
        const marker = L.marker([data.lat, data.lng], { icon }).addTo(map)
          .bindPopup(popupContent)
          // ADDED: Glassmorphism Tooltip on Hover
          .bindTooltip(`
            <div class="flex flex-col gap-1">
              <div class="font-bold text-xs flex items-center gap-2">
                <div style="width:6px; height:6px; background:${statusColor}; border-radius:50%;"></div>
                ${id}
              </div>
              <div class="text-[9px] font-mono opacity-80 flex justify-between">
                <span>${data.status.toUpperCase()}</span>
                <span>⚡${data.soc}%</span>
              </div>
            </div>
          `, {
             direction: 'top',
             offset: [0, -20],
             opacity: 1,
             className: 'tech-tooltip'
          });
        
        marker.on('click', () => {
          setSelectedCarId(id);
        });
        
        markersRef.current[id] = marker;
      }
    });

    // --- 2. Draw Active Trips ---
    polylinesRef.current.forEach(l => l.remove());
    polylinesRef.current = [];
    trips.forEach(t => {
       if (t.status === 'Completed') return; 
       const routeColor = getVehicleColor(t.driverId);
       
       if(t.route && t.route.length > 0) {
           const l = L.polyline(t.route, { color: routeColor, weight: 4, opacity: 0.8, dashArray: '8, 12' }).addTo(map);
           l.bindPopup(`Trip: ${t.id}<br>Driver: ${getDriverName(t.driverId, drivers)}`);
           polylinesRef.current.push(l);
       }
    });

    // --- 3. Preview Route ---
    if(previewPolylineRef.current) previewPolylineRef.current.remove();
    if(calculatedRoute) {
      previewPolylineRef.current = L.polyline(calculatedRoute, { color: '#22c55e', weight: 5, className: 'animate-pulse' }).addTo(map);
      map.fitBounds(previewPolylineRef.current.getBounds(), { padding: [50,50] });
    }

    // --- 4. CHARGING STATIONS VISUALIZATION (FIXED) ---
    stationMarkersRef.current.forEach(m => m.remove());
    stationMarkersRef.current = [];
    stationLinesRef.current.forEach(l => l.remove());
    stationLinesRef.current = [];
    
    // Logic: Identify Top 3 Recommended Stations
    const recommendedSet = new Set();
    
    if (selectedCarId && vehicles[selectedCarId]) {
       const car = vehicles[selectedCarId];
       // Fallback: If globalStations is empty, don't crash
       const available = (globalStations || []).filter(s => s.status === 'Available');
       const estimatedRange = car.range || (car.soc / 100 * 300);

       const withScore = available.map(st => {
         const dist = getDistanceFromLatLonInKm(car.lat, car.lng, st.lat, st.lng);
         const isReachable = dist <= estimatedRange;
         let score = (isReachable ? 10000 : 0) + (1000 - dist) + (st.power * 2);
         return { ...st, dist, isReachable, score };
       });
       
       const top3 = withScore.sort((a,b) => b.score - a.score).slice(0, 3);
       
       top3.forEach(st => {
         recommendedSet.add(st.id);
         
         const lineColor = st.isReachable ? '#22c55e' : '#ef4444'; 
         const lineClass = st.isReachable ? 'connector-line-safe' : 'connector-line-risk';
         const line = L.polyline([[car.lat, car.lng], [st.lat, st.lng]], {
             color: lineColor, weight: 3, dashArray: '5, 10', className: lineClass, opacity: 0.6
         }).addTo(map);
         
         stationLinesRef.current.push(line);
       });
    }

    // Draw ALL Station Markers with CORRECT ANCHORS
    (globalStations || []).forEach(st => {
      const isRecommended = recommendedSet.has(st.id);
      const isAvailable = st.status === 'Available';
      
      const color = isAvailable ? '#22c55e' : '#ef4444';
      const bgColor = isDarkMode ? '#09090b' : '#ffffff';
      
      // FIX: Using a Pin Icon with correct Anchor
      const iconSize = isRecommended ? [48, 48] : [32, 32];
      
      // ANCHOR FIX: For a pin, the anchor should be [width/2, height]
      // Because the SVG visual "tip" is at approx 22/24 of height, we shift slightly up
      const anchor = [iconSize[0]/2, iconSize[1]]; 
      
      const className = `custom-station-icon ${isRecommended ? 'suggested-station' : ''} station-icon`;
      const zIndex = isRecommended ? 1000 : 500;
      
      // Updated SVG: Standard Map Pin Shape with Bolt inside - EXACT TIP
      const svgIcon = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" stroke="${isDarkMode ? 'rgba(0,0,0,0.8)' : 'white'}" stroke-width="1" width="${iconSize[0]}" height="${iconSize[1]}" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
          <path d="M12 0C7.58 0 4 3.58 4 8c0 5.25 8 16 8 16s8-10.75 8-16c0-4.42-3.58-8-8-8z" opacity="0.9"/>
          <path d="M13 5L6 14h6l-1 5 7-9h-6l1-5z" fill="${isDarkMode ? '#000' : '#fff'}" transform="scale(0.7) translate(5, 5)"/>
        </svg>`;

      const icon = L.divIcon({ className, html: svgIcon, iconSize, iconAnchor: anchor, popupAnchor: [0, -iconSize[1]] });

      const popupContent = `
        <div style="font-family:'JetBrains Mono', monospace; min-width: 180px; background: ${bgColor}; color: ${isDarkMode?'white':'black'}; border-left: 4px solid ${color}; padding: 10px; border-radius: 4px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
             <b style="font-size: 13px;">${st.name}</b>
             ${isRecommended ? `<span style="font-size:10px; background:${color}20; color:${color}; padding:2px 4px; border-radius:2px;">RECOMMENDED</span>` : ''}
          </div>
          <div style="margin-top: 5px; font-size: 11px; color: ${isDarkMode?'#a1a1aa':'#64748b'};">
            Power: <span style="color:${color}; font-weight:bold;">${st.power} kW</span><br/>
            Type: ${st.type}<br/>
            Status: <b>${st.status}</b>
          </div>
        </div>
      `;

      const marker = L.marker([st.lat, st.lng], { icon, zIndexOffset: zIndex }).addTo(map).bindPopup(popupContent);
      
      if (isRecommended) {
         marker.openPopup();
         setTimeout(() => { marker.closePopup(); }, 5000);
      }
      
      stationMarkersRef.current.push(marker);
    });

  }, [vehicles, trips, calculatedRoute, activeTab, mapReady, drivers, isDarkMode, globalStations, selectedCarId]);

  // ... (Rest of logic remains unchanged)
  // ... (Keep existing code for executeAutoDispatch, handleAutoAssign, handleOptimizeRoute, etc.)
  
  // --- NEW: AUTO ASSIGN & DISPATCH LOGIC ---
  const executeAutoDispatch = async (routeCoords, distVal) => {
    setIsAutoAssigning(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auto-assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startCoords, tripDistance: parseFloat(distVal) })
      });
      
      if (!res.ok) {
        throw new Error(`Server Error: ${res.status}`); 
      }

      const data = await res.json();
      
      if (data.success) {
        const bestVehicle = data.vehicle;
        
        // Immediate Dispatch
        const dispatchRes = await fetch(`${API_BASE_URL}/api/trips`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            driverId: bestVehicle.id, 
            start: startCoords, 
            end: endCoords, 
            route: routeCoords 
          })
        });

        if (dispatchRes.ok) {
          alert(`🤖 CORTEX AUTO-PILOT ENGAGED\n\nAsset Assigned: ${bestVehicle.id}\nDistance: ${bestVehicle.distanceToPickup.toFixed(1)}km\nBattery: ${bestVehicle.battery}%\n\nMission Active.`);
          setShowPlanModal(false);
          setCalculatedRoute(null);
          setRouteDistance(null);
          setTripBriefing(null);
          setSuggestedStations([]);
        } else {
          alert("AUTO-DISPATCH FAILED: SERVER REJECTED MISSION.");
        }
      } else {
        alert("AUTO-DISPATCH ABORTED: NO SUITABLE ASSETS FOUND IN SECTOR.");
      }
    } catch (e) {
      console.error(e);
      alert(`CRITICAL FAILURE IN AUTO-DISPATCH SYSTEM: ${e.message}\n\nEnsure server.js is running on port 8080 and contains the /api/auto-assign endpoint.`);
    } finally {
      setIsAutoAssigning(false);
    }
  };

  const handleAutoAssign = async () => {
      if (!calculatedRoute || !routeDistance) {
          alert("Please compute the route first!");
          return;
      }
      setIsAutoAssigning(true);
      try {
          const res = await fetch(`${API_BASE_URL}/api/auto-assign`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ startCoords, tripDistance: parseFloat(routeDistance) })
          });
          const data = await res.json();
          if (data.success) {
              setSelectedDriver(data.vehicle.id);
              alert(`AI SELECTED OPTIMAL ASSET: ${data.vehicle.id}\n(Dist: ${data.vehicle.distanceToPickup.toFixed(1)}km | SoC: ${data.vehicle.battery}%)`);
          } else {
              alert("NO SUITABLE ASSETS FOUND.");
          }
      } catch (e) { alert("ALGORITHM ERROR"); }
      setIsAutoAssigning(false);
  };

  // --- ROUTING ---
  const handleOptimizeRoute = async () => {
    setIsRouting(true);
    setRouteDistance(null);
    setTripBriefing(null);
    setSuggestedStations([]); 

    const cleanStart = startCoords.replace(/\s/g, '');
    const cleanEnd = endCoords.replace(/\s/g, '');
    const [lat1, lng1] = cleanStart.split(','); 
    const [lat2, lng2] = cleanEnd.split(',');

    if(!lat1 || !lng1 || !lat2 || !lng2 || isNaN(lat1) || isNaN(lng1) || isNaN(lat2) || isNaN(lng2)) {
      alert("INVALID COORDINATE INPUT DETECTED.");
      setIsRouting(false);
      return;
    }

    const fetchRoute = async (baseUrl) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000); 
      try {
        const url = `${baseUrl}/${lng1},${lat1};${lng2},${lat2}?overview=full&geometries=geojson`;
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        if(!res.ok) throw new Error("API Error");
        const data = await res.json();
        if(data.routes && data.routes.length > 0) {
          const dist = (data.routes[0].distance / 1000).toFixed(1);
          const coords = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
          return { dist, coords };
        }
        throw new Error("No route");
      } catch (err) {
        clearTimeout(timeoutId);
        throw err;
      }
    };

    try {
      const result = await fetchRoute('https://router.project-osrm.org/route/v1/driving');
      setRouteDistance(result.dist);
      setCalculatedRoute(result.coords);
      
      // Auto-Dispatch Trigger
      if (isAutoDispatchMode) {
        await executeAutoDispatch(result.coords, result.dist);
      } else {
        // Standard Suggestions Logic
        const startLat = parseFloat(lat1);
        const startLng = parseFloat(lng1);
        // Fallback for globalStations
        const available = (globalStations || []).filter(s => s.status === 'Available');
        const withDist = available.map(st => ({
            ...st,
            dist: getDistanceFromLatLonInKm(startLat, startLng, st.lat, st.lng)
        }));
        const top3 = withDist.sort((a,b) => a.dist - b.dist).slice(0, 3);
        setSuggestedStations(top3);
      }

    } catch (err1) {
      console.warn("Primary uplink failed, engaging backup...");
      try {
        const result = await fetchRoute('https://routing.openstreetmap.de/routed-car/route/v1/driving');
        setRouteDistance(result.dist);
        setCalculatedRoute(result.coords);
        
        if (isAutoDispatchMode) {
          await executeAutoDispatch(result.coords, result.dist);
        } else {
          const startLat = parseFloat(lat1);
          const startLng = parseFloat(lng1);
          const available = (globalStations || []).filter(s => s.status === 'Available');
          const withDist = available.map(st => ({ ...st, dist: getDistanceFromLatLonInKm(startLat, startLng, st.lat, st.lng)}));
          setSuggestedStations(withDist.sort((a,b) => a.dist - b.dist).slice(0, 3));
        }

      } catch (err2) {
        const l1 = parseFloat(lat1), g1 = parseFloat(lng1), l2 = parseFloat(lat2), g2 = parseFloat(lng2);
        const dist = ((Math.abs(l1-l2) + Math.abs(g1-g2))*111).toFixed(1);
        const coords = [[l1, g1], [l2, g2]];
        
        setRouteDistance(dist); 
        setCalculatedRoute(coords);
        
        if (isAutoDispatchMode) {
           await executeAutoDispatch(coords, dist);
        } else {
           alert("ROUTING SYSTEMS OFFLINE. CALCULATING LINEAR VECTOR.");
        }
      }
    } finally {
      setIsRouting(false);
    }
  };

  const handleAnalyzeTrip = async () => {
    if (!calculatedRoute || !selectedDriver) return;
    setBriefingLoading(true);
    setTripBriefing('');
    
    const vehicle = vehicles[selectedDriver] || { battery: 100, range: 300, type: 'Unknown' };
    const prompt = `Generate a tactical dispatcher briefing for a mission from ${startCoords} to ${endCoords} (${routeDistance} km). 
    Asset: ${selectedDriver} (${vehicle.type}, ${vehicle.soc}% charge, Voltage: ${vehicle.voltage}V, Range: ${vehicle.range}km). 
    Include: 1. Power Feasibility based on voltage. 2. Hazard Assessment. 3. Mission Status Prediction. Use concise military/industrial language.`;

    const content = await callGemini(prompt, "You are a Logistics AI Assistant.", userApiKey);
    setTripBriefing(content);
    setBriefingLoading(false);
  };

  const handleAssignTrip = async () => {
    if (!selectedDriver || !calculatedRoute) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/trips`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driverId: selectedDriver, start: startCoords, end: endCoords, route: calculatedRoute })
      });
      if(res.ok) {
        setShowPlanModal(false);
        setCalculatedRoute(null);
        setRouteDistance(null);
        setTripBriefing(null);
        setSuggestedStations([]);
      } else {
        alert("ASSET UNAVAILABLE.");
      }
    } catch (e) { alert("UPLINK FAILURE."); }
  };

  const handleGenerateCoaching = async (driver) => {
    // Placeholder for future AI coaching integration
    console.log("Generating report for:", driver.name);
    alert(`AI COACHING REQUEST SENT FOR ${driver.name.toUpperCase()}`);
  };

  const handleAddDriver = (e) => {
    e.preventDefault();
    if (!newDriver.name || !newDriver.license) return;
    const driverToAdd = {
      id: `D00${drivers.length + 1}`,
      name: newDriver.name,
      vehicle: newDriver.vehicle || 'UNASSIGNED',
      rating: 5.0, 
      phone: newDriver.phone,
      experience: newDriver.experience,
      license: newDriver.license
    };
    setDrivers([...drivers, driverToAdd]);
    setNewDriver({ name: '', phone: '', license: '', experience: '', vehicle: '' });
    setIsAddDriverOpen(false);
  };

  const getSelectedVehicleRange = () => {
    if(!selectedDriver || !vehicles[selectedDriver]) return 0;
    return vehicles[selectedDriver].range || 0;
  };

  const availableVehicles = useMemo(() => {
    const cleanStart = startCoords.replace(/\s/g, '');
    const [lat1, lng1] = cleanStart.split(',');
    
    return Object.entries(vehicles).map(([id, d]) => {
        const distToStart = (!isNaN(lat1) && !isNaN(lng1)) ? getDistanceFromLatLonInKm(d.lat, d.lng, parseFloat(lat1), parseFloat(lng1)) : 0;
        const totalReq = distToStart + (parseFloat(routeDistance) || 0);
        let statusColor = 'text-green-500';
        let statusText = 'OPTIMAL';
        if (d.status === 'theft') { statusColor = 'text-red-500 font-bold'; statusText = 'CRITICAL: THEFT'; }
        else if (d.status !== 'idle') { statusColor = 'text-red-400'; statusText = 'BUSY'; } 
        else if (totalReq > d.range) { statusColor = 'text-orange-400'; statusText = 'INSUFFICIENT POWER'; } 
        else if (distToStart > 10) { statusColor = 'text-yellow-500'; statusText = 'OUT OF SECTOR'; }
        return { id, ...d, distToStart, totalReq, statusColor, statusText };
      }).sort((a, b) => {
        if (a.status !== 'idle' && b.status === 'idle') return 1;
        if (a.status === 'idle' && b.status !== 'idle') return -1;
        return a.totalReq - b.totalReq;
      });
  }, [vehicles, startCoords, routeDistance]);

  const openOSMDirections = () => {
    const [l1, g1] = startCoords.split(',');
    const [l2, g2] = endCoords.split(',');
    if(l1 && g1 && l2 && g2) {
      window.open(`https://www.openstreetmap.org/directions?engine=graphhopper_car&route=${l1}%2C${g1}%3B${l2}%2C${g2}`, '_blank');
    }
  };

  if (!isAuthenticated) return (
    <>
      <GlobalStyles isDarkMode={isDarkMode} />
      <LoginScreen onLogin={() => setIsAuthenticated(true)} theme={theme} />
    </>
  );

  return (
    <>
    <GlobalStyles isDarkMode={isDarkMode} />
    <div className={`flex h-screen ${theme.bg} ${theme.text} font-sans overflow-hidden bg-grid-pattern relative`}>
      
      {/* Sidebar / Command Strip */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} ${theme.sidebar} backdrop-blur border-r flex flex-col z-20 transition-all duration-300 relative shadow-2xl`}>
        <div className="absolute top-0 right-0 w-[1px] h-full bg-gradient-to-b from-transparent via-cyan-500/50 to-transparent"></div>
        <div className={`p-6 border-b ${theme.border} flex items-center gap-3 ${theme.panel}`}>
          <div className="bg-cyan-500/10 border border-cyan-500/50 p-2 rounded-lg text-cyan-500"><Navigation size={24}/></div>{sidebarOpen&&<h1 className="font-bold tracking-[0.2em]">FLEET<span className="text-cyan-500">-MANAGER</span></h1>}
        </div>
        <nav className="p-4 space-y-2 flex-1">
            {[
              {id: 'dashboard', icon: BarChart3, label: 'CMD CENTER'},
              {id: 'map', icon: MapIcon, label: 'GEO-LOCATOR'},
              {id: 'drivers', icon: Truck, label: 'ASSETS'},
              {id: 'trips', icon: Clock, label: 'LOGS'},
            ].map(item => (
              <button key={item.id} onClick={()=>setActiveTab(item.id)} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-lg border border-transparent transition-all group ${activeTab===item.id? 'bg-cyan-600 text-white shadow-lg shadow-cyan-500/20' : `hover:${theme.panel} ${theme.textMuted} hover:${theme.text}`}`}>
                <item.icon size={20} className={activeTab===item.id?'text-white':''}/>{sidebarOpen&& <span className="text-sm font-mono tracking-wide font-bold">{item.label}</span>}
              </button>
            ))}
            
            <div className={`pt-4 mt-2 border-t ${theme.border}`}>
              <button onClick={()=>setActiveTab('ai-advisor')} className={`w-full flex items-center gap-3 px-4 py-3.5 mb-2 rounded-lg border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-purple-500 dark:text-purple-300 transition-all`}>
                <MessageSquare size={20} className="text-purple-500"/>{sidebarOpen&&<span className="font-mono text-sm tracking-wide font-bold">AI ADVISOR</span>}
                {sidebarOpen && <Sparkles size={14} className="ml-auto text-purple-500 animate-pulse" />}
              </button>
              <button onClick={()=>setActiveTab('settings')} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-lg border border-transparent hover:${theme.panel} ${theme.textMuted} hover:${theme.text} transition-all`}>
                <Settings size={20} className={activeTab==='settings'?'text-cyan-500':''}/>{sidebarOpen&&<span className="font-mono text-sm tracking-wide font-bold">CONFIG</span>}
              </button>
            </div>
        </nav>
        
        {/* Toggle Theme & Logout */}
        <div className={`p-4 border-t ${theme.border} space-y-2`}>
           <button onClick={()=>setIsDarkMode(!isDarkMode)} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-lg ${theme.hover} ${theme.textMuted} hover:${theme.text} transition-colors`}>
              {isDarkMode ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} className="text-slate-600" />}
              {sidebarOpen && <span className="font-mono text-sm tracking-wide font-bold">{isDarkMode ? 'LIGHT MODE' : 'DARK MODE'}</span>}
           </button>
           <button onClick={()=>setIsAuthenticated(false)} className="w-full flex items-center gap-3 px-4 py-3.5 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors">
              <LogOut size={20} />{sidebarOpen && <span className="font-mono text-sm tracking-wide font-bold">TERMINATE</span>}
           </button>
        </div>

        <div className={`p-4 border-t ${theme.border} text-xs ${theme.textMuted} font-mono text-center`}>
          V2.6.0 STABLE
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Top Scanline Animation */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0 scan-overlay opacity-30"></div>

        <header className={`${theme.sidebar} backdrop-blur border-b ${theme.border} p-4 flex justify-between items-center z-10 shadow-sm`}>
          <button onClick={()=>setSidebarOpen(!sidebarOpen)} className={`p-2 rounded-md ${theme.hover} ${theme.textMuted} hover:${theme.text}`}><Menu/></button>
          <div className="flex items-center gap-6">
              {/* Scrolling Ticker mockup */}
              <div className={`hidden md:flex items-center gap-6 border-r ${theme.border} pr-6 mr-2`}>
                 <div className={`flex items-center gap-2 text-sm font-mono ${theme.textMuted}`}>
                   <Activity size={16} className="text-green-500 animate-pulse"/> NETWORK: STABLE
                 </div>
                 <div className={`flex items-center gap-2 text-sm font-mono ${theme.textMuted}`}>
                   <Cpu size={16} className="text-blue-500"/> CPU: 12%
                 </div>
              </div>

              {analytics?.totalDistance > 0 && (
                <div className={`hidden md:flex items-center gap-2 ${theme.panelSolid} border ${theme.border} rounded-md px-4 py-1.5 shadow-sm`}>
                  <Database size={16} className="text-cyan-500" />
                  <span className={`text-sm font-mono ${theme.text} tracking-wider`}>DB ONLINE • {analytics.totalDistance}KM</span>
                </div>
              )}
              <div className="bg-green-500/10 px-4 py-1.5 border border-green-500/30 text-xs text-green-600 dark:text-green-400 font-mono tracking-widest flex items-center gap-2 rounded-md font-bold">
                <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></span> SYSTEM ONLINE
              </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-8 z-10 relative">
          {activeTab === 'dashboard' && (
            <div className="max-w-8xl mx-auto space-y-8">
              <div className="flex items-center justify-between">
                 <h2 className="text-3xl font-bold uppercase tracking-widest flex items-center gap-3"><Crosshair className="text-cyan-500"/> Tactical Overview</h2>
                 <span className={`text-sm font-mono ${theme.textMuted} bg-opacity-20 px-3 py-1 rounded border ${theme.border}`}>LIVE FEED ACTIVE</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatCard title="ACTIVE ASSETS" value={Object.keys(vehicles).length} subtext="DEPLOYED" icon={Truck} color="text-cyan-500" theme={theme} />
                <StatCard title="TOTAL SORTIES" value={analytics?.totalTrips || 0} subtext="LOGGED" icon={MapPin} color="text-blue-500" theme={theme} />
                <StatCard title="COVERAGE" value={`${analytics?.totalDistance || 0}k`} subtext="KILOMETERS" icon={CheckCircle} color="text-purple-500" theme={theme} />
                <StatCard 
                  title="THREAT LEVEL" 
                  value={theftAlerts} 
                  subtext={theftAlerts > 0 ? "CRITICAL ALERT" : "NOMINAL"} 
                  icon={theftAlerts > 0 ? Siren : AlertTriangle} 
                  color={theftAlerts > 0 ? "text-red-500 animate-pulse" : "text-emerald-500"} 
                  theme={theme}
                />
              </div>
              
              <div className="tech-border p-8 rounded-lg">
                <h3 className="font-bold mb-6 font-mono text-base text-cyan-600 dark:text-cyan-400 uppercase tracking-wider border-b border-dashed border-gray-700/50 pb-2">Energy Status Array</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {Object.entries(vehicles).map(([id, car]) => (
                    <div key={id} className={`${theme.panel} p-5 border ${theme.border} rounded-lg relative overflow-hidden ${car.status === 'theft' ? 'border-red-500 shadow-red-500/20 shadow-lg' : 'hover:border-cyan-500/50'} transition-all`}>
                      {car.status === 'theft' && <div className="absolute inset-0 bg-red-500/10 z-0 animate-pulse"></div>}
                      <div className="flex justify-between mb-4 relative z-10">
                        <span className={`font-bold text-lg font-mono ${theme.text}`}>{id}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold border ${car.status==='active'?'border-green-500 text-green-500 bg-green-500/10': (car.status==='theft' ? 'border-red-500 text-red-500 bg-red-500/20' : 'border-amber-500 text-amber-500 bg-amber-500/10')}`}>{car.status.toUpperCase()}</span>
                      </div>
                      
                      {/* Enhanced Battery & Electrical Visuals */}
                      <div className="flex justify-between items-end mb-2">
                          <div className={`text-xs font-mono ${theme.textMuted}`}>SoC</div>
                          <div className={`text-xl font-bold font-mono ${car.soc < 30 ? 'text-red-500' : 'text-cyan-500'}`}>{car.soc}%</div>
                      </div>
                      <div className={`w-full ${isDarkMode ? 'bg-zinc-800' : 'bg-slate-200'} h-2 rounded-full mb-4 overflow-hidden`}>
                        <div style={{width:`${car.soc}%`}} className={`h-full rounded-full ${car.soc<30?'bg-red-500':'bg-cyan-500'} transition-all duration-500`}></div>
                      </div>
                      
                      <div className={`grid grid-cols-2 gap-3 text-xs font-mono pt-3 border-t ${theme.border}`}>
                          <div className={`p-2 rounded ${isDarkMode ? 'bg-black/40' : 'bg-slate-100'} border ${theme.border}`}>
                              <span className="text-yellow-600 dark:text-yellow-400 block text-[9px] uppercase mb-1 flex items-center gap-1 font-bold"><Zap size={10}/> Voltage</span>
                              <span className={`${theme.text} font-bold text-sm`}>{car.voltage} V</span>
                          </div>
                          <div className={`p-2 rounded ${isDarkMode ? 'bg-black/40' : 'bg-slate-100'} border ${theme.border}`}>
                              <span className="text-blue-600 dark:text-blue-400 block text-[9px] uppercase mb-1 flex items-center gap-1 font-bold"><Activity size={10}/> Current</span>
                              <span className={`${theme.text} font-bold text-sm`}>{car.current} A</span>
                          </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[400px]">
                <div className="lg:col-span-2 tech-border p-8 flex flex-col rounded-lg">
                  <h3 className="font-bold mb-6 font-mono text-base text-blue-500 uppercase tracking-wider border-b border-dashed border-gray-700/50 pb-2">Weekly Throughput</h3>
                  <div className="flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={analytics?.weekly?.length > 0 ? analytics.weekly : ANALYTICS_DATA}>
                        <CartesianGrid strokeDasharray="3 3" stroke={theme.chartGrid} vertical={false} />
                        <XAxis dataKey="name" stroke={theme.chartText} tick={{fontFamily: 'JetBrains Mono', fontSize: 12}} tickLine={false} axisLine={false} dy={10} />
                        <YAxis stroke={theme.chartText} tick={{fontFamily: 'JetBrains Mono', fontSize: 12}} tickLine={false} axisLine={false} dx={-10} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: isDarkMode ? '#09090b' : '#fff', border: `1px solid ${isDarkMode ? '#333' : '#e2e8f0'}`, borderRadius: '8px', fontFamily: 'JetBrains Mono', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} 
                          itemStyle={{color: isDarkMode ? '#fff' : '#0f172a', fontWeight: 'bold'}} 
                          cursor={{stroke: '#06b6d4', strokeWidth: 1}}
                        />
                        <Line type="monotone" dataKey="trips" stroke="#06b6d4" strokeWidth={3} dot={{r:4, fill: isDarkMode ? '#09090b' : '#fff', stroke:'#06b6d4', strokeWidth: 2}} activeDot={{r:6, fill:'#06b6d4'}} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="tech-border p-8 flex flex-col rounded-lg">
                  <h3 className="font-bold mb-6 font-mono text-base text-amber-500 uppercase tracking-wider border-b border-dashed border-gray-700/50 pb-2">Fleet Readiness</h3>
                  <div className="flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={analytics?.pie?.length > 0 ? analytics.pie : PIE_DATA} innerRadius={70} outerRadius={90} paddingAngle={5} dataKey="value" stroke="none">
                          {analytics?.pie?.length > 0 ? analytics.pie.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />) : PIE_DATA.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: isDarkMode ? '#000' : '#fff', border: `1px solid ${isDarkMode ? '#333' : '#e2e8f0'}`, borderRadius:'4px' }} itemStyle={{color: isDarkMode ? '#fff' : '#000'}}/>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className={`text-center mt-4 flex justify-center gap-6 text-xs font-mono font-bold ${theme.textMuted}`}>
                        <span className="flex items-center gap-2"><div className="w-2.5 h-2.5 bg-cyan-500 rounded-full"></div> ACT</span>
                        <span className="flex items-center gap-2"><div className="w-2.5 h-2.5 bg-amber-500 rounded-full"></div> IDL</span>
                        <span className="flex items-center gap-2"><div className="w-2.5 h-2.5 bg-red-500 rounded-full"></div> MNT</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'map' && (
            <div className="h-full relative tech-border overflow-hidden rounded-lg shadow-xl">
              {/* Ensure map div has height and width and no conflicting styles */}
              <div id="map" ref={mapRef} className={`w-full h-[calc(100vh-140px)] ${isDarkMode ? 'grayscale-[20%] contrast-[1.1]' : ''}`}/>
              
              {/* Floating controls */}
              <div className="absolute top-4 right-4 z-[1000]">
                  <button onClick={()=>setShowPlanModal(true)} className="bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-3 font-bold shadow-lg flex gap-2 rounded-md uppercase tracking-wider items-center backdrop-blur transition-all hover:scale-105">
                    <Plus size={20}/> Initiate Mission
                  </button>
              </div>

              {/* Mission Modal */}
              {showPlanModal && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-center justify-center">
                  <div className={`${theme.panelSolid} w-[500px] border ${theme.border} shadow-2xl transition-opacity duration-200 ${peekModal ? 'opacity-10' : 'opacity-100'} relative rounded-lg overflow-hidden`}>
                    {/* Header Strip */}
                    <div className="h-1.5 w-full bg-gradient-to-r from-cyan-500 to-purple-500"></div>
                    
                    <div className="p-8">
                      <div className="flex justify-between items-center mb-8">
                        <h2 className="text-2xl font-bold font-mono text-cyan-500 uppercase tracking-widest">Mission Parameters</h2>
                        <div className="flex gap-2">
                          <button onClick={openOSMDirections} className={`${theme.textMuted} hover:${theme.text} flex items-center gap-1.5 text-xs ${theme.hover} px-3 py-1.5 border ${theme.border} font-mono rounded transition-colors`}>
                            <ExternalLink size={12} /> SAT LINK
                          </button>
                          <button onMouseEnter={() => setPeekModal(true)} onMouseLeave={() => setPeekModal(false)} className={`${theme.textMuted} hover:${theme.text} flex items-center gap-1.5 text-xs ${theme.hover} px-3 py-1.5 border ${theme.border} font-mono rounded transition-colors`}>
                            <Eye size={12} /> VISUAL
                          </button>
                        </div>
                      </div>

                      {/* AUTO-PILOT TOGGLE */}
                      <div onClick={() => setIsAutoDispatchMode(!isAutoDispatchMode)} className={`cursor-pointer mb-6 p-4 rounded-lg border ${theme.border} flex items-center justify-between transition-all ${isAutoDispatchMode ? 'bg-cyan-500/10 border-cyan-500/50' : isDarkMode ? 'bg-zinc-900/50' : 'bg-slate-50'}`}>
                        <div className="flex items-center gap-3">
                           <div className={`p-2 rounded-full ${isAutoDispatchMode ? 'bg-cyan-500 text-white' : 'bg-gray-500/20 text-gray-500'}`}>
                              <BrainCircuit size={20} className={isAutoDispatchMode ? 'animate-pulse' : ''} />
                           </div>
                           <div>
                              <h4 className={`font-mono font-bold text-sm ${isAutoDispatchMode ? 'text-cyan-500' : theme.textMuted}`}>CORTEX AUTO-PILOT</h4>
                              <p className="text-[10px] opacity-60 font-mono">AI ASSIGNMENT & INSTANT DISPATCH</p>
                           </div>
                        </div>
                        <div className={`w-10 h-5 rounded-full p-0.5 transition-colors duration-300 ${isAutoDispatchMode ? 'bg-cyan-500' : 'bg-gray-600'}`}>
                           <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform duration-300 ${isAutoDispatchMode ? 'translate-x-5' : 'translate-x-0'}`}></div>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <div className="relative">
                          <label className={`text-[10px] ${theme.textMuted} font-mono uppercase absolute -top-2 left-3 ${theme.panelSolid} px-1 font-bold`}>Asset Selection</label>
                          <div className="flex gap-2">
                            <select 
                              className={`flex-1 ${theme.input} border ${theme.border} p-4 text-sm font-mono focus:border-cyan-500 outline-none rounded-md ${isAutoDispatchMode ? 'opacity-50 cursor-not-allowed' : ''}`} 
                              value={selectedDriver} 
                              onChange={(e)=>setSelectedDriver(e.target.value)}
                              disabled={isAutoDispatchMode}
                            >
                              <option value="">{isAutoDispatchMode ? '-- AI CONTROLLED --' : '-- SELECT UNIT --'}</option>
                              {availableVehicles.map((d) => (
                                <option key={d.id} value={d.id} disabled={d.status!=='idle'}>
                                  [{d.id}] {d.statusText} • {d.distToStart}KM PROX
                                </option>
                              ))}
                            </select>
                            {/* NEW: AUTO ASSIGN BUTTON - Hidden in Auto Mode */}
                            {!isAutoDispatchMode && (
                              <button 
                                  onClick={handleAutoAssign}
                                  disabled={isAutoAssigning}
                                  className="bg-purple-600 hover:bg-purple-500 text-white px-4 rounded-md flex items-center justify-center gap-2 shadow-lg font-bold font-mono transition-all"
                                  title="Use AI to find best car"
                              >
                                  {isAutoAssigning ? <Loader2 className="animate-spin" size={16}/> : <ChipIcon size={16}/>}
                                  AI
                              </button>
                            )}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-5">
                           <div className="relative group">
                              <MapPin size={16} className="absolute left-3 top-4 text-cyan-600"/>
                              <input value={startCoords} onChange={e=>setStartCoords(e.target.value)} className={`w-full ${theme.input} border ${theme.border} pl-10 p-4 text-sm font-mono focus:border-cyan-500 outline-none transition-colors rounded-md`} placeholder="LAT, LNG (ALPHA)"/>
                           </div>
                           <div className="relative group">
                              <Radio size={16} className="absolute left-3 top-4 text-purple-600"/>
                              <input value={endCoords} onChange={e=>setEndCoords(e.target.value)} className={`w-full ${theme.input} border ${theme.border} pl-10 p-4 text-sm font-mono focus:border-purple-500 outline-none transition-colors rounded-md`} placeholder="LAT, LNG (BRAVO)"/>
                           </div>
                        </div>
                        
                        <div className="flex gap-4">
                          <button onClick={handleOptimizeRoute} disabled={isRouting || isAutoAssigning} className={`flex-1 ${theme.panel} hover:${theme.hover} text-cyan-500 border border-cyan-500/30 py-3 font-mono text-sm flex justify-center gap-2 items-center transition-all rounded-md font-bold`}>
                            {isRouting || isAutoAssigning ? <Loader2 className="animate-spin" size={16}/> : <Crosshair size={16}/>}
                            {isAutoDispatchMode ? (isRouting || isAutoAssigning ? 'ENGAGING...' : 'AUTO-EXECUTE') : (isRouting ? 'TRIANGULATING...' : 'COMPUTE VECTOR')}
                          </button>
                          {calculatedRoute && !isAutoDispatchMode && (
                            <button onClick={handleAnalyzeTrip} disabled={briefingLoading} className="flex-1 bg-purple-500/10 hover:bg-purple-500/20 text-purple-500 border border-purple-500/30 py-3 font-mono text-sm flex justify-center gap-2 items-center transition-all rounded-md font-bold">
                              {briefingLoading ? <Loader2 className="animate-spin" size={16}/> : <Sparkles size={16}/>}
                              {briefingLoading ? 'ANALYZING...' : 'AI BRIEF'}
                            </button>
                          )}
                        </div>

                        {/* Suggested Charging Stations */}
                        {suggestedStations.length > 0 && (
                          <div className={`p-4 rounded-md border ${theme.border} ${isDarkMode ? 'bg-zinc-800/30' : 'bg-slate-50'}`}>
                            <div className={`text-[10px] font-bold font-mono uppercase ${theme.textMuted} mb-2 flex items-center gap-2`}>
                              <Zap size={12} className="text-yellow-500"/> Power Nodes Detected
                            </div>
                            <div className="space-y-2">
                              {suggestedStations.map(st => (
                                <div key={st.id} className={`flex justify-between items-center text-xs font-mono p-2 rounded ${isDarkMode?'bg-black/40':'bg-white'} border ${theme.border}`}>
                                  <div className="flex items-center gap-2">
                                    <Plug size={14} className="text-green-500"/>
                                    <span className={theme.text}>{st.name}</span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className="text-yellow-500 font-bold">{st.power}kW</span>
                                    <span className="text-green-500 bg-green-500/10 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold">IDLE</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {calculatedRoute && (
                          <div className={`p-5 border rounded-md text-sm space-y-3 ${
                            selectedDriver && parseFloat(getSelectedVehicleRange()) < parseFloat(routeDistance) 
                            ? 'border-red-500/50 bg-red-500/10 text-red-500' 
                            : `border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400`
                          }`}>
                              <div className="flex justify-between font-mono">
                                <span>DISTANCE:</span>
                                <span className="font-bold text-base">{routeDistance} KM</span>
                              </div>
                              {selectedDriver && (
                                <div className={`flex justify-between font-mono pt-2 border-t border-dashed ${isDarkMode ? 'border-zinc-700' : 'border-zinc-300'}`}>
                                  <span>RANGE:</span>
                                  <span className="font-bold text-base">{getSelectedVehicleRange()} KM</span>
                                </div>
                              )}
                              {selectedDriver && parseFloat(getSelectedVehicleRange()) < parseFloat(routeDistance) && (
                                <div className="text-red-500 font-bold pt-2 flex items-center justify-center gap-2 animate-pulse font-mono text-xs">
                                  <AlertTriangle size={14} /> INSUFFICIENT ENERGY RESERVES
                                </div>
                              )}
                          </div>
                        )}
                        
                        {tripBriefing && (
                          <div className="bg-purple-500/10 p-4 border-l-4 border-purple-500 text-xs text-purple-600 dark:text-purple-300 font-mono leading-relaxed rounded-r-md shadow-sm">
                            <strong className="block mb-2 tracking-widest font-bold text-purple-700 dark:text-purple-400">/// CORTEX TACTICAL BRIEF ///</strong>
                            {tripBriefing}
                          </div>
                        )}

                        {!isAutoDispatchMode && (
                          <div className="flex gap-4 pt-4">
                            <button onClick={()=>setShowPlanModal(false)} className={`flex-1 py-4 ${theme.textMuted} hover:${theme.text} ${theme.hover} font-mono uppercase text-xs font-bold rounded-md transition-colors`}>Abort Mission</button>
                            <button onClick={handleAssignTrip} disabled={!calculatedRoute} className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white py-4 font-bold font-mono tracking-widest shadow-lg rounded-md transition-all hover:scale-105">ENGAGE</button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'drivers' && (
            <div className="max-w-8xl mx-auto space-y-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold uppercase tracking-widest flex items-center gap-3"><User size={28} className="text-cyan-500"/> Personnel & Assets</h2>
                <div className="flex items-center gap-4">
                  <div className={`flex ${theme.panelSolid} rounded-lg p-1 border ${theme.border} shadow-sm`}>
                    <button onClick={() => setFleetTab('vehicles')} className={`px-5 py-2 text-xs font-mono font-bold transition-all rounded-md ${fleetTab === 'vehicles' ? 'bg-cyan-600 text-white shadow' : `${theme.textMuted} hover:${theme.text}`}`}>MECHANIZED</button>
                    <button onClick={() => setFleetTab('drivers')} className={`px-5 py-2 text-xs font-mono font-bold transition-all rounded-md ${fleetTab === 'drivers' ? 'bg-cyan-600 text-white shadow' : `${theme.textMuted} hover:${theme.text}`}`}>PERSONNEL</button>
                  </div>
                  {fleetTab === 'drivers' && (
                    <button 
                      onClick={() => setIsAddDriverOpen(true)}
                      className={`${theme.panel} hover:${theme.hover} text-cyan-500 border border-cyan-500/30 px-5 py-2.5 flex items-center gap-2 text-xs font-bold font-mono uppercase tracking-wider transition-all rounded-lg shadow-sm`}
                    >
                      <UserPlus size={16} /> Recruit
                    </button>
                  )}
                </div>
              </div>

              {fleetTab === 'vehicles' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {Object.entries(vehicles).map(([id, car]) => {
                    const assignedDriver = drivers.find(d => d.vehicle === id);
                    const isTheft = car.status === 'theft';
                    return (
                      <div key={id} className={`${theme.panelSolid} border ${isTheft ? 'border-red-500 animate-pulse' : theme.border} p-0 relative overflow-hidden group hover:border-cyan-500/50 transition-colors rounded-lg shadow-sm`}>
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                          {isTheft ? <Siren size={140} className="text-red-500"/> : <Truck size={140} />}
                        </div>
                        {/* Status Bar */}
                        <div className={`h-1.5 w-full ${isTheft ? 'bg-red-500' : (car.status === 'active' ? 'bg-green-500' : 'bg-amber-500')}`}></div>
                        
                        <div className="p-6 relative z-10">
                          <div className="flex justify-between items-start mb-6">
                            <div>
                               <h3 className={`font-bold text-xl ${theme.text} font-mono tracking-wider`}>{id}</h3>
                               <p className={`text-[10px] ${theme.textMuted} uppercase tracking-widest font-bold`}>{car.type || 'MK-1 EV'}</p>
                            </div>
                            {isTheft && <div className="bg-red-600 text-white px-2 py-1 text-[10px] font-bold uppercase animate-bounce rounded">THEFT</div>}
                          </div>

                          <div className="space-y-5">
                            <div>
                              <div className={`flex justify-between text-[10px] mb-1.5 font-mono uppercase font-bold ${theme.textMuted}`}><span>SoC (Charge)</span><span className={car.soc < 20 ? 'text-red-500 blink' : 'text-cyan-500'}>{car.soc}%</span></div>
                              <div className={`w-full ${isDarkMode ? 'bg-zinc-800' : 'bg-slate-200'} h-2.5 rounded-full overflow-hidden`}>
                                <div className={`h-full ${car.soc < 20 ? 'bg-red-500' : 'bg-cyan-500'} transition-all duration-500`} style={{ width: `${car.soc}%` }}></div>
                              </div>
                              <div className={`flex justify-between text-[10px] mt-1.5 ${theme.textMuted} font-mono font-bold`}><span>EST. RANGE</span><span>{car.range} KM</span></div>
                            </div>
                            
                            {/* NEW: Electrical Data Grid */}
                            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                               <div className={`${isDarkMode ? 'bg-black/40' : 'bg-slate-100'} p-3 rounded border ${theme.border}`}>
                                   <span className="text-yellow-600 dark:text-yellow-400 block text-[9px] uppercase mb-1 flex items-center gap-1 font-bold"><Zap size={10}/> Voltage</span>
                                   <span className={`${theme.text} font-bold text-sm`}>{car.voltage} V</span>
                               </div>
                               <div className={`${isDarkMode ? 'bg-black/40' : 'bg-slate-100'} p-3 rounded border ${theme.border}`}>
                                   <span className="text-blue-600 dark:text-blue-400 block text-[9px] uppercase mb-1 flex items-center gap-1 font-bold"><Activity size={10}/> Current</span>
                                   <span className={`${theme.text} font-bold text-sm`}>{car.current} A</span>
                               </div>
                            </div>

                            <div className={`pt-4 border-t ${theme.border} flex items-center gap-4`}>
                              <div className={`w-10 h-10 ${isDarkMode ? 'bg-zinc-800' : 'bg-slate-200'} flex items-center justify-center text-sm font-bold ${theme.textMuted} border ${theme.border} rounded`}>{assignedDriver ? assignedDriver.name.charAt(0) : '?'}</div>
                              <div><p className={`text-sm ${theme.text} font-bold uppercase`}>{assignedDriver ? assignedDriver.name : 'UNMANNED'}</p><p className={`text-[10px] ${theme.textMuted} uppercase font-bold`}>Operator</p></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {fleetTab === 'drivers' && (
                <div className={`${theme.panelSolid} border ${theme.border} overflow-hidden relative rounded-lg shadow-sm`}>
                    <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent"></div>
                  <table className="w-full text-left border-collapse">
                    <thead className={`${isDarkMode ? 'bg-zinc-950' : 'bg-slate-100'} ${theme.textMuted} text-[11px] uppercase tracking-widest font-mono font-bold`}>
                      <tr><th className="p-5">Identity</th><th className="p-5">Unit Assigned</th><th className="p-5">Comms</th><th className="p-5">Service Rec</th><th className="p-5">License ID</th><th className="p-5">Perf. Rating</th><th className="p-5 text-right">Protocol</th></tr>
                    </thead>
                    <tbody className={`divide-y ${theme.border} font-mono text-sm`}>
                      {drivers.map(d => {
                        const carStatus = vehicles[d.vehicle]?.status || 'offline';
                        const isTheft = carStatus === 'theft';
                        return (
                          <tr key={d.id} className={`${theme.hover} transition-colors group`}>
                            <td className="p-5">
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 ${isDarkMode ? 'bg-zinc-800' : 'bg-slate-200'} text-cyan-500 flex items-center justify-center text-sm font-bold border ${theme.border} group-hover:border-cyan-500 transition-colors rounded`}>{d.name.charAt(0)}</div>
                                    <div><div className={`${theme.text} font-bold`}>{d.name}</div><div className={`text-[10px] ${theme.textMuted}`}>{d.id}</div></div>
                                </div>
                            </td>
                            <td className="p-5 text-cyan-600 dark:text-cyan-400 font-bold">{d.vehicle}</td>
                            <td className={`p-5 ${theme.textMuted} text-xs`}>{d.phone || 'N/A'}</td>
                            <td className={`p-5 ${theme.textMuted} text-xs`}>{d.experience || 'N/A'}</td>
                            <td className={`p-5 ${theme.textMuted} text-xs tracking-tight`}>{d.license || '---'}</td>
                            <td className="p-5"><div className="flex items-center gap-1 text-amber-500 font-bold"><span>{d.rating}</span> <span className="text-[10px]">★</span></div></td>
                            <td className="p-5 text-right">
                              <div className="flex items-center gap-3 justify-end">
                                <span className={`inline-flex items-center px-2 py-1 text-[10px] uppercase tracking-wider font-bold border rounded ${
                                  isTheft ? 'border-red-500 text-red-500 animate-pulse bg-red-500/10' :
                                  carStatus === 'active' ? 'border-green-600 text-green-600 bg-green-600/10' : 
                                  `border-gray-500 text-gray-500`
                                }`}>
                                  {isTheft ? 'BREACH' : carStatus}
                                </span>
                                <button 
                                  onClick={() => handleGenerateCoaching(d)} 
                                  className={`${theme.textMuted} hover:text-cyan-500 p-2 ${theme.hover} transition-colors rounded-full`}
                                >
                                  <MessageCircle size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Add Driver Modal */}
              {isAddDriverOpen && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
                  <div className={`${theme.panelSolid} w-full max-w-md border ${theme.border} shadow-2xl relative rounded-lg overflow-hidden`}>
                    <div className="h-1.5 w-full bg-cyan-600"></div>
                    <div className={`p-6 border-b ${theme.border} flex justify-between items-center ${theme.bg}/50`}>
                      <h3 className="text-xl font-bold font-mono text-cyan-500 uppercase tracking-widest">
                        New Operator
                      </h3>
                      <button onClick={() => setIsAddDriverOpen(false)} className={`${theme.textMuted} hover:${theme.text}`}><X size={20}/></button>
                    </div>
                    <form onSubmit={handleAddDriver} className="p-8 space-y-6">
                      <div className="space-y-5">
                          {/* Form Inputs with Tech Styling */}
                          {['name', 'phone', 'experience', 'license'].map((field) => (
                             <div key={field} className="relative group">
                                <label className={`text-[10px] uppercase ${theme.textMuted} font-mono absolute -top-2 left-3 ${theme.panelSolid} px-1 font-bold`}>{field}</label>
                                <input 
                                   type="text" 
                                   required={field === 'name' || field === 'license'}
                                   className={`w-full ${theme.input} border ${theme.border} p-4 text-sm font-mono focus:border-cyan-500 outline-none transition-colors rounded-md`}
                                   placeholder={`ENTER ${field.toUpperCase()}`}
                                   value={newDriver[field]}
                                   onChange={e => setNewDriver({...newDriver, [field]: e.target.value})}
                                />
                             </div>
                          ))}
                          
                          <div className="relative">
                             <label className={`text-[10px] uppercase ${theme.textMuted} font-mono absolute -top-2 left-3 ${theme.panelSolid} px-1 font-bold`}>Assign Unit</label>
                             <select 
                               className={`w-full ${theme.input} border ${theme.border} p-4 text-sm font-mono focus:border-cyan-500 outline-none rounded-md`}
                               value={newDriver.vehicle}
                               onChange={e => setNewDriver({...newDriver, vehicle: e.target.value})}
                             >
                               <option value="">-- NO ASSET --</option>
                               {/* Use filtered unassignedVehicles here */}
                               {Object.keys(vehicles).filter(vid => !drivers.map(d=>d.vehicle).includes(vid)).map(vid => (
                                 <option key={vid} value={vid}>{vid} (AVAILABLE)</option>
                               ))}
                             </select>
                          </div>
                      </div>

                      <div className="pt-2 flex gap-4">
                        <button type="button" onClick={() => setIsAddDriverOpen(false)} className={`flex-1 py-4 ${theme.panel} hover:${theme.hover} text-xs font-mono uppercase ${theme.textMuted} font-bold rounded-md transition-colors`}>Cancel</button>
                        <button type="submit" className="flex-1 py-4 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-mono font-bold uppercase tracking-widest shadow-lg rounded-md transition-all">Confirm Profile</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'trips' && (
            <div className="space-y-8">
              <h2 className="text-3xl font-bold uppercase tracking-widest flex items-center gap-3"><Clock className="text-cyan-500"/> Mission Logs</h2>
              <div className={`${theme.panelSolid} border ${theme.border} overflow-hidden rounded-lg shadow-sm`}>
                 <table className="w-full text-left border-collapse">
                   <thead className={`${isDarkMode ? 'bg-zinc-950' : 'bg-slate-100'} ${theme.textMuted} text-[11px] uppercase font-mono tracking-widest font-bold`}>
                     <tr><th className="py-4 px-6">Log ID</th><th className="py-4 px-6">Asset</th><th className="py-4 px-6">Operator</th><th className="py-4 px-6">Vector</th><th className="py-4 px-6">Result</th></tr>
                   </thead>
                   <tbody className={`divide-y ${theme.border} font-mono text-sm`}>
                     {trips.map(trip => (
                       <tr key={trip.id} className={`${theme.text} ${theme.hover} transition-colors`}>
                         <td className="py-4 px-6 text-cyan-600 dark:text-cyan-400 font-bold">
                            {trip.id}
                            {trip.source === 'CLIENT_APP' && (
                                <span className="ml-2 px-1.5 py-0.5 bg-purple-500/20 text-purple-500 border border-purple-500/30 text-[9px] rounded font-bold uppercase tracking-wide">CLIENT REQ</span>
                            )}
                         </td>
                         <td className="py-4 px-6 font-bold">{trip.driverId}</td>
                         <td className={`py-4 px-6 ${theme.textMuted}`}>{getDriverName(trip.driverId, drivers)}</td>
                         <td className={`py-4 px-6 text-xs ${theme.textMuted}`}>{getLocationName(trip.start)} <span className="text-cyan-500 font-bold">→</span> {getLocationName(trip.end)}</td>
                         <td className="py-4 px-6"><span className={`px-2 py-1 text-[10px] uppercase border rounded font-bold ${trip.status==='Completed'?'border-green-600 text-green-600 bg-green-500/10':'border-blue-500 text-blue-500 bg-blue-500/10'}`}>{trip.status}</span></td>
                       </tr>
                     ))}
                     {mockTrips.map(trip => (
                       <tr key={trip.id} className={`${theme.textMuted} ${theme.hover} opacity-60`}>
                         <td className="py-4 px-6">{trip.id}</td>
                         <td className="py-4 px-6">{trip.vehicle}</td>
                         <td className="py-4 px-6">{getDriverName(trip.vehicle, drivers) !== 'UNMANNED' ? getDriverName(trip.vehicle, drivers) : trip.driver}</td>
                         <td className="py-4 px-6 text-xs">{trip.from} → {trip.to}</td>
                         <td className="py-4 px-6 uppercase text-[10px] font-bold">ARCHIVED</td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
              </div>
            </div>
          )}

          {activeTab === 'ai-advisor' && (
            <div className="max-w-5xl mx-auto space-y-8 pt-12">
              <div className="text-center mb-10">
                <div className="inline-block p-5 rounded-full bg-cyan-500/10 border border-cyan-500 mb-6 animate-pulse">
                   <BrainCircuit size={64} className="text-cyan-500" />
                </div>
                <h2 className="text-5xl font-bold tracking-[0.3em] uppercase">Fleet-<span className="text-cyan-500">AI</span></h2>
                <p className={`${theme.textMuted} font-mono text-sm mt-3 tracking-widest font-bold`}>NEURAL FLEET OPTIMIZATION ENGINE</p>
              </div>
              <FleetAIChat drivers={drivers} apiKey={userApiKey} theme={theme} />
            </div>
          )}
          
          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="max-w-2xl mx-auto pt-12">
               <div className={`tech-border p-10 ${theme.panel} rounded-lg`}>
                  <h2 className="text-3xl font-bold mb-10 flex items-center gap-4 font-mono uppercase tracking-widest text-cyan-500">
                    <Key className="text-amber-500" size={32}/> System Configuration
                  </h2>
                  <form onSubmit={handleSaveKey} className="space-y-8">
                    <div className="relative">
                      <label className="block text-xs text-cyan-600 font-mono uppercase mb-3 tracking-wider font-bold">Neural Uplink Key (Gemini API)</label>
                      <div className="flex gap-3">
                        <input 
                          type="password" 
                          value={userApiKey}
                          onChange={(e) => setUserApiKey(e.target.value)}
                          className={`flex-1 ${theme.input} border ${theme.border} rounded-md p-4 font-mono text-sm focus:border-cyan-500 outline-none transition-all`}
                          placeholder="ENTER SECURE TOKEN"
                        />
                        <div className={`${isDarkMode ? 'bg-zinc-800' : 'bg-slate-200'} p-4 border ${theme.border} flex items-center justify-center rounded-md`}>
                          <div className={`w-3 h-3 rounded-full ${userApiKey ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></div>
                        </div>
                      </div>
                      <p className={`text-[11px] ${theme.textMuted} mt-3 font-mono font-bold`}>REQUIRED FOR AI ADVISOR MODULE & TACTICAL ANALYSIS.</p>
                    </div>
                    <button type="submit" className="w-full bg-cyan-600 hover:bg-cyan-500 text-white py-4 font-bold font-mono uppercase tracking-widest clip-tech shadow-lg transition-all rounded-md">
                      Save Configuration
                    </button>
                  </form>
               </div>
            </div>
          )}
        </div>
      </main>
    </div>
    </>
  );
}