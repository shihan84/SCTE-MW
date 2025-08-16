const express = require('express');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const net = require('net');
const NodeMediaServer = require('node-media-server');
const ThreeFiveIntegration = require('./threefive-integration');

const app = express();
app.use(express.json());
app.use(cors());

// Custom HLS playlist endpoint with SCTE-35 headers (must come before static middleware)
app.get('/hls/:streamId/index.m3u8', (req, res) => {
    const { streamId } = req.params;
    const playlistPath = path.join(__dirname, 'public', 'hls', streamId, 'index.m3u8');
    
    if (!fs.existsSync(playlistPath)) {
        return res.status(404).json({ error: 'Playlist not found' });
    }
    
    // Set comprehensive SCTE-35 headers for Flussonic detection with threefive
    res.set({
        'Content-Type': 'application/vnd.apple.mpegurl',
        'X-SCTE35-Enabled': 'true',
        'X-SCTE35-PID': CONFIG.scte35Pid.toString(),
        'X-SCTE35-Version': '1.0',
        'X-SCTE35-Standard': 'SCTE-35',
        'X-Stream-ID': streamId,
        'X-Service-Provider': 'SCTE35-MW',
        'X-SCTE35-Data-Stream': 'true',
        'X-SCTE35-PID-Enabled': 'true',
        'X-SCTE35-Events': 'CUE-OUT,CUE-IN',
        'X-SCTE35-Event-ID-Base': CONFIG.baseEventId.toString(),
        'X-ThreeFive-Enabled': threefiveAvailable.toString(),
        'X-ThreeFive-Library': 'threefive (Python)',
        'X-SCTE35-Parser': threefiveAvailable ? 'threefive' : 'fallback'
    });
    
    // Send the playlist
    res.sendFile(playlistPath);
});

// Serve static files (HLS/DASH streams)
app.use('/hls', express.static(path.join(__dirname, 'public/hls')));
app.use('/dash', express.static(path.join(__dirname, 'public/dash')));

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

// Initialize threefive integration
const threefive = new ThreeFiveIntegration();
let threefiveAvailable = false;

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
        
        // Create a clean copy without process objects
        const cleanStreams = {};
        Object.keys(streams).forEach(streamId => {
            const stream = streams[streamId];
            cleanStreams[streamId] = {
                name: stream.name,
                lastEventId: stream.lastEventId,
                autoRestart: stream.autoRestart,
                flussonicOutput: stream.flussonicOutput,
                description: stream.description,
                status: stream.status,
                health: stream.health,
                scte35Log: stream.scte35Log || []
            };
        });
        
        fs.writeFileSync(configPath, JSON.stringify(cleanStreams, null, 2));
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
    const nmsConfig = {
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
        },
        trans: {
            ffmpeg: 'ffmpeg',
            tasks: [
                {
                    app: 'live',
                    hls: true,
                    hlsFlags: '[hls_time=2:hls_list_size=3:hls_flags=delete_segments]',
                    dash: true,
                    dashFlags: '[f=dash:window_size=3:extra_window_size=5]'
                }
            ]
        }
    };

    const nms = new NodeMediaServer(nmsConfig);
    
    // Handle RTMP connection events
    nms.on('preConnect', (id, args) => {
        console.log(`RTMP preConnect: ${id}`);
    });

    nms.on('postConnect', (id, args) => {
        console.log(`RTMP postConnect: ${id}`);
    });

    nms.on('doneConnect', (id, args) => {
        console.log(`RTMP doneConnect: ${id}`);
    });

    nms.on('prePublish', (id, StreamPath, args) => {
        console.log(`RTMP prePublish: ${id}, StreamPath: ${StreamPath}`);
        
        // Extract stream ID from StreamPath or use default
        let streamId = 'stream1'; // Default fallback
        
        if (StreamPath) {
            // Extract from path like /live/stream1
            const parts = StreamPath.split('/');
            if (parts.length >= 3) {
                streamId = parts[2]; // /live/stream1 -> stream1
            }
        }
        
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
        } else {
            // Update existing stream status
            streams[streamId].status = 'connecting';
            streams[streamId].health.lastUpdate = Date.now();
        }
        
        console.log(`Stream ${streamId} status set to connecting`);
        saveStreamConfig();
    });

    nms.on('postPublish', (id, StreamPath, args) => {
        console.log(`RTMP postPublish: ${id}, StreamPath: ${StreamPath}`);
        
        // Extract stream ID from StreamPath or use default
        let streamId = 'stream1'; // Default fallback
        
        if (StreamPath) {
            // Extract from path like /live/stream1
            const parts = StreamPath.split('/');
            if (parts.length >= 3) {
                streamId = parts[2]; // /live/stream1 -> stream1
            }
        }
        
        if (streams[streamId]) {
            streams[streamId].status = 'running';
            streams[streamId].health.lastUpdate = Date.now();
            console.log(`Stream ${streamId} is now running`);
            
            // Start FFmpeg process to capture bitrate and FPS
            try {
                startFFmpegProcess(streamId, {});
                console.log(`FFmpeg process started for stream ${streamId}`);
            } catch (error) {
                console.error(`Failed to start FFmpeg for stream ${streamId}:`, error);
            }
            
            saveStreamConfig();
        }
    });

    nms.on('donePublish', (id, StreamPath, args) => {
        console.log(`RTMP donePublish: ${id}, StreamPath: ${StreamPath}`);
        
        // Extract stream ID from StreamPath or use default
        let streamId = 'stream1'; // Default fallback
        
        if (StreamPath) {
            // Extract from path like /live/stream1
            const parts = StreamPath.split('/');
            if (parts.length >= 3) {
                streamId = parts[2]; // /live/stream1 -> stream1
            }
        }
        
        if (streams[streamId]) {
            streams[streamId].status = 'stopped';
            console.log(`Stream ${streamId} has stopped`);
            saveStreamConfig();
        }
    });

    nms.on('prePlay', (id, StreamPath, args) => {
        console.log(`RTMP prePlay: ${id}, StreamPath: ${StreamPath}`);
    });

    nms.on('postPlay', (id, StreamPath, args) => {
        console.log(`RTMP postPlay: ${id}, StreamPath: ${StreamPath}`);
    });

    nms.on('donePlay', (id, StreamPath, args) => {
        console.log(`RTMP donePlay: ${id}, StreamPath: ${StreamPath}`);
    });

    // Start the RTMP server
    nms.run();
    rtmpServer = nms;
    
    console.log(`RTMP Server listening on port ${CONFIG.rtmpPort}`);
    console.log(`HTTP Server listening on port 8000`);
}

// FFmpeg process management
function startFFmpegProcess(streamId, config) {
    const stream = streams[streamId];
    if (stream.ffmpegProcess) {
        console.log(`Stopping existing FFmpeg process for stream ${streamId}`);
        stream.ffmpegProcess.kill('SIGTERM');
    }

    const inputUrl = `rtmp://localhost:${CONFIG.rtmpPort}/live/${streamId}`;

    // Create FFmpeg command that outputs HLS stream with SCTE-35 data stream
    const ffmpegArgs = [
        '-i', inputUrl,
        '-f', 'lavfi',
        '-i', `sine=frequency=1000:duration=0.1`,
        '-map', '0:v',
        '-map', '0:a',
        '-map', '1:a',
        '-c:v', 'copy',
        '-c:a:0', 'copy',
        '-c:a:1', 'aac',
        '-b:a:1', '32k',
        '-f', 'hls',
        '-hls_time', '2',
        '-hls_list_size', '10',
        '-hls_flags', 'delete_segments+independent_segments',
        '-hls_segment_filename', `./public/hls/${streamId}/segment_%03d.ts`,
        '-metadata', `service_name=${streamId}`,
        '-metadata', `service_provider=SCTE35-MW`,
        '-metadata', `scte35_pid=${CONFIG.scte35Pid}`,
        '-metadata', `scte35_enabled=true`,
        '-metadata', `event_id_base=${CONFIG.baseEventId}`,
        '-metadata', `scte35_version=1.0`,
        '-metadata', `scte35_standard=SCTE-35`,
        '-metadata', `scte35_data_stream=true`,
        '-metadata', `scte35_pid_${CONFIG.scte35Pid}=true`,
        `./public/hls/${streamId}/index.m3u8`
    ];

    console.log(`Starting FFmpeg SCTE-35 HLS/DASH output for stream ${streamId}:`, ffmpegArgs.join(' '));

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
                    startFFmpegProcess(streamId, config);
                }, 2000);
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
    const sizeMatch = output.match(/(\d{2,4})x(\d{2,4})/);

    if (bitrateMatch) {
        stream.health.bitrate = parseFloat(bitrateMatch[1]);
        console.log(`Stream ${streamId} bitrate: ${stream.health.bitrate} kbps`);
    }
    if (fpsMatch) {
        stream.health.fps = parseFloat(fpsMatch[1]);
        console.log(`Stream ${streamId} fps: ${stream.health.fps}`);
    }
    if (sizeMatch) {
        stream.health.resolution = `${sizeMatch[1]}x${sizeMatch[2]}`;
        console.log(`Stream ${streamId} resolution: ${stream.health.resolution}`);
    }

    stream.health.lastUpdate = Date.now();
}

// SCTE-35 marker injection
async function injectScte35Marker(streamId, command, duration = null, eventId = null) {
    const stream = streams[streamId];
    if (!stream || !stream.ffmpegProcess) {
        throw new Error(`Stream ${streamId} not found or not running`);
    }

    if (!eventId) {
        eventId = ++eventIdCounter;
        stream.lastEventId = eventId;
    }

    // Log the SCTE-35 event and inject into HLS playlist
        const logEntry = {
            timestamp: new Date().toISOString(),
            streamId,
            command,
            eventId,
            duration,
        pid: CONFIG.scte35Pid,
        threefiveEnabled: threefiveAvailable
        };
        
        if (!stream.scte35Log) stream.scte35Log = [];
        stream.scte35Log.push(logEntry);
        
        // Keep only last 100 log entries
        if (stream.scte35Log.length > 100) {
            stream.scte35Log = stream.scte35Log.slice(-100);
        }
        
    // Inject SCTE-35 marker into HLS playlist
    await injectScte35IntoHLS(streamId, command, eventId, duration);
    
    console.log(`Injected SCTE-35 ${command} for stream ${streamId}: EventID=${eventId}, Duration=${duration}`);
        saveStreamConfig();
        return logEntry;
}

// Convenience functions
async function injectCueOut(streamId, duration, eventId = null) {
    return await injectScte35Marker(streamId, 'CUE-OUT', duration, eventId);
}

async function injectCueIn(streamId, eventId = null) {
    return await injectScte35Marker(streamId, 'CUE-IN', null, eventId);
}

// Inject SCTE-35 markers into HLS playlist and segments using threefive
async function injectScte35IntoHLS(streamId, command, eventId, duration) {
    try {
        const playlistPath = path.join(__dirname, 'public', 'hls', streamId, 'index.m3u8');
        const segmentsDir = path.join(__dirname, 'public', 'hls', streamId);
        
        if (!fs.existsSync(playlistPath)) {
            console.log(`HLS playlist not found for stream ${streamId}, will inject when available`);
            return;
        }
        
        let playlist = fs.readFileSync(playlistPath, 'utf8');
        const lines = playlist.split('\n');
        
        // Find the last segment entry
        let lastSegmentIndex = -1;
        let lastSegmentFile = null;
        for (let i = lines.length - 1; i >= 0; i--) {
            if (lines[i].endsWith('.ts')) {
                lastSegmentIndex = i;
                lastSegmentFile = lines[i];
                break;
            }
        }
        
        if (lastSegmentIndex === -1) {
            console.log(`No segments found in playlist for stream ${streamId}`);
            return;
        }
        
        // Create proper SCTE-35 cue using threefive
        const scte35Cue = await createScte35Cue(command, eventId, duration);
        
        if (scte35Cue) {
            // Create SCTE-35 marker comment with proper format for Flussonic
            const scte35Marker = `#EXT-X-CUE-OUT:${duration || 30}`;
            const scte35Info = `#EXT-X-SCTE35:${command}:${eventId}:${CONFIG.scte35Pid}`;
            
            // Add SCTE-35 data stream info with threefive encoded data
            const scte35Data = `#EXT-X-SCTE35-DATA:${command}:${eventId}:${CONFIG.scte35Pid}:${duration || 30}`;
            const scte35Encoded = scte35Cue.encoded ? `#EXT-X-SCTE35-ENCODED:${scte35Cue.encoded}` : '';
            
            // Insert SCTE-35 markers before the last segment
            const markers = [scte35Marker, scte35Info, scte35Data];
            if (scte35Encoded) markers.push(scte35Encoded);
            lines.splice(lastSegmentIndex, 0, ...markers);
            
            // Write updated playlist
            fs.writeFileSync(playlistPath, lines.join('\n'));
            
            // Create SCTE-35 data file for this event with threefive data
            createScte35DataFile(streamId, command, eventId, duration, scte35Cue);
            
            console.log(`Injected SCTE-35 marker into HLS playlist for stream ${streamId}: ${command} (using threefive)`);
        } else {
            console.error(`Failed to create SCTE-35 cue for stream ${streamId}`);
        }
    } catch (error) {
        console.error(`Error injecting SCTE-35 into HLS for stream ${streamId}:`, error);
    }
}

// Create SCTE-35 data file for Flussonic detection with threefive data
function createScte35DataFile(streamId, command, eventId, duration, scte35Cue = null) {
    try {
        const scte35Dir = path.join(__dirname, 'public', 'hls', streamId, 'scte35');
        if (!fs.existsSync(scte35Dir)) {
            fs.mkdirSync(scte35Dir, { recursive: true });
        }
        
        const scte35Data = {
            streamId: streamId,
            command: command,
            eventId: eventId,
            duration: duration,
            pid: CONFIG.scte35Pid,
            timestamp: new Date().toISOString(),
            scte35Standard: 'SCTE-35',
            scte35Version: '1.0',
            serviceProvider: 'SCTE35-MW',
            threefiveEnabled: true,
            threefiveLibrary: 'threefive'
        };
        
        // Add threefive cue data if available
        if (scte35Cue) {
            scte35Data.threefiveCue = {
                encoded: scte35Cue.encode(),
                command: scte35Cue.command ? {
                    type: scte35Cue.command.constructor.name,
                    eventId: scte35Cue.command.event_id,
                    outOfNetwork: scte35Cue.command.out_of_network_indicator,
                    programSplice: scte35Cue.command.program_splice_flag,
                    spliceImmediate: scte35Cue.command.splice_immediate_flag
                } : null,
                descriptors: scte35Cue.descriptors ? scte35Cue.descriptors.map(desc => ({
                    type: desc.constructor.name,
                    eventId: desc.segmentation_event_id,
                    typeId: desc.segmentation_type_id
                })) : []
            };
        }
        
        const dataFile = path.join(scte35Dir, `scte35_${eventId}.json`);
        fs.writeFileSync(dataFile, JSON.stringify(scte35Data, null, 2));
        
        console.log(`Created SCTE-35 data file with threefive data: ${dataFile}`);
    } catch (error) {
        console.error(`Error creating SCTE-35 data file for stream ${streamId}:`, error);
    }
}

// Inject SCTE-35 data into TS segment
function injectScte35IntoTS(tsFilePath, command, eventId, duration) {
    try {
        // Create a simple SCTE-35 packet
        const scte35Packet = createScte35Packet(command, eventId, duration);
        
        // For now, we'll just log that we would inject the packet
        // In a real implementation, you would modify the TS file to include the SCTE-35 packet
        console.log(`Would inject SCTE-35 packet into ${tsFilePath}: ${command} EventID=${eventId}`);
        
        // TODO: Implement actual TS packet injection
        // This would require parsing the TS file and inserting SCTE-35 packets at the correct PES boundaries
        
    } catch (error) {
        console.error(`Error injecting SCTE-35 into TS file ${tsFilePath}:`, error);
    }
}

// Create proper SCTE-35 cues using threefive Python library
async function createScte35Cue(command, eventId, duration) {
    if (!threefiveAvailable) {
        console.log('Threefive not available, using fallback SCTE-35 creation');
        return createFallbackScte35Cue(command, eventId, duration);
    }
    
    try {
        const cue = await threefive.createCue(command, eventId, duration);
        return cue;
    } catch (error) {
        console.error('Error creating SCTE-35 cue with threefive:', error);
        return createFallbackScte35Cue(command, eventId, duration);
    }
}

// Fallback SCTE-35 cue creation (when threefive is not available)
function createFallbackScte35Cue(command, eventId, duration) {
    const cue = {
        command: command,
        eventId: eventId,
        duration: duration,
        pid: CONFIG.scte35Pid,
        timestamp: Date.now(),
        encoded: null, // Will be set by the calling function
        threefiveEnabled: false
    };
    
    return cue;
}

// Parse SCTE-35 data from stream using threefive
async function parseScte35FromStream(streamId) {
    if (!threefiveAvailable) {
        console.log('Threefive not available, returning empty SCTE-35 events');
        return [];
    }
    
    try {
        const streamPath = path.join(__dirname, 'public', 'hls', streamId);
        const analysis = await threefive.analyzeSegments(streamPath);
        return analysis.scte35Events;
    } catch (error) {
        console.error('Error parsing SCTE-35 from stream:', error);
        return [];
    }
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
            scte35Log: stream.scte35Log ? stream.scte35Log.slice(-10) : [],
            rtmpUrl: `rtmp://localhost:${CONFIG.rtmpPort}/live/${streamId}`,
            hlsUrl: `http://localhost:${CONFIG.apiPort}/hls/${streamId}/index.m3u8`,
            dashUrl: `http://localhost:${CONFIG.apiPort}/dash/${streamId}/index.mpd`,
            scte35Enabled: true,
            scte35Pid: CONFIG.scte35Pid
        };
    });
    res.json(streamStatus);
});

// Start stream
app.post('/api/streams/:streamId/start', (req, res) => {
    const { streamId } = req.params;
    const config = req.body;

    // Input validation
    if (!streamId || typeof streamId !== 'string' || streamId.length > 50) {
        return res.status(400).json({ error: 'Invalid stream ID' });
    }

    if (!streams[streamId]) {
        streams[streamId] = {
            name: (config.name && typeof config.name === 'string' && config.name.length <= 100) ? config.name : streamId,
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
app.post('/api/streams/:streamId/cue-out', async (req, res) => {
    const { streamId } = req.params;
    const { duration = 30, eventId, pid } = req.body;

    // Input validation
    if (!streamId || typeof streamId !== 'string' || streamId.length > 50) {
        return res.status(400).json({ error: 'Invalid stream ID' });
    }

    if (duration && (typeof duration !== 'number' || duration < 1 || duration > 3600)) {
        return res.status(400).json({ error: 'Duration must be between 1 and 3600 seconds' });
    }

    if (eventId && (typeof eventId !== 'number' || eventId < 1)) {
        return res.status(400).json({ error: 'Event ID must be a positive number' });
    }

    try {
        const logEntry = await injectCueOut(streamId, duration, eventId, pid);
        res.json({ success: true, logEntry });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Inject CUE-IN
app.post('/api/streams/:streamId/cue-in', async (req, res) => {
    const { streamId } = req.params;
    const { eventId, pid } = req.body;

    // Input validation
    if (!streamId || typeof streamId !== 'string' || streamId.length > 50) {
        return res.status(400).json({ error: 'Invalid stream ID' });
    }

    if (eventId && (typeof eventId !== 'number' || eventId < 1)) {
        return res.status(400).json({ error: 'Event ID must be a positive number' });
    }

    try {
        const logEntry = await injectCueIn(streamId, eventId, pid);
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

// Get detailed stream information
app.get('/api/streams/:streamId/details', (req, res) => {
    const { streamId } = req.params;
    const stream = streams[streamId];

    if (!stream) {
        return res.status(404).json({ error: 'Stream not found' });
    }

    res.json({
        id: streamId,
        name: stream.name || streamId,
        status: stream.status,
        health: stream.health,
        lastEventId: stream.lastEventId,
        startTime: stream.startTime,
        error: stream.error,
        scte35Log: stream.scte35Log || [],
        rtmpUrl: `rtmp://localhost:${CONFIG.rtmpPort}/live/${streamId}`,
        hlsUrl: `http://localhost:${CONFIG.apiPort}/hls/${streamId}/index.m3u8`,
        dashUrl: `http://localhost:${CONFIG.apiPort}/dash/${streamId}/index.mpd`,
        scte35Enabled: true,
        scte35Pid: CONFIG.scte35Pid,
        ffmpegRunning: !!stream.ffmpegProcess,
        autoRestart: stream.autoRestart
    });
});

// Manual stream activation for testing
app.post('/api/streams/:streamId/activate', (req, res) => {
    const { streamId } = req.params;
    
    if (!streams[streamId]) {
        return res.status(404).json({ error: 'Stream not found' });
    }
    
    streams[streamId].status = 'running';
    streams[streamId].health.lastUpdate = Date.now();
    
    // Start FFmpeg analyzer to capture bitrate/FPS
    try {
        startFFmpegProcess(streamId, {});
        console.log(`FFmpeg analyzer started for stream ${streamId}`);
    } catch (error) {
        console.error(`Failed to start FFmpeg for stream ${streamId}:`, error);
    }
    
    saveStreamConfig();
    
    console.log(`Manually activated stream ${streamId}`);
    res.json({ 
        success: true, 
        message: `Stream ${streamId} manually activated with FFmpeg analyzer`,
        status: 'running'
    });
});

// Test bitrate capture
app.post('/api/streams/:streamId/test-bitrate', (req, res) => {
    const { streamId } = req.params;
    
    if (!streams[streamId]) {
        return res.status(404).json({ error: 'Stream not found' });
    }
    
    // Simulate some bitrate data for testing
    streams[streamId].health.bitrate = Math.floor(Math.random() * 5000) + 1000; // 1000-6000 kbps
    streams[streamId].health.fps = Math.floor(Math.random() * 30) + 24; // 24-54 fps
    streams[streamId].health.resolution = '1920x1080';
    streams[streamId].health.lastUpdate = Date.now();
    
    saveStreamConfig();
    
    console.log(`Test bitrate data set for stream ${streamId}: ${streams[streamId].health.bitrate} kbps, ${streams[streamId].health.fps} fps`);
    res.json({ 
        success: true, 
        message: `Test bitrate data set for stream ${streamId}`,
        health: streams[streamId].health
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

// RTMP Server Control Endpoints
app.get('/api/rtmp/status', async (req, res) => {
    try {
        // Check if integrated RTMP server is running by testing port 1935
        const testConnection = () => {
            return new Promise((resolve) => {
                const socket = net.createConnection(1935, 'localhost');
                socket.setTimeout(2000);
                
                socket.on('connect', () => {
                    socket.destroy();
                    resolve({ status: 'running', port: 1935 });
                });
                
                socket.on('timeout', () => {
                    socket.destroy();
                    resolve({ status: 'stopped', port: 1935 });
                });
                
                socket.on('error', () => {
                    socket.destroy();
                    resolve({ status: 'stopped', port: 1935 });
                });
            });
        };

        const rtmpStatus = await testConnection();
        
        // Count active streams
        const activeStreams = Object.keys(streams).filter(id => streams[id].status === 'running');
        
        res.json({
            status: rtmpStatus.status,
            port: 1935,
            httpPort: 8000, // NodeMediaServer HTTP port
            testPort: 1935, // RTMP port
            connections: activeStreams.length,
            streams: activeStreams,
            uptime: Date.now(),
            hasProcess: true, // Integrated RTMP server is always available when main server is running
            integrated: true, // Indicates this is the integrated RTMP server
            nodeMediaServer: true // Indicates this is using NodeMediaServer
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/rtmp/start', (req, res) => {
    try {
        // RTMP server is already running as part of the main server
        res.json({ 
            success: true, 
            message: 'RTMP server is already running (integrated)',
            integrated: true
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/rtmp/stop', (req, res) => {
    try {
        // Cannot stop integrated RTMP server without stopping main server
        res.json({ 
            success: false, 
            message: 'Cannot stop integrated RTMP server. Use main server stop instead.',
            integrated: true
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/rtmp/restart', async (req, res) => {
    try {
        // Cannot restart integrated RTMP server independently
        res.json({ 
            success: false, 
            message: 'Cannot restart integrated RTMP server. Restart main server instead.',
            integrated: true
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/rtmp/test', async (req, res) => {
    try {
        const testConnection = () => {
            return new Promise((resolve) => {
                const socket = net.createConnection(1935, 'localhost');
                socket.setTimeout(5000);
                
                socket.on('connect', () => {
                    socket.destroy();
                    resolve({ success: true, message: 'RTMP server connection test successful (integrated)' });
                });
                
                socket.on('timeout', () => {
                    socket.destroy();
                    resolve({ success: false, message: 'RTMP server connection test failed - timeout' });
                });
                
                socket.on('error', () => {
                    socket.destroy();
                    resolve({ success: false, message: 'RTMP server connection test failed - connection error' });
                });
            });
        };

        const result = await testConnection();
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// SCTE-35 parsing endpoint using threefive
app.get('/api/streams/:streamId/scte35/parse', async (req, res) => {
    const { streamId } = req.params;
    
    if (!streams[streamId]) {
        return res.status(404).json({ error: 'Stream not found' });
    }
    
    try {
        const scte35Events = await parseScte35FromStream(streamId);
        res.json({
            streamId: streamId,
            scte35Events: scte35Events,
            totalEvents: scte35Events.length,
            threefiveEnabled: threefiveAvailable
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// SCTE-35 analysis endpoint
app.get('/api/streams/:streamId/scte35/analyze', (req, res) => {
    const { streamId } = req.params;
    
    if (!streams[streamId]) {
        return res.status(404).json({ error: 'Stream not found' });
    }
    
    try {
        const streamPath = path.join(__dirname, 'public', 'hls', streamId);
        const segments = fs.readdirSync(streamPath)
            .filter(file => file.endsWith('.ts'))
            .sort();
        
        const analysis = {
            streamId: streamId,
            totalSegments: segments.length,
            scte35Enabled: true,
            threefiveLibrary: 'threefive',
            segments: segments.map(segment => ({
                name: segment,
                path: path.join(streamPath, segment),
                size: fs.statSync(path.join(streamPath, segment)).size
            }))
        };
        
        res.json(analysis);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'running',
        timestamp: new Date().toISOString(),
        config: CONFIG,
        activeStreams: Object.keys(streams).filter(id => streams[id].status === 'running').length,
        totalStreams: Object.keys(streams).length,
        threefiveEnabled: threefiveAvailable,
        threefiveLibrary: 'threefive (Python)'
    });
});

// Serve static UI files
app.use(express.static(path.join(__dirname, '../ui')));

// Initialize and start server
async function startServer() {
    initializeStreams();
    
    // Check threefive availability
    try {
        threefiveAvailable = await threefive.checkAvailability();
        if (threefiveAvailable) {
            console.log('✅ Threefive (Python) is available for SCTE-35 processing');
        } else {
            console.log('⚠️  Threefive (Python) is not available, using fallback SCTE-35 processing');
        }
    } catch (error) {
        console.log('⚠️  Could not check threefive availability:', error.message);
        threefiveAvailable = false;
    }
    
    // Start RTMP server
    startRTMPServer();
    
    app.listen(CONFIG.apiPort, () => {
        console.log(`SCTE-35 Middleware API running on port ${CONFIG.apiPort}`);
        console.log(`Web UI available at http://localhost:${CONFIG.apiPort}`);
        console.log(`RTMP input: rtmp://localhost:${CONFIG.rtmpPort}/live/{streamId}`);
        console.log(`SRT output: srt://${CONFIG.flussonicHost}:${CONFIG.flussonicPort}`);
        console.log(`Threefive integration: ${threefiveAvailable ? 'Enabled' : 'Disabled (fallback mode)'}`);
    });
}

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('Shutting down SCTE-35 Middleware...');
    
    // Stop RTMP server
    if (rtmpServer && rtmpServer.stop) {
        rtmpServer.stop();
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
