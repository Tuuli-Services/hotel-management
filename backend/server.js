// backend/server.js
const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Parser } = require('json2csv');

// --- Initialize Express App ---
// IMPORTANT: Define 'app' *before* using it for middleware or routes
const app = express();

// --- Constants ---
const PORT = process.env.PORT || 5001;
// !! SECURITY WARNING: Store your JWT secret securely (e.g., environment variable), not hardcoded !!
const JWT_SECRET = process.env.JWT_SECRET || 'your_very_secret_key_replace_this';

// --- In-Memory Data Store (Replace with a Database) ---
let users = [];
let guests = [];
let rooms = [
    { id: '101', type: 'Single', status: 'Available', rate: 100 },
    { id: '102', type: 'Single', status: 'Available', rate: 100 },
    { id: '201', type: 'Double', status: 'Available', rate: 150 },
    { id: '202', type: 'Double', status: 'Occupied', rate: 150 }, // Example occupied
    { id: '301', type: 'Suite', status: 'Available', rate: 250 },
];

// --- Helper: Add a default user (ONLY FOR DEV/TESTING) ---
const initializeDefaultUser = async () => {
    const email = 'reception@hotel.com';
    // Check if user already exists by email OR if users array is empty (first run)
    if (users.length === 0 || !users.some(u => u.email === email)) {
        try {
            const hashedPassword = await bcrypt.hash('password123', 10);
            users.push({
                id: uuidv4(),
                email: email,
                phone: null,
                password: hashedPassword,
                role: 'receptionist'
            });
            console.log(`Default user created/ensured: ${email} / password123`);
        } catch (hashError) {
            console.error("Error hashing default password:", hashError);
        }
    }
};
initializeDefaultUser(); // Run this on server start

// --- Core Middleware ---
app.use(cors());        // Enable Cross-Origin Resource Sharing
app.use(express.json()); // Middleware to parse JSON request bodies

// --- Authentication Middleware ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer TOKEN"

    if (token == null) {
        console.log("Auth middleware: No token provided");
        return res.status(401).json({ message: 'Authentication token required' }); // Unauthorized
    }

    jwt.verify(token, JWT_SECRET, (err, userPayload) => {
        if (err) {
            console.log("Auth middleware: Invalid token:", err.message);
            // Differentiate between expired and invalid tokens if needed
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ message: 'Token expired' });
            }
            return res.status(403).json({ message: 'Invalid token' }); // Forbidden
        }
        // Token is valid, attach user payload to the request object
        req.user = userPayload;
        console.log(`Auth middleware: Token verified for user ${userPayload.email || userPayload.phone}`);
        next(); // Proceed to the next middleware or route handler
    });
};

// --- API Routes ---

// --- Authentication Routes ---

// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
    const { email, phone, password } = req.body;
    const normalizedEmail = email ? email.toLowerCase().trim() : null;
    const normalizedPhone = phone ? phone.trim().replace(/\D/g,'') : null; // Basic clean (remove non-digits)

    // Validate input
    if (!normalizedEmail && !normalizedPhone) {
        return res.status(400).json({ message: 'Email or phone number is required.' });
    }
    if (!password) {
        return res.status(400).json({ message: 'Password is required.' });
    }
    if (password.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
    }

    // Check for existing user
    const existingUser = users.find(u =>
        (normalizedEmail && u.email === normalizedEmail) ||
        (normalizedPhone && u.phone === normalizedPhone)
    );
    if (existingUser) {
        let conflictField = normalizedEmail && existingUser.email === normalizedEmail ? 'Email' : 'Phone number';
        console.log(`Registration attempt failed: ${conflictField} already exists - ${normalizedEmail || normalizedPhone}`);
        return res.status(409).json({ message: `${conflictField} is already registered.` }); // Conflict
    }

    // Hash password and create user
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = {
            id: uuidv4(),
            email: normalizedEmail,
            phone: normalizedPhone,
            password: hashedPassword,
            role: 'receptionist' // Assign a default role
        };
        users.push(newUser); // Add to in-memory store
        console.log(`User registered successfully: ${newUser.email || newUser.phone}`);
        res.status(201).json({ message: 'User registered successfully. Please log in.' }); // Created
    } catch(error) {
        console.error("Registration error:", error);
        res.status(500).json({ message: 'Server error during registration' }); // Internal Server Error
    }
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
    const { identifier, password } = req.body; // Expect 'identifier' (email or phone)

    // Validate input
    if (!identifier || !password) {
        return res.status(400).json({ message: 'Email/Phone and password are required' });
    }

    const normalizedIdentifier = identifier.toLowerCase().trim();

    // Find user by email OR phone
    const user = users.find(u =>
        (u.email && u.email === normalizedIdentifier) ||
        (u.phone && u.phone === normalizedIdentifier) // Adjust matching if phone format varies
    );

    if (!user) {
        console.log(`Login attempt failed: Identifier not found - ${normalizedIdentifier}`);
        return res.status(401).json({ message: 'Invalid credentials' }); // Unauthorized
    }

    // Check password
    try {
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            console.log(`Login attempt failed: Password mismatch for ${user.email || user.phone}`);
            return res.status(401).json({ message: 'Invalid credentials' }); // Unauthorized
        }

        // Password matches - Create JWT
        const userPayload = {
            id: user.id,
            email: user.email,
            phone: user.phone,
            role: user.role
        };
        const accessToken = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '1h' }); // Token expires in 1 hour

        console.log(`User logged in successfully: ${user.email || user.phone}`);
        res.json({ accessToken, user: userPayload }); // Send token and basic user info

    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ message: 'Server error during login' }); // Internal Server Error
    }
});

// --- Protected Routes (Require Authentication) ---

// GET /api/rooms - Get room status (Can be public or protected)
// Let's keep it public for the CheckInForm dropdown for now
app.get('/api/rooms', (req, res) => {
    res.json(rooms);
});

// POST /api/guests/checkin
app.post('/api/guests/checkin', authenticateToken, (req, res) => { // Apply auth middleware
    const { name, contact, email, idType, idNumber, nationality, adults, children, expectedCheckout, roomNumber, notes } = req.body;

    // Basic validation
    if (!name || !contact || !roomNumber) {
        return res.status(400).json({ message: 'Name, contact, and room number are required.' });
    }

    const room = rooms.find(r => r.id === roomNumber);
    if (!room) {
        return res.status(404).json({ message: `Room ${roomNumber} not found.` }); // Not Found
    }
    if (room.status !== 'Available') {
         return res.status(409).json({ message: `Room ${roomNumber} is currently ${room.status}. Cannot check-in.` }); // Conflict
    }

    // Update room status (in memory)
    room.status = 'Occupied';

    // Create guest record
    const newGuest = {
        id: uuidv4(),
        name,
        contact,
        email: email || '',
        idType: idType || '',
        idNumber: idNumber || '',
        nationality: nationality || '',
        adults: parseInt(adults, 10) || 1,
        children: parseInt(children, 10) || 0,
        checkinTime: new Date().toISOString(),
        expectedCheckout: expectedCheckout || '',
        roomNumber,
        notes: notes || '',
        status: 'Checked-In', // Basic status
        checkedInBy: req.user.email || req.user.phone // Log which user performed the action
    };

    guests.push(newGuest); // Add to in-memory store
    console.log(`Guest ${name} checked into room ${roomNumber} by ${req.user.email || req.user.phone}`);
    res.status(201).json(newGuest); // Respond with the created guest data
});

// GET /api/guests - Retrieve all checked-in guests
app.get('/api/guests', authenticateToken, (req, res) => {
    // In a real app, filter for currently checked-in guests
    res.json(guests);
});

// GET /api/dashboard/summary
app.get('/api/dashboard/summary', authenticateToken, (req, res) => {
    const occupiedRooms = rooms.filter(r => r.status === 'Occupied').length;
    const availableRooms = rooms.filter(r => r.status === 'Available').length;
    // Filter for guests who are currently 'Checked-In' (requires adding checkout logic later)
    const currentGuests = guests.filter(g => g.status === 'Checked-In');
    const totalGuestsInHouse = currentGuests.reduce((sum, guest) => sum + guest.adults + guest.children, 0);
    const todaysCheckins = currentGuests.filter(g => g.checkinTime.startsWith(new Date().toISOString().split('T')[0])).length;

    res.json({
        currentInHouseGuests: currentGuests.length, // Number of active stays
        totalGuestsInHouse: totalGuestsInHouse,     // Total people
        occupiedRooms: occupiedRooms,
        availableRooms: availableRooms,
        totalRooms: rooms.length,
        todaysCheckins: todaysCheckins,
        // Add more metrics later: revenue, departures, etc.
    });
});

// GET /api/reports/download
app.get('/api/reports/download', authenticateToken, (req, res) => {
    const { period } = req.query; // e.g., ?period=daily
    let reportData = [];
    const now = new Date();
    let startDate;

    // Determine date range (adjust logic as needed)
    switch (period) {
        case 'daily':
            startDate = new Date(now);
            startDate.setHours(0, 0, 0, 0);
            break;
        case 'weekly':
            const firstDayOfWeek = now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1); // Adjust for week start (e.g., Monday)
            startDate = new Date(now.setDate(firstDayOfWeek));
            startDate.setHours(0, 0, 0, 0);
            break;
        case 'monthly':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            startDate.setHours(0, 0, 0, 0);
            break;
        case 'yearly':
            startDate = new Date(now.getFullYear(), 0, 1);
            startDate.setHours(0, 0, 0, 0);
            break;
        default:
            return res.status(400).json({ message: 'Invalid report period specified. Use daily, weekly, monthly, or yearly.' });
    }

    const endDate = new Date(); // Up to the current moment

    console.log(`Generating ${period} report from ${startDate.toISOString()} to ${endDate.toISOString()}`);

    // Filter guest data based on check-in time within the range
    // Modify this to include check-outs or other relevant events if needed
    reportData = guests.filter(guest => {
        const checkinDate = new Date(guest.checkinTime);
        return checkinDate >= startDate && checkinDate <= endDate;
    });

    if (reportData.length === 0) {
        // Optionally send an empty file or a message
        console.log(`No data found for ${period} report.`);
        return res.status(404).json({ message: `No check-in data found for the selected period (${period}).` });
    }

    // Define CSV fields - Adjust as necessary
    const fields = [
        { label: 'Guest ID', value: 'id' }, { label: 'Name', value: 'name' },
        { label: 'Contact', value: 'contact' }, { label: 'Email', value: 'email' },
        { label: 'Room', value: 'roomNumber' }, { label: 'Adults', value: 'adults' },
        { label: 'Children', value: 'children' }, { label: 'Checkin Time', value: 'checkinTime' },
        { label: 'Expected Checkout', value: 'expectedCheckout' }, { label: 'Nationality', value: 'nationality'},
        { label: 'Checked In By', value: 'checkedInBy'}, { label: 'Notes', value: 'notes' }
        // Add other relevant fields: ID Type, ID Number, Status, Checkout Time (when implemented)
    ];
    const json2csvParser = new Parser({ fields, header: true }); // Ensure header row

    try {
        const csv = json2csvParser.parse(reportData);
        const fileName = `hotel_checkin_report_${period}_${now.toISOString().split('T')[0]}.csv`;

        res.header('Content-Type', 'text/csv');
        res.attachment(fileName); // Suggests download with this filename
        res.status(200).send(csv); // Send the CSV data
        console.log(`Report ${fileName} generated and sent (${reportData.length} records).`);

    } catch (err) {
        console.error('Error generating CSV report:', err);
        res.status(500).send('Error generating report data');
    }
});

// --- Start Server ---
app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
    // Log loaded users (for debugging only - remove sensitive info logging in prod)
    console.log(`Current users in memory: ${users.length}`);
});