// server.js - Fixed with progress tracking and cancellation support
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { processConversation } = require('./index.js');
const progressTracker = require('./progressTracker.js');

const app = express();
const PORT = 3001;

// Track active jobs for cancellation
const activeJobs = new Map();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Progress endpoint
app.get('/api/progress/:jobId', (req, res) => {
  const { jobId } = req.params;
  const job = progressTracker.getJob(jobId);
  
  if (!job) {
    return res.status(404).json({
      error: 'Job not found',
      message: 'The requested job could not be found'
    });
  }

  // Return progress data
  res.json({
    phase: job.phase,
    message: job.message,
    completedDrones: job.completedDrones,
    totalDrones: job.totalDrones,
    error: job.error || null,
    updatedAt: job.updatedAt
  });
});

// Cancel endpoint
app.post('/api/cancel/:jobId', (req, res) => {
  const { jobId } = req.params;
  
  // Check if job exists
  const job = progressTracker.getJob(jobId);
  if (!job) {
    return res.status(404).json({
      success: false,
      error: 'Job not found',
      message: 'The requested job could not be found'
    });
  }
  
  // Check if job is already complete or cancelled
  if (job.phase === 'complete' || job.phase === 'cancelled') {
    return res.json({
      success: true,
      message: 'Job already completed or cancelled'
    });
  }
  
  // Mark job as cancelled
  progressTracker.setCancelled(jobId);
  
  // Signal to active processing to stop
  const activeJob = activeJobs.get(jobId);
  if (activeJob && activeJob.cancel) {
    activeJob.cancel();
  }
  
  console.log(`🛑 Job cancelled: ${jobId}`);
  
  res.json({
    success: true,
    message: 'Job cancelled successfully'
  });
});

// Main condense endpoint with progress tracking
app.post('/api/condense', async (req, res) => {
  let jobId = null;
  
  try {
    const { 
      text, 
      model = 'gemini-1.5-flash', 
      targetTokens = 500, 
      jobId: requestJobId, // Get jobId from request
      
      // Processing settings
      processingSpeed = 'balanced',
      concurrency = 3,
      recencyMode = false,
      recencyStrength = 0,
      
      // Advanced settings
      temperature = 0.5,
      droneDensity,
      maxDrones = 100,
      
      // For reference/logging
      compressionRatio = 'balanced'
    } = req.body;
    
    // Use provided jobId or generate one
    jobId = requestJobId || `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ 
        error: 'Text is required',
        message: 'Please provide text to condense'
      });
    }

    console.log(`🚀 Processing request [${jobId}]:`);
    console.log(`   Text: ${text.length} chars`);
    console.log(`   Model: ${model}`);
    console.log(`   Target: ${targetTokens} tokens (${compressionRatio})`);
    console.log(`   Processing: ${processingSpeed} (concurrency: ${concurrency})${recencyMode ? ` + recency(${recencyStrength})` : ''}`);
    console.log(`   Advanced: temp=${temperature}, drones=${droneDensity || 'auto'}, max=${maxDrones}`);
    
    // Initialize progress tracking
    progressTracker.createJob(jobId);
    
    // Create cancellation support
    let cancelled = false;
    const cancelHandler = () => {
      cancelled = true;
      console.log(`🛑 Processing cancelled for job: ${jobId}`);
    };
    
    // Register active job for cancellation
    activeJobs.set(jobId, { cancel: cancelHandler });
    
    // Create a temporary input file for this request
    const tempId = Date.now();
    const tempInputFile = `temp_raw_${tempId}.md`;
    
    try {
      // Write input text to temporary file
      fs.writeFileSync(tempInputFile, text, 'utf-8');
      
      // Temporarily override the raw file path in your pipeline
      const originalRawFile = 'raw.md';
      if (fs.existsSync(originalRawFile)) {
        fs.copyFileSync(originalRawFile, `${originalRawFile}.backup`);
      }
      fs.copyFileSync(tempInputFile, originalRawFile);
      
      // Run your existing pipeline with progress tracking
      const result = await processConversation({
        runDrones: true,
        model: model,
        concurrency: concurrency,
        saveOutput: false,
        customTargetTokens: targetTokens,
        jobId: jobId, // Pass jobId to processing pipeline
        cancelled: () => cancelled, // Pass cancellation checker
        
        // New settings
        processingSpeed: processingSpeed,
        recencyMode: recencyMode,
        recencyStrength: recencyStrength,
        temperature: temperature,
        droneDensity: droneDensity,
        maxDrones: maxDrones
      });

      // Check if processing was cancelled
      if (cancelled || progressTracker.isCancelled(jobId)) {
        return res.status(400).json({
          success: false,
          error: 'Processing was cancelled',
          errorType: 'CANCELLED',
          message: 'The processing was cancelled by user request'
        });
      }

      // Check if processing failed
      if (result.success === false) {
        progressTracker.setError(jobId, result.error);
        return res.status(400).json({
          success: false,
          error: result.error,
          errorType: result.errorType || 'PROCESSING_FAILURE',
          stats: result.stats
        });
      }
      
      // Mark as complete
      progressTracker.setComplete(jobId);
      
      console.log(`✅ Processing complete [${jobId}]: ${result.sessionStats?.compressionRatio || 'N/A'}:1 compression`);
      
      // Success response
      res.json({
        success: true,
        contextCard: result.contextCard,
        stats: {
            compressionRatio: result.sessionStats?.compressionRatio || 'N/A',
            executionTime: result.executionTime,
            successfulDrones: result.sessionStats?.successfulDrones || 0,
            totalDrones: result.sessionStats?.actualDrones || 0,
            originalTokens: result.sessionStats?.totalInputTokens,
            finalTokens: result.sessionStats?.finalContentTokens,
            settingsUsed: {
              model,
              processingSpeed,
              concurrency,
              recencyMode,
              recencyStrength,
              temperature,
              droneDensity,
              maxDrones
            }
        }
      });
      
      // Clean up job after a delay (give frontend time to poll final status)
      setTimeout(() => {
        progressTracker.deleteJob(jobId);
      }, 5000);
      
    } finally {
      // Cleanup: remove temp file and restore original
      if (fs.existsSync(tempInputFile)) {
        fs.unlinkSync(tempInputFile);
      }
      
      if (fs.existsSync('raw.md.backup')) {
        fs.copyFileSync('raw.md.backup', 'raw.md');
        fs.unlinkSync('raw.md.backup');
      }
      
      // Remove from active jobs
      activeJobs.delete(jobId);
    }
    
  } catch (error) {
    console.error(`❌ Processing error [${jobId}]:`, error);
    
    if (jobId) {
      progressTracker.setError(jobId, error.message);
      // Remove from active jobs on error
      activeJobs.delete(jobId);
    }
    
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Processing failed. Please try again.'
    });
  }
});

// Debug endpoint to see all jobs (optional)
app.get('/api/debug/jobs', (req, res) => {
  res.json({
    totalJobs: progressTracker.getJobCount(),
    jobs: progressTracker.getAllJobs(),
    activeJobs: Array.from(activeJobs.keys())
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
🧵 ThreadLink Backend Server
============================
🚀 Server running at: http://localhost:${PORT}
📡 API endpoints:
   • GET  /api/health        - Health check
   • POST /api/condense      - Process conversations
   • GET  /api/progress/:id  - Get job progress
   • POST /api/cancel/:id    - Cancel processing job
   • GET  /api/debug/jobs    - Debug: View all jobs

💡 Ready to receive requests from your frontend!
`);
});

module.exports = app;