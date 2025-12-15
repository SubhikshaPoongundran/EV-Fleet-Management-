const http = require('http');

const SERVER_HOST = '127.0.0.1'; 
const SERVER_PORT = 8080;

// Fleet State
// cars now have 'job' (the route) and 'jobIndex' (progress along route)
const fleet = [
    { id: 'TN-01-AB-1234', lat: 13.0827, lng: 80.2707, status: 'idle', battery: 85, job: null, jobIndex: 0 },
    { id: 'TN-09-XY-5678', lat: 13.0405, lng: 80.2337, status: 'idle', battery: 62, job: null, jobIndex: 0 },
    { id: 'TN-10-ZZ-9988', lat: 13.0102, lng: 80.2156, status: 'idle', battery: 45, job: null, jobIndex: 0 },
    { id: 'TN-22-MM-1122', lat: 12.9716, lng: 80.2430, status: 'idle', battery: 100, job: null, jobIndex: 0 }
];

// Helper: Calculate distance between two points
function getDistance(lat1, lon1, lat2, lon2) {
    return Math.sqrt(Math.pow(lat2 - lat1, 2) + Math.pow(lon2 - lon1, 2));
}

// 1. POLL FOR JOBS
function checkServerForJobs() {
    fleet.forEach(car => {
        if (car.status === 'idle') {
            http.get(`http://${SERVER_HOST}:${SERVER_PORT}/api/simulation/task/${car.id}`, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const response = JSON.parse(data);
                        if (response.hasJob) {
                            console.log(`\n🚨 [${car.id}] RECEIVED NEW MISSION! Starting drive...`);
                            car.job = response.route; // Array of [lat, lng]
                            car.jobIndex = 0;
                            car.status = 'active';
                        }
                    } catch (e) {}
                });
            }).on('error', () => {});
        }
    });
}

// 2. SIMULATION LOOP
function updateFleet() {
    fleet.forEach(car => {
        
        if (car.status === 'active' && car.job) {
            // --- DRIVING LOGIC ---
            const target = car.job[car.jobIndex]; // Target [lat, lng]
            
            // Move towards target
            // We use a simple interpolation (move 10% of the way there per tick)
            // In a real game engine you'd use speed * time
            const step = 0.2; // Speed factor
            
            car.lat += (target[0] - car.lat) * step;
            car.lng += (target[1] - car.lng) * step;
            
            // Check if we reached the waypoint
            const dist = getDistance(car.lat, car.lng, target[0], target[1]);
            if (dist < 0.0001) {
                car.jobIndex++; // Next waypoint
            }

            // Check if Trip Complete
            if (car.jobIndex >= car.job.length) {
                console.log(`\n✅ [${car.id}] MISSION COMPLETE. Returning to Idle.`);
                car.status = 'idle';
                car.job = null;
                car.jobIndex = 0;
            }
            
            // Battery Drain
            car.battery = Math.max(0, car.battery - 0.05);

        } else if (car.status === 'idle') {
            // --- IDLE JITTER ---
            // Just vibrate slightly to show connection is alive
            car.lat += (Math.random() - 0.5) * 0.00001;
            car.lng += (Math.random() - 0.5) * 0.00001;
            // Charge battery slowly while idle
            car.battery = Math.min(100, car.battery + 0.1);
        }

        // --- REPORT TO SERVER ---
        const postData = JSON.stringify({
            carId: car.id,
            lat: car.lat,
            lng: car.lng,
            status: car.status,
            battery: car.battery.toFixed(1),
            range: Math.floor((car.battery / 100) * 400),
            type: 'EV Sedan'
        });

        const req = http.request({
            hostname: SERVER_HOST,
            port: SERVER_PORT,
            path: '/api/update-location',
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) }
        });
        
        req.on('error', () => {}); 
        req.write(postData);
        req.end();
    });
}

// Loops
setInterval(updateFleet, 500); // Drive/Update every 500ms
setInterval(checkServerForJobs, 2000); // Check for assignments every 2s

console.log("🤖 Autonomous Fleet Simulator Running...");
console.log("   - Cars are IDLE. Waiting for assignments from Dashboard...");