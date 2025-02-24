import sys
import json
import time
from PIL import Image
import io
import numpy as np
from ultralytics import YOLO
import warnings
import logging
import contextlib

# Suppress extra warnings and set logging level
warnings.filterwarnings("ignore")
logging.getLogger("ultralytics").setLevel(logging.ERROR)

def run_inference(image_bytes):
    start_time = time.time()  # Start timer

    try:
        image = Image.open(io.BytesIO(image_bytes))
        try:
            image_np = np.array(image)
            model = YOLO('yolov8n.pt')
            # Redirect any prints during inference to stderr
            with contextlib.redirect_stdout(sys.stderr):
                results = model(image_np, conf=0.1, verbose=False)
            
            # Get the dictionary mapping label indices to names
            names_dict = model.names
            
            detections = []
            for result in results:
                for box in result.boxes:
                    bbox = box.xyxy.tolist()[0]  # [x1, y1, x2, y2]
                    confidence = box.conf.item()
                    label_index = int(box.cls.item())
                    label_name = names_dict.get(label_index, str(label_index-1))
                    
                    detections.append({
                        "bbox": bbox,
                        "confidence": confidence,
                        "label": label_name
                    })
        except Exception as e:
            return {"error": f"Error during inference: {str(e)}"}
        
        end_time = time.time()  # End timer
        processing_time_ms = int((end_time - start_time) * 1000)
        
        metadata = {
            "message": "Image processed successfully",
            "image_dims": image.size,
            "detections": detections,
            "processing_time_ms": processing_time_ms
        }
        return metadata
    except Exception as e:
        return {"error": f"Error processing image: {str(e)}"}

if __name__ == '__main__':
    image_bytes = sys.stdin.buffer.read()
    # Print only the final JSON output to stdout
    output = json.dumps(run_inference(image_bytes))
    print(output)