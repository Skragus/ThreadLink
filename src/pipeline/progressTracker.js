/**
 * Progress tracking module for ThreadLink
 * Browser-compatible version that uses callbacks instead of server-side storage
 * ES Module version
 */

export class ProgressTracker {
    constructor() {
        this.jobs = new Map();
        this.listeners = new Map();
    }

    /**
     * Create a new job
     * @param {string} jobId - Unique job identifier
     * @param {Function} onUpdate - Callback function for progress updates
     * @returns {string} The job ID
     */
    createJob(jobId, onUpdate = null) {
        const job = {
            id: jobId,
            status: 'created',
            progress: 0,
            totalDrones: 0,
            completedDrones: 0,
            message: 'Initializing...',
            startTime: Date.now(),
            lastUpdate: Date.now(),
            error: null
        };
        
        this.jobs.set(jobId, job);
        
        if (onUpdate) {
            this.listeners.set(jobId, onUpdate);
        }
        
        this._notifyUpdate(jobId);
        return jobId;
    }

    /**
     * Update job status
     * @param {string} jobId - Job identifier
     * @param {Object} updates - Updates to apply
     */
    updateJob(jobId, updates) {
        const job = this.jobs.get(jobId);
        if (!job) return;

        Object.assign(job, updates, {
            lastUpdate: Date.now()
        });

        // Calculate progress percentage
        if (job.totalDrones > 0 && job.completedDrones >= 0) {
            job.progress = Math.round((job.completedDrones / job.totalDrones) * 100);
        }

        this._notifyUpdate(jobId);
    }

    /**
     * Set job as preprocessing
     */
    setPreprocessing(jobId, message = 'Processing text...') {
        this.updateJob(jobId, {
            status: 'preprocessing',
            message,
            progress: 10
        });
    }

    /**
     * Set job as launching drones
     */
    setLaunching(jobId, totalDrones) {
        this.updateJob(jobId, {
            status: 'launching',
            message: `Launching ${totalDrones} drones...`,
            totalDrones,
            completedDrones: 0,
            progress: 20
        });
    }

    /**
     * Set job as processing
     */
    setProcessing(jobId, totalDrones) {
        this.updateJob(jobId, {
            status: 'processing',
            message: `Processing with ${totalDrones} drones...`,
            totalDrones,
            completedDrones: 0,
            progress: 30
        });
    }

    /**
     * Update drone progress
     */
    updateDroneProgress(jobId, completedDrones, totalDrones, message = null) {
        const updates = {
            completedDrones,
            totalDrones
        };
        
        if (message) {
            updates.message = message;
        } else {
            const percent = totalDrones > 0 ? Math.round((completedDrones / totalDrones) * 100) : 0;
            updates.message = `Processing: ${completedDrones}/${totalDrones} drones (${percent}%)`;
        }
        
        this.updateJob(jobId, updates);
    }

    /**
     * Set job as finalizing
     */
    setFinalizing(jobId) {
        this.updateJob(jobId, {
            status: 'finalizing',
            message: 'Creating context card...',
            progress: 90
        });
    }

    /**
     * Mark job as complete
     */
    setComplete(jobId, result = null) {
        const job = this.jobs.get(jobId);
        if (!job) return;

        this.updateJob(jobId, {
            status: 'complete',
            message: 'Complete!',
            progress: 100,
            result,
            endTime: Date.now(),
            duration: Date.now() - job.startTime
        });
    }

    /**
     * Mark job as failed
     */
    setError(jobId, error) {
        const job = this.jobs.get(jobId);
        if (!job) return;

        const errorMessage = typeof error === 'string' ? error : error.message || 'Unknown error';
        
        this.updateJob(jobId, {
            status: 'error',
            message: `Error: ${errorMessage}`,
            error: errorMessage,
            progress: 0,
            endTime: Date.now(),
            duration: Date.now() - job.startTime
        });
    }

    /**
     * Mark job as cancelled
     */
    setCancelled(jobId) {
        const job = this.jobs.get(jobId);
        if (!job) return;

        this.updateJob(jobId, {
            status: 'cancelled',
            message: 'Processing cancelled',
            progress: 0,
            endTime: Date.now(),
            duration: Date.now() - job.startTime
        });
    }

    /**
     * Get job status
     */
    getJob(jobId) {
        return this.jobs.get(jobId);
    }

    /**
     * Remove job and its listener
     */
    removeJob(jobId) {
        this.jobs.delete(jobId);
        this.listeners.delete(jobId);
    }

    /**
     * Clear old jobs (older than specified milliseconds)
     */
    cleanupOldJobs(maxAge = 3600000) { // Default: 1 hour
        const now = Date.now();
        const jobsToRemove = [];

        for (const [jobId, job] of this.jobs.entries()) {
            if (now - job.lastUpdate > maxAge) {
                jobsToRemove.push(jobId);
            }
        }

        jobsToRemove.forEach(jobId => this.removeJob(jobId));
        
        return jobsToRemove.length;
    }

    /**
     * Notify listener of job update
     * @private
     */
    _notifyUpdate(jobId) {
        const job = this.jobs.get(jobId);
        const listener = this.listeners.get(jobId);
        
        if (job && listener) {
            // Use setTimeout to avoid blocking
            setTimeout(() => {
                try {
                    listener({...job}); // Pass a copy to prevent external modifications
                } catch (error) {
                    console.error(`Error in progress listener for job ${jobId}:`, error);
                }
            }, 0);
        }
    }

    /**
     * Get all active jobs
     */
    getActiveJobs() {
        const activeJobs = [];
        
        for (const [jobId, job] of this.jobs.entries()) {
            if (job.status === 'processing' || job.status === 'preprocessing' || job.status === 'launching') {
                activeJobs.push({...job});
            }
        }
        
        return activeJobs;
    }

    /**
     * Check if a job is still active
     */
    isJobActive(jobId) {
        const job = this.jobs.get(jobId);
        return job && ['processing', 'preprocessing', 'launching', 'finalizing'].includes(job.status);
    }
}

// Create a singleton instance
export const progressTracker = new ProgressTracker();

// Export utility functions that mimic the server-side API
export function createJob(jobId, onUpdate) {
    return progressTracker.createJob(jobId, onUpdate);
}

export function updateJob(jobId, updates) {
    return progressTracker.updateJob(jobId, updates);
}

export function setPreprocessing(jobId, message) {
    return progressTracker.setPreprocessing(jobId, message);
}

export function setLaunching(jobId, totalDrones) {
    return progressTracker.setLaunching(jobId, totalDrones);
}

export function setProcessing(jobId, totalDrones) {
    return progressTracker.setProcessing(jobId, totalDrones);
}

export function updateDroneProgress(jobId, completedDrones, totalDrones, message) {
    return progressTracker.updateDroneProgress(jobId, completedDrones, totalDrones, message);
}

export function setFinalizing(jobId) {
    return progressTracker.setFinalizing(jobId);
}

export function setComplete(jobId, result) {
    return progressTracker.setComplete(jobId, result);
}

export function setError(jobId, error) {
    return progressTracker.setError(jobId, error);
}

export function setCancelled(jobId) {
    return progressTracker.setCancelled(jobId);
}

export function getJob(jobId) {
    return progressTracker.getJob(jobId);
}

export function removeJob(jobId) {
    return progressTracker.removeJob(jobId);
}

export function cleanupOldJobs(maxAge) {
    return progressTracker.cleanupOldJobs(maxAge);
}

export function getActiveJobs() {
    return progressTracker.getActiveJobs();
}

export function isJobActive(jobId) {
    return progressTracker.isJobActive(jobId);
}