# ✅ Your Questions Answered

## ❓ Question 1: "How can I add my OBS instance?"

### **ANSWER: Multiple Ways to Add OBS Instances**

#### **Method 1: Automatic Detection (Recommended)**
1. **Configure OBS Output**:
   - Go to **Settings → Output**
   - Set **Output Mode**: `Advanced`
   - Set **Type**: `Custom Output (FFmpeg)`
   - Set **URL**: `rtmp://localhost:1935/live/stream1`
   - Set **Container**: `flv`
   - Set **Keyframe Interval**: `2` seconds (CRITICAL!)

2. **Start Streaming in OBS**
   - Click "Start Streaming"
   - Stream automatically appears in web UI at `http://localhost:3000`

#### **Method 2: Manual Configuration**
Edit `server/streams.json` to pre-configure streams:
```json
{
  "stream1": {
    "name": "Main Channel",
    "lastEventId": 100023,
    "autoRestart": true,
    "description": "Primary broadcast stream"
  },
  "stream2": {
    "name": "News Channel",
    "lastEventId": 100023,
    "autoRestart": true,
    "description": "Secondary news stream"
  }
}
```

#### **Multiple OBS Instances (Up to 8 Streams)**
- **Stream 1**: `rtmp://localhost:1935/live/stream1`
- **Stream 2**: `rtmp://localhost:1935/live/stream2`
- **Stream 3**: `rtmp://localhost:1935/live/stream3`
- **Stream 4**: `rtmp://localhost:1935/live/stream4`
- etc.

---

## ❓ Question 2: "How can I add scheduled ad markers in stream?"

### **ANSWER: 4 Different Methods for Scheduling**

#### **Method 1: Web UI Drag & Drop (Easiest)**
1. **Open Web Interface**: `http://localhost:3000`
2. **Use Ad Presets**: Drag 30s, 60s, 120s, or Custom duration
3. **Drop on Stream**: Drop preset onto target stream card
4. **Immediate Execution**: CUE-OUT sent instantly

#### **Method 2: Advanced Scheduler Component**
The system includes a built-in scheduler (`ui/scheduler.js`):
- **Time-based scheduling**: Set specific times (e.g., 2:30 PM)
- **Daily repeats**: Schedule recurring ad breaks
- **Multiple streams**: Different schedules per stream
- **Enable/Disable**: Toggle schedules on/off

#### **Method 3: API-Based Scheduling**
Use REST API calls for programmatic control:

```bash
# Schedule immediate CUE-OUT
curl -X POST http://localhost:3000/api/streams/stream1/cue-out \
  -H "Content-Type: application/json" \
  -d '{"duration": 30}'

# Schedule CUE-IN
curl -X POST http://localhost:3000/api/streams/stream1/cue-in

# Bulk operations (all streams)
curl -X POST http://localhost:3000/api/cue-out-all \
  -H "Content-Type: application/json" \
  -d '{"duration": 60}'
```

#### **Method 4: Custom Scheduling Script**
Create `schedule-ads.js` for advanced automation:

```javascript
const axios = require('axios');

// Define your ad schedule
const adSchedule = [
  { time: '14:30:00', stream: 'stream1', duration: 30 },
  { time: '15:00:00', stream: 'stream1', duration: 60 },
  { time: '15:30:00', stream: 'stream2', duration: 30 }
];

// Auto-schedule function
function scheduleAd(schedule) {
  const now = new Date();
  const [hours, minutes] = schedule.time.split(':');
  const scheduledTime = new Date();
  scheduledTime.setHours(hours, minutes, 0, 0);
  
  if (scheduledTime <= now) {
    scheduledTime.setDate(scheduledTime.getDate() + 1);
  }
  
  const delay = scheduledTime.getTime() - now.getTime();
  
  setTimeout(async () => {
    await axios.post(`http://localhost:3000/api/streams/${schedule.stream}/cue-out`, {
      duration: schedule.duration
    });
    console.log(`Scheduled CUE-OUT executed: ${schedule.stream}`);
  }, delay);
}

// Execute all schedules
adSchedule.forEach(scheduleAd);
```

---

## 🚨 **IMPORTANT: FFmpeg Issue FIXED**

### **Your FFmpeg Path Issue**
✅ **RESOLVED**: Your FFmpeg path has been automatically configured in `launch-all.bat`:
```
Path: C:\Users\LIVE PCR\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-7.1.1-full_build\bin
```

### **What Was Fixed**:
- ❌ **Before**: "FFmpeg not found" error
- ✅ **After**: FFmpeg path automatically added to launch script
- ✅ **Backup**: `fix-ffmpeg-path.bat` script available if needed

---

## 🎯 **Quick Start Workflow**

### **Step 1: Launch System**
```bash
# Double-click this file:
launch-all.bat
```
- Starts middleware server
- Opens web UI automatically
- Configures FFmpeg path

### **Step 2: Configure OBS**
- **URL**: `rtmp://localhost:1935/live/stream1`
- **Keyframe Interval**: `2` seconds
- **Container**: `flv`
- Click "Start Streaming"

### **Step 3: Add Scheduled Ads**
Choose your preferred method:
- **Drag & Drop**: Use web UI presets
- **API Calls**: Use curl commands
- **Scheduler**: Use built-in time-based scheduler
- **Custom Script**: Create automated scheduling

### **Step 4: Monitor & Control**
- **Web UI**: `http://localhost:3000`
- **Hotkeys**: F1-F8 for quick CUE-OUT
- **Emergency**: Red CUE-IN ALL button
- **Logs**: Real-time SCTE-35 confirmation

---

## 📋 **Complete Feature List**

### **OBS Integration**:
- ✅ Multiple OBS instances (1-8 streams)
- ✅ Automatic stream detection
- ✅ Manual stream configuration
- ✅ Real-time status monitoring

### **Scheduling Options**:
- ✅ Drag & drop ad presets
- ✅ Time-based scheduling
- ✅ Daily recurring schedules
- ✅ API-based automation
- ✅ Custom scripting support

### **SCTE-35 Compliance**:
- ✅ PID 500 (JioTV/TataSky compliant)
- ✅ Sequential Event IDs (100023+)
- ✅ Proper splice_insert commands
- ✅ Crash recovery with auto CUE-IN

### **User Interface**:
- ✅ Professional broadcast theme
- ✅ Real-time stream health monitoring
- ✅ Hotkey support (F1-F8)
- ✅ Emergency controls
- ✅ Comprehensive logging

---

## 🔧 **Troubleshooting**

### **If OBS Won't Connect**:
1. Check RTMP URL: `rtmp://localhost:1935/live/stream1`
2. Verify middleware is running
3. Check Windows Firewall (ports 1935, 3000, 1234)

### **If Scheduling Doesn't Work**:
1. Ensure stream is actively running
2. Check web UI logs for errors
3. Verify API endpoints are responding
4. Test with manual CUE-OUT first

### **If FFmpeg Errors Persist**:
1. Run `fix-ffmpeg-path.bat`
2. Check if FFmpeg.exe exists at the configured path
3. Try manual PATH configuration

---

## 📞 **Need More Help?**

### **Documentation Files**:
- `README.md` - Complete system documentation
- `QUICK-START.md` - Simple usage guide
- `OBS-SETUP-GUIDE.md` - Detailed OBS configuration
- `INSTALLATION.md` - Setup instructions

### **Validation Tools**:
- `validate-setup.bat` - System health check
- `fix-ffmpeg-path.bat` - FFmpeg path repair

**Your system is now ready for professional broadcast SCTE-35 operations!** 🎉
