const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const fileUpload = require('express-fileupload');
const session = require('express-session'); // Import express-session for session management

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const devicesFilePath = path.join(__dirname, 'devices.json');

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(fileUpload());

// Session middleware
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set to `true` in production with HTTPS
}));

// Load devices from JSON file
let devices = [];
function loadDevicesFromFile() {
    try {
        const data = fs.readFileSync(devicesFilePath, 'utf8');
        devices = JSON.parse(data);
    } catch (err) {
        console.error('Error reading devices file:', err);
        devices = [];
    }
}

// Save devices to JSON file
function saveDevicesToFile() {
    try {
        fs.writeFileSync(devicesFilePath, JSON.stringify(devices, null, 2));
    } catch (err) {
        console.error('Error saving devices file:', err);
    }
}

loadDevicesFromFile();

// Serve the index page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});
// Serve the index page
app.get('/upload', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'upload.html'));
});

// Serve login page
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

// Handle login
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    // Simple authentication: replace with more secure solution in production
    if (username === 'admin' && password === "Admin@eng") {
        req.session.isAuthenticated = true;
        res.redirect('/config');
    } else {
        res.redirect('/login'); // Redirect to login if authentication fails
    }
});

// Logout route
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// Middleware to protect routes
function authMiddleware(req, res, next) {
    if (req.session.isAuthenticated) {
        next();
    } else {
        res.redirect('/login');
    }
}

// Protected routes
app.get('/config', authMiddleware, (req, res) => res.sendFile(path.join(__dirname, 'views', 'config.html')));
app.get('/controller', authMiddleware, (req, res) => res.sendFile(path.join(__dirname, 'views', 'controller.html')));

// Endpoint to retrieve devices
app.get('/devices', (req, res) => res.json(devices));

// Add new device configuration and save to file
app.post('/addDevice', authMiddleware, (req, res) => {
    const { deviceName } = req.body;
    if (deviceName && !devices.find(s => s.name === deviceName)) {
        const newDevice = { name: deviceName, route: `/device/${deviceName}` };
        devices.push(newDevice);
        saveDevicesToFile(); // Save updated devices to file
        res.status(201).json(newDevice);
    } else {
        res.status(400).json({ error: 'Invalid or duplicate device name' });
    }
});

// Route to delete a device
app.delete('/removeDevice/:deviceName', authMiddleware, (req, res) => {
    const { deviceName } = req.params;
    const deviceIndex = devices.findIndex(s => s.name === deviceName);

    if (deviceIndex !== -1) {
        devices.splice(deviceIndex, 1); // Remove device from array
        saveDevicesToFile(); // Save updated list to JSON
        res.status(200).send(`Device ${deviceName} removed successfully`);
    } else {
        res.status(404).send('Device not found');
    }
});


// Serve device player views
app.get('/device/:deviceName', (req, res) => {
    const device = devices.find(s => s.name === req.params.deviceName);
    if (device) {
        res.sendFile(path.join(__dirname, 'views', 'device.html'));
    } else {
        res.status(404).send('Device not found');
    }
});

// Handle file uploads for specific devices
app.post('/upload/:deviceName', authMiddleware, (req, res) => {
    const { deviceName } = req.params;
    const device = devices.find(s => s.name === deviceName);

    if (!device) {
        return res.status(404).send('Device not found');
    }

    if (!req.files || !req.files.videoFile) {
        return res.status(400).send('No file uploaded');
    }

    const deviceFolderPath = path.join(__dirname, 'public', 'videos', deviceName);

    if (!fs.existsSync(deviceFolderPath)) {
        fs.mkdirSync(deviceFolderPath, { recursive: true });
    }

    const videoFile = req.files.videoFile;
    const uploadPath = path.join(deviceFolderPath, videoFile.name);

    videoFile.mv(uploadPath, (err) => {
        if (err) return res.status(500).send(err);
        res.send('File uploaded successfully!');
    });
});

// Get videos for a specific device
app.get('/videos/:deviceName', (req, res) => {
    const { deviceName } = req.params;
    const deviceFolderPath = path.join(__dirname, 'public/videos/', deviceName);

    if (!fs.existsSync(deviceFolderPath)) {
        return res.json([]);
    }

    fs.readdir(deviceFolderPath, (err, files) => {
        if (err) return res.status(500).send('Error reading videos');
        res.json(files.map(file => `/videos/${deviceName}/${file}`));
    });
});

// DELETE route to delete a video file
app.delete('/videos/:deviceName/:fileName', authMiddleware, (req, res) => {
    const { deviceName, fileName } = req.params;
    const filePath = path.join(__dirname, 'public', 'videos', deviceName, fileName);

    fs.unlink(filePath, (err) => {
        if (err) {
            console.error(`Failed to delete file: ${filePath}`, err);
            return res.status(500).send('Failed to delete video');
        }
        console.log(`File deleted: ${filePath}`);
        res.send('Video deleted successfully');
    });
});

// WebSocket setup
io.on('connection', (socket) => {
    console.log('Client connected');

    socket.on('playVideo', ({ device, videoUrl }) => {
        console.log(`Broadcasting playVideo event to device: ${device} with URL: ${videoUrl}`);
        io.emit('playVideo', { device, videoUrl });
    });

    socket.on('loopSingle', ({ device, videoUrl }) => {
        console.log(`Broadcasting loopSingle event to device: ${device} with URL: ${videoUrl}`);
        io.emit('loopSingle', { device, videoUrl });
    });

    // Emit startLoop to all devices (or handle device-specific event handling in the client)
    socket.on('startLoop', ({ device, videoUrls }) => {
        console.log(`Broadcasting startLoop event to device: ${device} with URLs:`, videoUrls);
        io.emit(`startLoop_${device}`, { device, videoUrls });  // Emit globally but with a unique device identifier
    });




    socket.on('disconnect', () => console.log('Client disconnected'));
});

// Start the server
server.listen(3000, () => console.log('Server running on http://localhost:3000'));
