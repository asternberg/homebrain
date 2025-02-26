// src/services/llmService.ts
import axios from 'axios';

interface OllamaFullResponse {
  response: {
    model: string;
    created_at: string;
    response: string;
    done: boolean;
    done_reason?: string;
    context?: any[];  // We'll remove this
    // possibly other fields
  };
}

/**
 * Send the user's prompt + the camera context to the local LLM (Ollama).
 * Return a simplified JSON without the 'context' array.
 */
export async function askLocalLLM(
  userPrompt: string,
  houseContext: Record<string, any>
): Promise<unknown> {
  const systemPrompt = "You are HouseBrain, ..."; // your system prompt
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
    if (data?.response?.context) {
      delete data.response.context;
    }

    // If you want ONLY the 5 fields (model, created_at, response, done, done_reason) 
    // and nothing else, you can rebuild the object:
    const simplifiedResponse = {
      response: {
        model: data.response.model,
        created_at: data.response.created_at,
        response: data.response.response,
        done: data.response.done,
        done_reason: data.response.done_reason
      }
    };

    // Return that simplified object
    return simplifiedResponse;

  } catch (error: any) {
    throw new Error(`Failed to query local LLM: ${error.message}`);
  }
}