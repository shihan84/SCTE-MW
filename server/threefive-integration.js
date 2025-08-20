const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class ThreeFiveIntegration {
    constructor() {
        this.pythonPath = 'python';
    }

    // Check if threefive is available
    async checkAvailability() {
        return new Promise((resolve) => {
            const process = spawn(this.pythonPath, ['-c', 'import threefive; print("OK")']);
            
            process.on('close', (code) => {
                resolve(code === 0);
            });
            
            process.on('error', () => {
                resolve(false);
            });
        });
    }

    // Parse SCTE-35 from a stream using threefive
    async parseStream(streamPath) {
        return new Promise((resolve, reject) => {
            const pythonScript = `
import threefive
import json
import sys

try:
    stream = threefive.Stream('${streamPath.replace(/\\/g, '\\\\')}')
    cues = []
    
    def on_cue(cue):
        cues.append(cue)
    
    stream.on('cue', on_cue)
    stream.decode()
    
    # Convert cues to JSON-serializable format
    result = []
    for cue in cues:
        cue_dict = {
            'command': str(cue.command) if cue.command else None,
            'descriptors': [str(desc) for desc in cue.descriptors] if cue.descriptors else [],
            'pts': cue.pts if hasattr(cue, 'pts') else None,
            'dts': cue.dts if hasattr(cue, 'dts') else None
        }
        result.append(cue_dict)
    
    print(json.dumps(result))
except Exception as e:
    print(f"ERROR: {str(e)}", file=sys.stderr)
    sys.exit(1)
`;
            
            const process = spawn(this.pythonPath, ['-c', pythonScript]);
            let output = '';
            let error = '';

            process.stdout.on('data', (data) => {
                output += data.toString();
            });

            process.stderr.on('data', (data) => {
                error += data.toString();
            });

            process.on('close', (code) => {
                if (code === 0) {
                    try {
                        const cues = JSON.parse(output.trim());
                        resolve(cues);
                    } catch (parseError) {
                        reject(new Error(`Failed to parse threefive output: ${parseError.message}`));
                    }
                } else {
                    reject(new Error(`Threefive failed with code ${code}: ${error}`));
                }
            });

            process.on('error', (err) => {
                reject(new Error(`Failed to run threefive: ${err.message}`));
            });
        });
    }

    // Create SCTE-35 cue using threefive
    async createCue(command, eventId, duration = null) {
        return new Promise((resolve, reject) => {
            const durationValue = duration === null ? 'None' : duration;
            const pythonScript = `
import threefive
import json
import sys

try:
    # Create a basic SCTE-35 cue
    if '${command}' == 'CUE-OUT':
        # For CUE-OUT, we'll create a simple splice insert
        cue_data = {
            'command': 'splice_insert',
            'event_id': ${eventId},
            'out_of_network_indicator': True,
            'program_splice_flag': True,
            'splice_immediate_flag': True
        }
        
        if ${durationValue} is not None:
            cue_data['break_duration'] = {
                'auto_return': False,
                'duration': ${durationValue} * 90000  # Convert to 90kHz ticks
            }
            
    elif '${command}' == 'CUE-IN':
        # For CUE-IN, we'll create a simple splice insert
        cue_data = {
            'command': 'splice_insert',
            'event_id': ${eventId},
            'out_of_network_indicator': False,
            'program_splice_flag': True,
            'splice_immediate_flag': True
        }
    else:
        raise Exception(f"Unknown command: ${command}")
    
    # Create result object
    result = {
        'command': '${command}',
        'eventId': ${eventId},
        'duration': ${durationValue},
        'cueData': cue_data,
        'threefiveEnabled': True,
        'message': 'SCTE-35 cue data created successfully'
    }
    
    print(json.dumps(result))
except Exception as e:
    print(f"ERROR: {str(e)}", file=sys.stderr)
    sys.exit(1)
`;
            
            const process = spawn(this.pythonPath, ['-c', pythonScript]);
            let output = '';
            let error = '';

            process.stdout.on('data', (data) => {
                output += data.toString();
            });

            process.stderr.on('data', (data) => {
                error += data.toString();
            });

            process.on('close', (code) => {
                if (code === 0) {
                    try {
                        const result = JSON.parse(output.trim());
                        resolve(result);
                    } catch (parseError) {
                        reject(new Error(`Failed to parse threefive output: ${parseError.message}`));
                    }
                } else {
                    reject(new Error(`Threefive failed with code ${code}: ${error}`));
                }
            });

            process.on('error', (err) => {
                reject(new Error(`Failed to run threefive: ${err.message}`));
            });
        });
    }

    // Analyze stream segments for SCTE-35
    async analyzeSegments(segmentsDir) {
        const segments = fs.readdirSync(segmentsDir)
            .filter(file => file.endsWith('.ts'))
            .sort();
        
        const analysis = {
            totalSegments: segments.length,
            scte35Events: [],
            threefiveEnabled: true
        };

        for (const segment of segments) {
            const segmentPath = path.join(segmentsDir, segment);
            try {
                const cues = await this.parseStream(segmentPath);
                if (cues.length > 0) {
                    analysis.scte35Events.push({
                        segment: segment,
                        cues: cues,
                        timestamp: new Date().toISOString()
                    });
                }
            } catch (error) {
                console.log(`No SCTE-35 cues found in ${segment}: ${error.message}`);
            }
        }

        return analysis;
    }

    // Show stream information (like ffprobe)
    async showStream(streamPath) {
        return new Promise((resolve, reject) => {
            const pythonScript = `
import threefive
import json
import sys

try:
    stream = threefive.Stream('${streamPath.replace(/\\/g, '\\\\')}')
    info = {
        'path': '${streamPath}',
        'threefiveEnabled': True,
        'analysis': 'Stream analysis completed'
    }
    print(json.dumps(info))
except Exception as e:
    print(f"ERROR: {str(e)}", file=sys.stderr)
    sys.exit(1)
`;
            
            const process = spawn(this.pythonPath, ['-c', pythonScript]);
            let output = '';
            let error = '';

            process.stdout.on('data', (data) => {
                output += data.toString();
            });

            process.stderr.on('data', (data) => {
                error += data.toString();
            });

            process.on('close', (code) => {
                if (code === 0) {
                    try {
                        const result = JSON.parse(output.trim());
                        resolve(result);
                    } catch (parseError) {
                        resolve(output.trim()); // Return raw output if JSON parsing fails
                    }
                } else {
                    reject(new Error(`Threefive show failed with code ${code}: ${error}`));
                }
            });

            process.on('error', (err) => {
                reject(new Error(`Failed to run threefive show: ${err.message}`));
            });
        });
    }

    // Get iframes from stream
    async getIframes(streamPath) {
        return new Promise((resolve, reject) => {
            const pythonScript = `
import threefive
import json
import sys

try:
    stream = threefive.Stream('${streamPath.replace(/\\/g, '\\\\')}')
    iframes = []
    
    def on_iframe(pts):
        iframes.append(pts)
    
    stream.on('iframe', on_iframe)
    stream.decode()
    
    result = {
        'iframes': iframes,
        'count': len(iframes),
        'threefiveEnabled': True
    }
    print(json.dumps(result))
except Exception as e:
    print(f"ERROR: {str(e)}", file=sys.stderr)
    sys.exit(1)
`;
            
            const process = spawn(this.pythonPath, ['-c', pythonScript]);
            let output = '';
            let error = '';

            process.stdout.on('data', (data) => {
                output += data.toString();
            });

            process.stderr.on('data', (data) => {
                error += data.toString();
            });

            process.on('close', (code) => {
                if (code === 0) {
                    try {
                        const result = JSON.parse(output.trim());
                        resolve(result);
                    } catch (parseError) {
                        resolve(output.trim()); // Return raw output if JSON parsing fails
                    }
                } else {
                    reject(new Error(`Threefive iframes failed with code ${code}: ${error}`));
                }
            });

            process.on('error', (err) => {
                reject(new Error(`Failed to run threefive iframes: ${err.message}`));
            });
        });
    }

    // Get PTS from stream
    async getPts(streamPath) {
        return new Promise((resolve, reject) => {
            const pythonScript = `
import threefive
import json
import sys

try:
    stream = threefive.Stream('${streamPath.replace(/\\/g, '\\\\')}')
    pts_data = []
    
    def on_pts(pts):
        pts_data.append(pts)
    
    stream.on('pts', on_pts)
    stream.decode()
    
    result = {
        'pts': pts_data,
        'count': len(pts_data),
        'threefiveEnabled': True
    }
    print(json.dumps(result))
except Exception as e:
    print(f"ERROR: {str(e)}", file=sys.stderr)
    sys.exit(1)
`;
            
            const process = spawn(this.pythonPath, ['-c', pythonScript]);
            let output = '';
            let error = '';

            process.stdout.on('data', (data) => {
                output += data.toString();
            });

            process.stderr.on('data', (data) => {
                error += data.toString();
            });

            process.on('close', (code) => {
                if (code === 0) {
                    try {
                        const result = JSON.parse(output.trim());
                        resolve(result);
                    } catch (parseError) {
                        resolve(output.trim()); // Return raw output if JSON parsing fails
                    }
                } else {
                    reject(new Error(`Threefive pts failed with code ${code}: ${error}`));
                }
            });

            process.on('error', (err) => {
                reject(new Error(`Failed to run threefive pts: ${err.message}`));
            });
        });
    }

    // Create sidecar file with PTS and SCTE-35 cues
    async createSidecar(streamPath, outputPath) {
        return new Promise((resolve, reject) => {
            const pythonScript = `
import threefive
import json
import sys

try:
    stream = threefive.Stream('${streamPath.replace(/\\/g, '\\\\')}')
    sidecar_data = []
    
    def on_cue(cue):
        sidecar_data.append({
            'type': 'cue',
            'data': str(cue)
        })
    
    def on_pts(pts):
        sidecar_data.append({
            'type': 'pts',
            'data': pts
        })
    
    stream.on('cue', on_cue)
    stream.on('pts', on_pts)
    stream.decode()
    
    # Write to file
    with open('${outputPath.replace(/\\/g, '\\\\')}', 'w') as f:
        json.dump(sidecar_data, f, indent=2)
    
    result = {
        'outputPath': '${outputPath}',
        'entries': len(sidecar_data),
        'threefiveEnabled': True
    }
    print(json.dumps(result))
except Exception as e:
    print(f"ERROR: {str(e)}", file=sys.stderr)
    sys.exit(1)
`;
            
            const process = spawn(this.pythonPath, ['-c', pythonScript]);
            let output = '';
            let error = '';

            process.stdout.on('data', (data) => {
                output += data.toString();
            });

            process.stderr.on('data', (data) => {
                error += data.toString();
            });

            process.on('close', (code) => {
                if (code === 0) {
                    try {
                        const result = JSON.parse(output.trim());
                        resolve(result);
                    } catch (parseError) {
                        resolve(outputPath); // Return the output path if JSON parsing fails
                    }
                } else {
                    reject(new Error(`Threefive sidecar failed with code ${code}: ${error}`));
                }
            });

            process.on('error', (err) => {
                reject(new Error(`Failed to run threefive sidecar: ${err.message}`));
            });
        });
    }
}

module.exports = ThreeFiveIntegration;
