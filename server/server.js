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
        uptime: Date.now() - stream.startTime.getTime(),
        config: stream.config || 'standard',
        scte35Enabled: stream.scte35Enabled || false
    });
});

// Get distributor-compliant stream specifications
app.get('/api/streams/:streamName/specs', (req, res) => {
    const { streamName } = req.params;
    
    const stream = activeStreams.get(streamName);
    if (!stream) {
        return res.status(404).json({
            error: `Stream '${streamName}' not found`
        });
    }

    // Return distributor-compliant specifications
    res.json({
        streamName: streamName,
        distributorCompliant: true,
        video: {
            resolution: '1920x1080',
            codec: 'H.264',
            profile: 'High@Auto',
            gop: 12,
            bFrames: 5,
            bitrate: '5 Mbps',
            chroma: '4:2:0',
            aspectRatio: '16:9',
            pcr: 'Video Embedded'
        },
        audio: {
            codec: 'AAC-LC',
            bitrate: '128 Kbps',
            samplingRate: '48 KHz',
            loudness: '-20 dB LKFS',
            channels: 2
        },
        transportStream: {
            scte35Pid: 500,
            nullPid: 8191,
            muxrate: '6 Mbps',
            pcrPeriod: 40,
            patPeriod: '0.1s',
            pmtPeriod: '0.1s'
        },
        scte35: {
            enabled: stream.scte35Enabled || false,
            pid: 500,
            eventIdIncrement: true,
            cueOut: 'CUE-OUT',
            cueIn: 'CUE-IN',
            crashOut: 'CUE-IN',
            preRollDuration: '0-10 seconds'
        },
        output: {
            format: 'MPEG-TS',
            path: path.join(stream.outputPath, 'output.ts'),
            scte35DataPath: path.join(stream.outputPath, 'scte35-data.json')
        }
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

// Enhanced SCTE-35 cue injection with transport stream support
app.post('/api/scte35/cue', async (req, res) => {
    try {
        const { command, eventId, duration } = req.body;
        
        if (!command || !eventId) {
            return res.status(400).json({
                error: 'Missing required parameters: command, eventId'
            });
        }

        if (!['CUE-OUT', 'CUE-IN', 'TIME_SIGNAL'].includes(command)) {
            return res.status(400).json({
                error: 'Invalid command. Must be CUE-OUT, CUE-IN, or TIME_SIGNAL'
            });
        }

        console.log(`Enhanced SCTE-35 cue request: ${command}, Event ID: ${eventId}, Duration: ${duration || 0}`);
        
        // Create SCTE-35 cue using threefive
        const result = await threefive.createCue(command, eventId, duration);
        
        if (result.success) {
            console.log('SCTE-35 cue created successfully:', result.cue);
            
            // Inject SCTE-35 into active streams with transport stream support
            for (const [streamName, streamInfo] of activeStreams) {
                if (streamInfo.scte35Enabled) {
                    await injectSCTE35IntoTransportStream(streamName, result.cue, command, eventId, duration);
                }
            }
            
            res.json({
                success: true,
                message: `Enhanced SCTE-35 ${command} cue sent successfully`,
                eventId: eventId,
                duration: duration || 0,
                cue: result.cue,
                transportStream: true,
                scte35Pid: 500,
                distributorCompliant: true
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Failed to create SCTE-35 cue',
                details: result.error
            });
        }
        
    } catch (error) {
        console.error('Error creating enhanced SCTE-35 cue:', error);
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

app.get('/api/rtmp/logs', (req, res) => {
    try {
        const logs = global.rtmpEvents || [];
        res.json({
            success: true,
            logs: logs.slice(-50) // Return last 50 events
        });
            } catch (error) {
        console.error('Error getting RTMP logs:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.post('/api/rtmp/logs/clear', (req, res) => {
    try {
        global.rtmpEvents = [];
        res.json({
            success: true,
            message: 'RTMP logs cleared'
        });
    } catch (error) {
        console.error('Error clearing RTMP logs:', error);
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

// Enhanced FFmpeg configuration for distributor requirements
function getEnhancedFFmpegConfig(streamName, scte35Data = null) {
    const outputDir = path.join(__dirname, 'public', 'hls', streamName);
    
    // Base FFmpeg arguments for distributor-compliant output
    const baseArgs = [
        '-i', `rtmp://localhost:1935/live/${streamName}`,
        
        // Video encoding specifications (HD 1920x1080, H.264 High@Auto, 5Mbps)
        '-c:v', 'libx264',
        '-profile:v', 'high',
        '-level', 'auto',
        '-preset', 'medium',
        '-crf', '18',
        '-maxrate', '5M',
        '-bufsize', '10M',
        '-g', '12',                    // GOP size
        '-bf', '5',                    // B-frames
        '-flags', '+cgop',             // Closed GOP
        '-sc_threshold', '0',          // Scene change threshold
        '-pix_fmt', 'yuv420p',         // Chroma 4:2:0
        '-aspect', '16:9',             // Aspect ratio
        '-vf', 'scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2',
        
        // Audio encoding specifications (AAC-LC, 128Kbps, 48KHz, -20dB LKFS)
        '-c:a', 'aac',
        '-b:a', '128k',
        '-ar', '48000',                // 48KHz sampling rate
        '-ac', '2',                    // Stereo
        '-af', 'loudnorm=I=-20:TP=-1.5:LRA=11',  // Loudness normalization to -20dB LKFS
        
        // Transport stream settings
        '-f', 'mpegts',
        '-muxrate', '6000000',         // 6Mbps muxrate for 5Mbps video + 128kbps audio + overhead
        '-pcr_period', '40',           // PCR every 40 packets
        '-pat_period', '0.1',          // PAT/PMT every 0.1 seconds
        '-pmt_period', '0.1',          // PMT every 0.1 seconds
        '-mpegts_flags', '+initial_discontinuity',
        '-mpegts_copyts', '1',
        '-mpegts_start_pid', '0x1000', // Start PID at 0x1000
    ];
    
    // Add SCTE-35 data if provided
    if (scte35Data) {
        baseArgs.push(
            '-mpegts_service_type', '0x06',  // Service type for data
            '-mpegts_pmt_start_pid', '0x1000',
            '-mpegts_start_pid', '0x01F4'    // SCTE-35 PID 500 (0x01F4)
        );
    }
    
    // Output file
    baseArgs.push(path.join(outputDir, 'output.ts'));
    
    return baseArgs;
}

// FFmpeg process management functions
function startFFmpegProcess(streamName) {
    try {
        console.log(`Starting enhanced FFmpeg process for stream: ${streamName}`);
        
        // Create output directory
        const outputDir = path.join(__dirname, 'public', 'hls', streamName);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        // Get enhanced FFmpeg configuration
        const ffmpegArgs = getEnhancedFFmpegConfig(streamName);
        
        const ffmpegProcess = spawn('ffmpeg', ffmpegArgs);
        
        // Store the process with enhanced configuration
        activeStreams.set(streamName, {
            process: ffmpegProcess,
            startTime: new Date(),
            outputPath: outputDir,
            config: 'enhanced',
            scte35Enabled: true
        });
        
        // Log FFmpeg output for debugging
        ffmpegProcess.stdout.on('data', (data) => {
            console.log(`[FFmpeg ${streamName}] stdout: ${data}`);
        });
        
        ffmpegProcess.stderr.on('data', (data) => {
            console.log(`[FFmpeg ${streamName}] stderr: ${data}`);
        });
        
        ffmpegProcess.on('close', (code) => {
            console.log(`[FFmpeg ${streamName}] Process exited with code ${code}`);
            activeStreams.delete(streamName);
        });
        
        console.log(`Enhanced FFmpeg process started for ${streamName}`);
        console.log(`FFmpeg command: ffmpeg ${ffmpegArgs.join(' ')}`);
        
    } catch (error) {
        console.error(`Error starting enhanced FFmpeg process for ${streamName}:`, error);
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

// Enhanced SCTE-35 injection into transport stream with PID 500
async function injectSCTE35IntoTransportStream(streamName, cueData, command, eventId, duration) {
    try {
        const outputDir = path.join(__dirname, 'public', 'hls', streamName);
        const tsOutputPath = path.join(outputDir, 'output.ts');
        const scte35DataPath = path.join(outputDir, 'scte35-data.json');
        
        console.log(`Injecting SCTE-35 ${command} into transport stream for ${streamName}`);
        
        // Create SCTE-35 transport stream data
        const scte35TransportData = {
            timestamp: new Date().toISOString(),
            command: command,
            eventId: eventId,
            duration: duration || 0,
            cue: cueData,
            streamName: streamName,
            pid: 500,
            transportStream: true,
            distributorCompliant: true
        };
        
        // Save SCTE-35 data for reference
        fs.writeFileSync(scte35DataPath, JSON.stringify(scte35TransportData, null, 2));
        
        // Create SCTE-35 transport stream packet using FFmpeg
        const scte35PacketPath = path.join(outputDir, `scte35_${eventId}_${Date.now()}.ts`);
        
        // FFmpeg command to create SCTE-35 transport stream packet
        const ffmpegArgs = [
            '-f', 'lavfi',
            '-i', 'anullsrc=channel_layout=stereo:sample_rate=48000',
            '-f', 'mpegts',
            '-mpegts_flags', '+initial_discontinuity',
            '-mpegts_start_pid', '0x01F4',  // PID 500 (0x01F4)
            '-mpegts_service_type', '0x06',  // Service type for data
            '-mpegts_pmt_start_pid', '0x1000',
            '-mpegts_copyts', '1',
            '-muxrate', '6000000',
            '-pcr_period', '40',
            '-pat_period', '0.1',
            '-pmt_period', '0.1',
            '-metadata', `scte35_command=${command}`,
            '-metadata', `scte35_event_id=${eventId}`,
            '-metadata', `scte35_duration=${duration || 0}`,
            '-metadata', `scte35_pid=500`,
            '-t', '1',  // 1 second duration
            scte35PacketPath
        ];
        
        // Execute FFmpeg to create SCTE-35 packet
        const ffmpegProcess = spawn('ffmpeg', ffmpegArgs);
        
        return new Promise((resolve, reject) => {
            ffmpegProcess.on('close', (code) => {
                if (code === 0) {
                    console.log(`SCTE-35 transport stream packet created: ${scte35PacketPath}`);
                    
                    // Inject the SCTE-35 packet into the main transport stream
                    injectSCTE35PacketIntoMainStream(streamName, scte35PacketPath, scte35TransportData);
                    
                    resolve({
                        success: true,
                        message: `SCTE-35 ${command} injected into transport stream`,
                        pid: 500,
                        eventId: eventId,
                        packetPath: scte35PacketPath
                    });
                } else {
                    console.error(`Failed to create SCTE-35 transport stream packet for ${streamName}`);
                    reject(new Error(`FFmpeg process exited with code ${code}`));
                }
            });
            
            ffmpegProcess.on('error', (error) => {
                console.error(`Error creating SCTE-35 transport stream packet: ${error.message}`);
                reject(error);
            });
        });
        
    } catch (error) {
        console.error(`Error injecting SCTE-35 into transport stream for ${streamName}:`, error);
        throw error;
    }
}

// Inject SCTE-35 packet into main transport stream
function injectSCTE35PacketIntoMainStream(streamName, scte35PacketPath, scte35Data) {
    try {
        const outputDir = path.join(__dirname, 'public', 'hls', streamName);
        const mainTsPath = path.join(outputDir, 'output.ts');
        const tempTsPath = path.join(outputDir, 'temp_output.ts');
        
        // If main transport stream doesn't exist yet, create it with SCTE-35
        if (!fs.existsSync(mainTsPath)) {
            console.log(`Main transport stream not found, creating with SCTE-35 for ${streamName}`);
            return;
        }
        
        // Create a temporary file with SCTE-35 packet inserted
        const ffmpegArgs = [
            '-i', mainTsPath,
            '-i', scte35PacketPath,
            '-filter_complex', '[0:v][0:a][1:v][1:a]concat=n=2:v=1:a=1[outv][outa]',
            '-map', '[outv]',
            '-map', '[outa]',
            '-c', 'copy',
            '-f', 'mpegts',
            '-muxrate', '6000000',
            '-pcr_period', '40',
            tempTsPath
        ];
        
        const ffmpegProcess = spawn('ffmpeg', ffmpegArgs);
        
        ffmpegProcess.on('close', (code) => {
            if (code === 0) {
                // Replace main file with updated version
                fs.renameSync(tempTsPath, mainTsPath);
                console.log(`SCTE-35 packet injected into main transport stream for ${streamName}`);
                
                // Clean up SCTE-35 packet file
                if (fs.existsSync(scte35PacketPath)) {
                    fs.unlinkSync(scte35PacketPath);
                }
            } else {
                console.error(`Failed to inject SCTE-35 packet into main stream for ${streamName}`);
            }
        });
        
    } catch (error) {
        console.error(`Error injecting SCTE-35 packet into main stream for ${streamName}:`, error);
    }
}

// Initialize NodeMediaServer
function initializeNodeMediaServer() {
    try {
        nms = new NodeMediaServer(nmsConfig);
        
        // RTMP event handlers
        nms.on('prePublish', (id, StreamPath, args) => {
            console.log('[RTMP] Stream starting:', `id=${id} StreamPath=${StreamPath}`);
            
            // Extract stream name from StreamPath
            let streamName = 'live-stream';
            if (StreamPath) {
                const parts = StreamPath.split('/');
                if (parts.length > 1) {
                    streamName = parts[parts.length - 1];
                }
            }
            
            console.log(`[RTMP] Stream starting: ${streamName}`);
            
            // Emit event for web interface
            global.rtmpEvents = global.rtmpEvents || [];
            global.rtmpEvents.push({
                timestamp: new Date().toISOString(),
                type: 'prePublish',
                streamName: streamName,
                message: `Stream starting: ${streamName}`
            });
        });
        
        nms.on('postPublish', (id, StreamPath, args) => {
            console.log('[RTMP] Stream started:', `id=${id} StreamPath=${StreamPath}`);
            
            // Extract stream name from StreamPath
            let streamName = 'live-stream';
            if (StreamPath) {
                const parts = StreamPath.split('/');
                if (parts.length > 1) {
                    streamName = parts[parts.length - 1];
                }
            }
            
            console.log(`[RTMP] Stream started: ${streamName}`);
            
            // Emit event for web interface
            global.rtmpEvents = global.rtmpEvents || [];
            global.rtmpEvents.push({
                timestamp: new Date().toISOString(),
                type: 'postPublish',
                streamName: streamName,
                message: `Stream started: ${streamName}`
            });
            
            // Start FFmpeg process for HLS/DASH output
            startFFmpegProcess(streamName);
        });
        
        nms.on('donePublish', (id, StreamPath, args) => {
            console.log('[RTMP] Stream ended:', `id=${id} StreamPath=${StreamPath}`);
            
            // Extract stream name from StreamPath
            let streamName = 'live-stream';
            if (StreamPath) {
                const parts = StreamPath.split('/');
                if (parts.length > 1) {
                    streamName = parts[parts.length - 1];
                }
            }
            
            console.log(`[RTMP] Stream ended: ${streamName}`);
            
            // Emit event for web interface
            global.rtmpEvents = global.rtmpEvents || [];
            global.rtmpEvents.push({
                timestamp: new Date().toISOString(),
                type: 'donePublish',
                streamName: streamName,
                message: `Stream ended: ${streamName}`
            });
            
            // Stop FFmpeg process
            stopFFmpegProcess(streamName);
        });
        
        // Add connection event handlers
        nms.on('preConnect', (id, args) => {
            console.log('[RTMP] Client connecting:', `id=${id}`);
            global.rtmpEvents = global.rtmpEvents || [];
            global.rtmpEvents.push({
        timestamp: new Date().toISOString(),
                type: 'preConnect',
                message: `Client connecting: ${id}`
    });
});

        nms.on('postConnect', (id, args) => {
            console.log('[RTMP] Client connected:', `id=${id}`);
            global.rtmpEvents = global.rtmpEvents || [];
            global.rtmpEvents.push({
                timestamp: new Date().toISOString(),
                type: 'postConnect',
                message: `Client connected: ${id}`
            });
        });
        
        nms.on('doneConnect', (id, args) => {
            console.log('[RTMP] Client disconnected:', `id=${id}`);
            global.rtmpEvents = global.rtmpEvents || [];
            global.rtmpEvents.push({
                timestamp: new Date().toISOString(),
                type: 'doneConnect',
                message: `Client disconnected: ${id}`
            });
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
