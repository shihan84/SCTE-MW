// SCTE-35 Ad Scheduler Component
// Add this to the main UI for scheduled ad functionality

const AdScheduler = () => {
    const [schedules, setSchedules] = useState([]);
    const [newSchedule, setNewSchedule] = useState({
        streamId: 'stream1',
        time: '',
        duration: 30,
        repeat: 'none',
        enabled: true
    });

    // Load existing schedules from localStorage
    useEffect(() => {
        const saved = localStorage.getItem('scte35-schedules');
        if (saved) {
            setSchedules(JSON.parse(saved));
        }
    }, []);

    // Save schedules to localStorage
    useEffect(() => {
        localStorage.setItem('scte35-schedules', JSON.stringify(schedules));
    }, [schedules]);

    // Add new schedule
    const addSchedule = () => {
        if (!newSchedule.time) {
            alert('Please select a time');
            return;
        }

        const schedule = {
            id: Date.now(),
            ...newSchedule,
            nextRun: calculateNextRun(newSchedule.time, newSchedule.repeat)
        };

        setSchedules(prev => [...prev, schedule]);
        
        // Schedule the actual execution
        scheduleExecution(schedule);
        
        // Reset form
        setNewSchedule({
            streamId: 'stream1',
            time: '',
            duration: 30,
            repeat: 'none',
            enabled: true
        });
    };

    // Calculate next run time
    const calculateNextRun = (time, repeat) => {
        const [hours, minutes] = time.split(':');
        const now = new Date();
        const scheduled = new Date();
        scheduled.setHours(parseInt(hours), parseInt(minutes), 0, 0);

        if (scheduled <= now) {
            if (repeat === 'daily') {
                scheduled.setDate(scheduled.getDate() + 1);
            } else if (repeat === 'none') {
                return null; // One-time schedule in the past
            }
        }

        return scheduled.toISOString();
    };

    // Schedule execution
    const scheduleExecution = (schedule) => {
        if (!schedule.nextRun || !schedule.enabled) return;

        const delay = new Date(schedule.nextRun).getTime() - Date.now();
        
        if (delay > 0) {
            setTimeout(async () => {
                try {
                    // Send CUE-OUT
                    await axios.post(`/api/streams/${schedule.streamId}/cue-out`, {
                        duration: schedule.duration
                    });
                    
                    console.log(`Scheduled CUE-OUT executed: ${schedule.streamId} for ${schedule.duration}s`);
                    
                    // Update next run if repeating
                    if (schedule.repeat === 'daily') {
                        const nextRun = new Date(schedule.nextRun);
                        nextRun.setDate(nextRun.getDate() + 1);
                        
                        setSchedules(prev => prev.map(s => 
                            s.id === schedule.id 
                                ? { ...s, nextRun: nextRun.toISOString() }
                                : s
                        ));
                        
                        // Schedule next execution
                        scheduleExecution({ ...schedule, nextRun: nextRun.toISOString() });
                    } else {
                        // Remove one-time schedule
                        setSchedules(prev => prev.filter(s => s.id !== schedule.id));
                    }
                    
                } catch (error) {
                    console.error('Scheduled execution failed:', error);
                }
            }, delay);
        }
    };

    // Initialize existing schedules on component mount
    useEffect(() => {
        schedules.forEach(schedule => {
            if (schedule.enabled && schedule.nextRun) {
                scheduleExecution(schedule);
            }
        });
    }, []);

    // Toggle schedule enabled/disabled
    const toggleSchedule = (id) => {
        setSchedules(prev => prev.map(schedule => 
            schedule.id === id 
                ? { ...schedule, enabled: !schedule.enabled }
                : schedule
        ));
    };

    // Delete schedule
    const deleteSchedule = (id) => {
        setSchedules(prev => prev.filter(s => s.id !== id));
    };

    // Format time for display
    const formatTime = (isoString) => {
        if (!isoString) return 'N/A';
        return new Date(isoString).toLocaleString();
    };

    return (
        <div className="scheduler-container">
            <h3>📅 Scheduled Ad Markers</h3>
            
            {/* Add New Schedule Form */}
            <div className="schedule-form">
                <h4>Add New Schedule</h4>
                <div className="form-row">
                    <div className="form-group">
                        <label>Stream</label>
                        <select 
                            value={newSchedule.streamId}
                            onChange={(e) => setNewSchedule(prev => ({...prev, streamId: e.target.value}))}
                        >
                            <option value="stream1">Stream 1</option>
                            <option value="stream2">Stream 2</option>
                            <option value="stream3">Stream 3</option>
                            <option value="stream4">Stream 4</option>
                        </select>
                    </div>
                    
                    <div className="form-group">
                        <label>Time</label>
                        <input 
                            type="time"
                            value={newSchedule.time}
                            onChange={(e) => setNewSchedule(prev => ({...prev, time: e.target.value}))}
                        />
                    </div>
                    
                    <div className="form-group">
                        <label>Duration (seconds)</label>
                        <select 
                            value={newSchedule.duration}
                            onChange={(e) => setNewSchedule(prev => ({...prev, duration: parseInt(e.target.value)}))}
                        >
                            <option value={30}>30s</option>
                            <option value={60}>60s</option>
                            <option value={120}>120s</option>
                            <option value={180}>180s</option>
                        </select>
                    </div>
                    
                    <div className="form-group">
                        <label>Repeat</label>
                        <select 
                            value={newSchedule.repeat}
                            onChange={(e) => setNewSchedule(prev => ({...prev, repeat: e.target.value}))}
                        >
                            <option value="none">One Time</option>
                            <option value="daily">Daily</option>
                        </select>
                    </div>
                    
                    <button className="btn btn-success" onClick={addSchedule}>
                        Add Schedule
                    </button>
                </div>
            </div>

            {/* Existing Schedules List */}
            <div className="schedule-list">
                <h4>Active Schedules ({schedules.length})</h4>
                {schedules.length === 0 ? (
                    <p style={{color: '#888', textAlign: 'center', padding: '20px'}}>
                        No scheduled ad markers. Add one above.
                    </p>
                ) : (
                    schedules.map(schedule => (
                        <div key={schedule.id} className={`schedule-item ${schedule.enabled ? 'enabled' : 'disabled'}`}>
                            <div className="schedule-info">
                                <div className="schedule-stream">
                                    <strong>{schedule.streamId}</strong>
                                </div>
                                <div className="schedule-details">
                                    <span>⏰ {schedule.time}</span>
                                    <span>⏱️ {schedule.duration}s</span>
                                    <span>🔄 {schedule.repeat === 'daily' ? 'Daily' : 'One Time'}</span>
                                </div>
                                <div className="schedule-next">
                                    Next: {formatTime(schedule.nextRun)}
                                </div>
                            </div>
                            <div className="schedule-controls">
                                <button 
                                    className={`btn btn-sm ${schedule.enabled ? 'btn-warning' : 'btn-success'}`}
                                    onClick={() => toggleSchedule(schedule.id)}
                                >
                                    {schedule.enabled ? 'Disable' : 'Enable'}
                                </button>
                                <button 
                                    className="btn btn-sm btn-danger"
                                    onClick={() => deleteSchedule(schedule.id)}
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

// CSS for scheduler (add to styles.css)
const schedulerStyles = `
.scheduler-container {
    background: linear-gradient(135deg, #1e1e1e 0%, #2a2a2a 100%);
    border: 1px solid #333;
    border-radius: 8px;
    padding: 20px;
    margin-bottom: 20px;
}

.scheduler-container h3 {
    color: #00ff88;
    margin-bottom: 20px;
    font-size: 18px;
}

.schedule-form {
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid #444;
    border-radius: 6px;
    padding: 15px;
    margin-bottom: 20px;
}

.schedule-form h4 {
    color: #fff;
    margin-bottom: 15px;
    font-size: 14px;
}

.form-row {
    display: flex;
    gap: 15px;
    align-items: end;
    flex-wrap: wrap;
}

.form-group {
    display: flex;
    flex-direction: column;
    gap: 5px;
    min-width: 120px;
}

.form-group label {
    color: #ccc;
    font-size: 12px;
    font-weight: bold;
}

.form-group input, .form-group select {
    padding: 8px;
    background: #1a1a1a;
    border: 1px solid #555;
    border-radius: 4px;
    color: #fff;
    font-size: 14px;
}

.form-group input:focus, .form-group select:focus {
    outline: none;
    border-color: #00ff88;
}

.schedule-list {
    max-height: 300px;
    overflow-y: auto;
}

.schedule-list h4 {
    color: #fff;
    margin-bottom: 15px;
    font-size: 14px;
}

.schedule-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid #444;
    border-radius: 4px;
    padding: 12px;
    margin-bottom: 8px;
    transition: all 0.2s ease;
}

.schedule-item.enabled {
    border-color: #00ff88;
}

.schedule-item.disabled {
    opacity: 0.6;
    border-color: #666;
}

.schedule-info {
    flex: 1;
}

.schedule-stream {
    color: #00ff88;
    font-weight: bold;
    margin-bottom: 5px;
}

.schedule-details {
    display: flex;
    gap: 15px;
    font-size: 12px;
    color: #ccc;
    margin-bottom: 3px;
}

.schedule-next {
    font-size: 11px;
    color: #888;
}

.schedule-controls {
    display: flex;
    gap: 8px;
}
`;

// Export for use in main application
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AdScheduler, schedulerStyles };
}
