import express from 'express';
import type { RequestHandler } from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import { spawn, ChildProcess } from 'child_process';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import multer from 'multer';
import AdmZip from 'adm-zip';

// --- Configuration ---
const PORT = 3001;
// Use absolute path for server directory to ensure LD_LIBRARY_PATH works
const SERVER_DIR = path.resolve('mc-server'); 
const PLAYIT_BIN = process.env.PLAYIT_BIN || './playit'; 

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws/console' });

app.use(cors());
app.use(express.json());

// --- Types ---
interface MulterRequest extends express.Request {
  file?: Express.Multer.File;
}

// --- Helpers: Line Buffer ---
// Ensures we don't emit partial lines from stdout chunks
class LineBuffer {
  private buffer: string = '';

  process(chunk: string, callback: (line: string) => void) {
    this.buffer += chunk;
    const lines = this.buffer.split('\n');
    // The last element is either an empty string (if chunk ended with \n) 
    // or an incomplete line. We keep it in the buffer.
    this.buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.trim()) callback(line);
    }
  }
}

// --- Global State ---
let bedrockProcess: ChildProcess | null = null;
let serverStatus = 'OFFLINE';

// --- WebSocket Helper ---
const broadcast = (data: any) => {
  const message = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
};

const sendToConsole = (msg: string, type: 'stdout' | 'stderr' | 'system' = 'system') => {
  broadcast({
    type: 'console',
    data: {
      type,
      message: msg, // Send raw message, frontend handles formatting
      timestamp: new Date().toISOString()
    }
  });
};

// --- Initialization ---
const initServerEnvironment = async () => {
    try {
        if (!existsSync(SERVER_DIR)) {
            await fs.mkdir(SERVER_DIR, { recursive: true });
            console.log(`Created server directory at: ${SERVER_DIR}`);
        }

        // Force development folders
        await fs.mkdir(path.join(SERVER_DIR, 'development_behavior_packs'), { recursive: true });
        await fs.mkdir(path.join(SERVER_DIR, 'development_resource_packs'), { recursive: true });
        
        // Standard folders
        await fs.mkdir(path.join(SERVER_DIR, 'behavior_packs'), { recursive: true });
        await fs.mkdir(path.join(SERVER_DIR, 'resource_packs'), { recursive: true });

        const propFile = path.join(SERVER_DIR, 'server.properties');
        if (!existsSync(propFile)) {
            console.log('Creating default server.properties');
            const defaultProps = `server-name=Bedrock Server
gamemode=survival
difficulty=easy
allow-cheats=false
max-players=10
online-mode=true
white-list=false
server-port=19132
server-portv6=19133
view-distance=32
tick-distance=4
player-idle-timeout=30
max-threads=8
level-name=Bedrock level
level-seed=
default-player-permission-level=member
texturepack-required=false
content-log-file-enabled=true
compression-threshold=1
server-authoritative-movement=server-auth
player-movement-score-threshold=20
player-movement-action-direction-threshold=0.85
player-movement-distance-threshold=0.3
player-movement-duration-threshold-in-ms=500
correct-player-movement=false
server-authoritative-block-breaking=false`;
            await fs.writeFile(propFile, defaultProps);
        }
    } catch (error) {
        console.error('Failed to initialize server environment:', error);
    }
};

initServerEnvironment();

// --- PlayIt Service ---
class PlayItService {
  private process: ChildProcess | null = null;
  private publicAddress: string | null = null;
  private logs: string[] = [];
  private buffer = new LineBuffer();

  start() {
    if (this.process) return false;

    // Determine executable path (check root or server dir)
    let execPath = path.resolve(PLAYIT_BIN);
    if (!existsSync(execPath)) {
        // Fallback to trying inside mc-server if not in root
        execPath = path.join(SERVER_DIR, 'playit');
    }
    
    // Fallback: try just "playit" command if installed globally
    if (!existsSync(execPath)) execPath = 'playit';

    try {
      this.process = spawn(execPath, [], {
        cwd: SERVER_DIR, // Run inside server dir so it finds config/secret
        stdio: ['ignore', 'pipe', 'pipe']
      });

      this.process.stdout?.setEncoding('utf8');
      this.process.stderr?.setEncoding('utf8');

      const handleLog = (line: string) => {
        this.logs.push(line);
        if (this.logs.length > 50) this.logs.shift();
        
        // Try parsing address: "examples.playit.gg:12345"
        // Regex looks for common playit domains or generic format
        const match = line.match(/((?:[a-z0-9-]+\.)+playit\.gg(?::\d+)?)/i);
        if (match) {
          this.publicAddress = match[1];
        }
      };

      this.process.stdout?.on('data', (chunk) => this.buffer.process(chunk, handleLog));
      this.process.stderr?.on('data', (chunk) => this.buffer.process(chunk, handleLog));

      this.process.on('close', () => {
        this.process = null;
        this.publicAddress = null;
        this.logs.push('--- PlayIt Process Stopped ---');
      });

      this.logs.push('--- PlayIt Process Started ---');
      return true;

    } catch (e: any) {
      this.logs.push(`Failed to start playit: ${e.message}`);
      return false;
    }
  }

  stop() {
    if (this.process) {
      this.process.kill('SIGINT');
      this.process = null;
      return true;
    }
    return false;
  }

  getStatus() {
    return {
      running: !!this.process,
      publicAddress: this.publicAddress,
      logs: this.logs
    };
  }
}

const playitService = new PlayItService();


// --- Bedrock Process Management ---

const startServer = async () => {
  if (bedrockProcess) return false;

  try {
    const execPath = path.join(SERVER_DIR, 'bedrock_server');

    if (!existsSync(execPath)) {
        sendToConsole(`Error: 'bedrock_server' executable not found at ${execPath}.`, 'stderr');
        sendToConsole(`Please upload the Bedrock Server Linux binaries to this folder.`, 'stderr');
        return false;
    }

    // Ensure permission
    await fs.chmod(execPath, '755');

    serverStatus = 'STARTING';
    broadcast({ type: 'status', status: serverStatus });
    sendToConsole('Starting Bedrock Server...', 'system');

    const stdoutBuffer = new LineBuffer();
    const stderrBuffer = new LineBuffer();

    // Use absolute path for LD_LIBRARY_PATH
    const libraryPath = SERVER_DIR;

    bedrockProcess = spawn('./bedrock_server', [], {
        cwd: SERVER_DIR,
        // Crucial for Linux: Point LD_LIBRARY_PATH to the absolute server dir
        env: { ...process.env, LD_LIBRARY_PATH: libraryPath },
        shell: false, 
        stdio: ['pipe', 'pipe', 'pipe'] 
    });

    if (bedrockProcess.stdout) {
        bedrockProcess.stdout.setEncoding('utf8');
        bedrockProcess.stdout.on('data', (chunk) => {
            stdoutBuffer.process(chunk.toString(), (line) => {
                sendToConsole(line, 'stdout');
                if (line.includes('Server started')) {
                    serverStatus = 'ONLINE';
                    broadcast({ type: 'status', status: serverStatus });
                }
            });
        });
    }

    if (bedrockProcess.stderr) {
        bedrockProcess.stderr.setEncoding('utf8');
        bedrockProcess.stderr.on('data', (chunk) => {
            stderrBuffer.process(chunk.toString(), (line) => {
                sendToConsole(line, 'stderr');
            });
        });
    }

    bedrockProcess.on('error', (err) => {
        sendToConsole(`Failed to spawn process: ${err.message}`, 'stderr');
        serverStatus = 'OFFLINE';
        broadcast({ type: 'status', status: serverStatus });
        bedrockProcess = null;
    });

    bedrockProcess.on('close', (code) => {
        sendToConsole(`Server process exited with code ${code}`, 'system');
        bedrockProcess = null;
        serverStatus = 'OFFLINE';
        broadcast({ type: 'status', status: serverStatus });
    });

    return true;
  } catch (error: any) {
    sendToConsole(`Failed to start server: ${error.message}`, 'stderr');
    return false;
  }
};

const stopServer = () => {
  if (!bedrockProcess) return false;
  
  serverStatus = 'STOPPING';
  broadcast({ type: 'status', status: serverStatus });
  sendToConsole('Stopping server...', 'system');
  
  if (bedrockProcess.stdin) {
    bedrockProcess.stdin.write('stop\n');
  } else {
    bedrockProcess.kill('SIGTERM');
  }
  return true;
};

const restartServer = async () => {
  if (bedrockProcess) {
    stopServer();
    let checks = 0;
    while(bedrockProcess && checks < 20) {
        await new Promise(r => setTimeout(r, 1000));
        checks++;
    }
  }
  return startServer();
};

// --- WebSocket ---
wss.on('connection', (ws) => {
  ws.send(JSON.stringify({ type: 'status', status: serverStatus }));
  ws.on('message', (message) => {
    try {
      const parsed = JSON.parse(message.toString());
      if (parsed.command === 'input' && bedrockProcess && bedrockProcess.stdin) {
        const cmd = parsed.value.trim();
        bedrockProcess.stdin.write(cmd + '\n');
        sendToConsole(`> ${cmd}`, 'stdout'); // Echo to console
      }
    } catch (e) {
      console.error('WS Message Error', e);
    }
  });
});

// --- HTTP Routes ---

app.post('/api/server/start', async (req, res) => {
  const success = await startServer();
  res.json({ success, message: success ? 'Server starting...' : 'Failed to start or already running' });
});

app.post('/api/server/stop', (req, res) => {
  const success = stopServer();
  res.json({ success, message: success ? 'Stop command sent' : 'Server not running' });
});

app.post('/api/server/restart', async (req, res) => {
  const success = await restartServer();
  res.json({ success, message: 'Restart sequence initiated' });
});

app.get('/api/server/status', (req, res) => {
  res.json({ status: serverStatus });
});

// -- PlayIt Routes --
app.get('/api/playit/status', (req, res) => {
  res.json(playitService.getStatus());
});

app.post('/api/playit/start', (req, res) => {
  const success = playitService.start();
  res.json({ success, message: success ? 'PlayIt started' : 'Failed start or already running' });
});

app.post('/api/playit/stop', (req, res) => {
  const success = playitService.stop();
  res.json({ success, message: 'PlayIt stopped' });
});


// -- Config --
app.get('/api/config/server', async (req, res) => {
  try {
    const propPath = path.join(SERVER_DIR, 'server.properties');
    if (!existsSync(propPath)) return res.json([]);
    
    const content = await fs.readFile(propPath, 'utf-8');
    const lines = content.split('\n');
    const config = lines
      .filter(line => line.trim() && !line.startsWith('#'))
      .map(line => {
        const [key, ...valParts] = line.split('=');
        return { key: key.trim(), value: valParts.join('=').trim() };
      });
    res.json(config);
  } catch (e) {
    res.status(500).json({ error: 'Failed to read config' });
  }
});

app.put('/api/config/server', async (req, res) => {
  try {
    const newConfig = req.body;
    const propPath = path.join(SERVER_DIR, 'server.properties');
    let output = '#Properties Configured via Web Panel\n';
    newConfig.forEach((item: any) => {
      output += `${item.key}=${item.value}\n`;
    });
    await fs.writeFile(propPath, output);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to save config' });
  }
});

// -- Addons --
const upload = multer({ dest: 'temp_uploads/' });

app.get('/api/addons', async (req, res) => {
  try {
    const dirs = ['development_behavior_packs', 'development_resource_packs'];
    const addons: any[] = [];

    for (const dirName of dirs) {
      const fullDir = path.join(SERVER_DIR, dirName);
      if (existsSync(fullDir)) {
        const entries = await fs.readdir(fullDir, { withFileTypes: true });
        for (const entry of entries) {
            if (entry.isDirectory()) {
                let manifest: any = null;
                try {
                    const manifestPath = path.join(fullDir, entry.name, 'manifest.json');
                    if (existsSync(manifestPath)) {
                        const raw = await fs.readFile(manifestPath, 'utf-8');
                        const cleanRaw = raw.replace(/^\uFEFF/, '').replace(/\/\/.*$/gm, ''); 
                        manifest = JSON.parse(cleanRaw);
                    }
                } catch (e) {}

                addons.push({
                    id: entry.name,
                    name: manifest?.header?.name || entry.name,
                    description: manifest?.header?.description || '',
                    type: dirName.includes('behavior') ? 'behavior' : 'resource',
                    path: dirName
                });
            }
        }
      }
    }
    res.json(addons);
  } catch (e) {
    res.status(500).json({ error: 'Failed to list addons' });
  }
});

app.post('/api/addons/upload', upload.single('file') as any, async (req: MulterRequest, res: any) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  
  try {
    const zip = new AdmZip(req.file.path);
    const zipEntries = zip.getEntries();
    
    const manifestEntry = zipEntries.find(entry => entry.entryName.endsWith('manifest.json'));
    if (!manifestEntry) throw new Error('Invalid addon: manifest.json not found');

    const manifestData = manifestEntry.getData().toString('utf8');
    const cleanJson = manifestData.replace(/\/\/.*$/gm, '').replace(/^\uFEFF/, ''); 
    const manifest = JSON.parse(cleanJson);
    
    const isResource = manifest.modules?.some((m: any) => m.type === 'resources');
    
    // Forced use of development folders
    const targetFolder = isResource ? 'development_resource_packs' : 'development_behavior_packs';
    const packName = manifest.header.name.replace(/[^a-zA-Z0-9]/g, '_') || `addon_${Date.now()}`;
    const extractPath = path.join(SERVER_DIR, targetFolder, packName);

    zip.extractAllTo(extractPath, true);
    await fs.unlink(req.file.path);

    res.json({ success: true, message: `Installed to ${targetFolder}` });
  } catch (error: any) {
    console.error(error);
    res.status(400).json({ error: error.message || 'Failed to process addon' });
  }
});

app.delete('/api/addons/:type/:id', async (req, res) => {
  try {
    const { type, id } = req.params;
    const folder = type === 'resource' ? 'development_resource_packs' : 'development_behavior_packs';
    const targetPath = path.join(SERVER_DIR, folder, id);

    if (existsSync(targetPath)) {
        await fs.rm(targetPath, { recursive: true, force: true });
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'Addon not found' });
    }
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete addon' });
  }
});

server.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
  console.log(`Server Directory: ${SERVER_DIR}`);
});