# OBS Studio RTMP Setup Guide

## 🎥 Connecting OBS to Standalone RTMP Server

### Quick Setup (Recommended)

1. **Start the Standalone RTMP Server**
   ```bash
   # Run the batch file
   start-rtmp-server.bat
   ```

2. **Configure OBS Studio**
   - Open OBS Studio
   - Go to **Settings** → **Stream**
   - Set **Service** to **"Custom"**
   - **Server**: `rtmp://localhost:1935/live`
   - **Stream Key**: `stream1` (or any name you prefer)
   - Click **"OK"**

3. **Start Streaming**
   - Click **"Start Streaming"** in OBS
   - You should see connection success in both OBS and the RTMP server console

### 🔧 Detailed Configuration

#### OBS Settings
```
Service: Custom
Server: rtmp://localhost:1935/live
Stream Key: stream1
```

#### Alternative Stream Keys
- `stream1` - Main channel
- `stream2` - Secondary channel  
- `stream3` - News channel
- `test` - Testing stream
- `backup` - Backup stream

### 📺 Testing Your Stream

#### Method 1: VLC Media Player
1. Open VLC
2. Go to **Media** → **Open Network Stream**
3. Enter: `http://localhost:8000/live/stream1/index.m3u8`
4. Click **Play**

#### Method 2: Web Browser
1. Open any modern browser
2. Navigate to: `http://localhost:8000/live/stream1/index.m3u8`
3. The stream should play automatically

#### Method 3: HLS Player
1. Open: `http://localhost:8000/live/stream1/index.m3u8`
2. Use any HLS-compatible player

### 🚨 Troubleshooting

#### OBS Connection Issues

**Problem**: OBS shows "Connection failed"
**Solutions**:
1. Check if RTMP server is running: `netstat -an | findstr 1935`
2. Verify firewall settings
3. Try different stream key
4. Check OBS logs: **Help** → **Log Files** → **View Current Log**

**Problem**: OBS connects but no video
**Solutions**:
1. Check OBS video settings
2. Verify encoder settings (x264 recommended)
3. Check bitrate settings (start with 2500 kbps)

#### RTMP Server Issues

**Problem**: Port 1935 already in use
**Solution**: 
```bash
# Find process using port 1935
netstat -ano | findstr 1935
# Kill the process
taskkill /PID <process_id> /F
```

**Problem**: Server won't start
**Solution**:
1. Check Node.js installation: `node --version`
2. Install dependencies: `npm install`
3. Check for errors in console

### 🔍 Advanced Configuration

#### Multiple OBS Instances
You can run multiple OBS instances with different stream keys:
- OBS 1: `rtmp://localhost:1935/live/stream1`
- OBS 2: `rtmp://localhost:1935/live/stream2`
- OBS 3: `rtmp://localhost:1935/live/stream3`

#### Custom RTMP URLs
```
rtmp://localhost:1935/live/your-custom-name
rtmp://localhost:1935/live/news-channel
rtmp://localhost:1935/live/sports-feed
```

#### Network Access
To allow other computers to connect:
```
rtmp://YOUR_IP_ADDRESS:1935/live/stream1
```

### 📊 Monitoring

#### RTMP Server Console
The standalone RTMP server provides real-time logging:
- Connection attempts
- Stream start/stop events
- Error messages
- Stream statistics

#### Available Endpoints
- **RTMP**: `rtmp://localhost:1935/live/{streamKey}`
- **HLS**: `http://localhost:8000/live/{streamKey}/index.m3u8`
- **DASH**: `http://localhost:8000/live/{streamKey}/index.mpd`

### 🎯 Best Practices

1. **Use descriptive stream keys** (e.g., `main-channel`, `news-feed`)
2. **Test with low bitrate first** (1000-2000 kbps)
3. **Monitor server console** for connection issues
4. **Use wired network** for better stability
5. **Keep OBS and RTMP server on same machine** for testing

### 🔗 Integration with SCTE-35 Middleware

Once OBS is connected to the standalone RTMP server:
1. Start the main SCTE-35 middleware: `start.bat`
2. Configure streams in the web interface
3. Use the middleware to inject SCTE-35 cues
4. Monitor and control streams through the dashboard

### 📞 Support

If you continue to have issues:
1. Check the RTMP server console for error messages
2. Verify OBS log files
3. Test with a simple test pattern in OBS
4. Try restarting both OBS and the RTMP server
