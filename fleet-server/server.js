const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const mqtt = require('mqtt');
const aedes = require('aedes')(); 
const net = require('net'); 
const http = require('http');
const ws = require('websocket-stream'); 

const app = express();
app.use(cors());
app.use(express.json());

// --- CONFIGURATION ---
const HTTP_PORT = 8080;       // Admin Dashboard API
const MQTT_TCP_PORT = 1884;   // Hardware (Python/ESP32)
const MQTT_WS_PORT = 8083;    // Driver Dashboard & Client Terminal
const DB_FILE = path.join(__dirname, 'database.json');

const MQTT_TOPIC_LOCATION = 'fleet/ev/location';    // Incoming GPS (Hardware)
const MQTT_TOPIC_REQUESTS = 'fleet/ev/requests';    // Outgoing Jobs (To Driver)
const MQTT_TOPIC_RESPONSES = 'fleet/server/responses'; // Incoming Accept/Reject (From Driver)
const MQTT_TOPIC_CLIENT_REQ = 'ev/fleet/request';   // Incoming Missions (From Client Dash)

// --- 1. START MQTT BROKERS ---

// A. TCP Broker (Hardware)
const tcpServer = net.createServer(aedes.handle);
tcpServer.listen(MQTT_TCP_PORT, function () {
  console.log(`📡 MQTT TCP Broker running on port ${MQTT_TCP_PORT}`);
});

// B. WebSocket Broker (Driver & Client Dash)
const httpServer = http.createServer();
ws.createServer({ server: httpServer }, aedes.handle);
httpServer.listen(MQTT_WS_PORT, function () {
  console.log(`🌐 MQTT WebSocket Broker running on port ${MQTT_WS_PORT}`);
});

// --- C. LIVE CONNECTION TRACKING ---
const connectedClients = new Set();
const INTERNAL_IDS = ['FleetServer_Core']; // IDs to ignore (Internal Simulator)

function logNetworkStatus(action, clientId) {
    const realClients = Array.from(connectedClients).filter(id => !INTERNAL_IDS.includes(id));
    const driverCount = realClients.filter(id => !id.startsWith('client-')).length; 
    const webUserCount = realClients.filter(id => id.startsWith('client-')).length; 

    console.log(`\n---------------------------------------------------`);
    console.log(`${action === 'JOIN' ? '🟢' : '🔴'} ${clientId} ${action === 'JOIN' ? 'Connected' : 'Disconnected'}`);
    console.log(`📊 ACTIVE NODES: ${realClients.length}`);
    console.log(`   ├─ 🚗 Drivers/Hardware: ${driverCount}`);
    console.log(`   ├─ 💻 Web Clients:      ${webUserCount}`);
    console.log(`   └─ 🆔 List:             [ ${realClients.join(', ') || 'None'} ]`);
    console.log(`---------------------------------------------------\n`);
}

aedes.on('client', function (client) {
  if (client) {
    connectedClients.add(client.id);
    if (!INTERNAL_IDS.includes(client.id)) {
        logNetworkStatus('JOIN', client.id);
    }
  }
});

aedes.on('clientDisconnect', function (client) {
  if (client) {
    connectedClients.delete(client.id);
    if (!INTERNAL_IDS.includes(client.id)) {
        logNetworkStatus('LEAVE', client.id);
    }
  }
});

// --- 2. DATABASE STATE ---
// Standardized Station Data (Moved from Frontend to Backend)
const STATIONS = [
  { id: 'TN-CH-01', name: 'Zeon Charging - VR Mall', lat: 13.0844, lng: 80.1917, status: 'Available', power: 60, type: 'DC CCS2' },
  { id: 'TN-CH-02', name: 'Tata Power - Phoenix Marketcity', lat: 12.9915, lng: 80.2180, status: 'Busy', power: 30, type: 'DC Fast' },
  { id: 'TN-CH-03', name: 'Relux - Marina Mall', lat: 12.8260, lng: 80.2190, status: 'Available', power: 120, type: 'DC Ultra' },
  { id: 'TN-CH-04', name: 'Shell Recharge - Porur', lat: 13.0330, lng: 80.1650, status: 'Available', power: 60, type: 'DC CCS2' },
  { id: 'TN-CH-05', name: 'Ather Grid - Nungambakkam', lat: 13.0569, lng: 80.2425, status: 'Busy', power: 7, type: 'AC Type-2' },
  { id: 'TN-CH-06', name: 'Zeon - Nexus Vijaya Mall', lat: 13.0494, lng: 80.2093, status: 'Available', power: 50, type: 'DC Fast' },
  { id: 'TN-CH-07', name: 'Tata Power - Express Avenue', lat: 13.0587, lng: 80.2641, status: 'Available', power: 25, type: 'DC Fast' },
  { id: 'TN-CH-08', name: 'Relux - Grand Galada (Pallavaram)', lat: 12.9691, lng: 80.1472, status: 'Busy', power: 120, type: 'DC Ultra' },
  { id: 'TN-CB-01', name: 'Zeon Charging - Prozone Mall', lat: 11.0548, lng: 76.9941, status: 'Available', power: 50, type: 'DC Fast' },
  { id: 'TN-CB-02', name: 'Tata Power - Brookefields', lat: 11.0118, lng: 76.9628, status: 'Available', power: 30, type: 'DC Fast' },
  { id: 'TN-CB-03', name: 'Relux - Saravanampatti', lat: 11.0797, lng: 76.9997, status: 'Busy', power: 60, type: 'DC CCS2' },
  { id: 'TN-CB-04', name: 'Zeon - Hotel Junior Kuppanna', lat: 11.0168, lng: 76.9558, status: 'Available', power: 24, type: 'DC Fast' },
  { id: 'TN-CB-05', name: 'Ather Grid - RS Puram', lat: 11.0086, lng: 76.9535, status: 'Available', power: 7, type: 'AC Type-2' },
  { id: 'TN-SA-01', name: 'Zeon - Hotel Saravana Bhavan (Salem)', lat: 11.6643, lng: 78.1460, status: 'Available', power: 50, type: 'DC Fast' },
  { id: 'TN-SA-02', name: 'Relux - NH44 Thoppur', lat: 11.9333, lng: 78.0667, status: 'Available', power: 120, type: 'DC Ultra' },
  { id: 'TN-SA-03', name: 'Tata Power - Salem Grand Estancia', lat: 11.6980, lng: 78.1340, status: 'Busy', power: 30, type: 'DC Fast' },
  { id: 'TN-SA-04', name: 'Zeon - A2B Ulundurpet (NH45)', lat: 11.6600, lng: 79.2900, status: 'Available', power: 50, type: 'DC Fast' },
  { id: 'TN-MA-01', name: 'Tata Power - Madurai District Court', lat: 9.9320, lng: 78.1420, status: 'Available', power: 25, type: 'DC Fast' },
  { id: 'TN-MA-02', name: 'Zeon - Amma Unavagam', lat: 9.9252, lng: 78.1198, status: 'Busy', power: 50, type: 'DC CCS2' },
  { id: 'TN-MA-03', name: 'Relux - Hotel Temple City', lat: 9.9530, lng: 78.1560, status: 'Available', power: 60, type: 'DC Fast' },
  { id: 'TN-TR-01', name: 'Zeon - SRM Hotel', lat: 10.7870, lng: 78.6860, status: 'Available', power: 50, type: 'DC Fast' },
  { id: 'TN-TR-02', name: 'Tata Power - Femina Shopping Mall', lat: 10.8120, lng: 78.6880, status: 'Busy', power: 30, type: 'DC Fast' },
  { id: 'TN-TI-01', name: 'Zeon - Hotel Aryaas', lat: 8.7139, lng: 77.7567, status: 'Available', power: 50, type: 'DC Fast' },
  { id: 'TN-TI-02', name: 'Relux - NH44 Kayathar', lat: 8.9500, lng: 77.7800, status: 'Available', power: 120, type: 'DC Ultra' }
];

let db = {
    vehicles: {
        'TN-01-AB-1234': { lat: 13.0827, lng: 80.2707, status: 'idle', battery: 85, range: 320, type: 'Sedan EV', totalDistance: 120, tripsCompleted: 14, rating: 4.8 },
        'TN-09-XY-5678': { lat: 13.0405, lng: 80.2337, status: 'idle', battery: 62, range: 240, type: 'SUV EV', totalDistance: 95, tripsCompleted: 8, rating: 4.9 },
        'TN-10-ZZ-9988': { lat: 13.0102, lng: 80.2156, status: 'idle', battery: 45, range: 180, type: 'Van EV', totalDistance: 210, tripsCompleted: 22, rating: 4.5 },
        'TN-22-MM-1122': { lat: 12.9716, lng: 80.2430, status: 'idle', battery: 100, range: 400, type: 'Sedan EV', totalDistance: 45, tripsCompleted: 5, rating: 5.0 }
    },
    trips: [], 
    activeTrips: [] 
};

// Load DB
if (fs.existsSync(DB_FILE)) {
    try {
        const fileData = JSON.parse(fs.readFileSync(DB_FILE));
        db = { ...db, ...fileData, vehicles: { ...db.vehicles, ...fileData.vehicles } };
        console.log("📂 Database loaded.");
    } catch (e) { console.error("DB Init Error, using defaults."); }
}
function saveDB() { fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2)); }

// --- 3. SERVER MQTT CLIENT ---
const mqttClient = mqtt.connect(`mqtt://127.0.0.1:${MQTT_TCP_PORT}`, { clientId: 'FleetServer_Core' });

mqttClient.on('connect', () => {
    console.log(`✅ Server Core connected to Internal Broker`);
    mqttClient.subscribe(MQTT_TOPIC_LOCATION);
    mqttClient.subscribe(MQTT_TOPIC_RESPONSES);
    mqttClient.subscribe(MQTT_TOPIC_CLIENT_REQ); 
});

mqttClient.on('message', (topic, message) => {
    try {
        const payload = JSON.parse(message.toString());
        if (topic === MQTT_TOPIC_LOCATION) handleLocationUpdate(payload);
        if (topic === MQTT_TOPIC_RESPONSES) handleDriverResponse(payload);
        if (topic === MQTT_TOPIC_CLIENT_REQ) handleClientMission(payload); 
    } catch (e) { console.error("MQTT Error:", e.message); }
});

// --- LOGIC HANDLERS ---

function handleClientMission(data) {
    console.log(`[Client] Incoming Mission Request from ${data.client.name}`);
    
    // 1. Extract Data
    const startLat = parseFloat(data.route.origin.lat);
    const startLng = parseFloat(data.route.origin.lng);
    const endLat = parseFloat(data.route.destination.lat);
    const endLng = parseFloat(data.route.destination.lng);
    const fare = data.route.fare;
    
    // 2. Run Auto-Assign Algorithm
    let bestCandidate = null;
    let bestScore = Infinity;
    const W_DIST = 2.0, W_BATT = 0.5;

    Object.entries(db.vehicles).forEach(([id, car]) => {
        if (car.status !== 'idle' && car.status !== 'ONLINE') return;
        
        const dist = getDistance(startLat, startLng, car.lat, car.lng);
        const score = (dist * W_DIST) + ((100 - car.battery) * W_BATT);

        if (score < bestScore) {
            bestScore = score;
            bestCandidate = { id, ...car };
        }
    });

    if (bestCandidate) {
        console.log(`[System] Auto-Assigned ${bestCandidate.id} to Client ${data.client.name}`);
        
        // 3. Create Trip in DB
        const jobId = 'JOB-' + Date.now().toString().slice(-4);
        const newTrip = {
            id: jobId,
            driverId: bestCandidate.id,
            start: `${startLat},${startLng}`,
            end: `${endLat},${endLng}`,
            status: 'Requesting',
            startTime: new Date().toISOString(),
            clientName: data.client.name,
            isAutoAllocated: true,
            source: 'CLIENT_APP',
            route: [[startLat, startLng], [endLat, endLng]]
        };
        
        db.activeTrips.push(newTrip);
        db.vehicles[bestCandidate.id].status = 'busy'; 
        saveDB();

        // 4. Dispatch to Driver
        const driverPayload = {
            jobId,
            customerName: data.client.name,
            pickupAddress: `Lat: ${startLat.toFixed(3)}`,
            dropAddress: `Lat: ${endLat.toFixed(3)}`,
            pickupLat: startLat,
            pickupLng: startLng,
            dropLat: endLat,
            dropLng: endLng,
            fare: fare
        };

        mqttClient.publish(MQTT_TOPIC_REQUESTS, JSON.stringify(driverPayload));
    } else {
        console.log(`[System] No drivers available for Client ${data.client.name}`);
    }
}

function handleLocationUpdate(data) {
    const { id, lat, lng, status, battery } = data;
    if (!id || typeof lat !== 'number' || typeof lng !== 'number') return;

    if (!db.vehicles[id]) {
        console.log(`[New Asset] Registered: ${id}`);
        db.vehicles[id] = { lat, lng, status: 'idle', battery: battery || 100, range: 300, type: 'Live Unit', totalDistance: 0, tripsCompleted: 0 };
    }

    const car = db.vehicles[id];
    car.lat = lat; car.lng = lng;
    if (status === 'ONLINE') car.status = 'idle';
    if (status === 'OFFLINE') car.status = 'offline';
    if (status === 'BUSY') car.status = 'active';
    car.lastUpdate = Date.now();
    saveDB();
}

function handleDriverResponse(data) {
    if (data.msg_type === 'ACCEPT') {
        console.log(`[Dispatch] Driver ${data.driverId} ACCEPTED Job ${data.jobId}`);
        if (db.vehicles[data.driverId]) db.vehicles[data.driverId].status = 'active';
        const trip = db.activeTrips.find(t => t.id === data.jobId);
        if (trip) { 
            trip.status = 'Accepted'; 
            trip.acceptedAt = Date.now();
            saveDB(); 
        }
    }
}

function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; 
    const dLat = (lat2 - lat1) * (Math.PI/180);
    const dLon = (lon2 - lon1) * (Math.PI/180); 
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * (Math.PI/180)) * Math.cos(lat2 * (Math.PI/180)) * Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    return R * c;
}

// --- API ---
app.post('/api/auto-assign', (req, res) => {
    const { startCoords, tripDistance } = req.body;
    if (!startCoords || !tripDistance) return res.status(400).json({ error: "Missing Data" });
    const [startLat, startLng] = startCoords.split(',').map(Number);
    
    let bestCandidate = null, bestScore = Infinity;
    const W_DIST = 2.0, W_BATT = 0.5;

    Object.entries(db.vehicles).forEach(([id, car]) => {
        if (car.status !== 'idle' && car.status !== 'ONLINE') return; 
        const dist = getDistance(startLat, startLng, car.lat, car.lng);
        const score = (dist * W_DIST) + ((100 - car.battery) * W_BATT);
        if (score < bestScore) { bestScore = score; bestCandidate = { id, ...car, distanceToPickup: dist }; }
    });

    if (bestCandidate) res.json({ success: true, vehicle: bestCandidate });
    else res.status(404).json({ success: false });
});

app.post('/api/trips', (req, res) => {
    const { driverId, start, end, route } = req.body;
    if (!db.vehicles[driverId]) return res.status(404).json({error: "Driver not found"});

    const jobId = 'JOB-' + Date.now().toString().slice(-4);
    const newTrip = { id: jobId, driverId, start, end, route, status: 'In Progress', startTime: new Date().toISOString() };
    
    db.activeTrips.push(newTrip);
    db.vehicles[driverId].status = 'active'; 
    saveDB();

    const [pickupLat, pickupLng] = start.split(',').map(Number);
    const [dropLat, dropLng] = end.split(',').map(Number);

    mqttClient.publish(MQTT_TOPIC_REQUESTS, JSON.stringify({
        jobId, customerName: "Admin Dispatch",
        pickupAddress: `Lat: ${pickupLat.toFixed(3)}`, dropAddress: `Lat: ${dropLat.toFixed(3)}`,
        pickupLat, pickupLng, dropLat, dropLng, fare: "$25.00"
    }));
    
    res.json({ success: true, jobId });
});

app.get('/api/fleet-status', (req, res) => res.json(db.vehicles));
app.get('/api/trips', (req, res) => res.json([...db.activeTrips, ...db.trips.slice(-10).reverse()]));
app.get('/api/analytics', (req, res) => {
    res.json({
        totalTrips: db.trips.length + db.activeTrips.length,
        totalDistance: Object.values(db.vehicles).reduce((acc, v) => acc + (v.totalDistance || 0), 0).toFixed(1),
        weekly: [], pie: []
    });
});

// NEW: Endpoint to serve station data
app.get('/api/stations', (req, res) => {
    res.json(STATIONS);
});

// --- 4. REALISTIC PHYSICS SIMULATOR ---
const SIM_TICK = 1000; 
const SIM_SPEED_KMPH = 60; 
const METERS_PER_TICK = (SIM_SPEED_KMPH * 1000 / 3600) * (SIM_TICK / 1000); 

const simState = {}; 

setInterval(() => {
    // Only simulate the known dummy cars
    const DUMMY_CARS = ['TN-01-AB-1234', 'TN-09-XY-5678', 'TN-10-ZZ-9988', 'TN-22-MM-1122'];

    DUMMY_CARS.forEach(carId => {
        const car = db.vehicles[carId];
        if (!car) return;

        if (!simState[carId]) simState[carId] = { routeIndex: 0, currentJobId: null };
        const state = simState[carId];

        const activeJob = db.activeTrips.find(t => t.driverId === carId && t.status !== 'Completed');

        if (activeJob) {
            if (state.currentJobId !== activeJob.id) {
                console.log(`[Sim] ${carId} starting job ${activeJob.id}`);
                state.currentJobId = activeJob.id;
                state.routeIndex = 0;
            }

            const route = activeJob.route; 
            if (route && route.length > 0) {
                car.status = 'active'; 

                const target = route[state.routeIndex];
                const tLat = Array.isArray(target) ? target[0] : target.lat;
                const tLng = Array.isArray(target) ? target[1] : target.lng;

                const distToNext = getDistance(car.lat, car.lng, tLat, tLng) * 1000; 

                if (distToNext <= METERS_PER_TICK) {
                    car.lat = tLat;
                    car.lng = tLng;
                    state.routeIndex++;

                    if (state.routeIndex >= route.length) {
                        console.log(`✅ [Sim] ${carId} COMPLETED Job ${activeJob.id}`);
                        activeJob.status = 'Completed';
                        activeJob.endTime = new Date().toISOString();
                        
                        db.trips.push(activeJob);
                        db.activeTrips = db.activeTrips.filter(t => t.id !== activeJob.id);
                        
                        car.status = 'idle';
                        car.tripsCompleted = (car.tripsCompleted || 0) + 1;
                        state.currentJobId = null;
                        state.routeIndex = 0;
                        saveDB();
                    }
                } else {
                    const ratio = METERS_PER_TICK / distToNext;
                    car.lat += (tLat - car.lat) * ratio;
                    car.lng += (tLng - car.lng) * ratio;
                    
                    car.battery = Math.max(0, car.battery - 0.02);
                    car.totalDistance += (METERS_PER_TICK / 1000);
                }
            }
        } else {
            car.status = 'idle';
            car.lat += (Math.random() - 0.5) * 0.00005;
            car.lng += (Math.random() - 0.5) * 0.00005;
            if (car.battery < 100) car.battery = Math.min(100, car.battery + 0.05);
        }

        const payload = JSON.stringify({
            id: carId, lat: car.lat, lng: car.lng,
            status: car.status, battery: Math.floor(car.battery),
            range: Math.floor((car.battery/100)*300)
        });
        mqttClient.publish(MQTT_TOPIC_LOCATION, payload);
    });
}, SIM_TICK);

app.listen(HTTP_PORT, '0.0.0.0', () => {
    console.log(`🚀 Admin API running on Port ${HTTP_PORT}`);
});