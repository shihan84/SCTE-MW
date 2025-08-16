const NodeMediaServer = require('node-media-server');
const fs = require('fs');
const path = require('path');
const http = require('http');

// RTMP Server Configuration
const rtmpConfig = {
    rtmp: {
        port: 1935,
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

// Create RTMP server instance
const nms = new NodeMediaServer(rtmpConfig);

// Event handlers for better debugging
nms.on('preConnect', (id, args) => {
    console.log('[RTMP] Pre-connect:', id, args);
});

nms.on('postConnect', (id, args) => {
    console.log('[RTMP] Post-connect:', id, args);
});

nms.on('doneConnect', (id, args) => {
    console.log('[RTMP] Done-connect:', id, args);
});

nms.on('prePublish', (id, StreamPath, args) => {
    console.log('[RTMP] Pre-publish:', id, StreamPath, args);
    
    // Allow all streams - no rejection
    console.log(`[RTMP] Allowing stream: ${StreamPath}`);
});

nms.on('postPublish', (id, StreamPath, args) => {
    console.log('[RTMP] Post-publish:', id, StreamPath, args);
    console.log(`[RTMP] Stream started: ${StreamPath}`);
    
    // Log stream info
    const streamKey = StreamPath.split('/').pop();
    console.log(`[RTMP] Stream Key: ${streamKey}`);
    console.log(`[RTMP] Full URL: rtmp://localhost:1935${StreamPath}`);
});

nms.on('donePublish', (id, StreamPath, args) => {
    console.log('[RTMP] Done-publish:', id, StreamPath, args);
    console.log(`[RTMP] Stream ended: ${StreamPath}`);
});

nms.on('prePlay', (id, StreamPath, args) => {
    console.log('[RTMP] Pre-play:', id, StreamPath, args);
});

nms.on('postPlay', (id, StreamPath, args) => {
    console.log('[RTMP] Post-play:', id, StreamPath, args);
});

nms.on('donePlay', (id, StreamPath, args) => {
    console.log('[RTMP] Done-play:', id, StreamPath, args);
});

// Error handling
nms.on('error', (err) => {
    console.error('[RTMP] Server error:', err);
});

// Start the server
try {
    nms.run();
    console.log('[RTMP] Server started successfully');
} catch (error) {
    console.error('[RTMP] Failed to start server:', error);
    process.exit(1);
}

console.log('='.repeat(60));
console.log('🎥 STANDALONE RTMP SERVER STARTED');
console.log('='.repeat(60));
console.log(`📡 RTMP Server: rtmp://localhost:1935`);
console.log(`🌐 HTTP Server: http://localhost:8000`);
console.log(`📺 HLS Streams: http://localhost:8000/live/{streamKey}/index.m3u8`);
console.log(`📊 Dash Streams: http://localhost:8000/live/{streamKey}/index.mpd`);
console.log('='.repeat(60));
console.log('');

// OBS Configuration Guide
console.log('📋 OBS STUDIO CONFIGURATION:');
console.log('1. Open OBS Studio');
console.log('2. Go to Settings > Stream');
console.log('3. Set Service to "Custom"');
console.log('4. Server: rtmp://localhost:1935/live');
console.log('5. Stream Key: your-stream-name (e.g., stream1, stream2)');
console.log('6. Click "Start Streaming"');
console.log('');

// Test connection info
console.log('🔧 TESTING CONNECTIONS:');
console.log('• OBS RTMP URL: rtmp://localhost:1935/live/stream1');
console.log('• VLC HLS URL: http://localhost:8000/live/stream1/index.m3u8');
console.log('• Browser HLS: http://localhost:8000/live/stream1/index.m3u8');
console.log('');

// Test HTTP server after a delay
setTimeout(() => {
    const testServer = http.createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('RTMP Server is running!\n');
    });
    
    testServer.listen(8001, () => {
        console.log('[HTTP] Test server running on port 8001');
        console.log('[HTTP] Test URL: http://localhost:8001');
    });
}, 2000);

// Keep the process alive
process.on('SIGINT', () => {
    console.log('\n[RTMP] Shutting down RTMP server...');
    nms.stop();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n[RTMP] Shutting down RTMP server...');
    nms.stop();
    process.exit(0);
});
