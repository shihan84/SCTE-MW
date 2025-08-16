# 🎥 Standalone RTMP Server for SCTE-35 Middleware

## Overview

This standalone RTMP server provides a reliable, dedicated streaming endpoint for OBS Studio and other broadcasting software. It's specifically designed to work with the SCTE-35 Broadcast Middleware and provides better connection stability than the integrated RTMP server.

## 🚀 Quick Start

### 1. Start the Standalone RTMP Server
```bash
# Option 1: Use the batch file (Windows)
start-rtmp-server.bat

# Option 2: Direct command
cd server
node standalone-rtmp-server.js
```

### 2. Configure OBS Studio
- Open OBS Studio
- Go to **Settings** → **Stream**
- Set **Service** to **"Custom"**
- **Server**: `rtmp://localhost:1935/live`
- **Stream Key**: `stream1`
- Click **"OK"**

### 3. Start Streaming
- Click **"Start Streaming"** in OBS
- Check the RTMP server console for connection confirmation

## 📡 Server Endpoints

### RTMP Endpoints
```
rtmp://localhost:1935/live/stream1
rtmp://localhost:1935/live/stream2
rtmp://localhost:1935/live/stream3
rtmp://localhost:1935/live/your-custom-name
```

### HTTP/HLS Endpoints
```
http://localhost:8000/live/stream1/index.m3u8
http://localhost:8000/live/stream2/index.m3u8
http://localhost:8000/live/stream3/index.m3u8
```

### Test Endpoint
```
http://localhost:8001
```

## 🔧 Configuration

### Server Configuration
The RTMP server is configured in `server/standalone-rtmp-server.js`:

```javascript
const rtmpConfig = {
    rtmp: {
        port: 1935,           // RTMP port
        chunk_size: 60000,    // Chunk size
        gop_cache: true,      // GOP cache
        ping: 30,             // Ping interval
        ping_timeout: 60      // Ping timeout
    },
    http: {
        port: 8000,           // HTTP server port
        allow_origin: '*'     // CORS settings
    },
    trans: {
        ffmpeg: 'ffmpeg',     // FFmpeg path
        tasks: [
            {
                app: 'live',  // Application name
                hls: true,    // Enable HLS
                dash: true    // Enable DASH
            }
        ]
    }
};
```

### Port Configuration
- **RTMP**: Port 1935 (standard RTMP port)
- **HTTP**: Port 8000 (HLS/DASH streams)
- **Test**: Port 8001 (health check)

## 🎯 Features

### ✅ What's Working
- **OBS Studio Integration**: Full compatibility with OBS
- **Multiple Streams**: Support for multiple concurrent streams
- **HLS Output**: Automatic HLS stream generation
- **DASH Output**: Automatic DASH stream generation
- **Real-time Logging**: Detailed connection and stream logs
- **Error Handling**: Comprehensive error handling and recovery
- **Health Monitoring**: Built-in health check endpoint

### 🔄 Event Handling
The server provides detailed event logging:
- **preConnect**: Connection attempts
- **postConnect**: Successful connections
- **prePublish**: Stream publishing attempts
- **postPublish**: Active streams
- **donePublish**: Stream endings
- **Error Events**: Connection and stream errors

## 🧪 Testing

### Connection Test
Run the built-in test utility:
```bash
test-rtmp-connection.bat
```

### Manual Testing
1. **Test RTMP Server**:
   ```bash
   netstat -an | findstr 1935
   ```

2. **Test HTTP Server**:
   ```bash
   curl http://localhost:8001
   ```

3. **Test HLS Stream** (after OBS connects):
   ```bash
   curl http://localhost:8000/live/stream1/index.m3u8
   ```

### OBS Testing
1. Start the RTMP server
2. Configure OBS with the settings above
3. Add a test source (Color Source, Test Pattern)
4. Start streaming
5. Check server console for connection logs

## 🚨 Troubleshooting

### Common Issues

#### OBS Connection Failed
**Symptoms**: OBS shows "Connection failed" error
**Solutions**:
1. Verify RTMP server is running: `netstat -an | findstr 1935`
2. Check firewall settings
3. Try different stream key
4. Restart both OBS and RTMP server

#### Port Already in Use
**Symptoms**: Server fails to start with port error
**Solutions**:
```bash
# Find process using port 1935
netstat -ano | findstr 1935
# Kill the process
taskkill /PID <process_id> /F
```

#### No Video in Stream
**Symptoms**: OBS connects but no video appears
**Solutions**:
1. Check OBS video settings
2. Verify encoder settings (x264 recommended)
3. Check bitrate settings (start with 2500 kbps)
4. Add a test source in OBS

#### HLS Stream Not Available
**Symptoms**: HTTP endpoint returns 404
**Solutions**:
1. Ensure OBS is actively streaming
2. Wait for HLS segments to generate (2-3 seconds)
3. Check FFmpeg installation
4. Verify stream key matches

### Debug Mode
Enable detailed logging by modifying the server configuration:
```javascript
// Add to rtmpConfig
logType: 3,  // Verbose logging
```

## 🔗 Integration with SCTE-35 Middleware

### Workflow
1. **Start Standalone RTMP Server**: `start-rtmp-server.bat`
2. **Connect OBS**: Configure OBS to stream to RTMP server
3. **Start SCTE-35 Middleware**: `start.bat`
4. **Configure Streams**: Use web interface to set up SCTE-35 injection
5. **Monitor & Control**: Use dashboard for stream management

### Benefits
- **Reliable Connections**: Dedicated RTMP server for better stability
- **Better Error Handling**: Detailed logging and error recovery
- **Multiple Protocols**: RTMP, HLS, and DASH support
- **Easy Testing**: Built-in test utilities and health checks
- **Production Ready**: Suitable for live broadcasting

## 📊 Monitoring

### Server Status
- **RTMP Port**: 1935 (listening)
- **HTTP Port**: 8000 (HLS/DASH)
- **Test Port**: 8001 (health check)

### Stream Monitoring
- Real-time connection logs
- Stream start/stop events
- Error reporting
- Performance metrics

### Health Checks
```bash
# Check server status
curl http://localhost:8001

# Check active streams
curl http://localhost:8000/live/stream1/index.m3u8
```

## 🎯 Best Practices

### OBS Configuration
1. **Use x264 encoder** for best compatibility
2. **Start with 2500 kbps** bitrate
3. **Use 30 fps** for standard streaming
4. **Enable "Enforce streaming service encoder settings"**
5. **Test with simple sources** first

### Network Configuration
1. **Use wired connection** for stability
2. **Check firewall settings** for ports 1935, 8000, 8001
3. **Monitor network bandwidth**
4. **Keep OBS and server on same machine** for testing

### Server Management
1. **Monitor server logs** for issues
2. **Restart server** if connections become unstable
3. **Check disk space** for HLS segments
4. **Update FFmpeg** for latest codec support

## 📞 Support

### Getting Help
1. **Check server logs** for error messages
2. **Run connection test**: `test-rtmp-connection.bat`
3. **Verify OBS settings** match configuration
4. **Test with simple setup** first

### Common Commands
```bash
# Start RTMP server
start-rtmp-server.bat

# Test connections
test-rtmp-connection.bat

# Check server status
netstat -an | findstr 1935

# View server logs
# (Check the console window where server is running)
```

### File Locations
- **Server**: `server/standalone-rtmp-server.js`
- **Configuration**: `server/standalone-rtmp-server.js` (inline config)
- **Test Utility**: `test-rtmp-connection.bat`
- **OBS Guide**: `OBS-RTMP-SETUP.md`
