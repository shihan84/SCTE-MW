# 📅 SCHEDULER & PID/EVENT ID SOLUTION

## ✅ **Your Issues RESOLVED**

### **Problem 1: "Can't see scheduled ad markers"**
### **Problem 2: "Need option to manually edit PID 500 and Event IDs"**

---

## 🎯 **IMMEDIATE SOLUTION**

### **Step 1: Access the Scheduler**
I've created a dedicated scheduler page with full PID/Event ID control:

```
URL: http://localhost:3000/scheduler.html
```

**Features:**
- ✅ **Visual Scheduler Interface** - Time-based ad scheduling
- ✅ **Manual PID Editing** - Change from default 500 to any value (1-8191)
- ✅ **Manual Event ID Control** - Override auto-increment (100023+)
- ✅ **Real-time Settings Display** - See current PID/Event ID values
- ✅ **Manual SCTE-35 Injection** - Direct CUE-OUT/CUE-IN with custom parameters

### **Step 2: Quick Access from Main UI**
Add this button to your main dashboard (`index.html`):

```html
<!-- Add this anywhere in your main UI -->
<a href="scheduler.html" style="
    display: inline-block;
    background: #00ff88;
    color: #000;
    padding: 10px 20px;
    text-decoration: none;
    border-radius: 4px;
    font-weight: bold;
    margin: 10px;
">
    📅 Scheduler & Settings
</a>
```

---

## 🔧 **SCHEDULER FEATURES**

### **1. Manual PID Control**
- **Current PID Display**: Shows active PID (default: 500)
- **PID Input Field**: Change to any value (1-8191)
- **JioTV/TataSky Note**: Recommends PID 500 for compliance
- **Live Update**: Changes apply to new SCTE-35 injections

### **2. Manual Event ID Control**
- **Current Event ID Display**: Shows next Event ID (starts: 100023)
- **Base Event ID Setting**: Change starting point
- **Per-Injection Override**: Custom Event ID for specific CUE-OUT/CUE-IN
- **Auto-Increment**: Maintains sequential numbering

### **3. Advanced Scheduling**
- **Time-Based**: Schedule at specific times (e.g., 2:30 PM)
- **Daily Recurring**: Repeat daily at same time
- **One-Time**: Single execution
- **Custom Parameters**: Override PID/Event ID per schedule
- **Enable/Disable**: Toggle schedules on/off

### **4. Manual SCTE-35 Injection**
- **Stream Selection**: Choose target stream (stream1-stream4)
- **Command Type**: CUE-OUT or CUE-IN
- **Duration Control**: 1-3600 seconds
- **Custom Event ID**: Override auto-increment
- **Custom PID**: Override default PID
- **Immediate Execution**: Instant SCTE-35 injection

---

## 📋 **USAGE INSTRUCTIONS**

### **Access Scheduler:**
1. **Start your middleware**: Run `launch-all.bat`
2. **Open scheduler**: Go to `http://localhost:3000/scheduler.html`
3. **Configure settings**: Update PID/Event ID as needed

### **Change PID (from default 500):**
1. **Go to SCTE-35 Configuration section**
2. **Update PID field**: Enter new value (e.g., 501, 502, etc.)
3. **Click "Update Settings"**
4. **Restart middleware**: For changes to take effect

### **Change Event ID (from default 100023):**
1. **Go to SCTE-35 Configuration section**
2. **Update Base Event ID**: Enter new starting value
3. **Click "Update Settings"**
4. **New injections**: Will use updated Event ID sequence

### **Schedule Ad Markers:**
1. **Go to "Add New Schedule" section**
2. **Select Stream**: Choose target stream
3. **Set Time**: Pick execution time
4. **Set Duration**: Choose ad break length
5. **Optional**: Override Event ID or PID
6. **Click "Add Schedule"**

### **Manual SCTE-35 Injection:**
1. **Go to "Manual SCTE-35 Injection" section**
2. **Select Stream**: Choose target
3. **Select Command**: CUE-OUT or CUE-IN
4. **Set Duration**: For CUE-OUT commands
5. **Optional**: Custom Event ID or PID
6. **Click "Inject SCTE-35 Marker"**

---

## 🎯 **EXAMPLES**

### **Example 1: Change PID to 501**
```
1. Open: http://localhost:3000/scheduler.html
2. Find: "PID (Packet Identifier)" field
3. Change: From 500 to 501
4. Click: "Update Settings"
5. Result: All new SCTE-35 markers use PID 501
```

### **Example 2: Start Event IDs from 200000**
```
1. Open: http://localhost:3000/scheduler.html
2. Find: "Base Event ID" field
3. Change: From 100023 to 200000
4. Click: "Update Settings"
5. Result: Next CUE-OUT uses Event ID 200000, then 200001, etc.
```

### **Example 3: Schedule Daily Ad at 3:30 PM**
```
1. Open: http://localhost:3000/scheduler.html
2. Go to: "Add New Schedule" section
3. Set Stream: stream1
4. Set Time: 15:30
5. Set Duration: 60s
6. Set Repeat: Daily
7. Click: "Add Schedule"
8. Result: Daily 60-second ad break at 3:30 PM
```

### **Example 4: Manual CUE-OUT with Custom Parameters**
```
1. Open: http://localhost:3000/scheduler.html
2. Go to: "Manual SCTE-35 Injection" section
3. Select Stream: stream1
4. Select Command: CUE-OUT
5. Set Duration: 30
6. Custom Event ID: 999999
7. Custom PID: 502
8. Click: "Inject SCTE-35 Marker"
9. Result: Immediate CUE-OUT with Event ID 999999 and PID 502
```

---

## 🔧 **API USAGE** (Advanced)

### **Custom PID/Event ID via API:**
```bash
# CUE-OUT with custom PID and Event ID
curl -X POST http://localhost:3000/api/streams/stream1/cue-out \
  -H "Content-Type: application/json" \
  -d '{
    "duration": 30,
    "eventId": 999999,
    "pid": 502
  }'

# CUE-IN with custom parameters
curl -X POST http://localhost:3000/api/streams/stream1/cue-in \
  -H "Content-Type: application/json" \
  -d '{
    "eventId": 999999,
    "pid": 502
  }'
```

---

## 📊 **CURRENT SETTINGS DISPLAY**

The scheduler page shows:
- **Current PID**: Active PID value
- **Next Event ID**: Next Event ID to be used
- **Active Streams**: Number of running streams
- **All Settings**: Real-time configuration display

---

## 🚨 **IMPORTANT NOTES**

### **PID Compliance:**
- **JioTV/TataSky**: Use PID 500 (default)
- **Custom Carriers**: May require different PID values
- **Valid Range**: 1-8191
- **Restart Required**: Changes need middleware restart

### **Event ID Management:**
- **Sequential**: Auto-increments for each CUE-OUT
- **Unique**: Each injection gets unique Event ID
- **Override**: Can specify custom Event ID per injection
- **Range**: 1 to 4,294,967,295

### **Scheduling:**
- **Browser-Based**: Schedules stored in browser localStorage
- **Persistent**: Survives page refresh
- **Time Zone**: Uses local system time
- **Accuracy**: ±1 second precision

---

## ✅ **VERIFICATION STEPS**

### **Test PID Changes:**
1. Change PID in scheduler
2. Send test CUE-OUT
3. Check logs for new PID value
4. Verify Flussonic receives correct PID

### **Test Event ID Changes:**
1. Change Base Event ID
2. Send multiple CUE-OUTs
3. Verify sequential numbering
4. Check SCTE-35 logs for Event IDs

### **Test Scheduling:**
1. Schedule ad for 1 minute from now
2. Wait for execution
3. Check console logs for confirmation
4. Verify SCTE-35 injection occurred

---

**🎉 Your scheduler with full PID/Event ID control is ready!**

**Access it at: `http://localhost:3000/scheduler.html`**
