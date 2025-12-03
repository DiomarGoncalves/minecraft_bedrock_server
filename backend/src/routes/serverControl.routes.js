const express = require('express');
const router = express.Router();
const bedrockService = require('../services/bedrockProcess.service');

router.post('/start', (req, res) => {
    bedrockService.start();
    res.json({ message: 'Start command sent' });
});

router.post('/stop', (req, res) => {
    bedrockService.stop();
    res.json({ message: 'Stop command sent' });
});

router.post('/restart', (req, res) => {
    bedrockService.restart();
    res.json({ message: 'Restart command sent' });
});

router.get('/status', (req, res) => {
    res.json({ status: bedrockService.getStatus() });
});

module.exports = router;
