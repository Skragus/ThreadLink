// progressTracker.js - Simple in-memory progress tracking
class ProgressTracker {
    constructor() {
        this.jobs = new Map();
        
        // Auto cleanup old jobs after 1 hour
        setInterval(() => {
            const oneHourAgo = Date.now() - (60 * 60 * 1000);
            for (const [jobId, job] of this.jobs.entries()) {
                if (job.createdAt < oneHourAgo) {
                    this.jobs.delete(jobId);
                }
            }
        }, 300000); // Check every 5 minutes
    }

    createJob(jobId, totalDrones = 0) {
        this.jobs.set(jobId, {
            jobId,
            phase: 'preparing',
            message: 'Preparing drone batches',
            completedDrones: 0,
            totalDrones,
            createdAt: Date.now(),
            updatedAt: Date.now()
        });
    }

    updateJob(jobId, updates) {
        const job = this.jobs.get(jobId);
        if (!job) {
            console.warn(`Progress update for unknown job: ${jobId}`);
            return;
        }

        Object.assign(job, updates, { updatedAt: Date.now() });
        this.jobs.set(jobId, job);
        
        // Log progress updates
        if (updates.completedDrones !== undefined) {
            console.log(`📈 Progress: ${job.completedDrones}/${job.totalDrones} drones (${Math.round((job.completedDrones / job.totalDrones) * 100)}%)`);
        } else if (updates.message) {
            console.log(`📊 ${updates.message}`);
        }
    }

    getJob(jobId) {
        return this.jobs.get(jobId) || null;
    }

    setPhase(jobId, phase, message) {
        this.updateJob(jobId, { phase, message });
    }

    setLaunching(jobId, totalDrones) {
        this.updateJob(jobId, {
            phase: 'launching',
            message: 'Launching drones',
            totalDrones
        });
    }

    setProcessing(jobId, totalDrones) {
        this.updateJob(jobId, {
            phase: 'processing',
            message: `Progress: 0/${totalDrones} drones (0.0%)`,
            totalDrones,
            completedDrones: 0
        });
    }

    incrementCompleted(jobId) {
        const job = this.jobs.get(jobId);
        if (!job) return;

        const newCompleted = job.completedDrones + 1;
        const percentage = ((newCompleted / job.totalDrones) * 100).toFixed(1);
        
        this.updateJob(jobId, {
            completedDrones: newCompleted,
            message: `Progress: ${newCompleted}/${job.totalDrones} drones (${percentage}%)`
        });
    }

    setFinalizing(jobId) {
        this.updateJob(jobId, {
            phase: 'finalizing',
            message: 'Finalizing context card'
        });
    }

    setComplete(jobId) {
        this.updateJob(jobId, {
            phase: 'complete',
            message: 'Processing complete'
        });
    }

    setError(jobId, error) {
        this.updateJob(jobId, {
            phase: 'error',
            message: `Error: ${error}`,
            error
        });
    }

    setCancelled(jobId) {
        this.updateJob(jobId, {
            phase: 'cancelled',
            message: 'Processing cancelled by user'
        });
    }

    isCancelled(jobId) {
        const job = this.jobs.get(jobId);
        return job && job.phase === 'cancelled';
    }

    deleteJob(jobId) {
        this.jobs.delete(jobId);
    }

    // Get all jobs (for debugging)
    getAllJobs() {
        return Array.from(this.jobs.values());
    }

    // Get job count (for monitoring)
    getJobCount() {
        return this.jobs.size;
    }
}

// Create singleton instance
const progressTracker = new ProgressTracker();

module.exports = progressTracker;