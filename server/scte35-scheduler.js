const ThreeFiveIntegration = require('./threefive-integration.js');

class SCTE35Scheduler {
    constructor() {
        this.schedules = new Map();
        this.running = false;
        this.threefive = new ThreeFiveIntegration();
    }

    // Add a new schedule
    addSchedule(scheduleData) {
        const scheduleId = `schedule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const schedule = {
            id: scheduleId,
            name: scheduleData.name,
            streamName: scheduleData.streamName,
            command: scheduleData.command, // CUE-OUT or CUE-IN
            eventId: scheduleData.eventId,
            duration: scheduleData.duration,
            startTime: new Date(scheduleData.startTime),
            endTime: scheduleData.endTime ? new Date(scheduleData.endTime) : null,
            recurrence: scheduleData.recurrence, // daily, weekly, monthly, hourly, minutely, none
            recurrenceInterval: scheduleData.recurrenceInterval || 1,
            recurrenceDays: scheduleData.recurrenceDays || [], // for weekly/monthly
            active: true,
            lastExecuted: null,
            nextExecution: new Date(scheduleData.startTime)
        };

        this.schedules.set(scheduleId, schedule);
        console.log(`Schedule added: ${schedule.name} - Next execution: ${schedule.nextExecution}`);
        
        return scheduleId;
    }

    // Remove a schedule
    removeSchedule(scheduleId) {
        const schedule = this.schedules.get(scheduleId);
        if (schedule) {
            this.schedules.delete(scheduleId);
            console.log(`Schedule removed: ${schedule.name}`);
            return true;
        }
        return false;
    }

    // Update a schedule
    updateSchedule(scheduleId, updates) {
        const schedule = this.schedules.get(scheduleId);
        if (schedule) {
            Object.assign(schedule, updates);
            this.calculateNextExecution(schedule);
            console.log(`Schedule updated: ${schedule.name}`);
            return true;
        }
        return false;
    }

    // Calculate next execution time based on recurrence
    calculateNextExecution(schedule) {
        if (!schedule.active || schedule.recurrence === 'none') {
            schedule.nextExecution = null;
            return;
        }

        let nextTime = new Date(schedule.lastExecuted || schedule.startTime);
        
        switch (schedule.recurrence) {
            case 'daily':
                nextTime.setDate(nextTime.getDate() + schedule.recurrenceInterval);
                break;
            case 'weekly':
                nextTime.setDate(nextTime.getDate() + (7 * schedule.recurrenceInterval));
                break;
            case 'monthly':
                nextTime.setMonth(nextTime.getMonth() + schedule.recurrenceInterval);
                break;
            case 'hourly':
                nextTime.setHours(nextTime.getHours() + schedule.recurrenceInterval);
                break;
            case 'minutely':
                nextTime.setMinutes(nextTime.getMinutes() + schedule.recurrenceInterval);
                break;
        }

        // Check if we've passed the end time
        if (schedule.endTime && nextTime > schedule.endTime) {
            schedule.active = false;
            schedule.nextExecution = null;
            return;
        }

        schedule.nextExecution = nextTime;
    }

    // Execute a schedule
    async executeSchedule(schedule) {
        try {
            console.log(`Executing schedule: ${schedule.name} - ${schedule.command}`);
            
            // Create SCTE-35 cue
            const cue = await this.threefive.createCue(schedule.command, schedule.eventId, schedule.duration);
            
            // Update schedule
            schedule.lastExecuted = new Date();
            this.calculateNextExecution(schedule);
            
            console.log(`Schedule executed successfully: ${schedule.name}`);
            return { success: true, cue, schedule };
        } catch (error) {
            console.error(`Failed to execute schedule ${schedule.name}:`, error);
            return { success: false, error: error.message };
        }
    }

    // Check and execute due schedules
    async checkSchedules() {
        const now = new Date();
        const dueSchedules = [];

        for (const [scheduleId, schedule] of this.schedules) {
            if (schedule.active && schedule.nextExecution && schedule.nextExecution <= now) {
                dueSchedules.push({ scheduleId, schedule });
            }
        }

        for (const { scheduleId, schedule } of dueSchedules) {
            await this.executeSchedule(schedule);
        }
    }

    // Start the scheduler
    start() {
        if (this.running) return;
        
        this.running = true;
        this.interval = setInterval(async () => {
            await this.checkSchedules();
        }, 1000); // Check every second
        
        console.log('SCTE-35 Scheduler started');
    }

    // Stop the scheduler
    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        this.running = false;
        console.log('SCTE-35 Scheduler stopped');
    }

    // Get all schedules
    getAllSchedules() {
        return Array.from(this.schedules.values()).map(schedule => ({
            ...schedule,
            startTime: schedule.startTime.toISOString(),
            endTime: schedule.endTime ? schedule.endTime.toISOString() : null,
            lastExecuted: schedule.lastExecuted ? schedule.lastExecuted.toISOString() : null,
            nextExecution: schedule.nextExecution ? schedule.nextExecution.toISOString() : null
        }));
    }

    // Get schedule by ID
    getSchedule(scheduleId) {
        const schedule = this.schedules.get(scheduleId);
        if (schedule) {
            return {
                ...schedule,
                startTime: schedule.startTime.toISOString(),
                endTime: schedule.endTime ? schedule.endTime.toISOString() : null,
                lastExecuted: schedule.lastExecuted ? schedule.lastExecuted.toISOString() : null,
                nextExecution: schedule.nextExecution ? schedule.nextExecution.toISOString() : null
            };
        }
        return null;
    }
}

module.exports = SCTE35Scheduler;
