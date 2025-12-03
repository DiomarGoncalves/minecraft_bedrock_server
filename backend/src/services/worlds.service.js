const fs = require('fs-extra');
const path = require('path');

const WORLDS_DIR = path.resolve(__dirname, '../../mc-server/worlds');

class WorldsService {
    async listWorlds() {
        try {
            if (!await fs.pathExists(WORLDS_DIR)) {
                await fs.ensureDir(WORLDS_DIR);
                return [];
            }

            const entries = await fs.readdir(WORLDS_DIR, { withFileTypes: true });
            const worlds = [];

            for (const entry of entries) {
                if (entry.isDirectory()) {
                    const worldPath = path.join(WORLDS_DIR, entry.name);
                    const levelDatPath = path.join(worldPath, 'level.dat');
                    const levelNamePath = path.join(worldPath, 'levelname.txt');

                    if (await fs.pathExists(levelDatPath)) {
                        let worldName = entry.name;

                        // Try to read the world name from levelname.txt
                        if (await fs.pathExists(levelNamePath)) {
                            try {
                                worldName = (await fs.readFile(levelNamePath, 'utf8')).trim();
                            } catch (e) {
                                console.error(`Error reading levelname.txt for ${entry.name}:`, e);
                            }
                        }

                        // Get folder size
                        const stats = await this._getDirectorySize(worldPath);

                        worlds.push({
                            id: entry.name,
                            name: worldName,
                            path: entry.name,
                            size: this._formatBytes(stats.size),
                            sizeBytes: stats.size,
                            files: stats.files
                        });
                    }
                }
            }

            return worlds;
        } catch (error) {
            console.error('Error listing worlds:', error);
            throw new Error('Failed to list worlds');
        }
    }

    async deleteWorld(worldId) {
        try {
            const worldPath = path.join(WORLDS_DIR, worldId);

            if (!await fs.pathExists(worldPath)) {
                throw new Error('World not found');
            }

            await fs.remove(worldPath);
            return { success: true, message: 'World deleted successfully' };
        } catch (error) {
            console.error('Error deleting world:', error);
            throw error;
        }
    }

    async getWorldConfig(worldId) {
        try {
            const worldPath = path.join(WORLDS_DIR, worldId);
            const configPath = path.join(worldPath, 'world_config.json');

            if (!await fs.pathExists(configPath)) {
                return {};
            }

            return await fs.readJson(configPath);
        } catch (error) {
            console.error('Error reading world config:', error);
            return {};
        }
    }

    async _getDirectorySize(dirPath) {
        let totalSize = 0;
        let totalFiles = 0;

        const calculateSize = async (currentPath) => {
            const entries = await fs.readdir(currentPath, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = path.join(currentPath, entry.name);

                if (entry.isDirectory()) {
                    await calculateSize(fullPath);
                } else {
                    const stats = await fs.stat(fullPath);
                    totalSize += stats.size;
                    totalFiles++;
                }
            }
        };

        await calculateSize(dirPath);
        return { size: totalSize, files: totalFiles };
    }

    _formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    }
}

module.exports = new WorldsService();
