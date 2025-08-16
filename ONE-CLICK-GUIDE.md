# 🚀 ONE-CLICK SCTE-35 SYSTEM - COMPLETE GUIDE

## ✨ **SUPER EASY LAUNCH - Everything at Once!**

### **🎯 Single Command to Run Everything:**
```bash
# Double-click this file:
RUN-EVERYTHING.bat
```

**This ONE script will:**
- ✅ **Start RTMP Server** (port 1935)
- ✅ **Start API Server** (port 3000)
- ✅ **Open Navigation Hub** (system overview)
- ✅ **Open Main Dashboard** (stream control)
- ✅ **Open Scheduler** (PID/Event ID control)
- ✅ **Open RTMP Monitor** (server monitoring)
- ✅ **Check all dependencies**
- ✅ **Display system status**

---

## 🖥️ **Even Easier - Desktop Shortcut:**

### **Step 1: Create Desktop Shortcut**
```bash
# Double-click this file once:
CREATE-DESKTOP-SHORTCUT.bat
```

### **Step 2: Use Desktop Shortcut**
- **Look for**: "SCTE-35 Complete System" icon on desktop
- **Double-click**: Launches everything instantly
- **Result**: All interfaces open automatically

---

## 📋 **What Opens Automatically:**

### **🌐 Browser Tabs (4 interfaces):**
1. **Navigation Hub** - `http://localhost:3000/nav.html`
   - System overview and quick access
   - Status indicators
   - Feature list

2. **Main Dashboard** - `http://localhost:3000/index.html`
   - Stream control and monitoring
   - CUE-OUT/CUE-IN buttons
   - Real-time stream health

3. **Scheduler & Settings** - `http://localhost:3000/scheduler.html`
   - Time-based ad scheduling
   - Manual PID control (change from 500)
   - Manual Event ID control (change from 100023+)
   - Schedule management

4. **RTMP Dashboard** - `http://localhost:3000/rtmp-dashboard.html`
   - Server status monitoring
   - Active connections
   - Real-time logs
   - Connection management

---

## 🎛️ **Immediate Usage After Launch:**

### **📺 Configure OBS (Takes 30 seconds):**
1. **Open OBS Studio**
2. **Go to Settings → Output**
3. **Set these values**:
   - **URL**: `rtmp://localhost:1935/live/stream1`
   - **Container**: `flv`
   - **Keyframe Interval**: `2` seconds
4. **Click OK**
5. **Start Streaming** - Should connect instantly!

### **🎯 Use the System:**
- **Schedule Ads**: Go to Scheduler tab, set time and duration
- **Manual CUE-OUT**: Click buttons in Main Dashboard
- **Change PID**: Go to Scheduler, update PID field (default: 500)
- **Monitor RTMP**: Check RTMP Dashboard for connections
- **View Logs**: Real-time activity in RTMP Dashboard

---

## 🔧 **System Features Available:**

### **✅ SCTE-35 Control:**
- **Manual Injection**: CUE-OUT/CUE-IN buttons
- **Scheduled Injection**: Time-based automation
- **Custom PID**: Change from 500 to any value (1-8191)
- **Custom Event ID**: Change from 100023+ to any value
- **Per-Injection Override**: Different PID/Event ID per command

### **✅ Stream Management:**
- **Multi-Stream Support**: 1-8 concurrent OBS streams
- **Real-time Monitoring**: Bitrate, FPS, uptime
- **Health Indicators**: Stream status and quality
- **Auto-restart**: Crash recovery with emergency CUE-IN

### **✅ Professional Interface:**
- **Dark Broadcast Theme**: Professional appearance
- **Real-time Updates**: 5-second refresh intervals
- **Hotkey Support**: F1-F8 for quick CUE-OUT
- **Comprehensive Logging**: All activity tracked

### **✅ RTMP Server:**
- **OBS Connection**: Proper RTMP handling
- **Connection Monitoring**: Active client tracking
- **Server Logs**: Real-time activity display
- **Error Recovery**: Automatic reconnection handling

---

## 📊 **Quick Reference:**

### **🌐 URLs (Auto-opened):**
- **Navigation**: `http://localhost:3000/nav.html`
- **Dashboard**: `http://localhost:3000/index.html`
- **Scheduler**: `http://localhost:3000/scheduler.html`
- **RTMP Monitor**: `http://localhost:3000/rtmp-dashboard.html`

### **📡 Connection Details:**
- **RTMP Server**: `rtmp://localhost:1935/live/stream1`
- **API Server**: `http://localhost:3000`
- **SRT Output**: `srt://localhost:1234`

### **⚙️ Default Settings:**
- **PID**: 500 (JioTV/TataSky compliant)
- **Event ID**: 100023+ (auto-incrementing)
- **Packet Size**: 1316 bytes
- **Keyframe**: 2 seconds

---

## 🎯 **Common Tasks:**

### **Schedule Daily Ad at 3:30 PM:**
1. **Open Scheduler tab**
2. **Set Time**: 15:30
3. **Set Duration**: 60s
4. **Set Repeat**: Daily
5. **Click**: Add Schedule

### **Change PID from 500 to 501:**
1. **Open Scheduler tab**
2. **Find**: "PID (Packet Identifier)" field
3. **Change**: From 500 to 501
4. **Click**: Update Settings

### **Manual CUE-OUT with Custom Event ID:**
1. **Open Scheduler tab**
2. **Go to**: "Manual SCTE-35 Injection"
3. **Set**: Custom Event ID (e.g., 999999)
4. **Click**: Inject SCTE-35 Marker

### **Monitor OBS Connection:**
1. **Open RTMP Dashboard tab**
2. **Check**: "Active Streams" section
3. **View**: Connection status and metrics
4. **Monitor**: Real-time logs

---

## 🚨 **Troubleshooting:**

### **If Browser Doesn't Open:**
- **Manual Access**: Go to `http://localhost:3000/nav.html`
- **Check Console**: Look for "System launched successfully" message

### **If OBS Won't Connect:**
- **Check URL**: Must be `rtmp://localhost:1935/live/stream1`
- **Check Console**: Look for "RTMP Server listening" message
- **Try Restart**: Stop system, run `RUN-EVERYTHING.bat` again

### **If Interfaces Don't Load:**
- **Wait 10 seconds**: Server needs time to start
- **Refresh Browser**: Press F5 on each tab
- **Check Console**: Look for error messages

---

## 🎉 **Success Indicators:**

### **✅ System Running Correctly:**
- **Console Shows**: "System launched successfully"
- **Browser Opens**: 4 tabs automatically
- **OBS Connects**: Shows "Connected" status
- **Interfaces Load**: All pages display properly

### **✅ SCTE-35 Working:**
- **CUE-OUT Buttons**: Respond when clicked
- **Scheduler**: Accepts new schedules
- **Logs Show**: SCTE-35 injection confirmations
- **Event IDs**: Increment automatically

---

## 📞 **Support Files:**

### **📋 Documentation:**
- `ERROR-FIX-SOLUTION.md` - JavaScript error fixes
- `SCHEDULER-SOLUTION.md` - Detailed scheduler guide
- `FIX-OBS-CONNECTION.md` - OBS connection troubleshooting

### **🔧 Alternative Launchers:**
- `launch-simple.bat` - Basic launcher
- `launch-rtmp.bat` - RTMP-focused launcher
- `test-connection.bat` - Connection testing

---

## 🎯 **FINAL SUMMARY:**

**🚀 To run everything at once:**
1. **Double-click**: `RUN-EVERYTHING.bat`
2. **Wait 10 seconds**: For system to start
3. **Configure OBS**: `rtmp://localhost:1935/live/stream1`
4. **Start Streaming**: Should connect immediately
5. **Use Interfaces**: All 4 tabs opened automatically

**🖥️ For even easier access:**
1. **Run once**: `CREATE-DESKTOP-SHORTCUT.bat`
2. **Use shortcut**: Double-click desktop icon anytime
3. **Everything launches**: Automatically every time

**🎛️ Your complete SCTE-35 system is ready with one click!**
