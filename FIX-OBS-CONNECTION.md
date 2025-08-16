# 🚨 FIX OBS CONNECTION ERROR

## ❌ **Problem: "Failed to connect to server from OBS"**

This means OBS cannot reach the RTMP server on port 1935. Let's fix this step by step.

---

## 🔧 **IMMEDIATE FIXES**

### **Step 1: Check if Middleware is Running**
```bash
# Run this to check server status:
curl http://localhost:3000/api/health
```

**Expected Response:**
```json
{
  "status": "running",
  "activeStreams": 0,
  "totalStreams": 0
}
```

**If this fails:** The middleware isn't running. Run `launch-all.bat`

### **Step 2: Check RTMP Port**
```bash
# Check if port 1935 is listening:
netstat -an | findstr :1935
```

**Expected Response:**
```
TCP    0.0.0.0:1935           0.0.0.0:0              LISTENING
```

**If no response:** RTMP server isn't running properly.

### **Step 3: Test RTMP Server**
```bash
# Test RTMP connectivity:
telnet localhost 1935
```

**Expected:** Connection should succeed (cursor will hang - that's good!)
**If fails:** RTMP server not running.

---

## 🛠️ **SOLUTION 1: Use Node Media Server**

The current server needs a proper RTMP server. Let's add one:

### **Install Node Media Server:**
```bash
cd scte35-mw/server
npm install node-media-server
```

### **Create Enhanced Server:**
Create `scte35-mw/server/rtmp-server.js`:

```javascript
const NodeMediaServer = require('node-media-server');
const express = require('express');
const { spawn } = require('child_process');

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
  }
};

// Create RTMP Server
const nms = new NodeMediaServer(rtmpConfig);

// Handle stream events
nms.on('preConnect', (id, args) => {
  console.log('[NodeEvent on preConnect]', `id=${id} args=${JSON.stringify(args)}`);
});

nms.on('postConnect', (id, args) => {
  console.log('[NodeEvent on postConnect]', `id=${id} args=${JSON.stringify(args)}`);
});

nms.on('prePublish', (id, StreamPath, args) => {
  console.log('[NodeEvent on prePublish]', `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`);
  
  // Extract stream ID from path (e.g., /live/stream1)
  const streamMatch = StreamPath.match(/\/live\/(\w+)/);
  if (streamMatch) {
    const streamId = streamMatch[1];
    console.log(`✅ OBS Stream Connected: ${streamId}`);
    
    // Start FFmpeg processing for this stream
    startFFmpegForStream(streamId);
  }
});

nms.on('postPublish', (id, StreamPath, args) => {
  console.log('[NodeEvent on postPublish]', `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`);
});

nms.on('donePublish', (id, StreamPath, args) => {
  console.log('[NodeEvent on donePublish]', `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`);
  
  const streamMatch = StreamPath.match(/\/live\/(\w+)/);
  if (streamMatch) {
    const streamId = streamMatch[1];
    console.log(`❌ OBS Stream Disconnected: ${streamId}`);
  }
});

// FFmpeg processing function
function startFFmpegForStream(streamId) {
  const inputUrl = `rtmp://localhost:1935/live/${streamId}`;
  const outputUrl = `srt://localhost:1234?streamid=${streamId}&pkt_size=1316`;
  
  const ffmpegArgs = [
    '-i', inputUrl,
    '-c:v', 'copy',
    '-c:a', 'copy',
    '-f', 'mpegts',
    '-pes_data', '500',
    '-metadata', `service_name=${streamId}`,
    '-metadata', `service_provider=SCTE35-MW`,
    outputUrl
  ];
  
  console.log(`🚀 Starting FFmpeg for ${streamId}:`, ffmpegArgs.join(' '));
  
  const ffmpegProcess = spawn('ffmpeg', ffmpegArgs);
  
  ffmpegProcess.stdout.on('data', (data) => {
    console.log(`FFmpeg stdout [${streamId}]:`, data.toString());
  });
  
  ffmpegProcess.stderr.on('data', (data) => {
    console.log(`FFmpeg stderr [${streamId}]:`, data.toString());
  });
  
  ffmpegProcess.on('close', (code) => {
    console.log(`FFmpeg process for ${streamId} exited with code ${code}`);
  });
}

// Start RTMP Server
nms.run();
console.log('🎥 RTMP Server started on port 1935');
console.log('📺 OBS can now connect to: rtmp://localhost:1935/live/STREAMNAME');
```

### **Update Launch Script:**
Edit `launch-all.bat` to use the new RTMP server:

```batch
REM Start the RTMP server instead of the old server
cd server
start /B node rtmp-server.js
```

---

## 🛠️ **SOLUTION 2: Simple RTMP Relay (Quick Fix)**

If you can't install node-media-server, use this simple approach:

### **Create Simple RTMP Handler:**
Create `scte35-mw/server/simple-rtmp.js`:

```javascript
const net = require('net');
const { spawn } = require('child_process');

// Simple RTMP server
const server = net.createServer((socket) => {
  console.log('📺 OBS Connected from:', socket.remoteAddress);
  
  socket.on('data', (data) => {
    const dataStr = data.toString();
    console.log('📡 RTMP Data received:', dataStr.substring(0, 100) + '...');
    
    // Look for stream path in RTMP handshake
    const streamMatch = dataStr.match(/live\/(\w+)/);
    if (streamMatch) {
      const streamId = streamMatch[1];
      console.log(`✅ Detected Stream: ${streamId}`);
      
      // Start FFmpeg processing
      setTimeout(() => {
        startFFmpegProcessing(streamId);
      }, 2000);
    }
  });
  
  socket.on('close', () => {
    console.log('❌ OBS Disconnected');
  });
  
  socket.on('error', (err) => {
    console.error('RTMP Socket Error:', err);
  });
});

function startFFmpegProcessing(streamId) {
  const inputUrl = `rtmp://localhost:1935/live/${streamId}`;
  const outputUrl = `srt://localhost:1234?streamid=${streamId}&pkt_size=1316`;
  
  const ffmpegArgs = [
    '-i', inputUrl,
    '-c:v', 'copy',
    '-c:a', 'copy',
    '-f', 'mpegts',
    '-pes_data', '500',
    outputUrl
  ];
  
  console.log(`🚀 Starting FFmpeg: ${ffmpegArgs.join(' ')}`);
  
  const ffmpeg = spawn('ffmpeg', ffmpegArgs);
  
  ffmpeg.stderr.on('data', (data) => {
    console.log(`FFmpeg [${streamId}]:`, data.toString());
  });
}

server.listen(1935, () => {
  console.log('🎥 Simple RTMP Server listening on port 1935');
  console.log('📺 OBS URL: rtmp://localhost:1935/live/stream1');
});
```

---

## 🛠️ **SOLUTION 3: Use FFmpeg as RTMP Server**

### **Direct FFmpeg RTMP Server:**
Create `scte35-mw/start-rtmp-server.bat`:

```batch
@echo off
title RTMP Server for OBS
color 0C

echo Starting RTMP Server on port 1935...
echo OBS URL: rtmp://localhost:1935/live/stream1
echo.

REM Set FFmpeg path
set "FFMPEG_PATH=C:\Users\LIVE PCR\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-7.1.1-full_build\bin"
set "PATH=%PATH%;%FFMPEG_PATH%"

REM Start FFmpeg RTMP server
ffmpeg -f flv -listen 1 -i rtmp://localhost:1935/live/stream1 ^
       -c:v copy -c:a copy ^
       -f mpegts ^
       -pes_data 500 ^
       -metadata service_name=stream1 ^
       srt://localhost:1234?streamid=stream1^&pkt_size=1316

pause
```

---

## 🔧 **TROUBLESHOOTING STEPS**

### **Step 1: Check Windows Firewall**
```batch
# Allow port 1935 through firewall:
netsh advfirewall firewall add rule name="RTMP Server" dir=in action=allow protocol=TCP localport=1935
```

### **Step 2: Check OBS Settings**
**Verify these exact settings in OBS:**
- **Settings → Output**
- **Output Mode**: `Advanced`
- **Type**: `Custom Output (FFmpeg)`
- **FFmpeg Output Type**: `Output to URL`
- **File path or URL**: `rtmp://localhost:1935/live/stream1`
- **Container Format**: `flv`

### **Step 3: Test with VLC**
```
1. Open VLC
2. Media → Open Network Stream
3. URL: rtmp://localhost:1935/live/stream1
4. Should connect if RTMP server is working
```

### **Step 4: Check Process List**
```batch
# Check if anything is using port 1935:
netstat -ano | findstr :1935
```

---

## 🚀 **RECOMMENDED SOLUTION**

### **Use Solution 1 (Node Media Server):**
1. **Install**: `npm install node-media-server` in server folder
2. **Create**: `rtmp-server.js` with the code above
3. **Update**: `launch-all.bat` to use new server
4. **Test**: OBS connection should work

### **Quick Test:**
```batch
# 1. Stop current middleware
# 2. Run: cd scte35-mw/server && npm install node-media-server
# 3. Create rtmp-server.js file
# 4. Run: node rtmp-server.js
# 5. Test OBS connection
```

---

## ✅ **VERIFICATION**

### **Success Indicators:**
- ✅ OBS shows "Connected" (not "Failed to connect")
- ✅ Console shows "OBS Stream Connected: stream1"
- ✅ FFmpeg process starts automatically
- ✅ Web UI shows stream as "RUNNING"

### **Test Commands:**
```bash
# 1. Check RTMP server
telnet localhost 1935

# 2. Check middleware API
curl http://localhost:3000/api/streams

# 3. Test SCTE-35 injection
curl -X POST http://localhost:3000/api/streams/stream1/cue-out -H "Content-Type: application/json" -d '{"duration": 30}'
```

---

**🎯 Try Solution 1 first - it's the most reliable for OBS connections!**
