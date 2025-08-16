# 🎥 OBS Setup & Scheduled Ad Markers Guide

## 📺 Adding OBS Instances

### Step 1: Configure OBS Studio

#### For Stream 1 (Main Channel):
1. **Open OBS Studio**
2. **Go to Settings → Output**
   - **Output Mode**: `Advanced`
   - **Streaming Tab**:
     - **Type**: `Custom Output (FFmpeg)`
     - **FFmpeg Output Type**: `Output to URL`
     - **File path or URL**: `rtmp://localhost:1935/live/stream1`
     - **Container Format**: `flv`
     - **Muxer Settings**: (leave empty)

3. **Video Settings**:
   - **Encoder**: `libx264`
   - **Rate Control**: `CBR`
   - **Bitrate**: `3000` kbps (adjust as needed)
   - **Keyframe Interval**: `2` (CRITICAL for SCTE-35)
   - **CPU Usage Preset**: `veryfast`
   - **Profile**: `main`

4. **Audio Settings**:
   - **Track 1**: Enabled
   - **Encoder**: `aac`
   - **Bitrate**: `128` kbps

#### For Additional Streams (stream2-stream8):
Repeat the above steps but change the URL:
- **Stream 2**: `rtmp://localhost:1935/live/stream2`
- **Stream 3**: `rtmp://localhost:1935/live/stream3`
- **Stream 4**: `rtmp://localhost:1935/live/stream4`
- etc.

### Step 2: Start Streaming in OBS
1. **Click "Start Streaming"** in OBS
2. **Check Web UI** at `http://localhost:3000`
3. **Stream should show as "RUNNING"** in the web interface

### Step 3: Add Stream to Web Interface
The streams are automatically detected when OBS starts streaming. You can also manually add streams by editing `server/streams.json`:

```json
{
  "stream1": {
    "name": "Main Channel",
    "lastEventId": 100023,
    "autoRestart": true,
    "flussonicOutput": "main_channel",
    "description": "Primary broadcast stream"
  },
  "stream2": {
    "name": "News Channel", 
    "lastEventId": 100023,
    "autoRestart": true,
    "flussonicOutput": "news_channel",
    "description": "News broadcast stream"
  }
}
```

## ⏰ Scheduled Ad Markers

### Method 1: Web Interface Scheduling

#### Using Drag & Drop:
1. **Open Web UI**: `http://localhost:3000`
2. **Select Ad Preset**: Choose 30s, 60s, 120s, or Custom
3. **Drag to Stream**: Drop the preset onto the target stream card
4. **Automatic Execution**: CUE-OUT is sent immediately

#### Using Manual Controls:
1. **Click Stream Card** to select a stream
2. **Click CUE-OUT Button** (30s, 60s, 120s)
3. **Monitor Logs** for SCTE-35 confirmation

### Method 2: API-Based Scheduling

#### Schedule CUE-OUT via API:
```bash
# Send CUE-OUT to stream1 for 30 seconds
curl -X POST http://localhost:3000/api/streams/stream1/cue-out \
  -H "Content-Type: application/json" \
  -d '{"duration": 30}'

# Send CUE-IN to stream1
curl -X POST http://localhost:3000/api/streams/stream1/cue-in
```

#### Bulk Operations:
```bash
# CUE-OUT all streams for 60 seconds
curl -X POST http://localhost:3000/api/cue-out-all \
  -H "Content-Type: application/json" \
  -d '{"duration": 60}'

# CUE-IN all streams
curl -X POST http://localhost:3000/api/cue-in-all
```

### Method 3: Advanced Scheduling (Custom Script)

Create a scheduling script `schedule-ads.js`:

```javascript
const axios = require('axios');

// Schedule ads for specific times
const adSchedule = [
  { time: '14:30:00', stream: 'stream1', duration: 30 },
  { time: '15:00:00', stream: 'stream1', duration: 60 },
  { time: '15:30:00', stream: 'stream2', duration: 30 }
];

function scheduleAd(schedule) {
  const now = new Date();
  const [hours, minutes, seconds] = schedule.time.split(':');
  const scheduledTime = new Date();
  scheduledTime.setHours(hours, minutes, seconds, 0);
  
  if (scheduledTime <= now) {
    scheduledTime.setDate(scheduledTime.getDate() + 1); // Next day
  }
  
  const delay = scheduledTime.getTime() - now.getTime();
  
  setTimeout(async () => {
    try {
      await axios.post(`http://localhost:3000/api/streams/${schedule.stream}/cue-out`, {
        duration: schedule.duration
      });
      console.log(`Scheduled CUE-OUT sent to ${schedule.stream} at ${schedule.time}`);
    } catch (error) {
      console.error('Error sending scheduled CUE-OUT:', error.message);
    }
  }, delay);
  
  console.log(`Scheduled CUE-OUT for ${schedule.stream} at ${schedule.time} (in ${Math.round(delay/1000)}s)`);
}

// Schedule all ads
adSchedule.forEach(scheduleAd);
```

## 🔧 Troubleshooting

### Issue: "FFmpeg not found" Error
**FIXED**: Your FFmpeg path has been automatically configured!
- Path: `C:\Users\LIVE PCR\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-7.1.1-full_build\bin`
- The `launch-all.bat` script now includes your FFmpeg path
- If you still get errors, run `fix-ffmpeg-path.bat`

**Alternative Solutions**:
```bash
# Manual PATH setup (if needed):
# 1. Add to Windows PATH environment variable
# 2. Or copy ffmpeg.exe to Windows\System32
# 3. Or use the fix-ffmpeg-path.bat script
```

### Issue: OBS Not Connecting
**Checklist**:
- ✅ RTMP URL correct: `rtmp://localhost:1935/live/stream1`
- ✅ Middleware server running
- ✅ Port 1935 not blocked by firewall
- ✅ OBS output settings configured correctly

### Issue: Stream Not Showing in Web UI
**Solutions**:
1. **Refresh browser** - streams update every 2 seconds
2. **Check OBS streaming status** - must be actively streaming
3. **Verify RTMP URL** in OBS settings
4. **Check server logs** in console for errors

### Issue: SCTE-35 Markers Not Working
**Checklist**:
- ✅ FFmpeg installed with SCTE-35 support
- ✅ Stream actively running
- ✅ Keyframe interval set to 2 seconds in OBS
- ✅ Check web UI logs for confirmation

## 📋 Quick Setup Checklist

### OBS Configuration:
- [ ] Output Mode: Advanced
- [ ] Type: Custom Output (FFmpeg)
- [ ] URL: `rtmp://localhost:1935/live/stream1`
- [ ] Container: flv
- [ ] Video Encoder: libx264
- [ ] Keyframe Interval: 2 seconds
- [ ] Audio Encoder: aac

### System Requirements:
- [ ] FFmpeg installed and in PATH
- [ ] Node.js dependencies installed
- [ ] Middleware server running
- [ ] Web UI accessible at http://localhost:3000
- [ ] Ports 1935, 3000, 1234 available

### Testing:
- [ ] OBS streaming successfully
- [ ] Stream shows "RUNNING" in web UI
- [ ] CUE-OUT button works
- [ ] Logs show "Injected SCTE-35" messages
- [ ] Hotkeys respond (F1-F8)

## 🎯 Example Workflow

### Daily Broadcast Setup:
1. **Launch System**: Run `launch-all.bat`
2. **Configure OBS**: Set RTMP output to middleware
3. **Start Streaming**: Begin OBS stream
4. **Verify Connection**: Check web UI shows "RUNNING"
5. **Schedule Ads**: Use drag-and-drop or API calls
6. **Monitor**: Watch logs for SCTE-35 confirmations
7. **Emergency Control**: Use red CUE-IN ALL if needed

### Ad Break Workflow:
1. **Prepare**: Drag 30s preset to stream card
2. **Execute**: Drop triggers immediate CUE-OUT
3. **Monitor**: Watch countdown in logs
4. **Return**: System auto-sends CUE-IN after duration
5. **Verify**: Check Flussonic receives markers

---

**Need Help?** Check the main README.md for complete documentation or run `validate-setup.bat` to diagnose issues.
