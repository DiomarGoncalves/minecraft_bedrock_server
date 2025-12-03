const { spawn } = require('child_process');
const path = require('path');
const EventEmitter = require('events');

class BedrockProcessService extends EventEmitter {
    constructor() {
        super();
        this.process = null;
        this.serverDir = path.resolve(__dirname, '../../mc-server');
        this.executable = path.join(this.serverDir, 'bedrock_server');
        this.status = 'OFFLINE'; // ONLINE, STARTING, STOPPING
    }

    start() {
        if (this.process) {
            this.emit('console', 'Server is already running.');
            return;
        }

        this.status = 'STARTING';
        this.emit('status', this.status);
        this.emit('console', 'Starting server...');

        // Set LD_LIBRARY_PATH to include the server directory
        const env = { ...process.env, LD_LIBRARY_PATH: this.serverDir };

        this.process = spawn(this.executable, [], {
            cwd: this.serverDir,
            env: env,
            stdio: ['pipe', 'pipe', 'pipe']
        });

        this.process.stdout.on('data', (data) => {
            const text = data.toString();
            this.emit('console', text);
            if (text.includes('Server started')) {
                this.status = 'ONLINE';
                this.emit('status', this.status);
            }
        });

        this.process.stderr.on('data', (data) => {
            this.emit('console', `ERROR: ${data.toString()}`);
        });

        this.process.on('close', (code) => {
            this.emit('console', `Server process exited with code ${code}`);
            this.process = null;
            this.status = 'OFFLINE';
            this.emit('status', this.status);
        });

        this.process.on('error', (err) => {
            this.emit('console', `Failed to start server: ${err.message}`);
            this.status = 'OFFLINE';
            this.emit('status', this.status);
            this.process = null;
        });
    }

    stop() {
        if (!this.process) {
            this.emit('console', 'Server is not running.');
            return;
        }
        this.status = 'STOPPING';
        this.emit('status', this.status);
        this.writeCommand('stop');
    }

    restart() {
        if (this.process) {
            this.stop();
            // Wait for it to close then start
            const onClose = () => {
                this.start();
                this.removeListener('status', checkStatus);
            };

            const checkStatus = (status) => {
                if (status === 'OFFLINE') {
                    onClose();
                }
            };

            this.on('status', checkStatus);
        } else {
            this.start();
        }
    }

    writeCommand(command) {
        if (this.process && this.process.stdin) {
            this.process.stdin.write(command + '\n');
            this.emit('console', `> ${command}\n`);
        } else {
            this.emit('console', 'Cannot send command, server is offline.');
        }
    }

    getStatus() {
        return this.status;
    }
}

module.exports = new BedrockProcessService();
