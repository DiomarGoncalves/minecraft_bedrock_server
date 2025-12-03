const express = require('express');
const router = express.Router();
const addonsService = require('../services/addons.service');
const multer = require('multer');
const path = require('path');

const upload = multer({ dest: path.join(__dirname, '../../uploads/') });

router.get('/', async (req, res) => {
    try {
        const addons = await addonsService.listAddons();
        res.json(addons);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/upload', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
        const result = await addonsService.installAddon(req.file.path);
        res.json({ message: 'Addon installed successfully', result });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.delete('/:type/:id', async (req, res) => {
    try {
        const { type, id } = req.params;
        if (type !== 'behavior' && type !== 'resource') {
            return res.status(400).json({ error: 'Invalid addon type' });
        }
        await addonsService.deleteAddon(type, id);
        res.json({ message: 'Addon deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
