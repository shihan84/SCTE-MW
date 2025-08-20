# SCTE-MW: SCTE-35 Middleware for Stream Management

A clean, focused Node.js application for managing video streams with SCTE-35 cue integration using FFmpeg and Threefive.

## 🚀 Quick Start

### Prerequisites
- Node.js 14+ 
- FFmpeg installed and available in PATH
- Python 3.x with Threefive package installed

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd SCTE-MW

# Install dependencies
cd server
npm install

# Start the server
node server.js
```

### Access the Application
- **Web Interface**: http://localhost:3000
- **Health Check**: http://localhost:3000/api/health

## 📁 Project Structure

```
SCTE-MW/
├── server/
│   ├── server.js              # Main Express server
│   ├── threefive-integration.js # SCTE-35 integration
│   ├── package.json           # Node.js dependencies
│   └── node_modules/          # Installed packages
├── client/
│   └── index.html             # Web interface
├── README.md                  # This file
└── LICENSE                    # MIT License
```

## 🔧 Features

### Stream Management
- **Start/Stop Streams**: Manage multiple video streams
- **HLS Output**: Generate HLS playlists with FFmpeg
- **Real-time Monitoring**: Track stream status and uptime

### SCTE-35 Integration
- **Cue Creation**: Generate CUE-OUT and CUE-IN commands
- **Stream Analysis**: Parse SCTE-35 data from streams
- **Threefive Integration**: Full SCTE-35 parsing and creation

### System Health
- **Tool Detection**: Check FFmpeg, FFprobe, and Threefive availability
- **Status Monitoring**: Real-time system health checks

## 🌐 API Endpoints

### Health & Status
```bash
GET /api/health                    # System health check
```

### Stream Management
```bash
POST /api/streams                  # Start new stream
GET /api/streams                   # List active streams
GET /api/streams/:streamName       # Get stream status
DELETE /api/streams/:streamName    # Stop stream
```

### SCTE-35 Operations
```bash
POST /api/scte35/cue              # Create SCTE-35 cue
GET /api/scte35/parse/:streamPath  # Parse SCTE-35 from stream
GET /api/scte35/analyze/:segmentsDir # Analyze segments
GET /api/scte35/show/:streamPath   # Show stream info
GET /api/scte35/iframes/:streamPath # Get iframes
GET /api/scte35/pts/:streamPath    # Get PTS data
POST /api/scte35/sidecar          # Create sidecar file
```

## 💻 Usage Examples

### Start a Stream
```bash
curl -X POST http://localhost:3000/api/streams \
  -H "Content-Type: application/json" \
  -d '{
    "streamName": "live1",
    "inputUrl": "rtmp://localhost/live/stream",
    "outputPath": "output/stream.m3u8"
  }'
```

### Create SCTE-35 Cue
```bash
curl -X POST http://localhost:3000/api/scte35/cue \
  -H "Content-Type: application/json" \
  -d '{
    "command": "CUE-OUT",
    "eventId": 12345,
    "duration": 30
  }'
```

### Check System Health
```bash
curl http://localhost:3000/api/health
```

## 🎯 Web Interface

The web interface provides:
- **System Status Dashboard**: Monitor tool availability
- **Stream Management**: Start/stop streams with forms
- **SCTE-35 Controls**: Create cues with easy-to-use interface
- **Real-time Updates**: Live stream status and health monitoring

## 🔍 Troubleshooting

### Common Issues

1. **FFmpeg not found**
   - Ensure FFmpeg is installed and in your system PATH
   - Test with: `ffmpeg -version`

2. **Threefive not available**
   - Install Threefive: `pip install threefive`
   - Test with: `python -c "import threefive; print('OK')"`

3. **Port 3000 in use**
   - Change PORT environment variable: `PORT=3001 node server.js`

4. **Stream won't start**
   - Check input URL is accessible
   - Verify output directory permissions
   - Review server logs for FFmpeg errors

### Health Check Response
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "tools": {
    "ffmpeg": true,
    "ffprobe": true,
    "threefive": true
  }
}
```

## 📝 Configuration

### Environment Variables
- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment mode (development/production)

### FFmpeg Settings
The server uses these FFmpeg parameters:
- Video codec: `libx264`
- Audio codec: `aac`
- HLS segment time: 2 seconds
- HLS list size: unlimited

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For issues and questions:
1. Check the troubleshooting section
2. Review server logs
3. Test individual components
4. Create an issue with detailed information

---

**SCTE-MW** - Clean, focused stream management with SCTE-35 integration.
