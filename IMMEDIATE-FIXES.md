# 🚨 IMMEDIATE FIXES for Your Issues

## ❌ Problem 1: "Web UI not showing RTMP connection"
## ❌ Problem 2: "Unable to see scheduler"

---

## 🔧 QUICK FIX 1: Manual Stream Creation

Since your OBS is streaming to `rtmp://localhost:1935/live/stream1` but the web UI isn't detecting it, let's manually create the stream:

### Step 1: Test Current System
```bash
# Run this to test your current setup:
test-connection.bat
```

### Step 2: Manual Stream Creation via API
Open a new Command Prompt and run these commands:

```bash
# Create stream1 manually
curl -X POST http://localhost:3000/api/streams/stream1/start -H "Content-Type: application/json" -d "{\"name\": \"Main Channel\"}"

# Check if stream appears
curl http://localhost:3000/api/streams

# Test CUE-OUT
curl -X POST http://localhost:3000/api/streams/stream1/cue-out -H "Content-Type: application/json" -d "{\"duration\": 30}"
```

### Step 3: Refresh Web UI
- Go to `http://localhost:3000`
- Press F5 to refresh
- Stream should now appear as "RUNNING"

---

## 🔧 QUICK FIX 2: Enable Scheduler

### Method A: Add Scheduler Button to Web UI
Add this HTML to your web interface (temporary fix):

```html
<!-- Add this button to the system-info section -->
<button onclick="toggleScheduler()" style="background: #00ff88; color: #000; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer;">
    Show/Hide Scheduler
</button>

<!-- Add this div after the ad-presets section -->
<div id="scheduler-section" style="display: none;">
    <h3 style="color: #00ff88;">📅 Scheduled Ad Markers</h3>
    <div style="background: rgba(0,0,0,0.3); padding: 15px; border-radius: 6px; margin-bottom: 20px;">
        <h4 style="color: #fff; margin-bottom: 15px;">Add New Schedule</h4>
        <div style="display: flex; gap: 15px; align-items: end; flex-wrap: wrap;">
            <div style="display: flex; flex-direction: column; gap: 5px;">
                <label style="color: #ccc; font-size: 12px;">Stream</label>
                <select id="schedule-stream" style="padding: 8px; background: #1a1a1a; border: 1px solid #555; color: #fff;">
                    <option value="stream1">stream1</option>
                    <option value="stream2">stream2</option>
                </select>
            </div>
            <div style="display: flex; flex-direction: column; gap: 5px;">
                <label style="color: #ccc; font-size: 12px;">Time</label>
                <input type="time" id="schedule-time" style="padding: 8px; background: #1a1a1a; border: 1px solid #555; color: #fff;">
            </div>
            <div style="display: flex; flex-direction: column; gap: 5px;">
                <label style="color: #ccc; font-size: 12px;">Duration</label>
                <select id="schedule-duration" style="padding: 8px; background: #1a1a1a; border: 1px solid #555; color: #fff;">
                    <option value="30">30s</option>
                    <option value="60">60s</option>
                    <option value="120">120s</option>
                </select>
            </div>
            <button onclick="addSchedule()" style="background: #00ff88; color: #000; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer;">
                Add Schedule
            </button>
        </div>
    </div>
    <div id="schedule-list" style="background: rgba(0,0,0,0.2); padding: 15px; border-radius: 6px;">
        <h4 style="color: #fff;">Active Schedules</h4>
        <p style="color: #888; text-align: center;">No scheduled ad markers yet.</p>
    </div>
</div>

<script>
function toggleScheduler() {
    const scheduler = document.getElementById('scheduler-section');
    scheduler.style.display = scheduler.style.display === 'none' ? 'block' : 'none';
}

function addSchedule() {
    const stream = document.getElementById('schedule-stream').value;
    const time = document.getElementById('schedule-time').value;
    const duration = document.getElementById('schedule-duration').value;
    
    if (!time) {
        alert('Please select a time');
        return;
    }
    
    // Calculate delay until scheduled time
    const now = new Date();
    const [hours, minutes] = time.split(':');
    const scheduled = new Date();
    scheduled.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    
    if (scheduled <= now) {
        scheduled.setDate(scheduled.getDate() + 1); // Next day
    }
    
    const delay = scheduled.getTime() - now.getTime();
    
    // Schedule the CUE-OUT
    setTimeout(async () => {
        try {
            await fetch(`/api/streams/${stream}/cue-out`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ duration: parseInt(duration) })
            });
            console.log(`Scheduled CUE-OUT executed: ${stream} for ${duration}s`);
        } catch (error) {
            console.error('Scheduled execution failed:', error);
        }
    }, delay);
    
    // Add to schedule list
    const scheduleList = document.getElementById('schedule-list');
    const scheduleItem = document.createElement('div');
    scheduleItem.style.cssText = 'background: rgba(0,0,0,0.3); padding: 10px; margin: 5px 0; border-radius: 4px; border: 1px solid #444;';
    scheduleItem.innerHTML = `
        <div style="color: #00ff88; font-weight: bold;">${stream}</div>
        <div style="color: #ccc; font-size: 12px;">⏰ ${time} | ⏱️ ${duration}s | Next: ${scheduled.toLocaleString()}</div>
    `;
    scheduleList.appendChild(scheduleItem);
    
    // Clear form
    document.getElementById('schedule-time').value = '';
    
    alert(`Scheduled CUE-OUT for ${stream} at ${time} (${Math.round(delay/1000/60)} minutes from now)`);
}
</script>
```

---

## 🔧 QUICK FIX 3: OBS Connection Issues

### Check OBS Settings:
1. **OBS → Settings → Output**
2. **Verify these exact settings**:
   - Output Mode: `Advanced`
   - Type: `Custom Output (FFmpeg)`
   - URL: `rtmp://localhost:1935/live/stream1`
   - Container: `flv`

### Alternative: Use Multi RTMP Plugin
If you're using Multi RTMP plugin in OBS:
1. **Add new target**:
   - Name: `SCTE35 Middleware`
   - URL: `rtmp://localhost:1935/live/stream1`
   - Key: (leave empty)

---

## 🔧 QUICK FIX 4: Force Stream Detection

### Create streams.json manually:
Edit `server/streams.json` and add:

```json
{
  "stream1": {
    "name": "Main Channel",
    "lastEventId": 100023,
    "autoRestart": true,
    "status": "running",
    "health": {
      "bitrate": 0,
      "fps": 0,
      "lastUpdate": 1640995200000
    },
    "scte35Log": []
  }
}
```

Then restart the middleware:
1. Press any key in the launch-all.bat console to stop
2. Run `launch-all.bat` again

---

## 🔧 QUICK FIX 5: Test Everything

### Run these commands in order:

```bash
# 1. Test middleware
curl http://localhost:3000/api/health

# 2. Create stream manually
curl -X POST http://localhost:3000/api/streams/stream1/start -H "Content-Type: application/json" -d "{\"name\": \"Test Stream\"}"

# 3. Check streams
curl http://localhost:3000/api/streams

# 4. Test CUE-OUT
curl -X POST http://localhost:3000/api/streams/stream1/cue-out -H "Content-Type: application/json" -d "{\"duration\": 30}"

# 5. Test CUE-IN
curl -X POST http://localhost:3000/api/streams/stream1/cue-in
```

---

## 📋 **IMMEDIATE ACTION PLAN**

### Step 1: Fix Stream Detection
```bash
# Run this now:
test-connection.bat
```

### Step 2: Manual Stream Creation
```bash
curl -X POST http://localhost:3000/api/streams/stream1/start -H "Content-Type: application/json" -d "{\"name\": \"Main Channel\"}"
```

### Step 3: Verify in Web UI
- Go to `http://localhost:3000`
- Refresh page (F5)
- Stream should appear

### Step 4: Test SCTE-35 Injection
- Click "CUE-OUT 30s" button
- Check console logs for confirmation

### Step 5: Add Scheduler (Temporary)
- Copy the HTML/JavaScript code above
- Add to your web interface manually

---

## 🚨 **If Nothing Works**

### Nuclear Option - Restart Everything:
1. **Stop middleware** (press any key in console)
2. **Stop OBS streaming**
3. **Run**: `launch-all.bat`
4. **Wait 10 seconds**
5. **Start OBS streaming** to `rtmp://localhost:1935/live/stream1`
6. **Run**: `test-connection.bat`
7. **Check web UI**: `http://localhost:3000`

---

**Try these fixes in order and let me know which one works!** 🎯
