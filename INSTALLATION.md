# SCTE-35 Middleware Installation Guide

**Complete setup instructions for Windows-based SCTE-35 broadcast system**

## 📦 Prerequisites Download

### 1. Node.js (Portable)
```
Download: https://nodejs.org/en/download/
Version: v18.x LTS or higher
Extract to: scte35-mw/bin/nodejs/
```

### 2. FFmpeg (Windows Build)
```
Download: https://ffmpeg.org/download.html#build-windows
Version: Latest stable with SCTE-35 support
Extract to: scte35-mw/bin/ffmpeg/
```

### 3. OBS Studio
```
Download: https://obsproject.com/download
Version: v28.0 or higher
Install normally or use portable version
```

## 🚀 Step-by-Step Installation

### Step 1: System Preparation
```batch
# Create installation directory
mkdir D:\broadcast-tools\
cd D:\broadcast-tools\

# Extract SCTE-35 middleware
# Copy scte35-mw folder to D:\broadcast-tools\scte35-mw\
```

### Step 2: Validate Setup
```batch
# Run validation script
cd D:\broadcast-tools\scte35-mw\
validate-setup.bat

# Fix any issues reported by the validator
```

### Step 3: Install Dependencies
```batch
# Option A: Automatic (Recommended)
start.bat

# Option B: Manual
cd server
npm install express cors
cd ..
```

### Step 4: Configure OBS Studio

#### For Stream 1 (Main Channel):
1. **Open OBS Studio**
2. **Settings → Output**
   - Output Mode: `Advanced`
   - Streaming Tab:
     - Type: `Custom Output (FFmpeg)`
     - FFmpeg Output Type: `Output to URL`
     - File path or URL: `rtmp://localhost:1935/live/stream1`
     - Container Format: `flv`
     - Muxer Settings: (leave empty)

3. **Video Settings**
   - Output Resolution: `1920x1080` (or your preferred)
   - Encoder: `libx264`
   - Rate Control: `CBR`
   - Bitrate: `3000` kbps (adjust based on your needs)
   - Keyframe Interval: `2` (critical for SCTE-35)
   - CPU Usage Preset: `veryfast`
   - Profile: `main`

4. **Audio Settings**
   - Track 1: Enabled
   - Encoder: `aac`
   - Bitrate: `128` kbps
   - Sample Rate: `44.1` kHz

#### For Additional Streams (stream2-stream8):
- Repeat above steps
- Change URL to: `rtmp://localhost:1935/live/stream2`, etc.
- Use different OBS instances or scenes

### Step 5: Configure Flussonic

#### Basic Configuration:
```nginx
# Add to your flussonic.conf
stream main_channel {
    input srt://localhost:1234?streamid=stream1&pkt_size=1316;
    scte35_pid 500;
    output rtmp://your-carrier-endpoint/live/main_channel {
        scte35_pass true;
    }
}
```

#### Complete Configuration:
- Copy `flussonic-config-template.conf`
- Modify carrier endpoints
- Add authentication tokens
- Test configuration: `flussonic -t`

### Step 6: Network Configuration

#### Windows Firewall:
```batch
# Allow inbound connections (run as administrator)
netsh advfirewall firewall add rule name="SCTE35-RTMP" dir=in action=allow protocol=TCP localport=1935
netsh advfirewall firewall add rule name="SCTE35-API" dir=in action=allow protocol=TCP localport=3000
netsh advfirewall firewall add rule name="SCTE35-SRT" dir=in action=allow protocol=UDP localport=1234
```

#### Router Configuration (if needed):
- Port Forward: 1935 (RTMP), 3000 (Web UI), 1234 (SRT)
- Enable UPnP if using external access

### Step 7: First Launch

#### Start the Middleware:
```batch
cd D:\broadcast-tools\scte35-mw\
start.bat
```

#### Expected Output:
```
========================================
  SCTE-35 Broadcast Middleware v1.0
========================================

[INFO] Starting SCTE-35 Middleware...
[SUCCESS] Dependencies installed
SCTE-35 Middleware API running on port 3000
Web UI available at http://localhost:3000
RTMP input: rtmp://localhost:1935/live/{streamId}
SRT output: srt://localhost:1234
```

#### Access Web Interface:
```
URL: http://localhost:3000
```

### Step 8: Test Configuration

#### Test Stream Flow:
1. **Start OBS** with configured output
2. **Start Streaming** in OBS
3. **Check Web UI** - stream should show as "running"
4. **Test SCTE-35** - click "CUE-OUT 30s" button
5. **Monitor Logs** - verify SCTE-35 injection

#### Test Hotkeys:
- Press `F1` - should send CUE-OUT to stream1
- Press `Ctrl+F1` - should send CUE-IN to stream1
- Check logs for confirmation

## 🔧 Advanced Configuration

### Custom Stream Names
Edit `server/streams.json`:
```json
{
  "news_hd": {
    "name": "News HD Channel",
    "lastEventId": 100023,
    "autoRestart": true,
    "flussonicOutput": "news_hd_out"
  }
}
```

### Carrier-Specific Settings

#### JioTV Configuration:
```javascript
// In server.js, modify CONFIG object:
const JIOTV_CONFIG = {
    scte35Pid: 500,
    baseEventId: 100023,
    packetSize: 1316,
    ingestUrl: 'rtmp://jiotv-ingest.example.com/live/'
};
```

#### TataSky Configuration:
```javascript
const TATASKY_CONFIG = {
    scte35Pid: 500,
    baseEventId: 100023,
    packetSize: 1316,
    ingestUrl: 'rtmp://tatasky-ingest.example.com/live/'
};
```

### Performance Tuning

#### High-Performance Settings:
```batch
# Set process priority (run as administrator)
wmic process where name="node.exe" CALL setpriority "high priority"
wmic process where name="ffmpeg.exe" CALL setpriority "above normal"
```

#### System Optimization:
- Disable Windows Updates during broadcast
- Close unnecessary applications
- Use dedicated network interface
- Enable High Performance power plan

## 🛠️ Troubleshooting

### Common Issues

#### 1. "Node.js not found"
```batch
# Add Node.js to PATH
set PATH=%PATH%;D:\broadcast-tools\scte35-mw\bin\nodejs
# Or install Node.js system-wide
```

#### 2. "FFmpeg not found"
```batch
# Add FFmpeg to PATH
set PATH=%PATH%;D:\broadcast-tools\scte35-mw\bin\ffmpeg\bin
# Or copy ffmpeg.exe to Windows\System32
```

#### 3. "Port already in use"
```batch
# Find process using port
netstat -ano | findstr :3000
# Kill process (replace PID)
taskkill /PID 1234 /F
```

#### 4. "OBS connection failed"
- Check RTMP URL: `rtmp://localhost:1935/live/stream1`
- Verify middleware is running
- Check Windows Firewall
- Try different stream key

#### 5. "SCTE-35 not working"
```batch
# Test FFmpeg SCTE-35 support
ffmpeg -filters | findstr scte35
# Should show scte35 filter if supported
```

### Log Analysis

#### Middleware Logs:
- Location: Web UI → Show Logs
- Look for: "Injected SCTE-35", "FFmpeg process", "Stream health"

#### FFmpeg Logs:
- Location: Console output
- Look for: "SCTE-35", "PID 500", "splice_insert"

#### OBS Logs:
- Location: Help → Log Files
- Look for: "RTMP", "Connection", "Output"

### Performance Monitoring

#### System Resources:
```batch
# Monitor CPU usage
wmic cpu get loadpercentage /value

# Monitor memory usage
wmic OS get TotalVisibleMemorySize,FreePhysicalMemory /value

# Monitor network usage
netstat -e
```

#### Stream Health:
- Web UI shows real-time bitrate and FPS
- Monitor for drops or inconsistencies
- Check network stability

## 📋 Production Checklist

### Pre-Deployment:
- [ ] All dependencies installed and tested
- [ ] OBS configured and streaming successfully
- [ ] Flussonic receiving and processing streams
- [ ] SCTE-35 markers injecting correctly
- [ ] Web UI accessible and functional
- [ ] Hotkeys working properly
- [ ] Logs showing no errors
- [ ] Network configuration verified
- [ ] Backup systems configured

### Go-Live Checklist:
- [ ] All streams started and healthy
- [ ] Carrier endpoints receiving streams
- [ ] SCTE-35 compliance verified
- [ ] Monitoring systems active
- [ ] Support team notified
- [ ] Backup procedures tested
- [ ] Emergency contacts available

### Post-Deployment:
- [ ] Monitor stream health continuously
- [ ] Check SCTE-35 marker accuracy
- [ ] Verify ad insertion working
- [ ] Monitor system performance
- [ ] Regular backup of configurations
- [ ] Update documentation as needed

## 🔒 Security Considerations

### Network Security:
- Use VPN for remote access
- Implement IP whitelisting
- Enable HTTPS for web UI (production)
- Regular security updates

### Access Control:
- Restrict web UI access
- Use strong authentication
- Audit user actions
- Monitor access logs

### Data Protection:
- Encrypt sensitive configurations
- Secure backup storage
- Regular security audits
- Compliance with broadcast regulations

## 📞 Support Resources

### Documentation:
- README.md - General overview
- This file - Installation guide
- flussonic-config-template.conf - Configuration examples

### Validation Tools:
- validate-setup.bat - System validation
- start.bat - Launch script with diagnostics

### Community Support:
- GitHub Issues
- Broadcast engineering forums
- OBS Community
- FFmpeg documentation

### Professional Support:
- Contact your broadcast engineer
- Carrier technical support
- System integrator assistance

---

**Installation Complete!** 🎉

Your SCTE-35 Middleware system is now ready for broadcast operations.

For ongoing support and maintenance, refer to the README.md file and monitoring tools provided.
