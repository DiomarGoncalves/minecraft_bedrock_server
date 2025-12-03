const fs = require('fs-extra');
const path = require('path');

const PROPERTIES_FILE = path.resolve(__dirname, '../../mc-server/server.properties');

class ConfigService {
    async getConfig() {
        try {
            if (!await fs.pathExists(PROPERTIES_FILE)) {
                return {};
            }
            const content = await fs.readFile(PROPERTIES_FILE, 'utf8');
            const config = {};
            content.split('\n').forEach(line => {
                line = line.trim();
                if (line && !line.startsWith('#')) {
                    const [key, ...valueParts] = line.split('=');
                    if (key) {
                        config[key.trim()] = valueParts.join('=').trim();
                    }
                }
            });
            return config;
        } catch (error) {
            throw new Error('Failed to read server.properties');
        }
    }

    async updateConfig(newConfig) {
        try {
            let content = '';
            if (await fs.pathExists(PROPERTIES_FILE)) {
                content = await fs.readFile(PROPERTIES_FILE, 'utf8');
            }

            const lines = content.split('\n');
            const keys = Object.keys(newConfig);
            const updatedLines = [];
            const processedKeys = new Set();

            lines.forEach(line => {
                const trimmed = line.trim();
                if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
                    const [key] = trimmed.split('=');
                    const cleanKey = key.trim();
                    if (keys.includes(cleanKey)) {
                        updatedLines.push(`${cleanKey}=${newConfig[cleanKey]}`);
                        processedKeys.add(cleanKey);
                    } else {
                        updatedLines.push(line);
                    }
                } else {
                    updatedLines.push(line);
                }
            });

            // Add new keys that weren't in the file
            keys.forEach(key => {
                if (!processedKeys.has(key)) {
                    updatedLines.push(`${key}=${newConfig[key]}`);
                }
            });

            await fs.writeFile(PROPERTIES_FILE, updatedLines.join('\n'));
            return { success: true };
        } catch (error) {
            throw new Error('Failed to write server.properties');
        }
    }
}

module.exports = new ConfigService();
