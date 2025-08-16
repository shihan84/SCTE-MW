# ThreeFive Integration with SCTE-35 Broadcast Middleware

This document explains how to integrate the [threefive](https://github.com/superkabuki/SCTE35_threefive) Python library with our SCTE-35 Broadcast Middleware for proper SCTE-35 parsing and encoding.

## What is ThreeFive?

ThreeFive is the most advanced and complete SCTE-35 tool and library available. It can:

- Parse SCTE-35 in every available format (MPEGTS, HLS, DASH)
- Create proper SCTE-35 cues and packets
- Analyze streams for SCTE-35 content
- Show stream information (like ffprobe)
- Extract iframes and PTS data
- Create sidecar files with SCTE-35 data

## Installation

### Prerequisites

1. **Python 3.7+** installed on your system
2. **pip** (Python package manager)

### Install ThreeFive

```bash
# Install threefive using pip
pip install threefive

# Or install from source
git clone https://github.com/superkabuki/SCTE35_threefive.git
cd SCTE35_threefive
pip install -e .
```

### Verify Installation

```bash
# Check if threefive is available
threefive version

# Test with a sample SCTE-35 cue
threefive '/DAWAAAAAAAAAP/wBQb+ztd7owAAdIbbmw=='
```

## Integration Features

Our middleware now includes comprehensive threefive integration:

### 1. Automatic Detection

The server automatically detects if threefive is available and falls back to basic SCTE-35 processing if not.

### 2. Enhanced SCTE-35 Processing

- **Proper SCTE-35 Cue Creation**: Uses threefive to create standards-compliant SCTE-35 cues
- **Stream Analysis**: Analyzes HLS segments for existing SCTE-35 content
- **Multiple Output Formats**: Supports JSON, Base64, Hex, and XML output formats

### 3. New API Endpoints

#### SCTE-35 Parsing
```http
GET /api/streams/{streamId}/scte35/parse
```
Parses all segments in a stream for SCTE-35 cues using threefive.

#### Stream Analysis
```http
GET /api/streams/{streamId}/scte35/analyze
```
Provides detailed analysis of stream segments and SCTE-35 content.

### 4. Enhanced Headers

The HLS playlist endpoint now includes threefive-specific headers:

```
X-ThreeFive-Enabled: true/false
X-ThreeFive-Library: threefive (Python)
X-SCTE35-Parser: threefive/fallback
```

## Usage Examples

### 1. Basic SCTE-35 Injection

The middleware automatically uses threefive when available:

```javascript
// Inject CUE-OUT with 30-second duration
POST /api/streams/stream1/cue-out
{
  "duration": 30,
  "eventId": 100024
}
```

### 2. Parse Existing SCTE-35 Content

```javascript
// Parse SCTE-35 cues from stream segments
GET /api/streams/stream1/scte35/parse
```

### 3. Stream Analysis

```javascript
// Get detailed stream analysis
GET /api/streams/stream1/scte35/analyze
```

## ThreeFive CLI Integration

Our middleware can also leverage threefive's powerful CLI tools:

### Stream Information
```bash
# Show stream details (like ffprobe)
threefive show video.ts

# Get iframes
threefive iframes video.ts

# Get PTS data
threefive pts video.ts
```

### SCTE-35 Analysis
```bash
# Parse SCTE-35 from stream
threefive video.ts

# Create sidecar file
threefive sidecar video.ts

# Show raw SCTE-35 packets
threefive packets udp://@235.35.3.5:3535
```

### HLS Processing
```bash
# Parse HLS manifest and segments
threefive hls https://example.com/master.m3u8
```

## Configuration

### Environment Variables

You can configure threefive behavior through environment variables:

```bash
# Set threefive path (if not in PATH)
export THREEFIVE_PATH=/path/to/threefive

# Set output format
export THREEFIVE_OUTPUT=json
```

### Server Configuration

The middleware automatically detects threefive availability and reports it in the health endpoint:

```http
GET /api/health
```

Response includes:
```json
{
  "threefiveEnabled": true,
  "threefiveLibrary": "threefive (Python)"
}
```

## Troubleshooting

### ThreeFive Not Found

If you see "Threefive not available" in the logs:

1. **Check Installation**: Run `threefive version` in terminal
2. **Check PATH**: Ensure threefive is in your system PATH
3. **Python Version**: Ensure Python 3.7+ is installed
4. **Permissions**: Ensure the Node.js process can execute threefive

### Fallback Mode

If threefive is not available, the middleware automatically falls back to basic SCTE-35 processing:

- Basic HLS playlist markers
- Simple SCTE-35 data files
- Limited parsing capabilities

### Performance Considerations

- Threefive operations are asynchronous to prevent blocking
- Stream analysis is performed on-demand
- Large streams may take time to analyze
- Consider caching results for frequently accessed streams

## Advanced Features

### Custom SCTE-35 Cues

You can create custom SCTE-35 cues using threefive's JSON input:

```bash
# Create custom cue
echo '{"command": "splice_insert", "event_id": 12345}' | threefive - json
```

### Multicast Support

Threefive supports multicast streams:

```bash
# Parse multicast stream
threefive udp://@235.35.3.5:3535
```

### Integration with Other Tools

Threefive can be integrated with other streaming tools:

```bash
# Pipe to mplayer
threefive proxy video.ts | mplayer -

# Create WebVTT subtitles
threefive cue2vtt.py video.ts | mplayer video.ts -sub -
```

## Benefits

1. **Standards Compliance**: Proper SCTE-35 implementation
2. **Better Detection**: Flussonic and other tools can properly detect SCTE-35
3. **Advanced Analysis**: Detailed stream analysis capabilities
4. **Flexibility**: Multiple input/output formats
5. **Reliability**: Fallback mode ensures system continues working

## References

- [ThreeFive GitHub Repository](https://github.com/superkabuki/SCTE35_threefive)
- [ThreeFive Documentation](https://github.com/superkabuki/SCTE35_threefive#readme)
- [SCTE-35 Standard](https://www.scte.org/standards/)
- [HLS SCTE-35 Specification](https://tools.ietf.org/html/draft-pantos-hls-rfc8216bis-07#section-4.4.2.7)
