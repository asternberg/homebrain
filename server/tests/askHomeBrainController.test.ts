// tests/askHomeBrainController.test.ts
import { askHomeBrain } from '../src/controllers/askHomeBrainController';
import * as homeMetadataService from '../src/services/homeMetadataService';
import * as llmService from '../src/services/llmService';

describe('askHomeBrainController', () => {
  let mockReq: any;
  let mockRes: any;
  let mockNext: jest.Mock;

  beforeEach(() => {
    jest.resetAllMocks();
    mockReq = {
      body: { prompt: 'Hello from test' },
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();
  });

  it('should return the LLM response in JSON', async () => {
    // Mock the services
    (homeMetadataService.getCurrentHomeMetadata as jest.Mock).mockResolvedValue({ cameraData: 'test' });
    (llmService.askLocalLLM as jest.Mock).mockResolvedValue('LLM says hi');

    await askHomeBrain(mockReq, mockRes, mockNext);

    // Check we called the services
    expect(homeMetadataService.getCurrentHomeMetadata).toHaveBeenCalled();
    expect(llmService.askLocalLLM).toHaveBeenCalledWith('Hello from test', { cameraData: 'test' });
    // Check we returned JSON with { response: 'LLM says hi' }
    expect(mockRes.json).toHaveBeenCalledWith({ response: 'LLM says hi' });
  });

  it('should return 400 if prompt is missing', async () => {
    mockReq.body = {}; // no prompt
    await askHomeBrain(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Missing "prompt" in request body.' });
  });

  it('should handle errors by calling next(error)', async () => {
    const fakeError = new Error('Something broke');
    (homeMetadataService.getCurrentHomeMetadata as jest.Mock).mockRejectedValue(fakeError);

    await askHomeBrain(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalledWith(fakeError);
  });
});