
import express from 'express';
import type { RequestHandler } from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import { spawn, exec, ChildProcess } from 'child_process';
import fs from 'fs/promises';
import { existsSync, createReadStream, createWriteStream } from 'fs';
import path from 'path';
import multer from 'multer';
import AdmZip from 'adm-zip';

// --- Configuration ---
const PORT = 3001;
const SERVER_DIR = path.resolve('mc-server');
const WORLDS_DIR = path.join(SERVER_DIR, 'worlds');
const BACKUPS_DIR = path.resolve('backups');
const PLAYIT_BIN = process.env.PLAYIT_BIN || './playit';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws/console' });

app.use(cors() as any);
app.use(express.json() as any);

// --- Types & Interfaces ---
interface MulterRequest extends express.Request {
  file?: Express.Multer.File;
}

// --- Helpers ---
class LineBuffer {
  private buffer: string = '';
  process(chunk: string, callback: (line: string) => void) {
    this.buffer += chunk;
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() || '';
    for (const line of lines) {
      if (line.trim()) callback(line);
    }
  }
}

// Robust JSON parser to handle "dirty" JSON from addons (comments, trailing commas, BOM)
function parseJsonLoose(str: string) {
    if (!str) return {};
    try {
        return JSON.parse(str);
    } catch (e) {
        try {
            // 1. Remove BOM
            let clean = str.replace(/^\uFEFF/, '');
            // 2. Remove Comments (Block and Line)
            clean = clean.replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '$1');
            // 3. Remove Trailing Commas
            clean = clean.replace(/,(\s*[}\]])/g, '$1');
            // 4. Remove generic control characters that might break JSON (e.g. 0x00-0x1F except \n \r \t)
            // clean = clean.replace(/[\x00-\x09\x0B-\x1F\x7F]/g, ''); 
            
            return JSON.parse(clean);
        } catch (e2) {
            console.error("Failed to parse JSON loose:", e2);
            return {}; // Return empty object instead of crashing or throwing
        }
    }
}

const broadcast = (data: any) => {
  const message = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) client.send(message);
  });
};

const sendToConsole = (msg: string, type: 'stdout' | 'stderr' | 'system' = 'system') => {
  broadcast({
    type: 'console',
    data: { type, message: msg, timestamp: new Date().toISOString() }
  });
};

// --- Initialization ---
const initEnvironment = async () => {
    try {
        await fs.mkdir(SERVER_DIR, { recursive: true });
        await fs.mkdir(WORLDS_DIR, { recursive: true });
        await fs.mkdir(BACKUPS_DIR, { recursive: true });
        await fs.mkdir(path.join(SERVER_DIR, 'development_behavior_packs'), { recursive: true });
        await fs.mkdir(path.join(SERVER_DIR, 'development_resource_packs'), { recursive: true });
        
        // Ensure default properties
        const propFile = path.join(SERVER_DIR, 'server.properties');
        if (!existsSync(propFile)) {
            await fs.writeFile(propFile, 'server-name=Bedrock Server\nlevel-name=Bedrock level\ngamemode=survival\ndifficulty=easy\nallow-cheats=false\nmax-players=10\nonline-mode=true\nserver-port=19132\nserver-portv6=19133\ncontent-log-file-enabled=true\n');
        }
    } catch (e) {
        console.error("Init Error:", e);
    }
};
initEnvironment();

// ==========================================
// SERVICE: BEDROCK SERVER
// ==========================================
class BedrockService {
    private process: ChildProcess | null = null;
    status = 'OFFLINE';

    async start() {
        if (this.process) return false;

        const execPath = path.join(SERVER_DIR, 'bedrock_server');
        if (!existsSync(execPath)) {
            sendToConsole(`Error: bedrock_server not found in ${SERVER_DIR}`, 'stderr');
            return false;
        }

        await fs.chmod(execPath, '755');
        this.status = 'STARTING';
        broadcast({ type: 'status', status: this.status });
        sendToConsole('Starting Server...', 'system');

        const stdoutBuf = new LineBuffer();
        const stderrBuf = new LineBuffer();

        // LD_LIBRARY_PATH needs absolute path
        this.process = spawn('./bedrock_server', [], {
            cwd: SERVER_DIR,
            env: { ...process.env, LD_LIBRARY_PATH: SERVER_DIR },
            stdio: ['pipe', 'pipe', 'pipe']
        });

        this.process.stdout?.setEncoding('utf8');
        this.process.stdout?.on('data', c => stdoutBuf.process(c.toString(), l => {
            sendToConsole(l, 'stdout');
            if (l.includes('Server started')) {
                this.status = 'ONLINE';
                broadcast({ type: 'status', status: this.status });
            }
        }));

        this.process.stderr?.setEncoding('utf8');
        this.process.stderr?.on('data', c => stderrBuf.process(c.toString(), l => sendToConsole(l, 'stderr')));

        this.process.on('close', (code) => {
            sendToConsole(`Server exited with code ${code}`, 'system');
            this.process = null;
            this.status = 'OFFLINE';
            broadcast({ type: 'status', status: this.status });
        });

        return true;
    }

    stop() {
        if (!this.process) return false;
        this.status = 'STOPPING';
        broadcast({ type: 'status', status: this.status });
        if (this.process.stdin) this.process.stdin.write('stop\n');
        else this.process.kill('SIGTERM');
        return true;
    }

    async restart() {
        if (this.process) {
            this.stop();
            // Wait for shutdown
            for (let i = 0; i < 20; i++) {
                if (!this.process) break;
                await new Promise(r => setTimeout(r, 500));
            }
        }
        return this.start();
    }

    sendCommand(cmd: string) {
        if (this.process && this.process.stdin) {
            this.process.stdin.write(cmd + '\n');
            sendToConsole(`> ${cmd}`, 'stdout');
        }
    }
}
const bedrockService = new BedrockService();

// ==========================================
// SERVICE: PLAYIT (TUNNEL)
// ==========================================
class PlayItService {
    private process: ChildProcess | null = null;
    private publicAddress: string | null = null;
    private logs: string[] = [];
    private buffer = new LineBuffer();
    private _isInstalled: boolean = false;

    constructor() { this.checkInstall(); }

    async checkInstall() {
        return new Promise<void>(resolve => {
            exec('which playit', (err) => {
                if (!err) this._isInstalled = true;
                else if (existsSync(path.resolve(PLAYIT_BIN))) this._isInstalled = true;
                else this._isInstalled = false;
                resolve();
            });
        });
    }

    async install() {
        return new Promise<boolean>((resolve) => {
            const cmd = `curl -SsL https://playit-cloud.github.io/ppa/key.gpg | gpg --dearmor | sudo tee /etc/apt/trusted.gpg.d/playit.gpg >/dev/null && \
echo "deb [signed-by=/etc/apt/trusted.gpg.d/playit.gpg] https://playit-cloud.github.io/ppa/data ./" | sudo tee /etc/apt/sources.list.d/playit-cloud.list && \
sudo apt update && sudo apt install -y playit`;
            
            this.logs.push('--- Installing PlayIt ---');
            exec(cmd, (err, stdout, stderr) => {
                if (err) {
                    this.logs.push(`Install Failed: ${stderr}`);
                    resolve(false);
                } else {
                    this.logs.push('Install Success');
                    this._isInstalled = true;
                    resolve(true);
                }
            });
        });
    }

    start() {
        if (this.process) return false;
        
        let execPath = 'playit';
        if (existsSync(path.resolve(PLAYIT_BIN))) execPath = path.resolve(PLAYIT_BIN);

        try {
            this.process = spawn(execPath, [], {
                cwd: SERVER_DIR,
                stdio: ['ignore', 'pipe', 'pipe']
            });

            const handleLog = (line: string) => {
                this.logs.push(line);
                if (this.logs.length > 200) this.logs.shift();
                
                const match = line.match(/((?:[a-z0-9-]+\.)+playit\.gg(?::\d+)?)/i);
                if (match) this.publicAddress = match[1];
            };

            this.process.stdout?.on('data', c => this.buffer.process(c.toString(), handleLog));
            this.process.stderr?.on('data', c => this.buffer.process(c.toString(), handleLog));

            this.process.on('close', () => {
                this.process = null;
                this.publicAddress = null;
                this.logs.push('--- PlayIt Stopped ---');
            });
            return true;
        } catch (e: any) {
            this.logs.push(`Start failed: ${e.message}`);
            return false;
        }
    }

    stop() {
        if (this.process) {
            this.process.kill();
            this.process = null;
            return true;
        }
        return false;
    }

    getStatus() {
        return {
            running: !!this.process,
            publicAddress: this.publicAddress,
            logs: this.logs,
            isInstalled: this._isInstalled
        };
    }
}
const playitService = new PlayItService();

// ==========================================
// SERVICE: WORLDS & BACKUPS
// ==========================================
class WorldService {
    async listWorlds() {
        if (!existsSync(WORLDS_DIR)) return [];
        
        let activeLevelName = 'Bedrock level';
        try {
            const props = await fs.readFile(path.join(SERVER_DIR, 'server.properties'), 'utf-8');
            const match = props.match(/^level-name=(.+)$/m);
            if (match) activeLevelName = match[1].trim();
        } catch {}

        const entries = await fs.readdir(WORLDS_DIR, { withFileTypes: true });
        const worlds = [];
        for (const entry of entries) {
            if (entry.isDirectory()) {
                const stats = await fs.stat(path.join(WORLDS_DIR, entry.name));
                let meta: any = {};
                try {
                     const metaPath = path.join(WORLDS_DIR, entry.name, 'manager_config.json');
                     if (existsSync(metaPath)) meta = parseJsonLoose(await fs.readFile(metaPath, 'utf-8'));
                } catch {}

                worlds.push({
                    id: entry.name,
                    name: entry.name,
                    isActive: entry.name === activeLevelName,
                    lastModified: stats.mtime.toISOString(),
                    sizeBytes: stats.size,
                    ...meta
                });
            }
        }
        return worlds;
    }

    async createWorld(name: string, seed: string, gamemode: string, difficulty: string) {
        const folderName = name.replace(/[^a-zA-Z0-9_-]/g, '');
        const worldPath = path.join(WORLDS_DIR, folderName);
        
        await fs.mkdir(worldPath, { recursive: true });
        await this.setActive(folderName);
        
        const propsPath = path.join(SERVER_DIR, 'server.properties');
        let content = await fs.readFile(propsPath, 'utf-8');
        content = content.replace(/^level-seed=.*$/m, `level-seed=${seed}`);
        content = content.replace(/^gamemode=.*$/m, `gamemode=${gamemode}`);
        content = content.replace(/^difficulty=.*$/m, `difficulty=${difficulty}`);
        await fs.writeFile(propsPath, content);

        return true;
    }

    async importWorld(filePath: string, originalName: string) {
        const zip = new AdmZip(filePath);
        const entries = zip.getEntries();
        const levelDat = entries.find(e => e.entryName.endsWith('level.dat'));
        if (!levelDat) throw new Error('Invalid World: level.dat not found');

        let folderName = originalName.replace(/\.(zip|mcworld)$/i, '').replace(/[^a-zA-Z0-9_-]/g, '');
        if (!folderName) folderName = 'ImportedWorld';
        
        const pathParts = levelDat.entryName.split('/');
        const isNested = pathParts.length > 1;
        
        if (existsSync(path.join(WORLDS_DIR, folderName))) folderName = `${folderName}_${Date.now()}`;

        if (isNested) {
            const rootInZip = pathParts[0];
            const tempExtract = path.join(SERVER_DIR, 'temp_import_' + Date.now());
            zip.extractAllTo(tempExtract, true);
            const innerPath = path.join(tempExtract, rootInZip);
            if (existsSync(innerPath)) {
                await fs.rename(innerPath, path.join(WORLDS_DIR, folderName));
            }
            await fs.rm(tempExtract, { recursive: true, force: true });
        } else {
            zip.extractAllTo(path.join(WORLDS_DIR, folderName), true);
        }
        return true;
    }

    async setActive(id: string) {
        const propsPath = path.join(SERVER_DIR, 'server.properties');
        let content = await fs.readFile(propsPath, 'utf-8');
        if (content.match(/^level-name=/m)) {
            content = content.replace(/^level-name=.*$/m, `level-name=${id}`);
        } else {
            content += `\nlevel-name=${id}`;
        }
        await fs.writeFile(propsPath, content);
        return true;
    }

    async deleteWorld(id: string) {
        const target = path.join(WORLDS_DIR, id);
        if (existsSync(target)) {
            await fs.rm(target, { recursive: true, force: true });
            return true;
        }
        return false;
    }

    async backupWorld(id: string) {
        const worldPath = path.join(WORLDS_DIR, id);
        if (!existsSync(worldPath)) throw new Error('World not found');

        const backupFolder = path.join(BACKUPS_DIR, id);
        await fs.mkdir(backupFolder, { recursive: true });
        
        const filename = `${id}_${new Date().toISOString().replace(/[:.]/g, '-')}.zip`;
        const zip = new AdmZip();
        zip.addLocalFolder(worldPath);
        await zip.writeZipPromise(path.join(backupFolder, filename));
        return true;
    }

    async listBackups(id: string) {
        const backupFolder = path.join(BACKUPS_DIR, id);
        if (!existsSync(backupFolder)) return [];
        const files = await fs.readdir(backupFolder);
        const backups = [];
        for (const f of files) {
            if (f.endsWith('.zip')) {
                const stats = await fs.stat(path.join(backupFolder, f));
                backups.push({
                    filename: f,
                    date: stats.mtime.toISOString(),
                    sizeBytes: stats.size
                });
            }
        }
        return backups;
    }

    // --- Addon Management ---

    async getWorldAddons(worldId: string) {
        const worldPath = path.join(WORLDS_DIR, worldId);
        
        const readWorldJson = async (filename: string) => {
            const p = path.join(worldPath, filename);
            if (!existsSync(p)) return [];
            try { return parseJsonLoose(await fs.readFile(p, 'utf-8')); } catch { return []; }
        };

        // Current world config
        const wBehavior = await readWorldJson('world_behavior_packs.json');
        const wResource = await readWorldJson('world_resource_packs.json');
        
        // All installed addons on server
        const installed = await listInstalledAddons();

        const result = [];
        for (const addon of installed) {
            let enabled = false;
            // Check if addon UUID exists in the world's JSON
            if (addon.type === 'behavior') {
                enabled = Array.isArray(wBehavior) && wBehavior.some((x: any) => x.pack_id === addon.uuid);
            } else {
                enabled = Array.isArray(wResource) && wResource.some((x: any) => x.pack_id === addon.uuid);
            }
            result.push({ ...addon, enabled, folderName: addon.id });
        }
        return result;
    }

    async toggleWorldAddon(worldId: string, addonId: string, enabled: boolean) {
        // 1. Get the actual addon details (specifically correct Version and UUID)
        const installed = await listInstalledAddons();
        const addon = installed.find(x => x.id === addonId);
        if (!addon) throw new Error('Addon not found in installed packages');

        const worldPath = path.join(WORLDS_DIR, worldId);
        if (!existsSync(worldPath)) await fs.mkdir(worldPath, { recursive: true });

        const fileName = addon.type === 'behavior' ? 'world_behavior_packs.json' : 'world_resource_packs.json';
        const filePath = path.join(worldPath, fileName);

        let current: any[] = [];
        if (existsSync(filePath)) {
            try { 
                current = parseJsonLoose(await fs.readFile(filePath, 'utf-8')); 
                if (!Array.isArray(current)) current = [];
            } catch { current = []; }
        }

        // 2. Modify list
        // Remove existing entry for this UUID to avoid duplicates/updates
        current = current.filter((x: any) => x.pack_id !== addon.uuid);

        if (enabled) {
            // Add with Bedrock strict format: uuid and array version
            current.push({ 
                pack_id: addon.uuid, 
                version: addon.version 
            });
        }

        // 3. Save
        await fs.writeFile(filePath, JSON.stringify(current, null, 2));
        return true;
    }

    // --- Experiments & Metadata ---

    async saveExperiments(worldId: string, experiments: any) {
        const worldPath = path.join(WORLDS_DIR, worldId);
        if (!existsSync(worldPath)) await fs.mkdir(worldPath, { recursive: true });
        
        const metaPath = path.join(worldPath, 'manager_config.json');
        let meta: any = {};
        try { if(existsSync(metaPath)) meta = parseJsonLoose(await fs.readFile(metaPath, 'utf-8')); } catch {}

        meta.experiments = { ...(meta.experiments || {}), ...experiments };
        
        await fs.writeFile(metaPath, JSON.stringify(meta, null, 2));
        return true;
    }

    async setGamerule(rule: string, value: string) {
        if (bedrockService.status === 'ONLINE') {
            bedrockService.sendCommand(`gamerule ${rule} ${value}`);
            return true;
        }
        return false;
    }
}
const worldService = new WorldService();


// ==========================================
// HELPERS
// ==========================================
async function listInstalledAddons() {
    const dirs = ['development_behavior_packs', 'development_resource_packs'];
    const addons = [];
    for (const d of dirs) {
        const full = path.join(SERVER_DIR, d);
        if (existsSync(full)) {
            const entries = await fs.readdir(full, { withFileTypes: true });
            for (const ent of entries) {
                if (ent.isDirectory()) {
                    let manifest: any = {};
                    try {
                        const mPath = path.join(full, ent.name, 'manifest.json');
                        if (existsSync(mPath)) {
                            const raw = await fs.readFile(mPath, 'utf-8');
                            // Use robust parser
                            manifest = parseJsonLoose(raw);
                        }
                    } catch {}
                    
                    if (manifest.header?.uuid) {
                        addons.push({
                            id: ent.name,
                            name: manifest.header?.name || ent.name,
                            description: manifest.header?.description,
                            type: d.includes('behavior') ? 'behavior' : 'resource',
                            uuid: manifest.header?.uuid,
                            version: manifest.header?.version || [1, 0, 0],
                            path: d
                        });
                    }
                }
            }
        }
    }
    return addons;
}


// ==========================================
// HTTP ROUTES
// ==========================================

// -- Server --
app.get('/api/server/status', (req, res) => res.json({ status: bedrockService.status }));
app.post('/api/server/start', async (req, res) => res.json({ success: await bedrockService.start() }));
app.post('/api/server/stop', (req, res) => res.json({ success: bedrockService.stop() }));
app.post('/api/server/restart', async (req, res) => res.json({ success: await bedrockService.restart() }));

// -- Config --
app.get('/api/config/server', async (req, res) => {
    try {
        const raw = await fs.readFile(path.join(SERVER_DIR, 'server.properties'), 'utf-8');
        const config = raw.split('\n').filter(l => l.trim() && !l.startsWith('#')).map(l => {
            const [k, ...v] = l.split('=');
            return { key: k.trim(), value: v.join('=').trim() };
        });
        res.json(config);
    } catch { res.json([]); }
});
app.put('/api/config/server', async (req, res) => {
    try {
        let out = '# Web Config\n';
        req.body.forEach((i: any) => out += `${i.key}=${i.value}\n`);
        await fs.writeFile(path.join(SERVER_DIR, 'server.properties'), out);
        res.json({ success: true });
    } catch { res.status(500).json({ error: 'Save failed' }); }
});

// -- Addons --
app.get('/api/addons', async (req, res) => res.json(await listInstalledAddons()));
const upload = multer({ dest: 'temp_uploads/' });
app.post('/api/addons/upload', upload.single('file') as any, async (req: MulterRequest, res: any) => {
    if (!req.file) return res.status(400).json({ error: 'No file' });
    try {
        const zip = new AdmZip(req.file.path);
        const manifestEntry = zip.getEntries().find(e => e.entryName.endsWith('manifest.json'));
        if (!manifestEntry) throw new Error('No manifest.json');
        
        // Use robust parser for the uploaded manifest
        const manifest = parseJsonLoose(manifestEntry.getData().toString('utf8'));
        
        const isResource = manifest.modules?.some((m: any) => m.type === 'resources');
        const target = isResource ? 'development_resource_packs' : 'development_behavior_packs';
        
        const folderName = (manifest.header?.name || 'addon').replace(/[^a-zA-Z0-9]/g, '_');
        zip.extractAllTo(path.join(SERVER_DIR, target, folderName), true);
        await fs.unlink(req.file.path);
        res.json({ success: true, message: 'Installed' });
    } catch (e: any) {
        if(existsSync(req.file.path)) await fs.unlink(req.file.path);
        console.error("Upload Error:", e);
        res.status(400).json({ error: e.message || 'Invalid addon file' });
    }
});
app.delete('/api/addons/:type/:id', async (req, res) => {
    const folder = req.params.type === 'resource' ? 'development_resource_packs' : 'development_behavior_packs';
    await fs.rm(path.join(SERVER_DIR, folder, req.params.id), { recursive: true, force: true });
    res.json({ success: true });
});

// -- PlayIt --
app.get('/api/playit/status', async (req, res) => res.json(playitService.getStatus()));
app.post('/api/playit/start', (req, res) => res.json({ success: playitService.start() }));
app.post('/api/playit/stop', (req, res) => res.json({ success: playitService.stop() }));
app.post('/api/playit/install', async (req, res) => res.json({ success: await playitService.install() }));

// -- Worlds --
app.get('/api/worlds', async (req, res) => res.json(await worldService.listWorlds()));
app.post('/api/worlds', async (req, res) => {
    try {
        const { name, seed, gamemode, difficulty } = req.body;
        await worldService.createWorld(name, seed, gamemode, difficulty);
        res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});
app.post('/api/worlds/import', upload.single('file') as any, async (req: MulterRequest, res: any) => {
    if (!req.file) return res.status(400).json({ error: 'No file' });
    try {
        await worldService.importWorld(req.file.path, req.file.originalname);
        await fs.unlink(req.file.path);
        res.json({ success: true });
    } catch (e: any) {
        if (existsSync(req.file.path)) await fs.unlink(req.file.path);
        res.status(500).json({ error: e.message });
    }
});
app.post('/api/worlds/:id/activate', async (req, res) => res.json({ success: await worldService.setActive(req.params.id) }));
app.delete('/api/worlds/:id', async (req, res) => res.json({ success: await worldService.deleteWorld(req.params.id) }));

app.get('/api/worlds/:id/addons', async (req, res) => res.json(await worldService.getWorldAddons(req.params.id)));
app.post('/api/worlds/:id/addons', async (req, res) => {
    const { addonId, enabled } = req.body;
    try {
        await worldService.toggleWorldAddon(req.params.id, addonId, enabled);
        res.json({ success: true });
    } catch (e: any) { res.status(400).json({ error: e.message }); }
});

app.get('/api/worlds/:id/backups', async (req, res) => res.json(await worldService.listBackups(req.params.id)));
app.post('/api/worlds/:id/backups', async (req, res) => res.json({ success: await worldService.backupWorld(req.params.id) }));

app.post('/api/worlds/:id/gamerule', async (req, res) => {
    const result = await worldService.setGamerule(req.body.rule, req.body.value);
    if(result) res.json({ success: true });
    else res.status(400).json({ error: 'Server offline' });
});

app.post('/api/worlds/:id/experiments', async (req, res) => {
    await worldService.saveExperiments(req.params.id, req.body);
    res.json({ success: true });
});


// -- WS --
wss.on('connection', ws => {
    ws.send(JSON.stringify({ type: 'status', status: bedrockService.status }));
    ws.on('message', m => { try {
        const p = JSON.parse(m.toString());
        if (p.command === 'input') bedrockService.sendCommand(p.value);
    } catch {} });
});

server.listen(PORT, () => {
    console.log(`Backend: http://localhost:${PORT}`);
});
