// src/controllers/askHomeBrainController.ts
import { Request, Response, NextFunction } from 'express';
import { getCurrentHomeMetadata } from '../services/homeMetadataService';
import { askLocalLLM } from '../services/llmService';

export async function askHomeBrain(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      res.status(400).json({ error: 'Missing "prompt" in request body.' });
      return;
    }

    // 1) Gather the camera context
    const houseContext = await getCurrentHomeMetadata();

    // 2) Query your local LLM with both the user prompt and that context
    const llmResponse = await askLocalLLM(prompt, houseContext);

    // 3) Return the LLM's answer
    res.json({ response: llmResponse });
  } catch (error: any) {
    console.error('Error in askHomeBrain:', error);
    next(error);
  }
}