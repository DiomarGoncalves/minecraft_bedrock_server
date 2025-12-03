const express = require('express');
const router = express.Router();
const worldsService = require('../services/worlds.service');

router.get('/', async (req, res) => {
    try {
        const worlds = await worldsService.listWorlds();
        res.json(worlds);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await worldsService.deleteWorld(id);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/:id/config', async (req, res) => {
    try {
        const { id } = req.params;
        const config = await worldsService.getWorldConfig(id);
        res.json(config);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
