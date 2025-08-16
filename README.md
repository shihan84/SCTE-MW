# SCTE-35 Broadcast Middleware

**Windows-Based SCTE-35 Management System for Multi-OBS to Flussonic Streaming**

A professional-grade, portable Windows solution for injecting SCTE-35 markers into multiple OBS streams with broadcast-quality control interface.

## 🎯 Features

- **Multi-Stream Support**: Handle 1-8 concurrent OBS streams
- **SCTE-35 Compliance**: JioTV/TataSky compatible (PID 500, sequential Event IDs)
- **Broadcast UI**: Professional dark-themed web interface
- **Drag & Drop**: Intuitive ad scheduling with preset templates
- **Hotkey Support**: F1-F8 for quick cue operations
- **Crash Recovery**: Auto-restart with emergency CUE-IN
- **Real-time Monitoring**: Stream health indicators and logging
- **Zero Dependencies**: Portable solution requiring no admin rights

## 📋 System Requirements

- **OS**: Windows 10/11 (No admin rights required)
- **Node.js**: v14.0.0 or higher
- **FFmpeg**: Latest stable version
- **OBS Studio**: v28.0 or higher
- **RAM**: 4GB minimum, 8GB recommended
- **Network**: Stable internet connection for streaming

## 🚀 Quick Start

### 1. Download & Extract
```bash
# Extract the scte35-mw folder to your desired location
# Example: D:\broadcast-tools\scte35-mw\
```

### 2. Install Dependencies
```bash
# Option A: Use the provided start.bat (Recommended)
start.bat

# Option B: Manual installation
cd server
npm install
```

### 3. Configure OBS Studio

**For each stream (stream1, stream2, etc.):**

1. **Settings → Output**
   - Output Mode: `Advanced`
   - Streaming Tab:
     - Type: `Custom Output (FFmpeg)`
     - FFmpeg Output Type: `Output to URL`
     - File path or URL: `rtmp://localhost:1935/live/stream1`
     - Container Format: `flv`

2. **Video Settings**
   - Encoder: `libx264`
   - Rate Control: `CBR`
   - Bitrate: `2000-5000 kbps` (adjust as needed)
   - Keyframe Interval: `2` seconds
   - CPU Usage Preset: `veryfast`

3. **Audio Settings**
   - Encoder: `aac`
   - Bitrate: `128 kbps`

### 4. Start the Middleware
```bash
# Double-click start.bat or run from command line
start.bat
```

### 5. Access Web Interface
Open your browser and navigate to:
```
http://localhost:3000
```

## 🎛️ Web Interface Guide

### Main Dashboard
- **Stream Cards**: Real-time status of each stream
- **Control Panel**: Ad presets and bulk operations
- **System Status**: Overall health monitoring

### Stream Controls
- **Start/Stop**: Stream management
- **CUE-OUT**: Ad break insertion (30s, 60s, 120s, custom)
- **CUE-IN**: Return from ad break
- **Health Metrics**: Bitrate, FPS, uptime monitoring

### Hotkey Commands
| Key Combination | Action |
|----------------|--------|
| `F1-F8` | Quick CUE-OUT (30s) for streams 1-8 |
| `Ctrl+F1-F8` | Quick CUE-IN for streams 1-8 |
| `Ctrl+Shift+O` | Emergency CUE-OUT All streams |
| `Ctrl+Shift+I` | Emergency CUE-IN All streams |

### Drag & Drop Scheduling
1. **Select Preset**: Choose from 30s, 60s, 120s, or custom duration
2. **Drag to Stream**: Drop preset onto target stream card
3. **Auto-Execute**: CUE-OUT command sent immediately

## 🔧 Configuration

### Stream Configuration (`server/streams.json`)
```json
{
  "stream1": {
    "name": "Main Channel",
    "lastEventId": 100023,
    "autoRestart": true,
    "flussonicOutput": "main_channel",
    "description": "Primary broadcast stream"
  }
}
```

### Flussonic Integration
Add to your `flussonic.conf`:
```nginx
stream main_channel {
  input srt://localhost:1234?streamid=stream1&pkt_size=1316;
  scte35_pid 500;
  
  # Output to carrier/CDN
  output rtmp://your-cdn-endpoint/live/main_channel;
  
  # Optional: Record with SCTE-35 markers
  record /storage/recordings/main_channel;
}
```

### Carrier Compliance Settings
| Parameter | Value | Purpose |
|-----------|-------|---------|
| PID | 500 | SCTE-35 packet identifier |
| Event ID | 100023+ | Sequential event numbering |
| Packet Size | 1316 bytes | SRT optimization |
| Duration | Configurable | Ad break length in seconds |

## 📡 API Reference

### Stream Management
```bash
# Get all streams status
GET /api/streams

# Start stream
POST /api/streams/{streamId}/start

# Stop stream
POST /api/streams/{streamId}/stop
```

### SCTE-35 Control
```bash
# Send CUE-OUT
POST /api/streams/{streamId}/cue-out
Content-Type: application/json
{
  "duration": 30,
  "eventId": 100025  // Optional
}

# Send CUE-IN
POST /api/streams/{streamId}/cue-in
Content-Type: application/json
{
  "eventId": 100025  // Optional
}

# Bulk operations
POST /api/cue-out-all
POST /api/cue-in-all
```

### Monitoring
```bash
# System health
GET /api/health

# Stream logs
GET /api/streams/{streamId}/logs
```

## 🛠️ Troubleshooting

### Common Issues

**1. FFmpeg Not Found**
```bash
# Download FFmpeg from https://ffmpeg.org/download.html
# Extract to bin/ffmpeg/ or add to system PATH
```

**2. Node.js Dependencies**
```bash
cd server
npm install express cors
```

**3. OBS Connection Issues**
- Verify RTMP URL: `rtmp://localhost:1935/live/stream1`
- Check Windows Firewall settings
- Ensure port 1935 is not blocked

**4. SCTE-35 Not Working**
- Verify FFmpeg supports SCTE-35 (`ffmpeg -filters | grep scte35`)
- Check Flussonic configuration
- Monitor logs in web interface

**5. Stream Health Issues**
- Check OBS output settings
- Verify network connectivity
- Monitor CPU usage

### Log Locations
- **Middleware Logs**: Web interface → Show Logs
- **FFmpeg Logs**: Console output
- **OBS Logs**: Help → Log Files

### Performance Optimization
- **CPU**: Use hardware encoding if available
- **Network**: Dedicated network interface for streaming
- **Storage**: SSD for better I/O performance

## 🔒 Security Considerations

- **Local Network**: Middleware runs on localhost by default
- **Firewall**: Configure Windows Firewall for required ports
- **Access Control**: Implement authentication for production use
- **Monitoring**: Enable logging for audit trails

## 📞 Support & Maintenance

### Regular Maintenance
1. **Update Dependencies**: `npm update` in server directory
2. **Clear Logs**: Use web interface log clearing
3. **Backup Config**: Save `streams.json` regularly
4. **Monitor Performance**: Check system resources

### Getting Help
- **Documentation**: This README file
- **Logs**: Check web interface and console output
- **Community**: GitHub issues and discussions
- **Professional Support**: Contact your broadcast engineer

## 📄 License

MIT License - See LICENSE file for details

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## 📈 Roadmap

- [ ] Multi-language support
- [ ] Advanced scheduling
- [ ] Cloud integration
- [ ] Mobile app companion
- [ ] Analytics dashboard
- [ ] Load balancing support

---

**Version**: 1.0.0  
**Last Updated**: 2024  
**Compatibility**: Windows 10/11, OBS v28+, Node.js v14+

For technical support, please refer to the troubleshooting section or contact your system administrator.
