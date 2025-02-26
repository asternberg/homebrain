// tests/llmService.test.ts
import { askLocalLLM } from '../src/services/llmService';
import axios from 'axios';

jest.mock('axios');

describe('llmService', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should send prompt + context + model to local LLM and return simplified result', async () => {
    // Mock the axios.post to return a full structure, including `context` we expect to be removed
    (axios.post as jest.Mock).mockResolvedValue({
      data: {
        model: 'mistral',
        created_at: '2025-02-26T05:03:25.579193Z',
        response: 'some text from the model',
        done: true,
        done_reason: 'stop',
        context: [3, 1027, 3055, 5, 664545, 33, 33] // any large array
      }
    });

    const userPrompt = "What's the status?";
    const houseContext = { 'camera.front': { message: 'ok' } };

    const result = await askLocalLLM(userPrompt, houseContext);
    // We expect the final object to exclude `context`
    expect(result).toEqual({
      model: 'mistral',
      created_at: '2025-02-26T05:03:25.579193Z',
      response: 'some text from the model',
      done: true,
      done_reason: 'stop'
    });

    // Verify the call to axios.post has the correct URL and object
    expect(axios.post).toHaveBeenCalledWith(
      'http://localhost:11434/api/generate',
      expect.objectContaining({
        prompt: expect.stringContaining('"camera.front"'), // checks it includes camera context
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