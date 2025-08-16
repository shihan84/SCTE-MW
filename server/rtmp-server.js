const NodeMediaServer = require('node-media-server');
const express = require('express');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

// Express app for API
const app = express();
app.use(express.json());
app.use(cors());

// Configuration
const CONFIG = {
    rtmpPort: 1935,
    apiPort: 3000,
    baseEventId: 100023,
    scte35Pid: 500,
    srtPacketSize: 1316,
    flussonicHost: 'localhost',
    flussonicPort: 1234
};

// Stream management
let streams = {};
let eventIdCounter = CONFIG.baseEventId;
let activeFFmpegProcesses = {};

// RTMP Server Configuration
const rtmpConfig = {
    rtmp: {
        port: CONFIG.rtmpPort,
        chunk_size: 60000,
        gop_cache: true,
        ping: 30,
        ping_timeout: 60
    },
    http: {
        port: 8000,
        allow_origin: '*'
    }
};

// Create RTMP Server
const nms = new NodeMediaServer(rtmpConfig);

// Load/Save stream configurations
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

function saveStreamConfig() {
    try {
        const configPath = path.join(__dirname, 'streams.json');
        fs.writeFileSync(configPath, JSON.stringify(streams, null, 2));
    } catch (error) {
        console.error('Error saving stream config:', error);
    }
}

// Initialize streams
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

// FFmpeg processing function
function startFFmpegForStream(streamId) {
    // Stop existing process if running
    if (activeFFmpegProcesses[streamId]) {
        console.log(`Stopping existing FFmpeg process for ${streamId}`);
        activeFFmpegProcesses[streamId].kill('SIGTERM');
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
        outputUrl
    ];
    
    console.log(`🚀 Starting FFmpeg for ${streamId}:`, ffmpegArgs.join(' '));
    
    const ffmpegProcess = spawn('ffmpeg', ffmpegArgs, {
        stdio: ['pipe', 'pipe', 'pipe']
    });
    
    activeFFmpegProcesses[streamId] = ffmpegProcess;
    
    // Initialize stream if not exists
    if (!streams[streamId]) {
        streams[streamId] = {
            name: streamId.charAt(0).toUpperCase() + streamId.slice(1),
            lastEventId: CONFIG.baseEventId,
            autoRestart: true,
            health: { bitrate: 0, fps: 0, lastUpdate: Date.now() },
            scte35Log: [],
            status: 'running',
            startTime: Date.now()
        };
        saveStreamConfig();
    } else {
        streams[streamId].status = 'running';
        streams[streamId].startTime = Date.now();
    }
    
    streams[streamId].ffmpegProcess = ffmpegProcess;
    
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
    
    ffmpegProcess.on('close', (code) => {
        console.log(`FFmpeg process for ${streamId} exited with code ${code}`);
        delete activeFFmpegProcesses[streamId];
        
        if (streams[streamId]) {
            streams[streamId].status = 'stopped';
            streams[streamId].ffmpegProcess = null;
        }
        
        // Auto-restart on unexpected exit
        if (code !== 0 && streams[streamId] && streams[streamId].autoRestart !== false) {
            console.log(`Auto-restarting FFmpeg for ${streamId} after crash`);
            setTimeout(() => {
                startFFmpegForStream(streamId);
            }, 3000);
        }
    });
    
    ffmpegProcess.on('error', (error) => {
        console.error(`FFmpeg error for ${streamId}:`, error);
        if (streams[streamId]) {
            streams[streamId].status = 'error';
            streams[streamId].error = error.message;
        }
    });
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
function injectScte35Marker(streamId, command, duration = null, eventId = null, pid = null) {
    const stream = streams[streamId];
    if (!stream || !stream.ffmpegProcess) {
        throw new Error(`Stream ${streamId} not found or not running`);
    }

    if (!eventId) {
        eventId = ++eventIdCounter;
        stream.lastEventId = eventId;
    }

    const usePid = pid || CONFIG.scte35Pid;

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
        console.log(`✅ Injected SCTE-35 ${command} for stream ${streamId}: EventID=${eventId}, Duration=${duration}, PID=${usePid}`);
        
        // Log the injection
        const logEntry = {
            timestamp: new Date().toISOString(),
            streamId,
            command,
            eventId,
            duration,
            pid: usePid
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
function injectCueOut(streamId, duration, eventId = null, pid = null) {
    return injectScte35Marker(streamId, 'CUE-OUT', duration, eventId, pid);
}

function injectCueIn(streamId, eventId = null, pid = null) {
    return injectScte35Marker(streamId, 'CUE-IN', null, eventId, pid);
}

// RTMP Server Event Handlers
nms.on('preConnect', (id, args) => {
    console.log('[RTMP preConnect]', `id=${id} args=${JSON.stringify(args)}`);
});

nms.on('postConnect', (id, args) => {
    console.log('[RTMP postConnect]', `id=${id} args=${JSON.stringify(args)}`);
});

nms.on('prePublish', (id, StreamPath, args) => {
    console.log('[RTMP prePublish]', `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`);
    
    // Extract stream ID from path (e.g., /live/stream1)
    const streamMatch = StreamPath.match(/\/live\/(\w+)/);
    if (streamMatch) {
        const streamId = streamMatch[1];
        console.log(`✅ OBS Stream Connected: ${streamId}`);
        
        // Start FFmpeg processing for this stream
        setTimeout(() => {
            startFFmpegForStream(streamId);
        }, 2000); // Wait 2 seconds for stream to stabilize
    }
});

nms.on('postPublish', (id, StreamPath, args) => {
    console.log('[RTMP postPublish]', `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`);
});

nms.on('donePublish', (id, StreamPath, args) => {
    console.log('[RTMP donePublish]', `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`);
    
    const streamMatch = StreamPath.match(/\/live\/(\w+)/);
    if (streamMatch) {
        const streamId = streamMatch[1];
        console.log(`❌ OBS Stream Disconnected: ${streamId}`);
        
        // Stop FFmpeg process
        if (activeFFmpegProcesses[streamId]) {
            activeFFmpegProcesses[streamId].kill('SIGTERM');
            delete activeFFmpegProcesses[streamId];
        }
        
        if (streams[streamId]) {
            streams[streamId].status = 'stopped';
            streams[streamId].ffmpegProcess = null;
        }
    }
});

// API Routes
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

// Initialize and start servers
function startServers() {
    initializeStreams();
    
    // Start RTMP Server
    nms.run();
    console.log('🎥 RTMP Server started on port', CONFIG.rtmpPort);
    console.log('📺 OBS URL: rtmp://localhost:' + CONFIG.rtmpPort + '/live/{streamId}');
    
    // Start API Server
    app.listen(CONFIG.apiPort, () => {
        console.log('🌐 API Server running on port', CONFIG.apiPort);
        console.log('🖥️  Web UI: http://localhost:' + CONFIG.apiPort);
        console.log('📅 Scheduler: http://localhost:' + CONFIG.apiPort + '/scheduler.html');
        console.log('🎛️  Navigation: http://localhost:' + CONFIG.apiPort + '/nav.html');
    });
}

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('Shutting down SCTE-35 Middleware...');
    
    // Stop all FFmpeg processes
    Object.keys(activeFFmpegProcesses).forEach(streamId => {
        if (activeFFmpegProcesses[streamId]) {
            activeFFmpegProcesses[streamId].kill('SIGTERM');
        }
    });
    
    // Stop RTMP server
    if (nms) {
        nms.stop();
    }
    
    saveStreamConfig();
    process.exit(0);
});

// Start the servers
startServers();
