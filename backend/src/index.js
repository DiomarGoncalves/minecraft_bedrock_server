const express = require('express');
const http = require('http');
const cors = require('cors');
const setupWebSocket = require('./ws/consoleSocket');

const serverControlRoutes = require('./routes/serverControl.routes');
const configRoutes = require('./routes/config.routes');
const addonsRoutes = require('./routes/addons.routes');
const worldsRoutes = require('./routes/worlds.routes');

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

// Routes
app.use('/server', serverControlRoutes);
app.use('/config', configRoutes);
app.use('/addons', addonsRoutes);
app.use('/worlds', worldsRoutes);

// WebSocket
setupWebSocket(server);

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
    console.log(`Backend running on port ${PORT}`);
});
