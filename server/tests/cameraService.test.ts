// tests/cameraService.test.ts
import { fetchCameraEntities, requestStreamCamera, fetchCameraSnapshot, ensureSnapshotsDir } from '../src/services/cameraService';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

jest.mock('axios'); // this tells Jest to mock 'axios' entirely
jest.mock('fs');

describe('cameraService', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    process.env.HOME_ASSISTANT_TOKEN = 'mock-token';
  });

  it('should create snapshots directory if it does not exist', () => {
    // Mock fs.existsSync to return false the first time
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    (fs.mkdirSync as jest.Mock).mockImplementation(() => {});

    const dir = ensureSnapshotsDir();
    expect(fs.existsSync).toHaveBeenCalled();
    expect(fs.mkdirSync).toHaveBeenCalled();
    expect(dir).toContain('snapshots');
  });

  it('should NOT recreate snapshots directory if it already exists', () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);

    const dir = ensureSnapshotsDir();
    expect(fs.mkdirSync).not.toHaveBeenCalled();
    expect(dir).toContain('snapshots');
  });

  it('fetchCameraEntities: should return camera entity IDs', async () => {
    // Mock axios.get
    (axios.get as jest.Mock).mockResolvedValue({
      data: [
        { entity_id: 'camera.front_door' },
        { entity_id: 'light.kitchen' },
        { entity_id: 'camera.backyard' }
      ]
    });

    const entities = await fetchCameraEntities();
    expect(entities).toEqual(['camera.front_door', 'camera.backyard']);
  });

  it('requestStreamCamera: should ignore errors if request_stream is unsupported', async () => {
    (axios.post as jest.Mock).mockRejectedValue(new Error('Request failed with status code 400'));

    // Should not throw
    await requestStreamCamera('camera.front_door');
    expect(axios.post).toHaveBeenCalled();
  });

  it('fetchCameraSnapshot: should return a Buffer from axios response', async () => {
    // Mock axios.get with arraybuffer data
    const mockBuffer = Buffer.from('fake image data');
    (axios.get as jest.Mock).mockResolvedValue({ data: mockBuffer });

    const result = await fetchCameraSnapshot('camera.backyard');
    expect(result).toEqual(mockBuffer);
  });
});