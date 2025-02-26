# HomeBrain: AI-Glue for Home Automation

HomeBrain is a thin, **local**-only Node.js + TypeScript service that connects **computer vision** (CV) and a **language model** (LLM) to your Home Assistant camera feeds. It can answer unstructured questions about what’s happening on your property, based on real-time snapshots from your cameras.

> **Key Goal**: Ephemeral, local processing.  
> - No data storage.
> - No third-party cloud or WAN usage.
> - Scales to more cameras just as you add them to Home-Assistant. Plug-and play LLM and CV components.

---

## Table of Contents

1. [Architecture & Components](#architecture--components)  
2. [Setup & Requirements](#setup--requirements)  
3. [Usage](#usage)  
4. [Notes & Debugging](#notes--debugging)

---

## Architecture & Components

HouseBrain is structured as follows:

1. **Node.js Express Server**  
   - Exposes a single endpoint (`/api/askHomeBrain`) to accept user questions.  
   - Fetches camera snapshots from Home Assistant.  
   - Passes each snapshot through a **computer vision** model to classify detected objects.  
   - Sends both the user query and the classification context to a **local LLM** (via Ollama or similar).  
   - Returns the LLM’s text response back to the user.

2. **Home Assistant Integration**  
   - Calls Home Assistant to discover camera entities (`camera.*`) and retrieve snapshots.

3. **Computer Vision (CV) Model**  
   - Uses [Ultralytics YOLOv8n](https://github.com/ultralytics/ultralytics) for object detection.  
   - Runs a small Python script (`app.py`) in a virtual environment, reading raw snapshot bytes from stdin, returning classification JSON.

4. **Local LLM**  
   - Uses [Ollama](https://github.com/jmorganca/ollama) to run a **Mistral 7B** model on Apple Silicon (tested on a Mac Mini M4 Pro).  
   - Provides free-form text answers to user questions, guided by the object detection context.

All processing stays **local**—no external cloud usage or logging by default.

---

## Setup & Requirements

1. **Home Assistant**  
   - You must have a Home Assistant instance running to provide camera streams/snapshots.  
   - Ensure you have a valid `HOME_ASSISTANT_TOKEN` in your `.env`.

2. **Python CV Environment**  
   - Create a Python virtual environment (e.g., in `python_cv/venv`).  
   - Install [`ultralytics`](https://github.com/ultralytics/ultralytics), `Pillow`, etc., so that `app.py` can run YOLOv8n.

3. **LLM (Local)**  
   - Install [Ollama](https://github.com/jmorganca/ollama) on macOS (or Docker on Linux).  
   - Get a small model such as **Mistral 7B** (`mistral-7b.ggmlv3.q4_0.bin`), place it in Ollama’s model directory, then serve it:
     ```bash
     ollama serve --model mistral-7b.ggmlv3.q4_0.bin
     ```
4. **Node + TypeScript**  
   - Install dependencies:
     ```bash
     npm install
     ```
   - Build & run:
     ```bash
     npm run build
     npm start
     ```
   - Or for dev mode:
     ```bash
     npm run dev
     ```
5. **Environment Variables**  
   - Create a `.env` file with at least:
     ```bash
     HOME_ASSISTANT_TOKEN=<your_ha_token_here>
     ```

---

## Usage

1. **Start everything**:
   - Home Assistant running (with entities like `camera.front_door`, etc.).  
   - Python CV environment installed (`cd python_cv && source venv/bin/activate`).  
   - Ollama serving Mistral (e.g., `ollama serve --port 11434 --model mistral-7b.ggmlv3.q4_0.bin`).  
   - Node server (`npm run dev` or `npm start`).

2. **Send a POST request** to http://localhost:3000/api/askHomeBrain with JSON body, for example:
```json
{
  "prompt": "Is there anyone at the front door?"
}```
3. **View response**: 
```json
{
  "response": "It appears no person is detected at the front door at the moment."
}```


## Notes & Debugging

- No historical data or logs, beyond optional snapshot saving. By default, saving snapshots is commented out; enable if needed for debugging.

- All integrations are local (Home Assistant at http://localhost:8123, Ollama at http://localhost:11434).
### Tested Setup
- macOS with M4 Mini Pro
- Mistral 7B for LLM
- YOLOv8n for CV
- Node.js v18+ and Python 3.9+

### Troubleshooting
- ENOENT for Python? Check venv/bin/python paths.
- 400 from camera.request_stream? Possibly unsupported; skip or handle gracefully.
- LLM 404? Confirm the model file name in Ollama’s folder and matching JSON "model" field.