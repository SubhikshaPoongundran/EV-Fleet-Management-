const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const app = express();

app.use(cors());
app.use(express.json());

// --- FILE-BASED DATABASE SYSTEM ---
const DB_FILE = path.join(__dirname, 'database.json');

// Helper to generate fake history for analytics
function generateHistory() {
    const history = [];
    const now = Date.now();
    const dayMillis = 24 * 60 * 60 * 1000;
    
    // Generate 50 random trips over last 7 days
    for (let i = 0; i < 50; i++) {
        const timeOffset = Math.floor(Math.random() * 7 * dayMillis);
        history.push({
            id: `HIST-${1000 + i}`,
            driverId: ['TN-01-AB-1234', 'TN-09-XY-5678', 'TN-10-ZZ-9988', 'TN-22-MM-1122'][Math.floor(Math.random()*4)],
            startTime: new Date(now - timeOffset).toISOString(),
            status: 'Completed',
            distance: (Math.random() * 20).toFixed(1)
        });
    }
    return history;
}

// Initial Default State
let db = {
    vehicles: {
        'TN-01-AB-1234': { lat: 13.0827, lng: 80.2707, status: 'idle', battery: 85, range: 320, type: 'Sedan EV', totalDistance: 120, tripsCompleted: 14 },
        'TN-09-XY-5678': { lat: 13.0405, lng: 80.2337, status: 'idle', battery: 62, range: 240, type: 'SUV EV', totalDistance: 95, tripsCompleted: 8 },
        'TN-10-ZZ-9988': { lat: 13.0102, lng: 80.2156, status: 'idle', battery: 45, range: 180, type: 'Van EV', totalDistance: 210, tripsCompleted: 22 },
        'TN-22-MM-1122': { lat: 12.9716, lng: 80.2430, status: 'idle', battery: 100, range: 400, type: 'Sedan EV', totalDistance: 45, tripsCompleted: 5 },
        'TN-ESP32-01': { lat: 13.0827, lng: 80.2707, status: 'idle', battery: 100, range: 300, type: 'Hardware Node', totalDistance: 0, tripsCompleted: 0 }
    },
    trips: generateHistory(), // Seed with history
    activeTrips: [] 
};

// Load DB from disk if exists
if (fs.existsSync(DB_FILE)) {
    try {
        const raw = fs.readFileSync(DB_FILE);
        const savedData = JSON.parse(raw);
        db = { ...db, ...savedData, vehicles: { ...db.vehicles, ...savedData.vehicles } };
        console.log("📂 Database loaded.");
    } catch (e) { console.error("Error reading DB, using defaults."); }
}

function saveDB() {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

let pendingAssignments = {}; 

// --- ENDPOINTS ---

app.post('/api/update-location', (req, res) => {
    const { carId, lat, lng, status, battery, range, type } = req.body;
    
    if (!db.vehicles[carId]) {
        db.vehicles[carId] = { 
            lat, lng, status, battery: battery || 100, range: range || 300, 
            type: type || 'Real Node', totalDistance: 0, tripsCompleted: 0, lastUpdate: Date.now() 
        };
    } else {
        const car = db.vehicles[carId];
        if (car.lat && (car.lat !== lat || car.lng !== lng)) car.totalDistance += 0.05;
        db.vehicles[carId] = { ...car, lat, lng, status, battery: battery ?? car.battery, range: range ?? car.range, lastUpdate: Date.now() };
    }

    if (status === 'idle' && !pendingAssignments[carId]) {
        const tripIndex = db.activeTrips.findIndex(t => t.driverId === carId);
        if (tripIndex !== -1) {
            const completedTrip = db.activeTrips[tripIndex];
            completedTrip.status = 'Completed';
            completedTrip.endTime = new Date().toISOString();
            db.trips.push(completedTrip);
            db.activeTrips.splice(tripIndex, 1);
            if(db.vehicles[carId]) db.vehicles[carId].tripsCompleted++;
            saveDB();
        }
    }
    res.send({ success: true });
});

app.get('/api/fleet-status', (req, res) => res.json(db.vehicles));

app.post('/api/trips', (req, res) => {
    const newTrip = req.body;
    if (db.vehicles[newTrip.driverId]?.status === 'active') return res.status(400).json({ error: 'Car is busy!' });

    newTrip.id = 'TRIP-' + Date.now().toString().slice(-6);
    newTrip.status = 'In Progress';
    newTrip.startTime = new Date().toISOString(); // Timestamp added here
    
    db.activeTrips.push(newTrip);
    pendingAssignments[newTrip.driverId] = newTrip.route; 
    if(db.vehicles[newTrip.driverId]) db.vehicles[newTrip.driverId].status = 'active';

    saveDB();
    res.json(newTrip);
});

app.get('/api/simulation/task/:carId', (req, res) => {
    const { carId } = req.params;
    if (pendingAssignments[carId]) {
        const route = pendingAssignments[carId];
        delete pendingAssignments[carId]; 
        return res.json({ hasJob: true, route });
    }
    res.json({ hasJob: false });
});

// Return active trips + last 20 history
app.get('/api/trips', (req, res) => {
    const history = db.trips.slice(-20).reverse();
    res.json([...db.activeTrips, ...history]);
});

app.get('/api/analytics', (req, res) => {
    // Initialize standard week
    const weeklyData = [
        { name: 'Mon', trips: 0 }, { name: 'Tue', trips: 0 }, { name: 'Wed', trips: 0 },
        { name: 'Thu', trips: 0 }, { name: 'Fri', trips: 0 }, { name: 'Sat', trips: 0 }, { name: 'Sun', trips: 0 }
    ];
    
    // Process real data
    const allTrips = [...db.trips, ...db.activeTrips];
    allTrips.forEach(t => {
        if(!t.startTime) return;
        const date = new Date(t.startTime);
        const day = date.getDay(); // 0=Sun, 1=Mon
        // Adjust to 0=Mon, 6=Sun array index
        const index = day === 0 ? 6 : day - 1;
        if(weeklyData[index]) weeklyData[index].trips++;
    });

    const statusCounts = { Active: 0, Idle: 0, Maintenance: 0 };
    Object.values(db.vehicles).forEach(v => {
        const s = v.status.charAt(0).toUpperCase() + v.status.slice(1);
        if(statusCounts[s] !== undefined) statusCounts[s]++;
        else statusCounts['Maintenance']++;
    });
    const pieData = Object.keys(statusCounts).map(k => ({ name: k, value: statusCounts[k] }));

    res.json({
        weekly: weeklyData,
        pie: pieData,
        totalTrips: allTrips.length,
        totalDistance: Object.values(db.vehicles).reduce((acc, v) => acc + (v.totalDistance || 0), 0).toFixed(1)
    });
});

const PORT = 8080;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Fleet Server running on Port ${PORT}`);
});