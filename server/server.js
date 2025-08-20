const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const NodeMediaServer = require('node-media-server');
const ThreeFiveIntegration = require('./threefive-integration.js');
const SCTE35Scheduler = require('./scte35-scheduler.js');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client')));

// Initialize threefive integration
const threefive = new ThreeFiveIntegration();

// Initialize scheduler
const scheduler = new SCTE35Scheduler();

// Store active streams
const activeStreams = new Map();

// Store scheduled SCTE-35 events
const scheduledEvents = new Map();
let eventCounter = 1;

// NodeMediaServer configuration
const nmsConfig = {
    rtmp: {
        port: 1935,
        chunk_size: 60000,
        gop_cache: true,
        ping: 30,
        ping_timeout: 60,
        maxConnections: 100
    },
    http: {
        port: 8000,
        allow_origin: '*'
    }
};

// Initialize NodeMediaServer
let nms = null;

// Utility function to check if ffmpeg is available
function checkFFmpeg() {
    return new Promise((resolve) => {
        const process = spawn('ffmpeg', ['-version']);
        process.on('close', (code) => {
            resolve(code === 0);
        });
        process.on('error', () => {
            resolve(false);
        });
    });
}

// Utility function to check if ffprobe is available
function checkFFprobe() {
    return new Promise((resolve) => {
        const process = spawn('ffprobe', ['-version']);
        process.on('close', (code) => {
            resolve(code === 0);
        });
        process.on('error', () => {
            resolve(false);
        });
    });
}

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/index.html'));
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
    try {
        const ffmpegAvailable = await checkFFmpeg();
        const ffprobeAvailable = await checkFFprobe();
        const threefiveAvailable = await threefive.checkAvailability();
        
        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            tools: {
                ffmpeg: ffmpegAvailable,
                ffprobe: ffprobeAvailable,
                threefive: threefiveAvailable
            },
            scheduler: {
                running: scheduler.running,
                activeSchedules: scheduler.getAllSchedules().filter(s => s.active).length
            }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
});

// Start a new stream
app.post('/api/streams', async (req, res) => {
    try {
        const { inputUrl, outputPath, streamName } = req.body;
        
        if (!inputUrl || !outputPath || !streamName) {
            return res.status(400).json({
                error: 'Missing required parameters: inputUrl, outputPath, streamName'
            });
        }

        // Check if stream already exists
        if (activeStreams.has(streamName)) {
            return res.status(409).json({
                error: `Stream '${streamName}' is already running`
            });
        }

        // Create output directory if it doesn't exist
        const outputDir = path.dirname(outputPath);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        // FFmpeg command for HLS streaming
        const ffmpegArgs = [
            '-i', inputUrl,
            '-c:v', 'libx264',
            '-c:a', 'aac',
            '-hls_time', '2',
            '-hls_list_size', '0',
            '-hls_segment_filename', path.join(outputDir, 'segment_%03d.ts'),
            '-f', 'hls',
            outputPath
        ];

        const ffmpegProcess = spawn('ffmpeg', ffmpegArgs);
        
        let ffmpegOutput = '';
        let ffmpegError = '';

        ffmpegProcess.stdout.on('data', (data) => {
            ffmpegOutput += data.toString();
        });

        ffmpegProcess.stderr.on('data', (data) => {
            ffmpegError += data.toString();
            console.log(`FFmpeg stderr [${streamName}]:`, data.toString());
        });

        ffmpegProcess.on('close', (code) => {
            console.log(`Stream ${streamName} ended with code ${code}`);
            activeStreams.delete(streamName);
        });

        ffmpegProcess.on('error', (error) => {
            console.error(`FFmpeg error for stream ${streamName}:`, error);
            activeStreams.delete(streamName);
        });

        // Store stream info
        activeStreams.set(streamName, {
            process: ffmpegProcess,
            inputUrl,
            outputPath,
            startTime: new Date(),
            status: 'running'
        });

        res.json({
            message: `Stream '${streamName}' started successfully`,
            streamName,
            outputPath,
            startTime: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error starting stream:', error);
        res.status(500).json({
            error: 'Failed to start stream',
            details: error.message
        });
    }
});

// Stop a stream
app.delete('/api/streams/:streamName', (req, res) => {
    const { streamName } = req.params;
    
    const stream = activeStreams.get(streamName);
    if (!stream) {
        return res.status(404).json({
            error: `Stream '${streamName}' not found`
        });
    }

    try {
        stream.process.kill('SIGTERM');
        activeStreams.delete(streamName);
        
        res.json({
            message: `Stream '${streamName}' stopped successfully`
        });
    } catch (error) {
        console.error('Error stopping stream:', error);
        res.status(500).json({
            error: 'Failed to stop stream',
            details: error.message
        });
    }
});

// Get all active streams
app.get('/api/streams', (req, res) => {
    const streams = Array.from(activeStreams.entries()).map(([name, info]) => ({
        name,
        inputUrl: info.inputUrl,
        outputPath: info.outputPath,
        startTime: info.startTime,
        status: info.status,
        uptime: Date.now() - info.startTime.getTime()
    }));

    res.json({
        streams,
        count: streams.length
    });
});

// Get stream status
app.get('/api/streams/:streamName', (req, res) => {
    const { streamName } = req.params;
    
    const stream = activeStreams.get(streamName);
    if (!stream) {
        return res.status(404).json({
            error: `Stream '${streamName}' not found`
        });
    }

    res.json({
        name: streamName,
        inputUrl: stream.inputUrl,
        outputPath: stream.outputPath,
        startTime: stream.startTime,
        status: stream.status,
        uptime: Date.now() - stream.startTime.getTime()
    });
});

// SCTE-35 Scheduler Routes

// Get all schedules
app.get('/api/scheduler/schedules', (req, res) => {
    res.json({
        schedules: scheduler.getAllSchedules(),
        running: scheduler.running
    });
});

// Create a new schedule
app.post('/api/scheduler/schedules', async (req, res) => {
    try {
        const scheduleData = req.body;
        
        // Validate required fields
        if (!scheduleData.name || !scheduleData.streamName || !scheduleData.command || 
            !scheduleData.eventId || !scheduleData.startTime) {
            return res.status(400).json({
                error: 'Missing required fields: name, streamName, command, eventId, startTime'
            });
        }

        const scheduleId = scheduler.addSchedule(scheduleData);
        
        res.json({
            message: 'Schedule created successfully',
            scheduleId,
            schedule: scheduler.getSchedule(scheduleId)
        });
    } catch (error) {
        console.error('Error creating schedule:', error);
        res.status(500).json({
            error: 'Failed to create schedule',
            details: error.message
        });
    }
});

// Update a schedule
app.put('/api/scheduler/schedules/:scheduleId', (req, res) => {
    try {
        const { scheduleId } = req.params;
        const updates = req.body;
        
        const success = scheduler.updateSchedule(scheduleId, updates);
        
        if (success) {
            res.json({
                message: 'Schedule updated successfully',
                schedule: scheduler.getSchedule(scheduleId)
            });
        } else {
            res.status(404).json({
                error: 'Schedule not found'
            });
        }
    } catch (error) {
        console.error('Error updating schedule:', error);
        res.status(500).json({
            error: 'Failed to update schedule',
            details: error.message
        });
    }
});

// Delete a schedule
app.delete('/api/scheduler/schedules/:scheduleId', (req, res) => {
    try {
        const { scheduleId } = req.params;
        
        const success = scheduler.removeSchedule(scheduleId);
        
        if (success) {
            res.json({
                message: 'Schedule deleted successfully'
            });
        } else {
            res.status(404).json({
                error: 'Schedule not found'
            });
        }
    } catch (error) {
        console.error('Error deleting schedule:', error);
        res.status(500).json({
            error: 'Failed to delete schedule',
            details: error.message
        });
    }
});

// Get a specific schedule
app.get('/api/scheduler/schedules/:scheduleId', (req, res) => {
    const { scheduleId } = req.params;
    
    const schedule = scheduler.getSchedule(scheduleId);
    
    if (schedule) {
        res.json(schedule);
    } else {
        res.status(404).json({
            error: 'Schedule not found'
        });
    }
});

// Start/Stop scheduler
app.post('/api/scheduler/control', (req, res) => {
    try {
        const { action } = req.body;
        
        if (action === 'start') {
            scheduler.start();
            res.json({
                message: 'Scheduler started successfully',
                running: scheduler.running
            });
        } else if (action === 'stop') {
            scheduler.stop();
            res.json({
                message: 'Scheduler stopped successfully',
                running: scheduler.running
            });
        } else {
            res.status(400).json({
                error: 'Invalid action. Use "start" or "stop"'
            });
        }
    } catch (error) {
        console.error('Error controlling scheduler:', error);
        res.status(500).json({
            error: 'Failed to control scheduler',
            details: error.message
        });
    }
});

// Execute a schedule immediately
app.post('/api/scheduler/schedules/:scheduleId/execute', async (req, res) => {
    try {
        const { scheduleId } = req.params;
        const schedule = scheduler.schedules.get(scheduleId);
        
        if (!schedule) {
            return res.status(404).json({
                error: 'Schedule not found'
            });
        }

        const result = await scheduler.executeSchedule(schedule);
        
        if (result.success) {
            res.json({
                message: 'Schedule executed successfully',
                result
            });
        } else {
            res.status(500).json({
                error: 'Failed to execute schedule',
                details: result.error
            });
        }
    } catch (error) {
        console.error('Error executing schedule:', error);
        res.status(500).json({
            error: 'Failed to execute schedule',
            details: error.message
        });
    }
});

// SCTE-35 Scheduler Routes

// Get all schedules
app.get('/api/scheduler/schedules', (req, res) => {
    res.json({
        schedules: scheduler.getAllSchedules(),
        running: scheduler.running
    });
});

// Create a new schedule
app.post('/api/scheduler/schedules', async (req, res) => {
    try {
        const scheduleData = req.body;
        
        // Validate required fields
        if (!scheduleData.name || !scheduleData.streamName || !scheduleData.command || 
            !scheduleData.eventId || !scheduleData.startTime) {
            return res.status(400).json({
                error: 'Missing required fields: name, streamName, command, eventId, startTime'
            });
        }

        const scheduleId = scheduler.addSchedule(scheduleData);
        
        res.json({
            message: 'Schedule created successfully',
            scheduleId,
            schedule: scheduler.getSchedule(scheduleId)
        });
    } catch (error) {
        console.error('Error creating schedule:', error);
        res.status(500).json({
            error: 'Failed to create schedule',
            details: error.message
        });
    }
});

// Update a schedule
app.put('/api/scheduler/schedules/:scheduleId', (req, res) => {
    try {
        const { scheduleId } = req.params;
        const updates = req.body;
        
        const success = scheduler.updateSchedule(scheduleId, updates);
        
        if (success) {
            res.json({
                message: 'Schedule updated successfully',
                schedule: scheduler.getSchedule(scheduleId)
            });
        } else {
            res.status(404).json({
                error: 'Schedule not found'
            });
        }
    } catch (error) {
        console.error('Error updating schedule:', error);
        res.status(500).json({
            error: 'Failed to update schedule',
            details: error.message
        });
    }
});

// Delete a schedule
app.delete('/api/scheduler/schedules/:scheduleId', (req, res) => {
    try {
        const { scheduleId } = req.params;
        
        const success = scheduler.removeSchedule(scheduleId);
        
        if (success) {
            res.json({
                message: 'Schedule deleted successfully'
            });
        } else {
            res.status(404).json({
                error: 'Schedule not found'
            });
        }
    } catch (error) {
        console.error('Error deleting schedule:', error);
        res.status(500).json({
            error: 'Failed to delete schedule',
            details: error.message
        });
    }
});

// Get a specific schedule
app.get('/api/scheduler/schedules/:scheduleId', (req, res) => {
    const { scheduleId } = req.params;
    
    const schedule = scheduler.getSchedule(scheduleId);
    
    if (schedule) {
        res.json(schedule);
    } else {
        res.status(404).json({
            error: 'Schedule not found'
        });
    }
});

// Start/Stop scheduler
app.post('/api/scheduler/control', (req, res) => {
    try {
        const { action } = req.body;
        
        if (action === 'start') {
            scheduler.start();
            res.json({
                message: 'Scheduler started successfully',
                running: scheduler.running
            });
        } else if (action === 'stop') {
            scheduler.stop();
            res.json({
                message: 'Scheduler stopped successfully',
                running: scheduler.running
            });
        } else {
            res.status(400).json({
                error: 'Invalid action. Use "start" or "stop"'
            });
        }
    } catch (error) {
        console.error('Error controlling scheduler:', error);
        res.status(500).json({
            error: 'Failed to control scheduler',
            details: error.message
        });
    }
});

// Execute a schedule immediately
app.post('/api/scheduler/schedules/:scheduleId/execute', async (req, res) => {
    try {
        const { scheduleId } = req.params;
        const schedule = scheduler.schedules.get(scheduleId);
        
        if (!schedule) {
            return res.status(404).json({
                error: 'Schedule not found'
            });
        }

        const result = await scheduler.executeSchedule(schedule);
        
        if (result.success) {
            res.json({
                message: 'Schedule executed successfully',
                result
            });
        } else {
            res.status(500).json({
                error: 'Failed to execute schedule',
                details: result.error
            });
        }
    } catch (error) {
        console.error('Error executing schedule:', error);
        res.status(500).json({
            error: 'Failed to execute schedule',
            details: error.message
        });
    }
});

// SCTE-35 Integration Routes

// Create SCTE-35 cue
app.post('/api/scte35/cue', async (req, res) => {
    try {
        const { command, eventId, duration } = req.body;
        
        if (!command || !eventId) {
            return res.status(400).json({
                error: 'Missing required parameters: command, eventId'
            });
        }

        if (!['CUE-OUT', 'CUE-IN'].includes(command)) {
            return res.status(400).json({
                error: 'Invalid command. Must be CUE-OUT or CUE-IN'
            });
        }

        const result = await threefive.createCue(command, eventId, duration);
        res.json(result);
    } catch (error) {
        console.error('Error creating SCTE-35 cue:', error);
        res.status(500).json({
            error: 'Failed to create SCTE-35 cue',
            details: error.message
        });
    }
});

// Parse SCTE-35 from stream
app.get('/api/scte35/parse/:streamPath(*)', async (req, res) => {
    try {
        const { streamPath } = req.params;
        
        if (!fs.existsSync(streamPath)) {
            return res.status(404).json({
                error: 'Stream file not found'
            });
        }

        const cues = await threefive.parseStream(streamPath);
        res.json({
            streamPath,
            cues,
            count: cues.length,
            threefiveEnabled: true
        });
    } catch (error) {
        console.error('Error parsing SCTE-35:', error);
        res.status(500).json({
            error: 'Failed to parse SCTE-35',
            details: error.message
        });
    }
});

// Analyze segments for SCTE-35
app.get('/api/scte35/analyze/:segmentsDir(*)', async (req, res) => {
    try {
        const { segmentsDir } = req.params;
        
        if (!fs.existsSync(segmentsDir)) {
            return res.status(404).json({
                error: 'Segments directory not found'
            });
        }

        const analysis = await threefive.analyzeSegments(segmentsDir);
        res.json(analysis);
    } catch (error) {
        console.error('Error analyzing segments:', error);
        res.status(500).json({
            error: 'Failed to analyze segments',
            details: error.message
        });
    }
});

// Show stream information
app.get('/api/scte35/show/:streamPath(*)', async (req, res) => {
    try {
        const { streamPath } = req.params;
        
        if (!fs.existsSync(streamPath)) {
            return res.status(404).json({
                error: 'Stream file not found'
            });
        }

        const info = await threefive.showStream(streamPath);
        res.json(info);
    } catch (error) {
        console.error('Error showing stream info:', error);
        res.status(500).json({
            error: 'Failed to show stream info',
            details: error.message
        });
    }
});

// Get iframes from stream
app.get('/api/scte35/iframes/:streamPath(*)', async (req, res) => {
    try {
        const { streamPath } = req.params;
        
        if (!fs.existsSync(streamPath)) {
            return res.status(404).json({
                error: 'Stream file not found'
            });
        }

        const iframes = await threefive.getIframes(streamPath);
        res.json(iframes);
    } catch (error) {
        console.error('Error getting iframes:', error);
        res.status(500).json({
            error: 'Failed to get iframes',
            details: error.message
        });
    }
});

// Get PTS from stream
app.get('/api/scte35/pts/:streamPath(*)', async (req, res) => {
    try {
        const { streamPath } = req.params;
        
        if (!fs.existsSync(streamPath)) {
            return res.status(404).json({
                error: 'Stream file not found'
            });
        }

        const pts = await threefive.getPts(streamPath);
        res.json(pts);
    } catch (error) {
        console.error('Error getting PTS:', error);
        res.status(500).json({
            error: 'Failed to get PTS',
            details: error.message
        });
    }
});

// Create sidecar file
app.post('/api/scte35/sidecar', async (req, res) => {
    try {
        const { streamPath, outputPath } = req.body;
        
        if (!streamPath || !outputPath) {
            return res.status(400).json({
                error: 'Missing required parameters: streamPath, outputPath'
            });
        }

        if (!fs.existsSync(streamPath)) {
            return res.status(404).json({
                error: 'Stream file not found'
            });
        }

        const result = await threefive.createSidecar(streamPath, outputPath);
        res.json(result);
    } catch (error) {
        console.error('Error creating sidecar:', error);
        res.status(500).json({
            error: 'Failed to create sidecar',
            details: error.message
        });
    }
});

// RTMP Server Management Endpoints
app.post('/api/rtmp/config', (req, res) => {
    try {
        const { rtmpPort, httpPort, maxConnections, bufferSize, enableAuth } = req.body;
        
        // Update NodeMediaServer configuration
        if (nms) {
            // Update the global config
            nmsConfig.rtmp.port = rtmpPort;
            nmsConfig.http.port = httpPort;
            nmsConfig.rtmp.maxConnections = maxConnections;
            nmsConfig.rtmp.chunk_size = bufferSize * 1024 * 1024; // Convert MB to bytes
            
            console.log('RTMP server configuration updated:', req.body);
        }
        
        res.json({
            success: true,
            message: 'RTMP server configuration applied successfully'
        });
    } catch (error) {
        console.error('Error updating RTMP config:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.post('/api/rtmp/stop', (req, res) => {
    try {
        if (nms) {
            nms.stop();
            console.log('RTMP server stopped');
        }
        
        res.json({
            success: true,
            message: 'RTMP server stopped successfully'
        });
    } catch (error) {
        console.error('Error stopping RTMP server:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.post('/api/rtmp/test', (req, res) => {
    try {
        const { port } = req.body;
        
        // Test if port is available
        const net = require('net');
        const server = net.createServer();
        
        server.listen(port, () => {
            server.close();
            res.json({
                success: true,
                message: `Port ${port} is available`
            });
        });
        
        server.on('error', (err) => {
            res.json({
                success: false,
                error: `Port ${port} is not available: ${err.message}`
            });
        });
    } catch (error) {
        console.error('Error testing RTMP port:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.post('/api/rtmp/stream/:streamId/disconnect', (req, res) => {
    try {
        const { streamId } = req.params;
        
        // Find and disconnect the stream
        if (nms && nms.sessions) {
            const session = nms.sessions.get(streamId);
            if (session) {
                session.close();
                console.log(`Stream ${streamId} disconnected`);
            }
        }
        
        res.json({
            success: true,
            message: `Stream ${streamId} disconnected successfully`
        });
    } catch (error) {
        console.error('Error disconnecting stream:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.get('/api/rtmp/status', (req, res) => {
    try {
        const status = {
            running: nms ? true : false,
            connections: nms && nms.sessions ? nms.sessions.size : 0,
            streams: activeStreams.size,
            uptime: nms ? Date.now() - (nms.startTime || Date.now()) : 0
        };
        
        res.json({
            success: true,
            status: status
        });
    } catch (error) {
        console.error('Error getting RTMP status:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({
        error: 'Internal server error',
        message: error.message
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Endpoint not found'
    });
});

// FFmpeg process management functions
function startFFmpegProcess(streamName) {
    try {
        console.log(`Starting FFmpeg process for stream: ${streamName}`);
        
        // Create output directory
        const outputDir = path.join(__dirname, 'public', 'hls', streamName);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        // FFmpeg command for HLS output
        const ffmpegArgs = [
            '-i', `rtmp://localhost:1935/live/${streamName}`,
            '-c:v', 'copy',
            '-c:a', 'copy',
            '-f', 'hls',
            '-hls_time', '2',
            '-hls_list_size', '10',
            '-hls_flags', 'delete_segments',
            '-hls_segment_filename', path.join(outputDir, 'segment_%03d.ts'),
            path.join(outputDir, 'index.m3u8')
        ];
        
        const ffmpegProcess = spawn('ffmpeg', ffmpegArgs);
        
        // Store the process
        activeStreams.set(streamName, {
            process: ffmpegProcess,
            startTime: new Date(),
            outputPath: outputDir
        });
        
        console.log(`FFmpeg process started for ${streamName}`);
        
    } catch (error) {
        console.error(`Error starting FFmpeg process for ${streamName}:`, error);
    }
}

function stopFFmpegProcess(streamName) {
    try {
        const stream = activeStreams.get(streamName);
        if (stream && stream.process) {
            stream.process.kill('SIGTERM');
            activeStreams.delete(streamName);
            console.log(`FFmpeg process stopped for ${streamName}`);
        }
    } catch (error) {
        console.error(`Error stopping FFmpeg process for ${streamName}:`, error);
    }
}

// Initialize NodeMediaServer
function initializeNodeMediaServer() {
    try {
        nms = new NodeMediaServer(nmsConfig);
        
        // RTMP event handlers
        nms.on('prePublish', (id, StreamPath, args) => {
            console.log('[NodeEvent on prePublish]', `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`);
            
            // Extract stream name from StreamPath
            let streamName = 'live-stream';
            if (StreamPath) {
                const parts = StreamPath.split('/');
                if (parts.length > 1) {
                    streamName = parts[parts.length - 1];
                }
            }
            
            console.log(`Stream starting: ${streamName}`);
        });
        
        nms.on('postPublish', (id, StreamPath, args) => {
            console.log('[NodeEvent on postPublish]', `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`);
            
            // Extract stream name from StreamPath
            let streamName = 'live-stream';
            if (StreamPath) {
                const parts = StreamPath.split('/');
                if (parts.length > 1) {
                    streamName = parts[parts.length - 1];
                }
            }
            
            console.log(`Stream started: ${streamName}`);
            
            // Start FFmpeg process for HLS/DASH output
            startFFmpegProcess(streamName);
        });
        
        nms.on('donePublish', (id, StreamPath, args) => {
            console.log('[NodeEvent on donePublish]', `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`);
            
            // Extract stream name from StreamPath
            let streamName = 'live-stream';
            if (StreamPath) {
                const parts = StreamPath.split('/');
                if (parts.length > 1) {
                    streamName = parts[parts.length - 1];
                }
            }
            
            console.log(`Stream ended: ${streamName}`);
            
            // Stop FFmpeg process
            stopFFmpegProcess(streamName);
        });
        
        nms.run();
        console.log('NodeMediaServer started on RTMP port 1935 and HTTP port 8000');
        
    } catch (error) {
        console.error('Error starting NodeMediaServer:', error);
    }
}

// Start server
app.listen(PORT, () => {
    console.log(`SCTE-MW Server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
    console.log(`Web interface: http://localhost:${PORT}`);
    
    // Start NodeMediaServer
    initializeNodeMediaServer();
    
    // Start the scheduler
    scheduler.start();
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down server...');
    
    // Stop scheduler
    scheduler.stop();
    
    // Stop all active streams
    for (const [streamName, stream] of activeStreams.entries()) {
        console.log(`Stopping stream: ${streamName}`);
        stream.process.kill('SIGTERM');
    }
    
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\nShutting down server...');
    
    // Stop scheduler
    scheduler.stop();
    
    // Stop all active streams
    for (const [streamName, stream] of activeStreams.entries()) {
        console.log(`Stopping stream: ${streamName}`);
        stream.process.kill('SIGTERM');
    }
    
    process.exit(0);
});
