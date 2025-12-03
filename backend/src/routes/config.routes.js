const express = require('express');
const router = express.Router();
const configService = require('../services/config.service');

router.get('/server', async (req, res) => {
    try {
        const config = await configService.getConfig();
        res.json(config);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.put('/server', async (req, res) => {
    try {
        await configService.updateConfig(req.body);
        res.json({ message: 'Config updated' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
