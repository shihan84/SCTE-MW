# 🎥 Flussonic Media Server Integration Guide

## Overview
This guide explains how to ingest SCTE-35 enabled streams from the SCTE-35 Broadcast Middleware into Flussonic Media Server.

## 🔧 Flussonic Configuration

### 1. Flussonic Media Server Setup

#### Install Flussonic Media Server
```bash
# Download and install Flussonic Media Server
# Visit: https://flussonic.com/download
```

#### Basic Flussonic Configuration
Create or edit `/etc/flussonic/flussonic.conf`:

```nginx
# Flussonic Media Server Configuration
http {
    port 80;
    ssl_port 443;
}

# SRT Input Configuration
stream scte35_stream {
    input srt://0.0.0.0:1234;
    
    # Enable SCTE-35 processing
    scte35 on;
    scte35_pid 500;
    
    # Output configurations
    output hls;
    output dash;
    output rtmp;
}

# Alternative: Multiple streams
stream stream1 {
    input srt://0.0.0.0:1234?streamid=stream1;
    scte35 on;
    scte35_pid 500;
    output hls;
    output dash;
}

stream stream2 {
    input srt://0.0.0.0:1234?streamid=stream2;
    scte35 on;
    scte35_pid 500;
    output hls;
    output dash;
}
```

### 2. SCTE-35 Stream Flow

```
OBS Studio → RTMP → SCTE-35 Middleware → SRT → Flussonic → HLS/DASH/RTMP
```

#### Stream Flow Details:
1. **OBS Studio**: Streams to `rtmp://localhost:1935/live/stream1`
2. **SCTE-35 Middleware**: 
   - Receives RTMP stream
   - Injects SCTE-35 markers
   - Outputs to SRT: `srt://localhost:1234?streamid=stream1`
3. **Flussonic**: 
   - Receives SRT stream with SCTE-35 markers
   - Processes SCTE-35 events
   - Outputs HLS/DASH/RTMP with SCTE-35 data

### 3. Flussonic SCTE-35 Configuration Options

#### Basic SCTE-35 Configuration
```nginx
stream my_stream {
    input srt://0.0.0.0:1234;
    
    # Enable SCTE-35 processing
    scte35 on;
    
    # Specify SCTE-35 PID (default: 500)
    scte35_pid 500;
    
    # SCTE-35 event handling
    scte35_events {
        # Log SCTE-35 events
        log on;
        
        # Forward SCTE-35 events to outputs
        forward on;
        
        # Custom event handling
        on_cue_out "script.sh";
        on_cue_in "script.sh";
    }
    
    # Output configurations
    output hls;
    output dash;
    output rtmp;
}
```

#### Advanced SCTE-35 Configuration
```nginx
stream advanced_scte35 {
    input srt://0.0.0.0:1234;
    
    # SCTE-35 processing
    scte35 on;
    scte35_pid 500;
    
    # SCTE-35 event callbacks
    scte35_events {
        log on;
        forward on;
        
        # Custom scripts for SCTE-35 events
        on_splice_insert "/usr/local/bin/scte35_handler.sh";
        on_time_signal "/usr/local/bin/time_signal.sh";
        
        # Event filtering
        filter {
            event_type splice_insert;
            event_type time_signal;
        }
    }
    
    # HLS output with SCTE-35
    output hls {
        path /var/www/hls;
        playlist_length 10;
        segment_length 2;
        
        # Include SCTE-35 markers in HLS
        scte35_markers on;
        scte35_marker_format cue;
    }
    
    # DASH output with SCTE-35
    output dash {
        path /var/www/dash;
        segment_length 2;
        
        # Include SCTE-35 markers in DASH
        scte35_markers on;
    }
    
    # RTMP output with SCTE-35
    output rtmp {
        url rtmp://destination-server/live/stream;
        
        # Forward SCTE-35 markers
        scte35_forward on;
    }
}
```

### 4. Testing SCTE-35 Integration

#### Test Stream Setup
1. **Start Flussonic Media Server**:
   ```bash
   sudo systemctl start flussonic
   sudo systemctl status flussonic
   ```

2. **Start SCTE-35 Middleware**:
   ```bash
   cd server
   node server.js
   ```

3. **Connect OBS Studio**:
   - Service: Custom
   - Server: `rtmp://localhost:1935/live`
   - Stream Key: `stream1`

4. **Test SCTE-35 Injection**:
   ```bash
   # Send CUE-OUT
   curl -X POST http://localhost:3000/api/streams/stream1/cue-out \
     -H "Content-Type: application/json" \
     -d '{"duration": 30}'
   
   # Send CUE-IN
   curl -X POST http://localhost:3000/api/streams/stream1/cue-in \
     -H "Content-Type: application/json"
   ```

#### Verify SCTE-35 in Flussonic
1. **Check Flussonic Logs**:
   ```bash
   tail -f /var/log/flussonic/flussonic.log | grep scte35
   ```

2. **Monitor Stream Status**:
   - Visit: `http://localhost/flussonic/`
   - Check stream status and SCTE-35 events

3. **Test HLS Playback**:
   - URL: `http://localhost/hls/stream1/index.m3u8`
   - Check for SCTE-35 markers in playlist

### 5. Flussonic API Integration

#### Flussonic REST API
```bash
# Get stream status
curl http://localhost/api/streams

# Get SCTE-35 events
curl http://localhost/api/streams/stream1/scte35

# Trigger SCTE-35 event
curl -X POST http://localhost/api/streams/stream1/scte35 \
  -H "Content-Type: application/json" \
  -d '{"event": "splice_insert", "duration": 30}'
```

#### Flussonic Web Interface
- **URL**: `http://localhost/flussonic/`
- **Features**:
  - Stream monitoring
  - SCTE-35 event logs
  - Real-time statistics
  - Configuration management

### 6. Troubleshooting

#### Common Issues

1. **SRT Connection Failed**:
   ```bash
   # Check if Flussonic is listening on SRT port
   netstat -an | grep 1234
   
   # Check Flussonic logs
   tail -f /var/log/flussonic/flussonic.log
   ```

2. **SCTE-35 Not Detected**:
   ```bash
   # Verify SCTE-35 PID in stream
   ffprobe -i srt://localhost:1234 -show_packets | grep 500
   
   # Check SCTE-35 middleware logs
   tail -f server.log | grep scte35
   ```

3. **Stream Not Appearing in Flussonic**:
   ```bash
   # Check stream input
   curl http://localhost/api/streams
   
   # Restart Flussonic
   sudo systemctl restart flussonic
   ```

#### Debug Commands
```bash
# Test SRT connection
ffplay srt://localhost:1234?streamid=stream1

# Analyze SCTE-35 markers
ffprobe -i srt://localhost:1234 -show_packets -select_streams data

# Monitor network traffic
tcpdump -i lo port 1234
```

### 7. Production Deployment

#### Recommended Flussonic Configuration
```nginx
# Production Flussonic Configuration
http {
    port 80;
    ssl_port 443;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
}

# Load balancing for multiple streams
upstream scte35_backend {
    server 127.0.0.1:1234;
    server 127.0.0.1:1235;
    server 127.0.0.1:1236;
}

# Production stream configuration
stream production_stream {
    input srt://0.0.0.0:1234;
    
    # SCTE-35 processing
    scte35 on;
    scte35_pid 500;
    
    # High availability
    backup input srt://backup-server:1234;
    
    # Output configurations
    output hls {
        path /var/www/hls;
        playlist_length 10;
        segment_length 2;
        scte35_markers on;
    }
    
    output dash {
        path /var/www/dash;
        segment_length 2;
        scte35_markers on;
    }
    
    # CDN integration
    output rtmp {
        url rtmp://cdn-server/live/stream;
        scte35_forward on;
    }
}
```

#### Monitoring and Logging
```bash
# Set up log rotation
sudo logrotate /etc/logrotate.d/flussonic

# Monitor system resources
htop
iotop
nethogs

# Check stream health
curl http://localhost/api/streams/stream1/health
```

## 🎯 Summary

The SCTE-35 Broadcast Middleware outputs SCTE-35 enabled streams via SRT to Flussonic Media Server. Flussonic processes these streams and can output HLS, DASH, and RTMP with embedded SCTE-35 markers for ad insertion and content management.

### Key Points:
- **Input**: SRT stream with SCTE-35 markers
- **Processing**: Flussonic handles SCTE-35 events
- **Output**: HLS/DASH/RTMP with SCTE-35 data
- **Monitoring**: Real-time SCTE-35 event tracking
- **Integration**: REST API for automation

For more information, visit:
- [Flussonic Documentation](https://flussonic.com/doc)
- [SCTE-35 Standards](https://www.scte.org/standards)
- [SRT Protocol](https://www.srtalliance.org/)
