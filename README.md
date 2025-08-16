# 🎥 SCTE-35 Broadcast Middleware

A comprehensive Windows-based SCTE-35 middleware solution for multi-OBS to Flussonic streaming with integrated RTMP server controls.

## 🚀 Quick Start

### **Single Command Launch**
```bash
# Run the complete system launcher
launch-scte35.bat
```

This single script will:
- ✅ Check system requirements (Node.js, FFmpeg)
- ✅ Verify port availability
- ✅ Install dependencies
- ✅ Start SCTE-35 Middleware server
- ✅ Start standalone RTMP server
- ✅ Test all services
- ✅ Provide interactive menu for management

## 📁 Project Structure

```
SCTE-MW/
├── launch-scte35.bat          # 🎯 Single launcher for everything
├── server/
│   ├── server.js              # Main SCTE-35 middleware server
│   ├── standalone-rtmp-server.js  # Standalone RTMP server
│   ├── package.json           # Dependencies
│   └── streams.json           # Stream configurations
├── ui/
│   ├── index.html             # Main dashboard with RTMP controls
│   ├── styles.css             # Dashboard styling
│   ├── scheduler.html         # Advanced scheduler
│   └── rtmp-dashboard.html    # RTMP monitoring
├── start.bat                  # Legacy launcher (deprecated)
├── start-rtmp-server.bat      # RTMP server only
├── test-rtmp-connection.bat   # RTMP connection tester
└── README.md                  # This file
```

## 🎯 Features

### **SCTE-35 Middleware**
- **Real-time SCTE-35 Injection**: CUE-OUT/IN markers with custom durations
- **Multi-Stream Support**: Handle multiple OBS streams simultaneously
- **Web Dashboard**: Professional interface with navigation tabs
- **Hotkey Support**: F1-F8 for quick CUE-OUT, Ctrl+F1-F8 for CUE-IN
- **Emergency Controls**: Bulk operations for all streams
- **Health Monitoring**: Real-time stream metrics and status

### **RTMP Server Controls**
- **Standalone RTMP Server**: Dedicated server for OBS connections
- **Dashboard Integration**: Full RTMP management from web interface
- **Real-time Status**: Live monitoring of RTMP server state
- **OBS Configuration**: Built-in setup guide with copy-to-clipboard
- **Multiple Protocols**: RTMP, HLS, and DASH support
- **Connection Testing**: Built-in diagnostic tools

### **Advanced Features**
- **Navigation Tabs**: Dashboard, Scheduler, RTMP Monitor, Settings
- **Drag & Drop**: Ad preset management
- **Auto-restart**: Automatic recovery on stream failures
- **Configuration Management**: Save/load stream settings
- **Comprehensive Logging**: Detailed operation logs

## 🔧 System Requirements

### **Required Software**
- **Node.js** (v14 or higher) - [Download](https://nodejs.org/)
- **FFmpeg** - [Download](https://ffmpeg.org/)

### **Port Requirements**
- **Port 3000**: SCTE-35 Middleware API and Dashboard
- **Port 1935**: RTMP Server
- **Port 8000**: HLS/DASH Streams
- **Port 8001**: RTMP Health Check

## 🎮 Usage

### **1. Launch the System**
```bash
# Double-click or run:
launch-scte35.bat
```

### **2. Access the Dashboard**
- Open: `http://localhost:3000`
- Navigate between tabs: Dashboard, Scheduler, RTMP Monitor, Settings

### **3. Configure OBS Studio**
```
Service: Custom
Server: rtmp://localhost:1935/live
Stream Key: stream1 (or any name)
```

### **4. Control SCTE-35 Markers**
- **Quick CUE-OUT**: Press F1-F8 for 30-second ads
- **Quick CUE-IN**: Press Ctrl+F1-F8
- **Emergency CUE-IN ALL**: Press Ctrl+Shift+I
- **Emergency CUE-OUT ALL**: Press Ctrl+Shift+O

### **5. RTMP Server Management**
- **Start/Stop**: Use RTMP Monitor tab
- **Status Monitoring**: Real-time server status
- **Connection Testing**: Built-in diagnostic tools
- **OBS Setup**: Copy-paste configuration

## 📊 Dashboard Tabs

### **📺 Dashboard Tab**
- Stream monitoring and control
- Ad preset management
- Bulk operations
- Hotkey support
- Real-time health metrics

### **📅 Scheduler Tab**
- Advanced scheduling interface
- Time-based ad scheduling
- Custom PID configuration
- Event ID management
- Recurring schedules

### **📡 RTMP Monitor Tab**
- RTMP server status and controls
- OBS configuration guide
- Connection testing
- Quick access links
- Server information

### **⚙️ Settings Tab**
- System configuration
- Quick actions
- Documentation links
- Export/import settings

## 🔗 API Endpoints

### **SCTE-35 Control**
- `GET /api/streams` - Get all streams status
- `POST /api/streams/:id/start` - Start stream
- `POST /api/streams/:id/stop` - Stop stream
- `POST /api/streams/:id/cue-out` - Inject CUE-OUT
- `POST /api/streams/:id/cue-in` - Inject CUE-IN
- `POST /api/cue-out-all` - CUE-OUT all streams
- `POST /api/cue-in-all` - CUE-IN all streams

### **RTMP Server Control**
- `GET /api/rtmp/status` - Get RTMP server status
- `POST /api/rtmp/start` - Start RTMP server
- `POST /api/rtmp/stop` - Stop RTMP server
- `POST /api/rtmp/restart` - Restart RTMP server
- `POST /api/rtmp/test` - Test RTMP connection

### **System**
- `GET /api/health` - System health check

## 🎯 Stream Endpoints

### **RTMP Input**
```
rtmp://localhost:1935/live/{streamKey}
```

### **HLS Output**
```
http://localhost:8000/live/{streamKey}/index.m3u8
```

### **DASH Output**
```
http://localhost:8000/live/{streamKey}/index.mpd
```

### **SRT Output**
```
srt://localhost:1234?streamid={streamKey}
```

## 🚨 Troubleshooting

### **Common Issues**

#### **Port Already in Use**
```bash
# Check what's using the port
netstat -ano | findstr :3000
netstat -ano | findstr :1935

# Kill the process
taskkill /PID <process_id> /F
```

#### **OBS Connection Failed**
1. Verify RTMP server is running
2. Check OBS settings match configuration
3. Test with different stream key
4. Check firewall settings

#### **SCTE-35 Not Working**
1. Verify FFmpeg is installed
2. Check stream is running
3. Review server logs
4. Test with simple CUE-OUT

### **Debug Commands**
```bash
# Check system status
launch-scte35.bat (option 3)

# Test RTMP connection
launch-scte35.bat (option 2)

# Check running processes
tasklist | findstr node

# View server logs
# Check the service windows for detailed logs
```

## 📚 Documentation

### **Setup Guides**
- **OBS Setup**: `OBS-RTMP-SETUP.md`
- **Installation**: `INSTALLATION.md`
- **Quick Start**: `QUICK-START.md`

### **Feature Documentation**
- **RTMP Controls**: `RTMP-CONTROLS-IMPLEMENTATION.md`
- **Navigation Tabs**: `NAVIGATION-TABS.md`
- **Scheduler**: `SCHEDULER-SOLUTION.md`

### **Troubleshooting**
- **Error Fixes**: `ERROR-FIX-SOLUTION.md`
- **OBS Connection**: `FIX-OBS-CONNECTION.md`
- **Immediate Fixes**: `IMMEDIATE-FIXES.md`

## 🎉 Benefits

### **User Experience**
- **One-Click Launch**: Single script starts everything
- **Professional Interface**: Modern web dashboard
- **Real-time Monitoring**: Live status updates
- **Easy Configuration**: Copy-paste OBS settings

### **Technical Benefits**
- **Modular Design**: Separate RTMP and SCTE-35 servers
- **Scalable Architecture**: Support for multiple streams
- **Reliable Operation**: Auto-restart and error recovery
- **Comprehensive Logging**: Detailed operation tracking

### **Production Ready**
- **Stable Operation**: Professional-grade reliability
- **Monitoring**: Real-time status tracking
- **Documentation**: Complete setup guides
- **Troubleshooting**: Built-in diagnostic tools

## 🔮 Future Enhancements

### **Planned Features**
- **Connection Logs**: Real-time connection monitoring
- **Stream Statistics**: Bitrate, FPS, viewer count
- **Auto-restart**: Automatic recovery on failure
- **Configuration Management**: Save/load server settings

### **Advanced Controls**
- **Multiple Servers**: Manage multiple RTMP instances
- **Load Balancing**: Distribute streams across servers
- **Health Monitoring**: Advanced diagnostics
- **Performance Metrics**: Detailed analytics

## 📞 Support

### **Getting Help**
1. Check the troubleshooting section
2. Review server logs for errors
3. Test individual components
4. Verify configuration settings

### **Documentation**
- **API Reference**: Available in server code
- **Configuration**: Inline documentation
- **Examples**: Included in setup guides

---

## ✅ **Ready to Use**

The SCTE-35 Broadcast Middleware is now a clean, professional solution with:

1. **Single Launch Script**: `launch-scte35.bat` starts everything
2. **Integrated RTMP Controls**: Full management from dashboard
3. **Navigation Tabs**: Organized interface for all features
4. **Comprehensive Documentation**: Complete setup and usage guides
5. **Production Ready**: Stable, reliable operation

**Get started now with `launch-scte35.bat`!**
