import express from 'express';
import { spawn } from 'child_process';

const app = express();
const port = 3000;

// GET endpoint to retrieve current home metadata
app.get('/getCurrentHomeMetadata', (req, res) => {
  // Spawn the Python process that handles the CV inference
  const pythonProcess = spawn('python3', ['./python_cv/app.py']);

  let output = '';

  // Collect stdout data from Python
  pythonProcess.stdout.on('data', (data) => {
    output += data.toString();
  });

  // Log any errors from Python
  pythonProcess.stderr.on('data', (data) => {
    console.error(`Python error: ${data}`);
  });

  // When Python process ends, parse and return the JSON result
  pythonProcess.on('close', (code) => {
    if (code !== 0) {
      console.error(`Python process exited with code ${code}`);
      return res.status(500).json({ error: 'Error processing CV data' });
    }
    try {
      const metadata = JSON.parse(output);
      res.json(metadata);
    } catch (err) {
      console.error('Failed to parse JSON output:', err);
      res.status(500).json({ error: 'Invalid JSON output from CV process' });
    }
  });
});

app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});