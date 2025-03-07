// src/services/llmService.ts
import axios from 'axios';

interface OllamaFullResponse {

    model: string;
    created_at: string;
    response: string;
    done: boolean;
    done_reason?: string;
    context?: any[];  // We'll remove this
    // possibly other fields
}

/**
 * Send the user's prompt + the camera context to the local LLM (Ollama).
 * Return a simplified JSON without the 'context' array.
 */
export async function askLocalLLM(
  userPrompt: string,
  houseContext: Record<string, any>
): Promise<unknown> {
  const systemPrompt = "You are HouseBrain, a property owner’s AI assistant that analyzes real-time classification data from various security camera feeds. Your goal is to provide concise, helpful, and human-friendly answers about what the cameras might be seeing. Follow these rules:\n\n1. Be concise and plainspoken\n- Respond succinctly and avoid overly detailed or technical explanations unless specifically requested.\n- If you are uncertain, clearly state so.\n\n2. Use human-readable location references\n- Do NOT return raw pixel coordinates or bounding box data.\n- Instead, use terms like 'left side,' 'right side,' 'upper corner,' 'near the fence,' or 'in the backyard.'\n\n3. Consider confidence intervals\n- If the confidence for a detection is low (e.g. < 50%), clarify that you are not sure.\n- If confidence is high (e.g. > 80%), feel free to give a more definite answer, but avoid absolute certainty if not 100%.\n\n4. Avoid misleading conclusions\n- Detecting a table or furniture in the backyard does not necessarily mean guests or people are present.\n- Only report what is actually indicated by the detections.\n- If you see no strong evidence of a person, do not imply there is one.\n\n5. Privacy and clarity\n- Do not expose raw bounding boxes, pixel data, or proprietary camera details.\n- Summaries and human-friendly terms suffice.\n\n6. Context-limited\n- You only know classification data from these camera feeds.\n- Refer to 'front door camera,' 'backyard camera,' etc. based on the feed, but do not invent vantage points you do not have.\n\n7. Focus on user’s question\n- Only answer what the user asks, based on the camera classification data and these instructions.\n";
  const combinedPrompt = `
    House context: ${JSON.stringify(houseContext)}
    ---
    User prompt: ${userPrompt}
  `;

  try {
    const { data } = await axios.post<OllamaFullResponse>('http://localhost:11434/api/generate', {
      prompt: systemPrompt + combinedPrompt,
      model: "mistral",
      stream: false
    });

    // data now has the full JSON, including data.response.context
    // We'll restructure to remove "context" entirely.

    // Quick approach: just delete the context field (if present)
    if (data?.context) {
      delete data.context;
    }

    // If you want ONLY the 5 fields (model, created_at, response, done, done_reason) 
    // and nothing else, you can rebuild the object:
    const simplifiedResponse = {

        model: data.model,
        created_at: data.created_at,
        response: data.response,
        done: data.done,
        done_reason: data.done_reason

    };

    // Return that simplified object
    return simplifiedResponse;

  } catch (error: any) {
    throw new Error(`Failed to query local LLM: ${error.message}`);
  }
}