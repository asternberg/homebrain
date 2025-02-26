// src/server.ts
import 'dotenv/config';
import express from 'express';
import { Bonjour } from 'bonjour-service';
import askHomeBrainRoutes from './routes/askHomeBrainRoutes';
import { ensureSnapshotsDir, fetchCameraEntities } from './services/cameraService';

const app = express();
const port = 3000;
const bonjour = new Bonjour();

app.use(express.json());

// Mount routes
app.use('/api', askHomeBrainRoutes);

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