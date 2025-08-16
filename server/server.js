const express = require('express');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const net = require('net');

const app = express();
app.use(express.json());
app.use(cors());

// Configuration
const CONFIG = {
    rtmpPort: 1935,
    apiPort: 3000,
    uiPort: 8080,
    baseEventId: 100023,
    scte35Pid: 500,
    srtPacketSize: 1316,
    flussonicHost: 'localhost',
    flussonicPort: 1234
};

// RTMP Server for receiving OBS streams
let rtmpServer = null;

// Stream management
let streams = {};
let eventIdCounter = CONFIG.baseEventId;

// Load stream configurations
function loadStreamConfig() {
    try {
        const configPath = path.join(__dirname, 'streams.json');
        if (fs.existsSync(configPath)) {
            const data = fs.readFileSync(configPath, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Error loading stream config:', error);
    }
    return {};
}

// Save stream configurations
function saveStreamConfig() {
    try {
        const configPath = path.join(__dirname, 'streams.json');
        fs.writeFileSync(configPath, JSON.stringify(streams, null, 2));
    } catch (error) {
        console.error('Error saving stream config:', error);
    }
}

// Initialize streams from config
function initializeStreams() {
    const savedStreams = loadStreamConfig();
    Object.keys(savedStreams).forEach(streamId => {
        streams[streamId] = {
            ...savedStreams[streamId],
            ffmpegProcess: null,
            status: 'stopped',
            lastEventId: savedStreams[streamId].lastEventId || CONFIG.baseEventId,
            health: {
                bitrate: 0,
                fps: 0,
                lastUpdate: Date.now()
            }
        };
    });
}

// Start RTMP server to receive OBS streams
function startRTMPServer() {
    rtmpServer = net.createServer((socket) => {
        console.log(`RTMP connection received from ${socket.remoteAddress}`);
        
        socket.on('data', (data) => {
            // Parse RTMP stream ID from connection
            const dataStr = data.toString();
            const streamMatch = dataStr.match(/live\/(\w+)/);
            
            if (streamMatch) {
                const streamId = streamMatch[1];
                console.log(`Detected stream: ${streamId}`);
                
                // Initialize stream if not exists
                if (!streams[streamId]) {
                    streams[streamId] = {
                        name: streamId.charAt(0).toUpperCase() + streamId.slice(1),
                        lastEventId: CONFIG.baseEventId,
                        autoRestart: true,
                        health: { bitrate: 0, fps: 0, lastUpdate: Date.now() },
                        scte35Log: [],
                        status: 'connecting'
                    };
                    saveStreamConfig();
                }
                
                // Start FFmpeg processing for this stream
                startFFmpegProcess(streamId, {});
            }
        });
        
        socket.on('close', () => {
            console.log('RTMP connection closed');
        });
        
        socket.on('error', (err) => {
            console.error('RTMP socket error:', err);
        });
    });
    
    rtmpServer.listen(CONFIG.rtmpPort, () => {
        console.log(`RTMP Server listening on port ${CONFIG.rtmpPort}`);
    });
    
    rtmpServer.on('error', (err) => {
        console.error('RTMP Server error:', err);
    });
}

// FFmpeg process management
function startFFmpegProcess(streamId, config) {
    const stream = streams[streamId];
    if (stream.ffmpegProcess) {
        console.log(`Stopping existing FFmpeg process for stream ${streamId}`);
        stream.ffmpegProcess.kill('SIGTERM');
    }

    const inputUrl = `rtmp://localhost:${CONFIG.rtmpPort}/live/${streamId}`;
    const outputUrl = `srt://${CONFIG.flussonicHost}:${CONFIG.flussonicPort}?streamid=${streamId}&pkt_size=${CONFIG.srtPacketSize}`;

    const ffmpegArgs = [
        '-i', inputUrl,
        '-c:v', 'copy',
        '-c:a', 'copy',
        '-f', 'mpegts',
        '-pes_data', CONFIG.scte35Pid.toString(),
        '-metadata', `service_name=${streamId}`,
        '-metadata', `service_provider=SCTE35-MW`,
        '-mpegts_pmt_start_pid', '256',
        '-mpegts_start_pid', '257',
        '-srt_streamid', streamId,
        outputUrl
    ];

    console.log(`Starting FFmpeg for stream ${streamId}:`, ffmpegArgs.join(' '));

    const ffmpegProcess = spawn('ffmpeg', ffmpegArgs, {
        stdio: ['pipe', 'pipe', 'pipe']
    });

    stream.ffmpegProcess = ffmpegProcess;
    stream.status = 'running';
    stream.startTime = Date.now();

    // Handle FFmpeg output
    ffmpegProcess.stdout.on('data', (data) => {
        const output = data.toString();
        console.log(`FFmpeg stdout [${streamId}]:`, output);
        updateStreamHealth(streamId, output);
    });

    ffmpegProcess.stderr.on('data', (data) => {
        const output = data.toString();
        console.log(`FFmpeg stderr [${streamId}]:`, output);
        updateStreamHealth(streamId, output);
    });

    // Handle process exit
    ffmpegProcess.on('close', (code) => {
        console.log(`FFmpeg process for stream ${streamId} exited with code ${code}`);
        stream.status = 'stopped';
        stream.ffmpegProcess = null;

        // Auto-restart on unexpected exit
        if (code !== 0 && stream.autoRestart !== false) {
            console.log(`Auto-restarting stream ${streamId} after crash`);
            setTimeout(() => {
                // Send emergency CUE-IN before restart
                injectCueIn(streamId, true);
                setTimeout(() => {
                    startFFmpegProcess(streamId, config);
                }, 2000);
            }, 1000);
        }
    });

    ffmpegProcess.on('error', (error) => {
        console.error(`FFmpeg error for stream ${streamId}:`, error);
        stream.status = 'error';
        stream.error = error.message;
    });

    return ffmpegProcess;
}

// Update stream health metrics
function updateStreamHealth(streamId, output) {
    const stream = streams[streamId];
    if (!stream) return;

    // Parse FFmpeg output for bitrate and fps
    const bitrateMatch = output.match(/bitrate=\s*(\d+\.?\d*)kbits\/s/);
    const fpsMatch = output.match(/fps=\s*(\d+\.?\d*)/);

    if (bitrateMatch) {
        stream.health.bitrate = parseFloat(bitrateMatch[1]);
    }
    if (fpsMatch) {
        stream.health.fps = parseFloat(fpsMatch[1]);
    }

    stream.health.lastUpdate = Date.now();
}

// SCTE-35 marker injection
function injectScte35Marker(streamId, command, duration = null, eventId = null) {
    const stream = streams[streamId];
    if (!stream || !stream.ffmpegProcess) {
        throw new Error(`Stream ${streamId} not found or not running`);
    }

    if (!eventId) {
        eventId = ++eventIdCounter;
        stream.lastEventId = eventId;
    }

    let scte35Command;
    switch (command) {
        case 'CUE-OUT':
            scte35Command = `splice_insert:event_id=${eventId},duration=${duration || 30},out_of_network_indicator=1,program_splice_flag=1,splice_immediate_flag=1`;
            break;
        case 'CUE-IN':
            scte35Command = `splice_insert:event_id=${eventId},out_of_network_indicator=0,program_splice_flag=1,splice_immediate_flag=1`;
            break;
        default:
            throw new Error(`Unknown SCTE-35 command: ${command}`);
    }

    // Send SCTE-35 command to FFmpeg via stdin
    const scte35Data = `SCTE35:${scte35Command}\n`;
    
    try {
        stream.ffmpegProcess.stdin.write(scte35Data);
        console.log(`Injected SCTE-35 ${command} for stream ${streamId}: EventID=${eventId}, Duration=${duration}`);
        
        // Log the injection
        const logEntry = {
            timestamp: new Date().toISOString(),
            streamId,
            command,
            eventId,
            duration,
            pid: CONFIG.scte35Pid
        };
        
        if (!stream.scte35Log) stream.scte35Log = [];
        stream.scte35Log.push(logEntry);
        
        // Keep only last 100 log entries
        if (stream.scte35Log.length > 100) {
            stream.scte35Log = stream.scte35Log.slice(-100);
        }
        
        saveStreamConfig();
        return logEntry;
    } catch (error) {
        console.error(`Error injecting SCTE-35 for stream ${streamId}:`, error);
        throw error;
    }
}

// Convenience functions
function injectCueOut(streamId, duration, eventId = null) {
    return injectScte35Marker(streamId, 'CUE-OUT', duration, eventId);
}

function injectCueIn(streamId, eventId = null) {
    return injectScte35Marker(streamId, 'CUE-IN', null, eventId);
}

// API Routes

// Get all streams status
app.get('/api/streams', (req, res) => {
    const streamStatus = {};
    Object.keys(streams).forEach(streamId => {
        const stream = streams[streamId];
        streamStatus[streamId] = {
            id: streamId,
            name: stream.name || streamId,
            status: stream.status,
            health: stream.health,
            lastEventId: stream.lastEventId,
            startTime: stream.startTime,
            error: stream.error,
            scte35Log: stream.scte35Log ? stream.scte35Log.slice(-10) : []
        };
    });
    res.json(streamStatus);
});

// Start stream
app.post('/api/streams/:streamId/start', (req, res) => {
    const { streamId } = req.params;
    const config = req.body;

    if (!streams[streamId]) {
        streams[streamId] = {
            name: config.name || streamId,
            lastEventId: CONFIG.baseEventId,
            autoRestart: true,
            health: { bitrate: 0, fps: 0, lastUpdate: Date.now() },
            scte35Log: []
        };
    }

    try {
        startFFmpegProcess(streamId, config);
        saveStreamConfig();
        res.json({ success: true, message: `Stream ${streamId} started` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Stop stream
app.post('/api/streams/:streamId/stop', (req, res) => {
    const { streamId } = req.params;
    const stream = streams[streamId];

    if (!stream) {
        return res.status(404).json({ error: 'Stream not found' });
    }

    if (stream.ffmpegProcess) {
        stream.autoRestart = false;
        stream.ffmpegProcess.kill('SIGTERM');
    }

    stream.status = 'stopped';
    saveStreamConfig();
    res.json({ success: true, message: `Stream ${streamId} stopped` });
});

// Inject CUE-OUT
app.post('/api/streams/:streamId/cue-out', (req, res) => {
    const { streamId } = req.params;
    const { duration = 30, eventId, pid } = req.body;

    try {
        const logEntry = injectCueOut(streamId, duration, eventId, pid);
        res.json({ success: true, logEntry });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Inject CUE-IN
app.post('/api/streams/:streamId/cue-in', (req, res) => {
    const { streamId } = req.params;
    const { eventId, pid } = req.body;

    try {
        const logEntry = injectCueIn(streamId, eventId, pid);
        res.json({ success: true, logEntry });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get stream logs
app.get('/api/streams/:streamId/logs', (req, res) => {
    const { streamId } = req.params;
    const stream = streams[streamId];

    if (!stream) {
        return res.status(404).json({ error: 'Stream not found' });
    }

    res.json({
        scte35Log: stream.scte35Log || [],
        health: stream.health,
        status: stream.status
    });
});

// Bulk operations
app.post('/api/cue-out-all', (req, res) => {
    const { duration = 30 } = req.body;
    const results = [];

    Object.keys(streams).forEach(streamId => {
        if (streams[streamId].status === 'running') {
            try {
                const logEntry = injectCueOut(streamId, duration);
                results.push({ streamId, success: true, logEntry });
            } catch (error) {
                results.push({ streamId, success: false, error: error.message });
            }
        }
    });

    res.json({ results });
});

app.post('/api/cue-in-all', (req, res) => {
    const results = [];

    Object.keys(streams).forEach(streamId => {
        if (streams[streamId].status === 'running') {
            try {
                const logEntry = injectCueIn(streamId);
                results.push({ streamId, success: true, logEntry });
            } catch (error) {
                results.push({ streamId, success: false, error: error.message });
            }
        }
    });

    res.json({ results });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'running',
        timestamp: new Date().toISOString(),
        config: CONFIG,
        activeStreams: Object.keys(streams).filter(id => streams[id].status === 'running').length,
        totalStreams: Object.keys(streams).length
    });
});

// Serve static UI files
app.use(express.static(path.join(__dirname, '../ui')));

// Initialize and start server
function startServer() {
    initializeStreams();
    
    // Start RTMP server
    startRTMPServer();
    
    app.listen(CONFIG.apiPort, () => {
        console.log(`SCTE-35 Middleware API running on port ${CONFIG.apiPort}`);
        console.log(`Web UI available at http://localhost:${CONFIG.apiPort}`);
        console.log(`RTMP input: rtmp://localhost:${CONFIG.rtmpPort}/live/{streamId}`);
        console.log(`SRT output: srt://${CONFIG.flussonicHost}:${CONFIG.flussonicPort}`);
    });
}

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('Shutting down SCTE-35 Middleware...');
    
    // Stop RTMP server
    if (rtmpServer) {
        rtmpServer.close();
    }
    
    // Stop all FFmpeg processes
    Object.keys(streams).forEach(streamId => {
        const stream = streams[streamId];
        if (stream.ffmpegProcess) {
            stream.autoRestart = false;
            stream.ffmpegProcess.kill('SIGTERM');
        }
    });
    
    saveStreamConfig();
    process.exit(0);
});

// Start the server
startServer();
