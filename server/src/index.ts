import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import axios from 'axios';

const { Bonjour } = require('bonjour-service');
const bonjour = new Bonjour();

const app = express();
const port = 3000;

/** Retrieve the Home Assistant token from .env */
function getHomeAssistantToken() {
  const token = process.env.HOME_ASSISTANT_TOKEN;
  if (!token) {
    throw new Error('HOME_ASSISTANT_TOKEN not set in .env');
  }
  return token;
}

/** Dynamically fetch all camera entities (entity_id starts with 'camera.'). */
async function fetchCameraEntities(): Promise<string[]> {
  const homeAssistantURL = 'http://localhost:8123';
  const token = getHomeAssistantToken();
  const url = `${homeAssistantURL}/api/states`;

  const response = await axios.get(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const allEntities = response.data as any[];
  const cameraEntities = allEntities.filter((entity: any) =>
    entity.entity_id.startsWith('camera.')
  );

  return cameraEntities.map((cam: any) => cam.entity_id);
}

/**
 * Attempt to start an RTSP stream for the camera, if supported.
 * Some battery cameras might allow a forced stream, enabling a later snapshot.
 */
async function requestStreamCamera(entityId: string) {
  const homeAssistantURL = 'http://localhost:8123';
  const token = getHomeAssistantToken();

  const serviceUrl = `${homeAssistantURL}/api/services/camera/request_stream`;

  try {
    await axios.post(
      serviceUrl,
      {
        entity_id: entityId,
        format: 'rtsp',
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    console.log(`Called camera.request_stream on ${entityId} with 'rtsp'`);
  } catch (err) {
    console.log(`camera.request_stream not supported or failed for ${entityId}: ${err}`);
  }

  // Wait a few seconds to let the camera spin up its stream
  await new Promise((resolve) => setTimeout(resolve, 5000));
}

/** Fetch a snapshot (JPEG) for a given camera entity as a Buffer. */
async function fetchCameraSnapshot(entityId: string): Promise<Buffer> {
  const homeAssistantURL = 'http://localhost:8123';
  const token = getHomeAssistantToken();
  const url = `${homeAssistantURL}/api/camera_proxy/${entityId}`;

  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const arrayBuffer = response.data as ArrayBuffer;
  const imageData = Buffer.from(arrayBuffer);
  return imageData;
}

/** Ensure we have a 'snapshots' folder to save images. */
function ensureSnapshotsDir() {
  const snapshotsDir = path.join(__dirname, '..', '..', 'snapshots');
  if (!fs.existsSync(snapshotsDir)) {
    fs.mkdirSync(snapshotsDir, { recursive: true });
    console.log(`Created snapshots directory at: ${snapshotsDir}`);
  }
  return snapshotsDir;
}

/**
 * GET /getCurrentHomeMetadata
 * 1) Dynamically fetch all camera entities
 * 2) For each camera, call requestStreamCamera, then fetch snapshot
 * 3) Save snapshot to disk, pipe to Python, aggregate results
 */
app.get('/getCurrentHomeMetadata', (req: Request, res: Response, next: NextFunction) => {
  (async () => {
    try {
      const snapshotsDir = ensureSnapshotsDir();
      const cameraIds = await fetchCameraEntities();

      if (!cameraIds.length) {
        return res.status(404).json({ error: 'No camera entities found.' });
      }

      const allResults: Record<string, any> = {};

      for (const entityId of cameraIds) {
        // 1) Attempt to start RTSP stream to wake camera
        await requestStreamCamera(entityId);

        // 2) Fetch snapshot as a Buffer
        let imageData: Buffer;
        try {
          imageData = await fetchCameraSnapshot(entityId);
        } catch (snapshotErr) {
          console.error(`Error fetching snapshot for camera "${entityId}":`, snapshotErr);
          continue;
        }

        // 3) Save snapshot to disk
        const fileName = `${entityId.replace('.', '_')}_${Date.now()}.jpg`;
        const filePath = path.join(snapshotsDir, fileName);
        try {
          fs.writeFileSync(filePath, imageData);
          console.log(`Saved snapshot for ${entityId} to: ${filePath}`);
        } catch (err) {
          console.error(`Failed to save snapshot for ${entityId}:`, err);
          continue;
        }

        // 4) Spawn Python, pipe imageData
        const pythonPath = path.join(__dirname, '..', '..', 'python_cv', 'venv', 'bin', 'python');
        const pythonScript = path.join(__dirname, '..', '..', 'python_cv', 'app.py');
        const pythonProcess = spawn(pythonPath, [pythonScript]);

        let output = '';
        pythonProcess.stdout.on('data', (chunk) => {
          output += chunk.toString();
        });

        pythonProcess.stderr.on('data', (errMsg) => {
          console.error(`Python error for camera "${entityId}": ${errMsg}`);
        });

        const pythonCompleted = new Promise<void>((resolve, reject) => {
          pythonProcess.on('close', (code) => {
            if (code !== 0) {
              return reject(`Python exited with code ${code} for camera ${entityId}`);
            }
            try {
              const metadata = JSON.parse(output);
              allResults[entityId] = metadata;
              resolve();
            } catch (parseErr) {
              reject(`Failed to parse JSON for camera ${entityId}: ${output}`);
            }
          });
        });

        pythonProcess.stdin.write(imageData);
        pythonProcess.stdin.end();

        await pythonCompleted;
      }

      return res.json(allResults);
    } catch (error) {
      console.error('Error in /getCurrentHomeMetadata:', error);
      return res.status(500).json({ error: String(error) });
    }
  })().catch(next);
});

app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);

  // Bonjour / mDNS advertisement
  bonjour.publish({
    name: 'Housebrain Service',
    type: 'housebrain',
    protocol: 'tcp',
    port: port,
  });
});

// Optional: Quick test at startup
(async () => {
  try {
    ensureSnapshotsDir();
    const cameraIds = await fetchCameraEntities();
    console.log('[Startup] Found camera IDs:', cameraIds);
  } catch (err) {
    console.error('[Startup] Error checking cameras:', err);
  }
})();
