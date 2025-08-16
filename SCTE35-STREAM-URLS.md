# 🎥 SCTE-35 Enabled Stream URLs

## Overview
Your SCTE-35 Broadcast Middleware now provides **direct SCTE-35 enabled stream URLs** without requiring complex Flussonic configuration. Simply use these URLs in your video players or CDNs.

## 🚀 Quick Start

### 1. Start Your Stream
1. **Connect OBS Studio** to: `rtmp://localhost:1935/live/stream1`
2. **Start streaming** from OBS
3. **Your SCTE-35 enabled streams are automatically available!**

### 2. Available Stream URLs

#### HLS Stream (with SCTE-35 markers)
```
http://localhost:3000/hls/stream1/index.m3u8
```

#### DASH Stream (with SCTE-35 markers)
```
http://localhost:3000/dash/stream1/index.mpd
```

#### RTMP Input (for OBS)
```
rtmp://localhost:1935/live/stream1
```

## 📺 How to Use

### Video.js Player (HLS)
```html
<!DOCTYPE html>
<html>
<head>
    <title>SCTE-35 HLS Player</title>
    <link href="https://vjs.zencdn.net/8.10.0/video-js.css" rel="stylesheet" />
</head>
<body>
    <video
        id="player"
        class="video-js vjs-default-skin"
        controls
        preload="auto"
        width="640"
        height="360"
        data-setup="{}"
    >
        <source src="http://localhost:3000/hls/stream1/index.m3u8" type="application/x-mpegURL">
    </video>
    
    <script src="https://vjs.zencdn.net/8.10.0/video.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/videojs-contrib-hls@5.15.0/dist/videojs-contrib-hls.min.js"></script>
</body>
</html>
```

### VLC Media Player
1. Open VLC
2. Go to **Media** → **Open Network Stream**
3. Enter: `http://localhost:3000/hls/stream1/index.m3u8`
4. Click **Play**

### FFplay (Command Line)
```bash
# HLS Stream
ffplay http://localhost:3000/hls/stream1/index.m3u8

# DASH Stream
ffplay http://localhost:3000/dash/stream1/index.mpd
```

## 🎬 SCTE-35 Control

### Send CUE-OUT (Start Ad Break)
```bash
curl -X POST http://localhost:3000/api/streams/stream1/cue-out \
  -H "Content-Type: application/json" \
  -d '{"duration": 30}'
```

### Send CUE-IN (End Ad Break)
```bash
curl -X POST http://localhost:3000/api/streams/stream1/cue-in \
  -H "Content-Type: application/json"
```

### Check Stream Status
```bash
curl http://localhost:3000/api/streams
```

## 🔧 Stream Configuration

### SCTE-35 Settings
- **PID**: 500 (configurable)
- **Event ID Base**: 100023
- **Auto-restart**: Enabled
- **Health monitoring**: Bitrate, FPS, Resolution

### Stream URLs for Multiple Streams
```
# Stream 1
HLS: http://localhost:3000/hls/stream1/index.m3u8
DASH: http://localhost:3000/dash/stream1/index.mpd

# Stream 2
HLS: http://localhost:3000/hls/stream2/index.m3u8
DASH: http://localhost:3000/dash/stream2/index.mpd
```

## 📊 Dashboard Access

### Web Dashboard
- **URL**: `http://localhost:3000`
- **Features**:
  - Stream monitoring
  - SCTE-35 controls
  - Health statistics
  - Direct stream links

### API Endpoints
```bash
# Get all streams
GET http://localhost:3000/api/streams

# Get specific stream details
GET http://localhost:3000/api/streams/stream1/details

# Get stream logs
GET http://localhost:3000/api/streams/stream1/logs
```

## 🌐 Production Deployment

### External Access
Replace `localhost` with your server's IP address:

```
# Internal
http://localhost:3000/hls/stream1/index.m3u8

# External
http://your-server-ip:3000/hls/stream1/index.m3u8
```

### CDN Integration
Point your CDN to the HLS/DASH URLs:

```
# CDN Configuration
Origin: http://your-server-ip:3000
HLS Path: /hls/stream1/index.m3u8
DASH Path: /dash/stream1/index.mpd
```

### Load Balancer
Configure your load balancer to forward requests to port 3000:

```nginx
# Nginx Configuration
location /hls/ {
    proxy_pass http://localhost:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

## 🎯 Benefits

✅ **No Complex Setup**: Direct stream URLs, no Flussonic needed  
✅ **SCTE-35 Ready**: Markers automatically injected  
✅ **Multiple Formats**: HLS and DASH support  
✅ **Real-time Control**: API for CUE-OUT/CUE-IN  
✅ **Health Monitoring**: Bitrate, FPS, resolution tracking  
✅ **Web Dashboard**: Easy management interface  

## 🔍 Troubleshooting

### Stream Not Available
1. Check if OBS is streaming to `rtmp://localhost:1935/live/stream1`
2. Verify server is running: `http://localhost:3000`
3. Check stream status: `http://localhost:3000/api/streams`

### SCTE-35 Not Working
1. Verify PID 500 is not conflicting
2. Check SCTE-35 logs: `http://localhost:3000/api/streams/stream1/logs`
3. Test CUE-OUT/CUE-IN via API

### Playback Issues
1. Use Video.js with HLS plugin
2. Check browser console for errors
3. Verify CORS headers are set

## 📞 Support

- **Dashboard**: `http://localhost:3000`
- **API Docs**: Check the dashboard for available endpoints
- **Stream Status**: Real-time monitoring available

---

**Your SCTE-35 enabled streams are ready to use!** 🎉
