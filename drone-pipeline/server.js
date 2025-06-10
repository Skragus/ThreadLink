// server.js
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { processConversation } = require('./index.js');

const app = express();
const PORT = 3001; // Different from your frontend (probably 3000)

// Middleware
app.use(cors()); // Allow requests from your React frontend
app.use(express.json({ limit: '10mb' })); // Handle large conversation texts

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Main condense endpoint
app.post('/api/condense', async (req, res) => {
  try {
    const { text, model = 'gemini-1.5-flash', targetTokens = 500, concurrency = 3 } = req.body;
    
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ 
        error: 'Text is required',
        message: 'Please provide text to condense'
      });
    }

    console.log(`🚀 Processing request: ${text.length} chars, model: ${model}, target: ${targetTokens} tokens`);
    
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
      
      // Run your existing pipeline
      const result = await processConversation({
        runDrones: true,
        model: model,
        concurrency: concurrency,
        saveOutput: false, // Don't save files for API requests
        customTargetTokens: targetTokens
      });

      // Check if processing failed
      if (result.success === false) {
        return res.status(400).json({
          success: false,
          error: result.error,
          errorType: result.errorType || 'PROCESSING_FAILURE',
          stats: result.stats
        });
      }
      
      console.log(`✅ Processing complete: ${result.sessionStats?.compressionRatio || 'N/A'}:1 compression`);
      
      // Success response
      res.json({
        success: true,
        contextCard: result.contextCard,
        stats: {
            compressionRatio: result.sessionStats?.compressionRatio || 'N/A',
            executionTime: result.executionTime,
            successfulDrones: result.sessionStats?.successfulDrones || 0,
            totalDrones: result.sessionStats?.estimatedDrones || 0,
            originalTokens: result.sessionStats?.totalInputTokens,
            finalTokens: result.sessionStats?.finalContentTokens
        }
      });
    } finally {
      // Cleanup: remove temp file and restore original
      if (fs.existsSync(tempInputFile)) {
        fs.unlinkSync(tempInputFile);
      }
      
      if (fs.existsSync('raw.md.backup')) {
        fs.copyFileSync('raw.md.backup', 'raw.md');
        fs.unlinkSync('raw.md.backup');
      }
    }
    
  } catch (error) {
    console.error('❌ Processing error:', error);
    
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Processing failed. Please try again.'
    });
  }
});

// Progress endpoint (for future real-time updates)
app.get('/api/progress/:jobId', (req, res) => {
  // Placeholder for progress tracking
  res.json({ progress: 0, status: 'pending' });
});

// Error handler
app.use((error, req, res, next) => {
  console.error('💥 Server error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: 'Something went wrong on our end'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
🧵 ThreadLink Backend Server
============================
🚀 Server running at: http://localhost:${PORT}
📡 API endpoints:
   • GET  /api/health     - Health check
   • POST /api/condense   - Process conversations

💡 Ready to receive requests from your frontend!
`);
});

module.exports = app;