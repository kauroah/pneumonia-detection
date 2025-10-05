# Pneumonia Detection Model

## Setup Instructions

1. Place your trained ONNX model file in this directory
2. Rename it to `pneumonia_model.onnx`
3. Ensure the model accepts input shape: [1, 3, 224, 224]
4. Ensure the model outputs: [1, 2] (probabilities for NORMAL and PNEUMONIA)

## Model Input/Output Specifications

**Input:**
- Name: `input` (adjust in `lib/model-inference.ts` if different)
- Shape: [1, 3, 224, 224]
- Type: float32
- Preprocessing: ImageNet normalization (mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])

**Output:**
- Name: `output` (adjust in `lib/model-inference.ts` if different)
- Shape: [1, 2]
- Type: float32
- Format: [probability_normal, probability_pneumonia]

## Converting PyTorch to ONNX

If you have a `.pth` file, convert it to ONNX format:

\`\`\`python
import torch
import torch.onnx

# Load your model
model = YourResNetModel()
model.load_state_dict(torch.load('model.pth'))
model.eval()

# Create dummy input
dummy_input = torch.randn(1, 3, 224, 224)

# Export to ONNX
torch.onnx.export(
    model,
    dummy_input,
    "pneumonia_model.onnx",
    export_params=True,
    opset_version=11,
    input_names=['input'],
    output_names=['output'],
    dynamic_axes={'input': {0: 'batch_size'}, 'output': {0: 'batch_size'}}
)
\`\`\`

## Testing the Model

After placing the model file, test it by uploading a chest X-ray image through the dashboard.
