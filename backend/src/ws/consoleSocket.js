const WebSocket = require('ws');
const bedrockService = require('../services/bedrockProcess.service');

function setupWebSocket(server) {
    const wss = new WebSocket.Server({ server, path: '/ws/console' });

    wss.on('connection', (ws) => {
        console.log('Client connected to console');

        // Send current status immediately
        ws.send(JSON.stringify({ type: 'status', data: bedrockService.getStatus() }));

        ws.on('message', (message) => {
            try {
                const parsed = JSON.parse(message);
                if (parsed.type === 'command') {
                    bedrockService.writeCommand(parsed.data);
                }
            } catch (e) {
                console.error('Invalid message format:', message);
            }
        });
    });

    // Broadcast console logs
    bedrockService.on('console', (data) => {
        broadcast(wss, { type: 'log', data: data.toString() });
    });

    // Broadcast status changes
    bedrockService.on('status', (status) => {
        broadcast(wss, { type: 'status', data: status });
    });
}

function broadcast(wss, data) {
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}

module.exports = setupWebSocket;
