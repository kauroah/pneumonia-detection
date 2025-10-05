"""
Script to convert PyTorch model (.pth) to ONNX format

Usage:
    python scripts/convert_model.py --input model.pth --output pneumonia_model.onnx
"""

import torch
import torch.nn as nn
import argparse
from torchvision import models


def load_resnet_model(model_path, num_classes=2):
    """Load a ResNet model from .pth file"""
    # Initialize ResNet architecture (adjust based on your model)
    model = models.resnet50(pretrained=False)
    
    # Modify final layer for binary classification
    num_features = model.fc.in_features
    model.fc = nn.Linear(num_features, num_classes)
    
    # Load trained weights
    model.load_state_dict(torch.load(model_path, map_location=torch.device('cpu')))
    model.eval()
    
    return model


def convert_to_onnx(model, output_path, input_size=(1, 3, 224, 224)):
    """Convert PyTorch model to ONNX format"""
    # Create dummy input
    dummy_input = torch.randn(input_size)
    
    # Export to ONNX
    torch.onnx.export(
        model,
        dummy_input,
        output_path,
        export_params=True,
        opset_version=11,
        do_constant_folding=True,
        input_names=['input'],
        output_names=['output'],
        dynamic_axes={
            'input': {0: 'batch_size'},
            'output': {0: 'batch_size'}
        }
    )
    
    print(f"Model successfully converted to ONNX: {output_path}")


def main():
    parser = argparse.ArgumentParser(description='Convert PyTorch model to ONNX')
    parser.add_argument('--input', type=str, required=True, help='Path to .pth model file')
    parser.add_argument('--output', type=str, default='pneumonia_model.onnx', help='Output ONNX file path')
    parser.add_argument('--num-classes', type=int, default=2, help='Number of output classes')
    
    args = parser.parse_args()
    
    # Load PyTorch model
    print(f"Loading PyTorch model from {args.input}...")
    model = load_resnet_model(args.input, args.num_classes)
    
    # Convert to ONNX
    print("Converting to ONNX format...")
    convert_to_onnx(model, args.output)
    
    print("Conversion complete!")


if __name__ == "__main__":
    main()
