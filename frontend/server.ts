import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import { spawn, ChildProcess } from 'child_process';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import multer from 'multer';
import AdmZip from 'adm-zip';

// Configuration
const PORT = 3001;
const MC_SERVER_PATH = path.join(path.resolve('.'), 'mc-server');
const BEDROCK_EXECUTABLE = './bedrock_server'; // Linux executable
const PROPERTIES_FILE = path.join(MC_SERVER_PATH, 'server.properties');

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws/console' });

app.use(cors());
app.use(express.json() as any);

// --- Types ---
interface MulterRequest extends express.Request {
  file?: Express.Multer.File;
}

// --- Global State ---
let bedrockProcess: ChildProcess | null = null;
let serverStatus = 'OFFLINE';

// --- Initialization ---
const initServerEnvironment = async () => {
  try {
    if (!existsSync(MC_SERVER_PATH)) {
      console.log('Creating server directory:', MC_SERVER_PATH);
      await fs.mkdir(MC_SERVER_PATH, { recursive: true });
    }

    // Create necessary subdirectories
    await fs.mkdir(path.join(MC_SERVER_PATH, 'behavior_packs'), { recursive: true });
    await fs.mkdir(path.join(MC_SERVER_PATH, 'resource_packs'), { recursive: true });

    if (!existsSync(PROPERTIES_FILE)) {
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
content-log-file-enabled=false
compression-threshold=1
server-authoritative-movement=server-auth
player-movement-score-threshold=20
player-movement-action-direction-threshold=0.85
player-movement-distance-threshold=0.3
player-movement-duration-threshold-in-ms=500
correct-player-movement=false
server-authoritative-block-breaking=false`;
      await fs.writeFile(PROPERTIES_FILE, defaultProps);
    }
  } catch (error) {
    console.error('Failed to initialize server environment:', error);
  }
};

// Initialize immediately
initServerEnvironment();

// --- Helper Functions ---

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
      message: msg,
      timestamp: new Date().toISOString()
    }
  });
};

// --- Process Management ---

const startServer = async () => {
  if (bedrockProcess) {
    return false;
  }

  // Ensure directory exists
  if (!existsSync(MC_SERVER_PATH)) {
    sendToConsole(`Error: Directory ${MC_SERVER_PATH} not found. Please create it and add server files.`, 'stderr');
    return false;
  }

  // Set executable permissions (critical for Linux)
  try {
    const execPath = path.join(MC_SERVER_PATH, BEDROCK_EXECUTABLE);
    if (existsSync(execPath)) {
        await fs.chmod(execPath, '755');
    } else {
        sendToConsole(`Error: Executable not found at ${execPath}. Please download the Bedrock Server software for Linux and place it in the 'mc-server' folder.`, 'stderr');
        return false;
    }
  } catch (error) {
    sendToConsole(`Warning: Failed to set executable permissions: ${error}`, 'stderr');
  }

  serverStatus = 'STARTING';
  broadcast({ type: 'status', status: serverStatus });
  sendToConsole('Starting Bedrock Server...');

  // Spawn process
  // Linux usually requires LD_LIBRARY_PATH=. to find local libs
  bedrockProcess = spawn(BEDROCK_EXECUTABLE, [], {
    cwd: MC_SERVER_PATH,
    env: { ...process.env, LD_LIBRARY_PATH: '.' },
    shell: true // Helpful for some Linux environments
  });

  bedrockProcess.stdout?.on('data', (data) => {
    const text = data.toString();
    sendToConsole(text, 'stdout');
    if (text.includes('Server started')) {
        serverStatus = 'ONLINE';
        broadcast({ type: 'status', status: serverStatus });
    }
  });

  bedrockProcess.stderr?.on('data', (data) => {
    sendToConsole(data.toString(), 'stderr');
  });

  bedrockProcess.on('close', (code) => {
    sendToConsole(`Server process exited with code ${code}`, 'system');
    bedrockProcess = null;
    serverStatus = 'OFFLINE';
    broadcast({ type: 'status', status: serverStatus });
  });

  return true;
};

const stopServer = () => {
  if (!bedrockProcess) return false;
  
  serverStatus = 'STOPPING';
  broadcast({ type: 'status', status: serverStatus });
  sendToConsole('Stopping server...', 'system');
  
  // Try graceful stop command first
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
    // Wait for process to die logic
    await new Promise(r => setTimeout(r, 4000)); 
  }
  return startServer();
};

// --- WebSocket Handling ---

wss.on('connection', (ws) => {
  // Send initial state
  ws.send(JSON.stringify({ type: 'status', status: serverStatus }));
  
  ws.on('message', (message) => {
    try {
      const parsed = JSON.parse(message.toString());
      if (parsed.command === 'input' && bedrockProcess && bedrockProcess.stdin) {
        bedrockProcess.stdin.write(parsed.value + '\n');
        sendToConsole(`> ${parsed.value}`, 'system');
      }
    } catch (e) {
      console.error('WS Message Error', e);
    }
  });
});

// --- HTTP Routes ---

// 1. Control
app.post('/api/server/start', async (req, res) => {
  const success = await startServer();
  res.json({ success, status: serverStatus });
});

app.post('/api/server/stop', (req, res) => {
  const success = stopServer();
  res.json({ success, status: serverStatus });
});

app.post('/api/server/restart', async (req, res) => {
  const success = await restartServer();
  res.json({ success, status: serverStatus });
});

app.get('/api/server/status', (req, res) => {
  res.json({ status: serverStatus });
});

// 2. Config (server.properties)
app.get('/api/config/server', async (req, res) => {
  try {
    if (!existsSync(PROPERTIES_FILE)) {
      return res.status(404).json({ error: 'server.properties not found' });
    }
    const content = await fs.readFile(PROPERTIES_FILE, 'utf-8');
    const lines = content.split('\n');
    const config: { key: string; value: string }[] = [];
    
    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [key, ...valParts] = trimmed.split('=');
        config.push({ key: key.trim(), value: valParts.join('=').trim() });
      }
    });
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read config' });
  }
});

app.put('/api/config/server', async (req, res) => {
  try {
    const newConfig = req.body as { key: string; value: string }[];
    
    let fileContent = '# Properties Configured via Web Panel\n';
    newConfig.forEach(item => {
      fileContent += `${item.key}=${item.value}\n`;
    });
    
    await fs.writeFile(PROPERTIES_FILE, fileContent, 'utf-8');
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save config' });
  }
});

// 3. Addons
const upload = multer({ dest: 'temp_uploads/' });

app.get('/api/addons', async (req, res) => {
  try {
    const behaviorPath = path.join(MC_SERVER_PATH, 'behavior_packs');
    const resourcePath = path.join(MC_SERVER_PATH, 'resource_packs');
    
    const addons: any[] = [];
    
    const scanDir = async (dir: string, type: 'behavior' | 'resource') => {
      if (!existsSync(dir)) return;
      const dirs = await fs.readdir(dir, { withFileTypes: true });
      
      for (const d of dirs) {
        if (d.isDirectory()) {
          // Try to read manifest
          const manifestPath = path.join(dir, d.name, 'manifest.json');
          let name = d.name;
          let description = '';
          
          if (existsSync(manifestPath)) {
            try {
              const mContent = await fs.readFile(manifestPath, 'utf-8');
              const json = JSON.parse(mContent);
              name = json.header?.name || name;
              description = json.header?.description || '';
            } catch (e) { }
          }
          
          addons.push({
            id: d.name,
            name,
            description,
            type,
            path: d.name
          });
        }
      }
    };
    
    await scanDir(behaviorPath, 'behavior');
    await scanDir(resourcePath, 'resource');
    
    res.json(addons);
  } catch (error) {
    res.status(500).json({ error: 'Failed to list addons' });
  }
});

app.post('/api/addons/upload', upload.single('file'), async (req: any, res: any) => {
  const multerReq = req as MulterRequest;
  if (!multerReq.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const tempPath = multerReq.file.path;
  
  try {
    const zip = new AdmZip(tempPath);
    const zipEntries = zip.getEntries();
    
    // Attempt to find manifest.json to determine type
    let manifestEntry = zipEntries.find(entry => entry.entryName.endsWith('manifest.json') && !entry.entryName.includes('__MACOSX'));
    
    let targetDir = '';
    let packFolder = '';

    if (manifestEntry) {
        const manifestContent = manifestEntry.getData().toString('utf8');
        try {
            const manifest = JSON.parse(manifestContent);
            // Check modules for type
            const isResource = manifest.modules?.some((m: any) => m.type === 'resources' || m.type === 'resource_pack');
            targetDir = isResource ? 'resource_packs' : 'behavior_packs';
            
            // Use UUID or Name as folder name to avoid conflicts
            packFolder = (manifest.header?.name || multerReq.file.originalname).replace(/[^a-zA-Z0-9]/g, '_');
        } catch (e) {
            // Default behavior if manifest parse fails
            targetDir = 'behavior_packs'; 
            packFolder = multerReq.file.originalname.replace('.mcpack', '').replace('.zip', '');
        }
    } else {
        // Fallback
        targetDir = 'behavior_packs';
        packFolder = multerReq.file.originalname.replace('.mcpack', '').replace('.zip', '');
    }

    const extractPath = path.join(MC_SERVER_PATH, targetDir, packFolder);
    
    // Create directory if not exists
    if (!existsSync(extractPath)) {
        await fs.mkdir(extractPath, { recursive: true });
    }

    zip.extractAllTo(extractPath, true);
    
    // Cleanup
    await fs.unlink(tempPath);
    
    res.json({ message: `Successfully installed to ${targetDir}/${packFolder}` });

  } catch (err) {
    console.error("Unzip error:", err);
    // Attempt to clean up even if fail
    try { await fs.unlink(tempPath); } catch {}
    res.status(500).json({ error: "Failed to process addon file. Ensure it is a valid .mcpack or .zip" });
  }
});

app.delete('/api/addons/:type/:id', async (req: any, res: any) => {
  const { type, id } = req.params;
  const targetDir = type === 'behavior' ? 'behavior_packs' : 'resource_packs';
  const fullPath = path.join(MC_SERVER_PATH, targetDir, id);
  
  // Safety check to prevent deleting outside directory
  if (!fullPath.startsWith(MC_SERVER_PATH)) {
    return res.status(403).json({ error: "Invalid path" });
  }

  try {
    await fs.rm(fullPath, { recursive: true, force: true });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Failed to delete" });
  }
});

// Start listening
server.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
  console.log(`WebSocket on ws://localhost:${PORT}/ws/console`);
  console.log(`Targeting Minecraft Server at: ${MC_SERVER_PATH}`);
});