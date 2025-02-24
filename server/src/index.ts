import express from 'express';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const app = express();
const port = 3000;

app.get('/getCurrentHomeMetadata', (req, res) => {
  // Define the path to the sample image
  const imagePath = path.join(__dirname, '..', 'sample_image.jpg');

  // Read the image file as binary data
  fs.readFile(imagePath, (err, imageData) => {
    if (err) {
      console.error('Error reading image file:', err);
      return res.status(500).json({ error: 'Error reading image file' });
    }

    // Spawn the Python process

    const pythonPath = path.join(__dirname, '..', '..', 'python_cv', 'venv', 'bin', 'python'); 
    const pythonProcess = spawn(pythonPath, [path.join(__dirname, '..', '..', 'python_cv', 'app.py')]);
    

    let output = '';

    // When Python sends data, accumulate it as a string
    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    // Log any errors from Python
    pythonProcess.stderr.on('data', (data) => {
      console.error(`Python error: ${data}`);
    });

    // When Python finishes, parse and return the JSON
    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        console.error(`Python process exited with code ${code}`);
        return res.status(500).json({ error: 'Error processing CV data' });
      }
      try {
        const metadata = JSON.parse(output);
        res.json(metadata);
      } catch (err) {
        console.error('Failed to parse JSON output:' +output, err);
        res.status(500).json({ error: 'Invalid JSON output from CV process' });
      }
    });

    // Pipe the binary image data to Python's stdin
    pythonProcess.stdin.write(imageData);
    pythonProcess.stdin.end();
  });
});

app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});