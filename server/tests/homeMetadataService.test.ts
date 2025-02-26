// tests/homeMetadataService.test.ts
import { getCurrentHomeMetadata } from '../src/services/homeMetadataService';
import * as cameraService from '../src/services/cameraService';
import { spawn } from 'child_process';

jest.mock('../src/services/cameraService'); // Mocks entire cameraService module
jest.mock('child_process');

describe('homeMetadataService', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should gather current home metadata for cameras', async () => {
    // Mock cameraService
    (cameraService.fetchCameraEntities as jest.Mock).mockResolvedValue(['camera.front', 'camera.back']);
    (cameraService.requestStreamCamera as jest.Mock).mockResolvedValue(undefined);
    (cameraService.fetchCameraSnapshot as jest.Mock).mockResolvedValue(Buffer.from('fakeImage'));

    // Mock spawn to simulate Python returning some JSON
    const mockSpawn = spawn as jest.MockedFunction<typeof spawn>;
    const mockChildProcess = {
      stdout: {
        on: jest.fn((event, handler) => {
          if (event === 'data') {
            // simulate sending JSON from python
            handler('{"detections": [{"label": "person"}]}');
          }
        }),
      },
      stderr: { on: jest.fn() },
      stdin: {
        write: jest.fn(),
        end: jest.fn(),
      },
      on: jest.fn((event, handler) => {
        if (event === 'close') {
          // simulate normal exit code
          handler(0);
        }
      }),
    };
    mockSpawn.mockReturnValue(mockChildProcess as any);

    const result = await getCurrentHomeMetadata();

    expect(cameraService.fetchCameraEntities).toHaveBeenCalled();
    expect(cameraService.requestStreamCamera).toHaveBeenCalledTimes(2);
    expect(cameraService.fetchCameraSnapshot).toHaveBeenCalledTimes(2);
    expect(spawn).toHaveBeenCalledTimes(2);

    // The final result should include metadata for each camera
    expect(result).toEqual({
      'camera.front': { detections: [{ label: 'person' }] },
      'camera.back': { detections: [{ label: 'person' }] },
    });
  });

  it('should throw error if no cameras are found', async () => {
    (cameraService.fetchCameraEntities as jest.Mock).mockResolvedValue([]);
    await expect(getCurrentHomeMetadata()).rejects.toThrow('No camera entities found.');
  });
});