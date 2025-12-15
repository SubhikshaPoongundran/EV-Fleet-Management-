import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Map as MapIcon, 
  Navigation, 
  Truck, 
  BarChart3, 
  AlertTriangle,
  CheckCircle,
  Clock,
  MapPin,
  Menu,
  Sparkles,
  MessageSquare,
  Send,
  Loader2,
  Plus,
  Zap,
  Eye,
  Database,
  Phone,
  FileBadge,
  Gauge,
  ExternalLink,
  UserPlus,
  User,
  X,
  MessageCircle,
  BrainCircuit
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

// --- Gemini Setup ---
const apiKey = ""; 
const GEMINI_MODEL = "gemini-2.5-flash-preview-09-2025";

const callGemini = async (prompt, systemInstruction = "") => {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          systemInstruction: { parts: [{ text: systemInstruction }] },
        }),
      }
    );
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "No analysis available.";
  } catch (error) { return "Unable to contact FleetCom AI."; }
};

// --- Leaflet Loader ---
let leafletPromise = null;
const loadLeaflet = () => {
  if (window.L) return Promise.resolve(window.L);
  if (!leafletPromise) {
    leafletPromise = new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.async = true;
      script.onload = () => {
        if (window.L) resolve(window.L);
        else reject(new Error('Leaflet loaded but L is undefined'));
      };
      script.onerror = (e) => { leafletPromise = null; reject(e); };
      document.head.appendChild(script);
    });
  }
  return leafletPromise;
};

// --- CONSTANTS ---
const INITIAL_DRIVERS = [
  { id: 'D001', name: 'Rajesh Kumar', vehicle: 'TN-01-AB-1234', rating: 4.8, phone: '+91 98765 43210', experience: '5 Years', license: 'TN012015000123' },
  { id: 'D002', name: 'Priya Sundar', vehicle: 'TN-09-XY-5678', rating: 4.9, phone: '+91 98765 43211', experience: '3 Years', license: 'TN092018000456' },
  { id: 'D003', name: 'Karthik Raja', vehicle: 'TN-10-ZZ-9988', rating: 4.5, phone: '+91 98765 43212', experience: '7 Years', license: 'TN102012000789' },
  { id: 'D004', name: 'Senthil Vel', vehicle: 'TN-22-MM-1122', rating: 4.2, phone: '+91 98765 43213', experience: '2 Years', license: 'TN222019000321' },
  { id: 'D005', name: 'Hardware Pilot', vehicle: 'TN-ESP32-01', rating: 5.0, phone: '+91 99999 88888', experience: '1 Year', license: 'TN322023000999' },
];

const ANALYTICS_DATA = [
  { name: 'Mon', trips: 40 }, { name: 'Tue', trips: 30 }, { name: 'Wed', trips: 55 },
  { name: 'Thu', trips: 45 }, { name: 'Fri', trips: 80 }, { name: 'Sat', trips: 95 }, { name: 'Sun', trips: 60 },
];
const PIE_DATA = [{ name: 'Active', value: 4 }, { name: 'Idle', value: 2 }, { name: 'Maintenance', value: 1 }];
const COLORS = ['#10B981', '#F59E0B', '#EF4444'];

// --- Helpers ---
const getLocationName = (coords) => {
  if (!coords) return 'Unknown';
  const parts = coords.split(',');
  if (parts.length !== 2) return coords;
  const lat = parseFloat(parts[0]).toFixed(3);
  const lng = parseFloat(parts[1]).toFixed(3);
  if (lat === '13.083' && lng === '80.271') return 'Chennai Central';
  if (lat === '13.041' && lng === '80.234') return 'T. Nagar';
  if (lat === '13.010' && lng === '80.216') return 'Guindy Industrial';
  if (lat === '12.972' && lng === '80.243') return 'Adyar Depot';
  return `${lat}, ${lng}`;
};

const getVehicleColor = (id) => {
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f43f5e'];
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

const getDistanceFromLatLonInKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371; 
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
  return parseFloat((R * c).toFixed(1));
};

const LoginScreen = ({ onLogin }) => {
  const [id, setId] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');
  const handleLogin = (e) => {
    e.preventDefault();
    if (id === 'admin' && pass === 'raspberry') onLogin();
    else setError('Invalid Manager ID or Password');
  };
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800 p-8 rounded-xl shadow-2xl w-full max-w-md border border-slate-700">
        <h2 className="text-2xl font-bold text-white text-center mb-6">Fleet Command</h2>
        <form onSubmit={handleLogin} className="space-y-4">
          <input type="text" value={id} onChange={(e) => setId(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white" placeholder="admin" />
          <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white" placeholder="raspberry" />
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg">Access Dashboard</button>
        </form>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, subtext, icon: Icon, color }) => (
  <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
    <div className="flex justify-between items-start">
      <div><p className="text-slate-400 text-sm">{title}</p><h3 className="text-2xl font-bold text-white mt-2">{value}</h3><p className={`text-xs mt-1 ${color}`}>{subtext}</p></div>
      <div className={`p-3 rounded-lg bg-slate-700/50 text-white`}><Icon size={24} /></div>
    </div>
  </div>
);

const FleetAIChat = ({ drivers }) => {
  const [messages, setMessages] = useState([{ role: 'ai', text: 'Hello! I am your FleetCom Advisor. How can I help optimize your operations today?' }]);
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
    const systemContext = `You are a Fleet Management AI. Current Driver Data: ${JSON.stringify(drivers)}`;
    const aiResponse = await callGemini(userMsg, systemContext);
    setMessages(prev => [...prev, { role: 'ai', text: aiResponse }]);
    setLoading(false);
  };
  return (
    <div className="h-[600px] flex flex-col bg-slate-800 rounded-xl border border-slate-700 shadow-xl overflow-hidden">
      <div className="p-4 border-b border-slate-700 bg-slate-900/50 flex justify-between items-center">
        <h3 className="font-bold text-white flex items-center gap-2"><Sparkles className="text-purple-400" size={18} /> FleetCom Advisor</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-lg p-3 text-sm ${m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-200'}`}>{m.text}</div>
          </div>
        ))}
        {loading && <div className="text-slate-400 text-xs ml-4">Thinking...</div>}
        <div ref={endRef} />
      </div>
      <div className="p-4 border-t border-slate-700 bg-slate-900/30 flex gap-2">
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white" placeholder="Ask AI..." />
        <button onClick={handleSend} disabled={loading} className="bg-purple-600 text-white p-2 rounded-lg"><Send size={20} /></button>
      </div>
    </div>
  );
};

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [fleetTab, setFleetTab] = useState('vehicles');

  const [vehicles, setVehicles] = useState({});
  const [trips, setTrips] = useState([]);
  const [drivers, setDrivers] = useState(INITIAL_DRIVERS);
  
  // Data
  const [mockTrips] = useState([
    { id: 'T-5521', vehicle: 'TN-01-AB-1234', from: 'Chennai Central', to: 'T. Nagar', status: 'Completed', time: '10:42 AM' },
    { id: 'T-5520', vehicle: 'TN-09-XY-5678', from: 'Anna Nagar', to: 'Marina Beach', status: 'Completed', time: '09:15 AM' },
  ]);
  const [analytics, setAnalytics] = useState({ weekly: [], pie: [], totalTrips: 0, totalDistance: 0 });

  // Trip Planning
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [peekModal, setPeekModal] = useState(false); 
  const [selectedDriver, setSelectedDriver] = useState('');
  const [startCoords, setStartCoords] = useState('13.0827, 80.2707'); 
  const [endCoords, setEndCoords] = useState('13.0405, 80.2337'); 
  const [calculatedRoute, setCalculatedRoute] = useState(null);
  const [routeDistance, setRouteDistance] = useState(null);
  const [isRouting, setIsRouting] = useState(false);
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  // Driver / AI
  const [isAddDriverOpen, setIsAddDriverOpen] = useState(false);
  const [newDriver, setNewDriver] = useState({ name: '', phone: '', license: '', experience: '', vehicle: '' });
  const [coachingModalOpen, setCoachingModalOpen] = useState(false);
  const [coachingData, setCoachingData] = useState(null);
  const [coachingLoading, setCoachingLoading] = useState(false);
  const [tripBriefing, setTripBriefing] = useState(null);
  const [briefingLoading, setBriefingLoading] = useState(false);

  // Maps
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});
  const polylinesRef = useRef([]);
  const previewPolylineRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);

  // --- HELPER FUNCTION DEFINED AT TOP OF COMPONENT ---
  const getDriverName = (vehicleId) => {
    const driver = drivers.find(d => d.vehicle === vehicleId);
    return driver ? driver.name : 'Unknown Driver';
  };

  // Poll Server
  useEffect(() => {
    if (!isAuthenticated) return;
    const fetchData = async () => {
      try {
        const vRes = await fetch('http://localhost:8080/api/fleet-status');
        const vData = await vRes.json();
        setVehicles(vData);
        const tRes = await fetch('http://localhost:8080/api/trips');
        const tData = await tRes.json();
        setTrips(tData);
        const aRes = await fetch('http://localhost:8080/api/analytics');
        const aData = await aRes.json();
        setAnalytics(aData);
      } catch (e) { }
    };
    const interval = setInterval(fetchData, 1000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // Leaflet Init
  useEffect(() => {
    if (activeTab !== 'map' || !isAuthenticated) return;
    let mounted = true;
    loadLeaflet().then((L) => {
      if (!mounted || mapInstanceRef.current || !mapRef.current) return;
      if (typeof L.map !== 'function') return;

      const map = L.map(mapRef.current).setView([13.0827, 80.2707], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OSM' }).addTo(map);
      mapInstanceRef.current = map;
      setTimeout(() => map.invalidateSize(), 100);
      setMapReady(true);
    }).catch(err => console.error(err));
    return () => { 
      mounted = false; 
      if(mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; markersRef.current = {}; polylinesRef.current = []; setMapReady(false); }
    };
  }, [activeTab, isAuthenticated]);

  // Leaflet Updates
  useEffect(() => {
    if (activeTab !== 'map' || !mapInstanceRef.current || !window.L || !mapReady) return;
    const map = mapInstanceRef.current;
    const L = window.L;

    Object.entries(vehicles).forEach(([id, data]) => {
      const driverName = getDriverName(id);
      const vehicleColor = getVehicleColor(id);
      const popupContent = `<div style="font-family:sans-serif; min-width: 150px;"><div style="display:flex; align-items:center; gap:5px; margin-bottom:5px;"><div style="width:10px; height:10px; border-radius:50%; background-color:${vehicleColor}"></div><b style="font-size: 14px;">${id}</b></div><span style="color: #94a3b8; font-size: 12px;">${driverName}</span><br/><div style="margin-top: 5px;"><span style="color:${data.status==='active'?'#22c55e':'#f59e0b'}; font-weight: bold;">● ${data.status.toUpperCase()}</span><br>🔋 ${data.battery}% | ${data.range}km</div></div>`;
      
      const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${vehicleColor}" stroke="white" stroke-width="2" width="32" height="32" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/></svg>`;

      if (markersRef.current[id]) {
        markersRef.current[id].setLatLng([data.lat, data.lng]).setPopupContent(popupContent);
      } else {
        const icon = L.divIcon({ className: 'custom-car-icon', html: svgIcon, iconSize: [32, 32], iconAnchor: [16, 16], popupAnchor: [0, -16] });
        markersRef.current[id] = L.marker([data.lat, data.lng], { icon }).addTo(map).bindPopup(popupContent);
      }
    });

    polylinesRef.current.forEach(l => l.remove());
    polylinesRef.current = [];
    trips.forEach(t => {
       if (t.status === 'Completed') return; 
       const routeColor = getVehicleColor(t.driverId);
       const l = L.polyline(t.route, { color: routeColor, weight: 5, opacity: 0.9 }).addTo(map);
       l.bindPopup(`Trip: ${t.id}<br>Driver: ${getDriverName(t.driverId)}`);
       polylinesRef.current.push(l);
    });

    if(previewPolylineRef.current) previewPolylineRef.current.remove();
    if(calculatedRoute) {
      const routeColor = isOfflineMode ? '#f97316' : '#22c55e';
      const dash = isOfflineMode ? '15, 15' : '10, 10';
      previewPolylineRef.current = L.polyline(calculatedRoute, { color: routeColor, weight: 4, dashArray: dash }).addTo(map);
      map.fitBounds(previewPolylineRef.current.getBounds(), { padding: [50,50] });
    }
  }, [vehicles, trips, calculatedRoute, activeTab, mapReady, drivers]);

  // --- ROUTING ---
  const handleOptimizeRoute = async () => {
    setIsRouting(true);
    setRouteDistance(null);
    setTripBriefing(null);
    setIsOfflineMode(false);
    const cleanStart = startCoords.replace(/\s/g, '');
    const cleanEnd = endCoords.replace(/\s/g, '');
    const [lat1, lng1] = cleanStart.split(','); 
    const [lat2, lng2] = cleanEnd.split(',');

    if(!lat1 || !lng1 || !lat2 || !lng2 || isNaN(lat1) || isNaN(lng1)) { alert("Invalid Coordinates."); setIsRouting(false); return; }

    const fetchRoute = async (baseUrl) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000); 
      try {
        const url = `${baseUrl}/${lng1},${lat1};${lng2},${lat2}?overview=full&geometries=geojson`;
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        if(!res.ok) throw new Error("API Error");
        const data = await res.json();
        if(data.routes && data.routes.length > 0) {
          setRouteDistance((data.routes[0].distance / 1000).toFixed(1));
          return data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
        }
        throw new Error("No route");
      } catch (err) { clearTimeout(timeoutId); throw err; }
    };

    const generateOfflinePath = () => {
      console.warn("Generating Offline City Grid Path...");
      setIsOfflineMode(true);
      const l1 = parseFloat(lat1), g1 = parseFloat(lng1);
      const l2 = parseFloat(lat2), g2 = parseFloat(lng2);
      const midLat = (l1 + l2) / 2;
      const midLng = (g1 + g2) / 2;
      const gridRoute = [[l1, g1], [l1, midLng], [midLat, midLng], [midLat, g2], [l2, g2]];
      const dist = (Math.abs(l1-l2)*111) + (Math.abs(g1-g2)*111);
      setRouteDistance(dist.toFixed(1));
      setCalculatedRoute(gridRoute);
    };

    try {
      const route = await fetchRoute('https://router.project-osrm.org/route/v1/driving');
      setCalculatedRoute(route);
    } catch (err1) {
      try {
        const brouterUrl = `https://brouter.de/brouter?lonlats=${lng1},${lat1}|${lng2},${lat2}&profile=car-fast&format=geojson`;
        const res = await fetch(brouterUrl);
        if(!res.ok) throw new Error("BRouter Failed");
        const data = await res.json();
        if(data.features?.[0]) {
           setRouteDistance((data.features[0].properties['track-length']/1000).toFixed(1));
           setCalculatedRoute(data.features[0].geometry.coordinates.map(c => [c[1], c[0]]));
        } else throw new Error("No route");
      } catch (err2) {
        generateOfflinePath();
      }
    } finally { setIsRouting(false); }
  };

  const handleAnalyzeTrip = async () => {
    if (!calculatedRoute || !selectedDriver) return;
    setBriefingLoading(true);
    setTripBriefing('');
    const vehicle = vehicles[selectedDriver] || { battery: 100, range: 300, type: 'Unknown' };
    const prompt = `Briefing for trip: ${startCoords} to ${endCoords} (${routeDistance}km). Vehicle: ${selectedDriver} (${vehicle.type}, ${vehicle.battery}% bat). Check range, give safety tips.`;
    const content = await callGemini(prompt, "You are a Logistics AI Assistant.");
    setTripBriefing(content);
    setBriefingLoading(false);
  };

  const handleAssignTrip = async () => {
    if (!selectedDriver || !calculatedRoute) return;
    try {
      const res = await fetch('http://localhost:8080/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driverId: selectedDriver, start: startCoords, end: endCoords, route: calculatedRoute })
      });
      if(res.ok) { setShowPlanModal(false); setCalculatedRoute(null); setRouteDistance(null); setTripBriefing(null); setIsOfflineMode(false); } 
      else { alert("Car is busy!"); }
    } catch (e) { alert("Server Error"); }
  };

  const handleGenerateCoaching = async (driver) => {
    setCoachingModalOpen(true);
    setCoachingData({ driver, content: '' });
    setCoachingLoading(true);
    const prompt = `Performance coaching for ${driver.name}. Rating ${driver.rating}/5, Exp: ${driver.experience}. Short constructive message.`;
    const content = await callGemini(prompt, "You are a Fleet Manager.");
    setCoachingData({ driver, content });
    setCoachingLoading(false);
  };

  const handleAddDriver = (e) => {
    e.preventDefault();
    if (!newDriver.name || !newDriver.license) { alert("Name/License required."); return; }
    const driverToAdd = {
      id: `D00${drivers.length + 1}`,
      name: newDriver.name,
      vehicle: newDriver.vehicle || 'Unassigned',
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
        let statusColor = 'text-green-400';
        let statusText = 'RECOMMENDED';
        if (d.status !== 'idle') { statusColor = 'text-red-400'; statusText = 'BUSY'; } 
        else if (totalReq > d.range) { statusColor = 'text-orange-400'; statusText = 'LOW RANGE'; } 
        else if (distToStart > 10) { statusColor = 'text-yellow-400'; statusText = 'FAR AWAY'; }
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
    if(l1 && g1 && l2 && g2) window.open(`https://www.openstreetmap.org/directions?engine=graphhopper_car&route=${l1}%2C${g1}%3B${l2}%2C${g2}`, '_blank');
  };

  const unassignedVehicles = useMemo(() => {
    const assignedIds = drivers.map(d => d.vehicle);
    return Object.keys(vehicles).filter(vid => !assignedIds.includes(vid));
  }, [vehicles, drivers]);

  if (!isAuthenticated) return <LoginScreen onLogin={() => setIsAuthenticated(true)} />;

  return (
    <div className="flex h-screen bg-slate-900 text-white font-sans overflow-hidden">
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-slate-800 border-r border-slate-700 flex flex-col z-20`}>
        <div className="p-6 border-b border-slate-700 flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg"><Navigation size={24}/></div>{sidebarOpen&&<h1 className="font-bold">FleetCom</h1>}
        </div>
        <nav className="p-4 space-y-2">
           <button onClick={()=>setActiveTab('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg ${activeTab==='dashboard'?'bg-blue-600':'hover:bg-slate-800'}`}><BarChart3 size={20}/>{sidebarOpen&&"Dashboard"}</button>
           <button onClick={()=>setActiveTab('map')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg ${activeTab==='map'?'bg-blue-600':'hover:bg-slate-800'}`}><MapIcon size={20}/>{sidebarOpen&&"Live Map"}</button>
           <button onClick={()=>setActiveTab('drivers')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg ${activeTab==='drivers'?'bg-blue-600':'hover:bg-slate-800'}`}><Truck size={20}/>{sidebarOpen&&"Fleet Mgmt"}</button>
           <button onClick={()=>setActiveTab('trips')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg ${activeTab==='trips'?'bg-blue-600':'hover:bg-slate-800'}`}><Clock size={20}/>{sidebarOpen&&"Trip Logs"}</button>
           <div className="pt-4 border-t border-slate-700 mt-2">
             <button onClick={()=>setActiveTab('ai-advisor')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg ${activeTab==='ai-advisor'?'bg-purple-600':'hover:bg-slate-800'}`}>
               <MessageSquare size={20} className="text-purple-300"/>{sidebarOpen&&<span className="font-medium">AI Advisor</span>}
               {sidebarOpen && <Sparkles size={14} className="ml-auto text-purple-300 animate-pulse" />}
             </button>
           </div>
        </nav>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <header className="bg-slate-800 border-b border-slate-700 p-4 flex justify-between items-center">
          <button onClick={()=>setSidebarOpen(!sidebarOpen)} className="p-2 text-slate-400"><Menu/></button>
          <div className="flex items-center gap-4">
             {analytics.totalDistance > 0 && (
               <div className="hidden md:flex items-center gap-2 bg-slate-900 border border-slate-600 rounded-full px-4 py-2">
                 <Database size={14} className="text-blue-400" />
                 <span className="text-xs font-mono text-slate-300">DB ONLINE • {analytics.totalDistance}km Tracked</span>
               </div>
             )}
             <div className="bg-slate-900 px-4 py-1 rounded-full border border-slate-600 text-xs text-green-400 font-mono">SYSTEM ONLINE</div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-6">
          {activeTab === 'dashboard' && (
            <div className="max-w-7xl mx-auto space-y-6">
              <h2 className="text-2xl font-bold">Fleet Overview (Real-Time DB)</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatCard title="Active Cars" value={Object.keys(vehicles).length} subtext="Live" icon={Truck} color="text-green-400" />
                <StatCard title="Total Trips" value={analytics.totalTrips} subtext="Stored in DB" icon={MapPin} color="text-blue-400" />
                <StatCard title="Total Distance" value={`${analytics.totalDistance} km`} subtext="Fleet Total" icon={CheckCircle} color="text-purple-400" />
                <StatCard title="Avg Battery" value="78%" subtext="Healthy" icon={Zap} color="text-yellow-400" />
              </div>
              
              <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                <h3 className="font-bold mb-4">EV Status</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {Object.entries(vehicles).map(([id, d]) => (
                    <div key={id} className="bg-slate-900 p-4 rounded border border-slate-600">
                      <div className="flex justify-between mb-2"><span className="font-bold text-sm">{id}</span><span className={`text-[10px] px-2 rounded ${d.status==='active'?'bg-green-500/20 text-green-400':'bg-orange-500/20 text-orange-400'}`}>{d.status}</span></div>
                      <div className="text-xs text-slate-400 mb-1">Battery: {d.battery}%</div>
                      <div className="w-full bg-slate-700 h-1.5 rounded-full"><div style={{width:`${d.battery}%`}} className={`h-full rounded-full ${d.battery<30?'bg-red-500':'bg-green-500'}`}></div></div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[300px]">
                <div className="lg:col-span-2 bg-slate-800 p-6 rounded-xl border border-slate-700 flex flex-col">
                  <h3 className="text-lg font-bold mb-4">Weekly Trips (Real Data)</h3>
                  <div className="flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={analytics.weekly.length > 0 ? analytics.weekly : ANALYTICS_DATA}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="name" stroke="#94a3b8" />
                        <YAxis stroke="#94a3b8" />
                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none' }} />
                        <Line type="monotone" dataKey="trips" stroke="#3b82f6" strokeWidth={3} dot={{r:4}} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 flex flex-col">
                  <h3 className="text-lg font-bold mb-4">Fleet Status</h3>
                  <div className="flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={analytics.pie.length > 0 ? analytics.pie : PIE_DATA} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                          {analytics.pie.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'map' && (
            <div className="h-full relative rounded-xl overflow-hidden border border-slate-700">
              <div id="map" ref={mapRef} className="w-full h-full bg-slate-800"/>
              <div className="absolute top-4 right-4 z-[1000]">
                 <button onClick={()=>setShowPlanModal(true)} className="bg-green-600 hover:bg-green-500 text-white px-6 py-3 rounded-full font-bold shadow-lg flex gap-2"><Plus/> New Trip</button>
              </div>
              {showPlanModal && (
                <div className="absolute inset-0 bg-black/60 z-[2000] flex items-center justify-center">
                  <div className={`bg-slate-800 p-8 rounded-xl w-[400px] border border-slate-600 shadow-2xl transition-opacity duration-200 ${peekModal ? 'opacity-10' : 'opacity-100'}`}>
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-xl font-bold">Assign Trip (Smart Sort)</h2>
                      <button 
                        onMouseEnter={() => setPeekModal(true)} 
                        onMouseLeave={() => setPeekModal(false)}
                        className="text-slate-400 hover:text-white flex items-center gap-1 text-xs bg-slate-700 px-2 py-1 rounded"
                      >
                        <Eye size={14} /> Hold to Peek Map
                      </button>
                    </div>
                    <div className="space-y-4">
                      
                      {/* SMART ASSIGN DROPDOWN */}
                      <select className="w-full bg-slate-900 border border-slate-600 p-2 rounded" onChange={(e)=>setSelectedDriver(e.target.value)}>
                        <option value="">-- Recommended Vehicles --</option>
                        {availableVehicles.map((d) => (
                          <option key={d.id} value={d.id} disabled={d.status!=='idle'}>
                            {d.distToStart}km away • {d.id} • {d.statusText}
                          </option>
                        ))}
                      </select>

                      <input value={startCoords} onChange={e=>setStartCoords(e.target.value)} className="w-full bg-slate-900 border border-slate-600 p-2 rounded" placeholder="Start Lat,Lng"/>
                      <input value={endCoords} onChange={e=>setEndCoords(e.target.value)} className="w-full bg-slate-900 border border-slate-600 p-2 rounded" placeholder="End Lat,Lng"/>
                      
                      <button onClick={handleOptimizeRoute} disabled={isRouting} className="w-full bg-blue-600 py-2 rounded font-bold flex justify-center gap-2">
                        {isRouting && <Loader2 className="animate-spin" size={20}/>}
                        {isRouting ? 'Searching...' : 'Calculate Route'}
                      </button>

                      {calculatedRoute && (
                        <div className={`p-3 rounded text-center text-sm space-y-1 ${
                          selectedDriver && parseFloat(getSelectedVehicleRange()) < parseFloat(routeDistance) 
                          ? 'bg-red-500/20 text-red-300 border border-red-500/50' 
                          : 'bg-green-500/20 text-green-300 border border-green-500/50'
                        }`}>
                           <div className="flex justify-between">
                             <span>Trip Distance:</span>
                             <span className="font-bold">{routeDistance} km</span>
                           </div>
                           {selectedDriver && (
                             <div className="flex justify-between border-t border-slate-600/50 pt-1 mt-1">
                               <span>Vehicle Range:</span>
                               <span className="font-bold">{getSelectedVehicleRange()} km</span>
                             </div>
                           )}
                           {selectedDriver && parseFloat(getSelectedVehicleRange()) < parseFloat(routeDistance) && (
                             <div className="text-red-400 font-bold pt-1 flex items-center justify-center gap-1">
                               <AlertTriangle size={14} /> Insufficient Range!
                             </div>
                           )}
                        </div>
                      )}

                      <div className="flex gap-2">
                        <button onClick={()=>setShowPlanModal(false)} className="flex-1 bg-slate-700 py-2 rounded">Cancel</button>
                        <button onClick={handleAssignTrip} disabled={!calculatedRoute} className="flex-1 bg-green-600 py-2 rounded">Assign</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'drivers' && (
            <div className="max-w-6xl mx-auto space-y-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Fleet Management</h2>
                <div className="flex items-center gap-4">
                  <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700">
                    <button onClick={() => setFleetTab('vehicles')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${fleetTab === 'vehicles' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>Vehicles</button>
                    <button onClick={() => setFleetTab('drivers')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${fleetTab === 'drivers' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>Drivers</button>
                  </div>
                  {fleetTab === 'drivers' && (
                    <button 
                      onClick={() => setIsAddDriverOpen(true)}
                      className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold shadow-lg"
                    >
                      <UserPlus size={18} /> Add Driver
                    </button>
                  )}
                </div>
              </div>

              {fleetTab === 'vehicles' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {Object.entries(vehicles).map(([id, car]) => {
                    const assignedDriver = drivers.find(d => d.vehicle === id);
                    return (
                      <div key={id} className="bg-slate-800 rounded-xl border border-slate-700 p-5 shadow-lg relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity"><Truck size={100} /></div>
                        <div className="flex justify-between items-start mb-4 relative z-10">
                          <div><h3 className="font-bold text-lg text-white">{id}</h3><p className="text-xs text-slate-400">{car.type || 'Standard EV'}</p></div>
                          <span className={`px-2 py-1 rounded text-xs font-bold ${car.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{car.status.toUpperCase()}</span>
                        </div>
                        <div className="space-y-4 relative z-10">
                          <div>
                            <div className="flex justify-between text-xs mb-1"><span className="text-slate-400 flex items-center gap-1"><Zap size={12}/> Battery</span><span className={car.battery < 20 ? 'text-red-400 font-bold' : 'text-white'}>{car.battery}%</span></div>
                            <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden"><div className={`h-full rounded-full ${car.battery < 20 ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${car.battery}%` }}></div></div>
                            <div className="flex justify-between text-xs mt-1 text-slate-500"><span>Est. Range</span><span>{car.range} km</span></div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="bg-slate-900/50 p-2 rounded border border-slate-700"><span className="text-slate-500 block mb-1 flex items-center gap-1"><Gauge size={10}/> Odometer</span><span className="text-white font-mono text-sm">{Math.round(car.totalDistance || 0)} km</span></div>
                            <div className="bg-slate-900/50 p-2 rounded border border-slate-700"><span className="text-slate-500 block mb-1 flex items-center gap-1"><Clock size={10}/> Trips</span><span className="text-white font-mono text-sm">{car.tripsCompleted || 0}</span></div>
                          </div>
                          <div className="pt-3 border-t border-slate-700/50 flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">{assignedDriver ? assignedDriver.name.charAt(0) : '?'}</div>
                            <div><p className="text-sm text-white font-medium">{assignedDriver ? assignedDriver.name : 'Unassigned'}</p><p className="text-xs text-slate-500">Authorized Driver</p></div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {fleetTab === 'drivers' && (
                <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-lg">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-900/80 text-slate-400 text-xs uppercase font-semibold">
                      <tr><th className="p-4">Driver Name</th><th className="p-4">Assigned Vehicle</th><th className="p-4">Contact</th><th className="p-4">Experience</th><th className="p-4">License #</th><th className="p-4">Rating</th><th className="p-4 text-right">Actions</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                      {drivers.map(d => {
                        const carStatus = vehicles[d.vehicle]?.status || 'offline';
                        return (
                          <tr key={d.id} className="hover:bg-slate-700/30 transition-colors">
                            <td className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold">{d.name.charAt(0)}</div><div><div className="font-medium text-white">{d.name}</div><div className="text-xs text-slate-500">ID: {d.id}</div></div></div></td>
                            <td className="p-4 font-mono text-sm text-slate-300">{d.vehicle}</td>
                            <td className="p-4 text-sm text-slate-300 flex items-center gap-2"><Phone size={14} className="text-slate-500" /> {d.phone || 'N/A'}</td>
                            <td className="p-4 text-sm text-slate-300">{d.experience || 'N/A'}</td>
                            <td className="p-4 text-sm font-mono text-slate-400 flex items-center gap-2"><FileBadge size={14} /> {d.license || '---'}</td>
                            <td className="p-4"><div className="flex items-center gap-1 text-yellow-400 font-bold"><span>{d.rating}</span> <span className="text-xs">★</span></div></td>
                            <td className="p-4 text-right">
                              <button 
                                onClick={() => handleGenerateCoaching(d)} 
                                className="text-slate-400 hover:text-purple-400 bg-slate-900/50 p-2 rounded-lg transition-colors border border-slate-700 hover:border-purple-500/50 flex items-center gap-2 ml-auto"
                              >
                                <MessageCircle size={16} /> <span className="text-xs">Coach</span>
                              </button>
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
                <div className="absolute inset-0 bg-black/60 z-[2000] flex items-center justify-center p-4">
                  <div className="bg-slate-800 rounded-xl w-full max-w-md border border-slate-700 shadow-2xl flex flex-col">
                    <div className="p-6 border-b border-slate-700 flex justify-between items-center">
                      <h3 className="text-xl font-bold flex items-center gap-2">
                        <UserPlus size={20} className="text-blue-400"/> New Driver Onboarding
                      </h3>
                      <button onClick={() => setIsAddDriverOpen(false)} className="text-slate-400 hover:text-white"><X size={20}/></button>
                    </div>
                    <form onSubmit={handleAddDriver} className="p-6 space-y-4">
                      <div>
                        <label className="block text-sm text-slate-400 mb-1">Full Name</label>
                        <div className="relative">
                          <User className="absolute left-3 top-2.5 text-slate-500" size={16} />
                          <input 
                            type="text" 
                            required
                            className="w-full bg-slate-900 border border-slate-600 rounded-lg py-2 pl-10 pr-4 text-white focus:border-blue-500 focus:outline-none"
                            placeholder="e.g. John Doe"
                            value={newDriver.name}
                            onChange={e => setNewDriver({...newDriver, name: e.target.value})}
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm text-slate-400 mb-1">Phone</label>
                          <input 
                            type="text" 
                            className="w-full bg-slate-900 border border-slate-600 rounded-lg py-2 px-3 text-white focus:border-blue-500 focus:outline-none"
                            placeholder="+91..."
                            value={newDriver.phone}
                            onChange={e => setNewDriver({...newDriver, phone: e.target.value})}
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-slate-400 mb-1">Experience</label>
                          <input 
                            type="text" 
                            className="w-full bg-slate-900 border border-slate-600 rounded-lg py-2 px-3 text-white focus:border-blue-500 focus:outline-none"
                            placeholder="e.g. 4 Years"
                            value={newDriver.experience}
                            onChange={e => setNewDriver({...newDriver, experience: e.target.value})}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm text-slate-400 mb-1">License Number</label>
                        <input 
                          type="text" 
                          required
                          className="w-full bg-slate-900 border border-slate-600 rounded-lg py-2 px-3 text-white focus:border-blue-500 focus:outline-none font-mono"
                          placeholder="TN-XX-202X-XXXXXXX"
                          value={newDriver.license}
                          onChange={e => setNewDriver({...newDriver, license: e.target.value})}
                        />
                      </div>

                      <div>
                        <label className="block text-sm text-slate-400 mb-1">Assign Vehicle (Optional)</label>
                        <select 
                          className="w-full bg-slate-900 border border-slate-600 rounded-lg py-2 px-3 text-white focus:border-blue-500 focus:outline-none"
                          value={newDriver.vehicle}
                          onChange={e => setNewDriver({...newDriver, vehicle: e.target.value})}
                        >
                          <option value="">-- No Vehicle Assigned --</option>
                          {unassignedVehicles.map(vid => (
                            <option key={vid} value={vid}>{vid} (Available)</option>
                          ))}
                        </select>
                        <p className="text-xs text-slate-500 mt-1">Only showing unassigned vehicles.</p>
                      </div>

                      <div className="pt-4 flex gap-3">
                        <button type="button" onClick={() => setIsAddDriverOpen(false)} className="flex-1 py-2.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium transition-colors">Cancel</button>
                        <button type="submit" className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold shadow-lg transition-colors">Create Driver Profile</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Coaching Modal */}
              {coachingModalOpen && (
                <div className="absolute inset-0 bg-black/60 z-[2000] flex items-center justify-center p-4">
                  <div className="bg-slate-800 p-6 rounded-xl w-full max-w-lg border border-slate-600 shadow-2xl flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xl font-bold flex items-center gap-2">
                        <BrainCircuit className="text-purple-400" /> AI Performance Coach
                      </h3>
                      <button onClick={() => setCoachingModalOpen(false)} className="text-slate-400 hover:text-white"><X size={20}/></button>
                    </div>
                    
                    <div className="flex-1 bg-slate-900/50 rounded-lg p-4 border border-slate-700/50 min-h-[150px]">
                      {coachingLoading ? (
                        <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-400">
                          <Loader2 className="animate-spin text-purple-500" size={32} />
                          <span>Analyzing driver metrics...</span>
                        </div>
                      ) : (
                        <div className="prose prose-invert text-sm">
                          <p className="text-slate-300 leading-relaxed whitespace-pre-line">{coachingData?.content}</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-4 flex justify-end">
                      <button onClick={() => setCoachingModalOpen(false)} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium transition-colors">Close</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'trips' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">Trip Logs</h2>
              <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-lg overflow-hidden">
                 <table className="w-full text-left border-collapse">
                   <thead className="bg-slate-900/50 text-slate-400 text-xs uppercase">
                     <tr><th className="py-3 px-4">ID</th><th className="py-3 px-4">Vehicle</th><th className="py-3 px-4">Driver</th><th className="py-3 px-4">Route</th><th className="py-3 px-4">Status</th><th className="py-3 px-4">Time</th></tr>
                   </thead>
                   <tbody>
                     {trips.map(trip => (
                       <tr key={trip.id} className="border-b border-slate-700 text-sm">
                         <td className="py-3 px-4 font-mono text-blue-400">{trip.id}</td>
                         <td className="py-3 px-4 font-bold">{trip.driverId}</td>
                         <td className="py-3 px-4 text-slate-300">{getDriverName(trip.driverId)}</td>
                         <td className="py-3 px-4 text-slate-400">{getLocationName(trip.start)} <span className="text-blue-500">→</span> {getLocationName(trip.end)}</td>
                         <td className="py-3 px-4"><span className={`px-2 py-1 rounded-full text-xs font-bold ${trip.status==='Completed'?'bg-green-500/20 text-green-400':'bg-blue-500/20 text-blue-400'}`}>{trip.status}</span></td>
                         <td className="py-3 px-4 text-slate-400">{new Date(trip.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                       </tr>
                     ))}
                     {mockTrips.map(trip => (
                       <tr key={trip.id} className="border-b border-slate-700 text-sm opacity-60">
                         <td className="py-3 px-4 font-mono">{trip.id}</td>
                         <td className="py-3 px-4 font-bold">{trip.vehicle}</td>
                         <td className="py-3 px-4">{getDriverName(trip.vehicle) !== 'Unknown Driver' ? getDriverName(trip.vehicle) : trip.driver}</td>
                         <td className="py-3 px-4 text-slate-400">{trip.from} <span className="text-slate-600">→</span> {trip.to}</td>
                         <td className="py-3 px-4 text-slate-500">Completed</td>
                         <td className="py-3 px-4 text-slate-500">{trip.time}</td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
              </div>
            </div>
          )}

          {activeTab === 'ai-advisor' && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="text-center mb-4"><h2 className="text-3xl font-bold">FleetCom AI Advisor</h2><p className="text-slate-400">Powered by Gemini.</p></div>
              <FleetAIChat drivers={drivers} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}