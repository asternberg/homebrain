import json

def run_inference():
    # dummy data
    metadata = {
        "camera1": {
            "detections": [
                {"object": "person", "confidence": 0.95, "bbox": [100, 150, 50, 80]},
                {"object": "dog", "confidence": 0.87, "bbox": [300, 120, 60, 90]}
            ]
        },
        "camera2": {
            "detections": [
                {"object": "cat", "confidence": 0.92, "bbox": [200, 250, 40, 60]}
            ]
        }
    }
    return metadata

if __name__ == '__main__':
    metadata = run_inference()
    # Print JSON so the Node process can capture it
    print(json.dumps(metadata))