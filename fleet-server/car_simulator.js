const mqtt = require('mqtt');

// --- CONFIGURATION ---
// Connects to the Internal Broker we built in server.js
const BROKER_URL = 'mqtt://127.0.0.1:1884'; 
const UPDATE_INTERVAL = 2000; // Update every 2 seconds

// --- VIRTUAL FLEET ---
// These mimic 4 real cars driving around Chennai
const fleet = [
    { id: 'TN-01-AB-1234', lat: 13.0827, lng: 80.2707, active: false, dest: null, step: 0 },
    { id: 'TN-09-XY-5678', lat: 13.0405, lng: 80.2337, active: false, dest: null, step: 0 },
    { id: 'TN-10-ZZ-9988', lat: 13.0102, lng: 80.2156, active: false, dest: null, step: 0 },
    { id: 'TN-22-MM-1122', lat: 12.9716, lng: 80.2430, active: false, dest: null, step: 0 }
];

// --- CONNECT TO BROKER ---
const client = mqtt.connect(BROKER_URL);

client.on('connect', () => {
    console.log(`✅ Simulator Connected to Broker at ${BROKER_URL}`);
    console.log(`🚗 Simulating ${fleet.length} vehicles...`);
    
    // Subscribe to dispatch instructions for ALL simulated cars
    fleet.forEach(car => {
        client.subscribe(`fleet/v1/dispatch/${car.id}`);
    });
});

client.on('error', (err) => {
    console.error('❌ Simulation Connection Error:', err.message);
});

// --- HANDLE JOB ASSIGNMENTS ---
client.on('message', (topic, message) => {
    const payload = JSON.parse(message.toString());
    const carId = topic.split('/').pop();
    
    if (payload.type === 'JOB_ASSIGNMENT') {
        console.log(`[${carId}] 📩 Received Job: ${payload.tripId}`);
        startTrip(carId, payload.route);
    }
});

// --- SIMULATION LOOP ---
setInterval(() => {
    fleet.forEach(car => {
        // Logic 1: If Active, Drive along the route
        if (car.active && car.route && car.route.length > 0) {
            moveCarAlongRoute(car);
        } else {
            // Logic 2: If Idle, add tiny jitter (GPS noise) so they look "alive"
            car.lat += (Math.random() - 0.5) * 0.0001;
            car.lng += (Math.random() - 0.5) * 0.0001;
        }

        // Logic 3: Battery Drain Simulation
        let battery = 85; // Default
        if (car.active) battery -= 1; // Drain when moving

        // --- PUBLISH TELEMETRY ---
        const payload = JSON.stringify({
            carId: car.id,
            lat: car.lat,
            lng: car.lng,
            status: car.active ? 'active' : 'idle',
            battery: battery,
            type: 'Simulated EV',
            range: 300 + Math.floor(Math.random() * 20)
        });

        client.publish(`fleet/v1/update/${car.id}`, payload);
    });
}, UPDATE_INTERVAL);


// --- HELPER FUNCTIONS ---

function startTrip(carId, route) {
    const car = fleet.find(c => c.id === carId);
    if (car && route && route.length > 0) {
        car.active = true;
        car.route = route;
        car.step = 0;
        console.log(`[${carId}] 🚀 Starting trip with ${route.length} waypoints.`);
    }
}

function moveCarAlongRoute(car) {
    // Simple interpolation: Move to next waypoint
    if (car.step < car.route.length) {
        const target = car.route[car.step];
        
        // Move 20% of the way to the target per tick (smooth animation)
        car.lat += (target.lat - car.lat) * 0.2;
        car.lng += (target.lng - car.lng) * 0.2;

        // Check if close enough to target to switch to next waypoint
        if (Math.abs(target.lat - car.lat) < 0.0005 && Math.abs(target.lng - car.lng) < 0.0005) {
            car.step++;
        }
    } else {
        // Trip Done
        car.active = false;
        console.log(`[${car.id}] 🏁 Trip Completed.`);
    }
}