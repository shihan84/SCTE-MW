# 🚀 SCTE-35 Middleware Quick Start Guide

## One-Click Launch (Recommended)

### Option 1: Complete System Launch
```batch
# Double-click this file to start everything:
launch-all.bat
```
**What it does:**
- ✅ Starts the SCTE-35 middleware server
- ✅ Automatically opens the web UI in your browser
- ✅ Shows system status and instructions
- ✅ One-click stop when done

### Option 2: Manual Launch
```batch
# Step 1: Start the server
start.bat

# Step 2: Open browser manually
# Go to: http://localhost:3000
```

## 🖥️ Where is the UI?

### Web Interface Location:
```
URL: http://localhost:3000
```

### UI Components:
1. **Main Dashboard** - Stream status and controls
2. **Ad Presets** - Drag-and-drop scheduling (30s, 60s, 120s, custom)
3. **Bulk Controls** - CUE-OUT/CUE-IN all streams
4. **Emergency Controls** - Red emergency CUE-IN button
5. **System Logs** - Real-time monitoring and SCTE-35 events

### UI Features:
- 🎨 **Dark Broadcast Theme** - Professional broadcast control interface
- 🖱️ **Drag & Drop** - Drag ad presets to stream cards
- ⌨️ **Hotkeys** - F1-F8 for quick operations
- 📊 **Real-time Stats** - Bitrate, FPS, uptime monitoring
- 🚨 **Emergency Controls** - Instant CUE-IN for all streams

## 📺 OBS Configuration

### Quick OBS Setup:
1. **Settings → Output**
   - Output Mode: `Advanced`
   - Type: `Custom Output (FFmpeg)`
   - URL: `rtmp://localhost:1935/live/stream1`
   - Container: `flv`

2. **Start Streaming** in OBS

3. **Check Web UI** - Stream should show as "RUNNING"

## 🎮 Using the Interface

### Stream Control:
- **Green Button** = Start Stream
- **Red Button** = Stop Stream
- **Yellow Buttons** = CUE-OUT (30s, 60s, 120s)
- **Green CUE-IN** = Return from ad break

### Hotkeys (when web page is focused):
- `F1-F8` = Quick CUE-OUT (30s) for streams 1-8
- `Ctrl+F1-F8` = Quick CUE-IN for streams 1-8
- `Ctrl+Shift+O` = Emergency CUE-OUT ALL
- `Ctrl+Shift+I` = Emergency CUE-IN ALL

### Drag & Drop:
1. **Drag** an ad preset (30s, 60s, 120s, Custom)
2. **Drop** onto any stream card
3. **CUE-OUT** is sent automatically

## 🔧 Troubleshooting

### "Can't access http://localhost:3000"
```batch
# Check if server is running:
netstat -an | findstr :3000

# If not running, launch the server:
launch-all.bat
```

### "OBS not connecting"
- Verify URL: `rtmp://localhost:1935/live/stream1`
- Check Windows Firewall
- Ensure middleware is running

### "No streams showing"
- Start OBS streaming first
- Check RTMP URL in OBS settings
- Look at web UI logs for errors

## 📱 Interface Screenshots

### Main Dashboard:
```
┌─────────────────────────────────────────────────────────┐
│ SCTE-35 Broadcast Control                    🚨 EMERGENCY│
│ System: Running  Active: 2/4                            │
├─────────────────────────────────────────────────────────┤
│ AD PRESETS (DRAG TO STREAM)    │ STREAM CARDS           │
│ ┌─────┐ ┌─────┐               │ ┌─────────────────────┐ │
│ │ 30s │ │ 60s │               │ │ F1 Main Channel     │ │
│ └─────┘ └─────┘               │ │ Status: RUNNING     │ │
│ ┌─────┐ ┌─────┐               │ │ Bitrate: 3000 kbps  │ │
│ │120s │ │Custom│              │ │ [CUE-OUT] [CUE-IN]  │ │
│ └─────┘ └─────┘               │ └─────────────────────┘ │
│                               │                         │
│ BULK CONTROLS                 │ ┌─────────────────────┐ │
│ [CUE-OUT ALL] [CUE-IN ALL]    │ │ F2 News Channel     │ │
│                               │ │ Status: STOPPED     │ │
│ HOTKEYS                       │ │ [START STREAM]      │ │
│ F1-F8: Quick CUE-OUT          │ └─────────────────────┘ │
│ Ctrl+F1-F8: Quick CUE-IN      │                         │
└─────────────────────────────────────────────────────────┘
```

## 🎯 Quick Test

### Test the Complete System:
1. **Run** `launch-all.bat`
2. **Wait** for browser to open
3. **Start** OBS streaming
4. **Click** "CUE-OUT 30s" button
5. **Check** logs for SCTE-35 confirmation
6. **Press** F1 key for hotkey test

### Expected Results:
- ✅ Web UI loads with dark theme
- ✅ Stream shows as "RUNNING" 
- ✅ CUE-OUT button sends SCTE-35 marker
- ✅ Logs show "Injected SCTE-35 CUE-OUT"
- ✅ Hotkeys work when page is focused

## 📞 Need Help?

### Common Issues:
- **Port conflicts**: Check if ports 1935, 3000, 1234 are free
- **Dependencies**: Run `validate-setup.bat` first
- **Permissions**: No admin rights needed
- **Browser**: Use Chrome/Edge for best compatibility

### Files to Check:
- `README.md` - Complete documentation
- `INSTALLATION.md` - Detailed setup guide
- `validate-setup.bat` - System validation

---

**🎉 You're Ready!** 

The SCTE-35 middleware and web UI are now running. Use the professional broadcast interface to control your streams and inject SCTE-35 markers for ad insertion.
