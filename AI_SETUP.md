# AI Setup & Integration Guide

## Overview
EcoSynTech Farm OS tích hợp 2 module AI cốt lõi:
1. **Plant Disease Detection** - TensorFlow Lite (4MB, 91% accuracy)
2. **Irrigation Prediction** - ONNX LSTM (optional, ~10MB)

## Model Files

| File | Size | Purpose |
|------|------|---------|
| `models/plant_disease.tflite` | 4MB | Plant disease classification (38 classes) |
| `models/labels.txt` | 877B | Disease labels mapping |
| `models/irrigation_lstm.onnx` | Optional | Irrigation prediction |

## Quick Setup

### 1. Environment Variables
```bash
# .env
AI_SMALL_MODEL=1        # Enable TFLite disease detection (default: ON)
AI_LARGE_MODEL=0        # Disable ONNX LSTM (default: OFF - save RAM)
AI_ONNX_URL=            # Optional: external ONNX API
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Start Server
```bash
npm start
```

AI models tự động load khi khởi động (lazy loading cho small model).

## API Endpoints

### Disease Detection
```bash
curl -X POST -F "image=@leaf.jpg" http://localhost:3000/api/ai/disease/predict
```
Response:
```json
{
  "success": true,
  "prediction": {
    "disease": "Tomato___Late_blight",
    "confidence": "94.21%"
  }
}
```

### Irrigation Prediction
```bash
curl -X POST http://localhost:3000/api/ai/irrigation/predict \
  -H "Content-Type: application/json" \
  -d '{"historicalData": [
    {"temp": 28, "humidity": 70, "rainfall": 5, "soilMoisture": 45},
    {"temp": 29, "humidity": 65, "rainfall": 0, "soilMoisture": 40},
    {"temp": 30, "humidity": 60, "rainfall": 0, "soilMoisture": 35}
  ]}'
```

## Model Source

### Plant Disease Model
- **Source**: [knowbee/plant-disease-model](https://github.com/knowbee/plant-disease-model)
- **Architecture**: MobileNetV2 (fine-tuned on PlantVillage dataset)
- **Classes**: 38 plant diseases
- **Accuracy**: 91% on test set
- **Size**: 4MB

### Irrigation LSTM Model
- **Source**: Generated via `models/create_lstm_model.py`
- **Architecture**: LSTM (2 layers, 32 hidden units)
- **Input**: 3-day weather sequence (temp, humidity, rainfall, soilMoisture)
- **Output**: Recommended water (mm)

## Bootstrap System

Xem chi tiết: [Bootstrap Runbook](docs/bootstrap-runbook.md)

```bash
# CLI tool
node bin/bootstrap-ai.js --load-small    # Load TFLite only
node bin/bootstrap-ai.js --reload        # Reload all models
```

## Technical Details

- **TFLite**: `@tensorflow/tfjs-node` + `@tensorflow/tflite-node`
- **ONNX**: `onnxruntime-node`
- **Lazy Loading**: Models chỉ load khi cần (default: small model ON)
- **Memory**: ~200MB RAM for TFLite, ~100MB for ONNX

## Verification

Run tests:
```bash
npm test
```

Test AI specifically:
```bash
npm test -- --testPathPattern="ai_"
```

## Support
- Email: kd.ecosyntech@gmail.com
- Phone: 0989516698