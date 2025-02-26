// src/services/homeMetadataService.ts
import {
  fetchCameraEntities,
  requestStreamCamera,
  fetchCameraSnapshot,
  ensureSnapshotsDir
} from './cameraService';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import pLimit from 'p-limit';

/**
 * Gathers the current metadata of all cameras in parallel,
 * but uses a small concurrency limit (2) to avoid overwhelming Home Assistant.
 */
export async function getCurrentHomeMetadata(): Promise<Record<string, any>> {
  const snapshotsDir = ensureSnapshotsDir();
  const cameraIds = await fetchCameraEntities();

  if (!cameraIds.length) {
    throw new Error('No camera entities found.');
  }

  const allResults: Record<string, any> = {};

  // Concurrency limit: 2 cameras at a time
  const limit = pLimit(2);

  // Map cameras to an array of Promises
  const cameraPromises = cameraIds.map((entityId) =>
    limit(async () => {
      try {
        // 1) Attempt to "wake" camera. If it fails (400), we ignore the error
        await requestStreamCamera(entityId);

        // 2) Fetch snapshot
        const imageData = await fetchCameraSnapshot(entityId);

        // 3) Optionally save snapshot to disk
        const fileName = `${entityId.replace('.', '_')}_${Date.now()}.jpg`;
        const filePath = path.join(snapshotsDir, fileName);
        fs.writeFileSync(filePath, imageData);
        console.log(`Saved snapshot for ${entityId} to: ${filePath}`);

        // 4) Call Python inference
        const pythonResult = await callPythonInference(imageData, entityId);

        // Return result for this camera
        return { entityId, metadata: pythonResult };
      } catch (err) {
        console.error(`Error processing camera "${entityId}":`, err);
        // Return a fallback object so we don't fail the entire process
        return { entityId, metadata: { error: String(err) } };
      }
    })
  );

  // Wait for all cameras to complete
  const cameraResults = await Promise.all(cameraPromises);

  // Aggregate results in allResults object
  cameraResults.forEach(({ entityId, metadata }) => {
    allResults[entityId] = metadata;
  });

  return allResults;
}

/**
 * Helper function to spawn Python, write image data to stdin,
 * and parse the JSON output.
 */
async function callPythonInference(imageData: Buffer, entityId: string): Promise<any> {
  // Adjust paths as needed
  const pythonPath = path.join(__dirname, '..', '..', '..','python_cv', 'venv', 'bin', 'python');
  const pythonScript = path.join(__dirname, '..', '..','..', 'python_cv', 'app.py');

  return new Promise((resolve, reject) => {
    const pythonProcess = spawn(pythonPath, [pythonScript]);

    let output = '';

    pythonProcess.stdout.on('data', (chunk) => {
      output += chunk.toString();
    });

    pythonProcess.stderr.on('data', (errMsg) => {
      console.error(`Python stderr for camera "${entityId}": ${errMsg}`);
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        return reject(`Python exited with code ${code} for camera ${entityId}`);
      }
      try {
        const parsed = JSON.parse(output);
        resolve(parsed);
      } catch (parseErr) {
        reject(`Failed to parse JSON for camera ${entityId}: ${output}`);
      }
    });

    // Write the snapshot data to STDIN
    pythonProcess.stdin.write(imageData);
    pythonProcess.stdin.end();
  });
}