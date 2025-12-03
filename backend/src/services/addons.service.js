const fs = require('fs-extra');
const path = require('path');
const AdmZip = require('adm-zip');

const BEHAVIOR_PACKS_DIR = path.resolve(__dirname, '../../mc-server/development_behavior_packs');
const RESOURCE_PACKS_DIR = path.resolve(__dirname, '../../mc-server/development_resource_packs');

class AddonsService {
    async listAddons() {
        const behaviorPacks = await this._getPacks(BEHAVIOR_PACKS_DIR, 'behavior');
        const resourcePacks = await this._getPacks(RESOURCE_PACKS_DIR, 'resource');
        return { behaviorPacks, resourcePacks };
    }

    async _getPacks(dir, type) {
        if (!await fs.pathExists(dir)) return [];
        const entries = await fs.readdir(dir, { withFileTypes: true });
        const packs = [];

        for (const entry of entries) {
            if (entry.isDirectory()) {
                const manifestPath = path.join(dir, entry.name, 'manifest.json');
                if (await fs.pathExists(manifestPath)) {
                    try {
                        const manifest = await fs.readJson(manifestPath);
                        packs.push({
                            id: entry.name,
                            name: manifest.header.name,
                            description: manifest.header.description,
                            version: manifest.header.version,
                            uuid: manifest.header.uuid,
                            type: type
                        });
                    } catch (e) {
                        console.error(`Error reading manifest for ${entry.name}:`, e);
                    }
                }
            }
        }
        return packs;
    }

    async deleteAddon(type, id) {
        const dir = type === 'behavior' ? BEHAVIOR_PACKS_DIR : RESOURCE_PACKS_DIR;
        const addonPath = path.join(dir, id);
        if (await fs.pathExists(addonPath)) {
            await fs.remove(addonPath);
            return { success: true };
        }
        throw new Error('Addon not found');
    }

    async installAddon(filePath) {
        const zip = new AdmZip(filePath);
        const tempDir = path.join(__dirname, '../../temp_addon_' + Date.now());

        try {
            await fs.ensureDir(tempDir);
            zip.extractAllTo(tempDir, true);

            // Find manifest.json (it might be in a subfolder if the zip was created that way)
            let manifestPath = null;
            let rootDir = tempDir;

            const findManifest = async (dir) => {
                const files = await fs.readdir(dir);
                if (files.includes('manifest.json')) return path.join(dir, 'manifest.json');
                for (const file of files) {
                    const fullPath = path.join(dir, file);
                    if ((await fs.stat(fullPath)).isDirectory()) {
                        const found = await findManifest(fullPath);
                        if (found) return found;
                    }
                }
                return null;
            };

            manifestPath = await findManifest(tempDir);

            if (!manifestPath) {
                throw new Error('manifest.json not found in the uploaded file');
            }

            const manifest = await fs.readJson(manifestPath);
            const packName = manifest.header.name || 'unknown_pack';
            const uuid = manifest.header.uuid;

            // Determine type
            let targetDir = null;
            const modules = manifest.modules || [];
            const isBehavior = modules.some(m => m.type === 'data' || m.type === 'script');
            const isResource = modules.some(m => m.type === 'resources');

            if (isBehavior) targetDir = BEHAVIOR_PACKS_DIR;
            else if (isResource) targetDir = RESOURCE_PACKS_DIR;
            else throw new Error('Could not determine pack type from manifest');

            // Move the folder containing manifest to target
            const sourceDir = path.dirname(manifestPath);
            const destDir = path.join(targetDir, `${packName}_${uuid}`); // Unique folder name

            await fs.move(sourceDir, destDir, { overwrite: true });
            return { success: true, name: packName, type: isBehavior ? 'behavior' : 'resource' };

        } finally {
            await fs.remove(tempDir);
            await fs.remove(filePath); // Clean up uploaded zip
        }
    }
}

module.exports = new AddonsService();
