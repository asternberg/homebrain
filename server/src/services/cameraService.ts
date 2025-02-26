// src/services/cameraService.ts
import axios from 'axios';
import fs from 'fs';
import path from 'path';

/** Retrieve the Home Assistant token from .env */
function getHomeAssistantToken(): string {
  const token = process.env.HOME_ASSISTANT_TOKEN;
  if (!token) {
    throw new Error('HOME_ASSISTANT_TOKEN not set in .env');
  }
  return token;
}

/** Dynamically fetch all camera entities (entity_id starts with "camera."). */
export async function fetchCameraEntities(): Promise<string[]> {
  const homeAssistantURL = 'http://localhost:8123'; // Adjust if needed
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
 * Attempt to start an RTSP stream for the camera to "wake" it, if supported.
 * If it fails (e.g., NotImplementedError -> 400), we log and ignore.
 */
export async function requestStreamCamera(entityId: string): Promise<void> {
  const homeAssistantURL = 'http://localhost:8123'; // Adjust if needed
  const token = getHomeAssistantToken();
  const serviceUrl = `${homeAssistantURL}/api/services/camera/request_stream`;

  try {
    await axios.post(
      serviceUrl,
      { entity_id: entityId, format: 'rtsp' },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    console.log(`Called camera.request_stream on ${entityId} with 'rtsp'`);
    // Optionally wait a few seconds if your camera needs time to spin up
    await new Promise((resolve) => setTimeout(resolve, 5000));
  } catch (err) {
    console.log(`Ignoring request_stream error for ${entityId}: ${err}`);
    // We do NOT rethrow, so we can still attempt to fetch a snapshot
  }
}

/**
 * Fetch a snapshot (JPEG) for a given camera entity as a Buffer.
 */
export async function fetchCameraSnapshot(entityId: string): Promise<Buffer> {
  const homeAssistantURL = 'http://localhost:8123'; // Adjust if needed
  const token = getHomeAssistantToken();
  const url = `${homeAssistantURL}/api/camera_proxy/${entityId}`;

  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return Buffer.from(response.data as ArrayBuffer);
}

/**
 * Ensure we have a 'snapshots' folder to save images.
 * Returns the directory path.
 */
export function ensureSnapshotsDir(): string {
  const snapshotsDir = path.join(__dirname, '..', '..', 'snapshots');
  if (!fs.existsSync(snapshotsDir)) {
    fs.mkdirSync(snapshotsDir, { recursive: true });
    console.log(`Created snapshots directory at: ${snapshotsDir}`);
  }
  return snapshotsDir;
}