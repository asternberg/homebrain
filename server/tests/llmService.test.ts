// tests/llmService.test.ts
import { askLocalLLM } from '../src/services/llmService';
import axios from 'axios';

jest.mock('axios');

describe('llmService', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('askLocalLLM: should send prompt + context + model to local LLM and return result', async () => {
    (axios.post as jest.Mock).mockResolvedValue({ data: 'Mock LLM response' });

    const userPrompt = "What's the status?";
    const houseContext = { 'camera.front': { message: 'ok' } };

    const result = await askLocalLLM(userPrompt, houseContext);
    expect(result).toBe('Mock LLM response');

    // Verify the call to axios.post has the correct URL and object
    expect(axios.post).toHaveBeenCalledWith(
      'http://localhost:11434/api/generate',
      expect.objectContaining({
        prompt: expect.stringContaining('"camera.front"'), // checks the user prompt includes the camera context
        model: 'mistral',
        stream: false
      })
    );
  });

  it('should throw error if LLM call fails', async () => {
    (axios.post as jest.Mock).mockRejectedValue(new Error('Connection refused'));

    await expect(askLocalLLM('Hello?', {})).rejects.toThrow('Failed to query local LLM');
  });
});