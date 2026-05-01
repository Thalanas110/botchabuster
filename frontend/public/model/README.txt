ResNet50 ONNX model placement

Put your trained ONNX file in one of these paths (first existing path is used):

1. frontend/public/model/meatlens_resnet50_exp2.onnx   (recommended)
2. frontend/public/model/resnet50.onnx
3. frontend/public/model/model.onnx
4. frontend/public/models/resnet50_meat/meatlens_resnet50_exp2.onnx
5. frontend/public/models/resnet50_meat/model.onnx

Optional override:
- Set VITE_RESNET50_ONNX_PATH to an absolute web path, e.g.
  VITE_RESNET50_ONNX_PATH=/model/my_custom_resnet50.onnx
- Set VITE_RESNET50_CLASS_LABELS to match model output order, e.g.
  VITE_RESNET50_CLASS_LABELS=fresh,warning,spoiled

Notes:
- The app uses ONNX Runtime Web with ResNet50 preprocessing (RGB->BGR plus
  ImageNet channel mean subtraction).
- If no ONNX file is found, the app falls back to rule-based classification.
