This directory holds the MobileNetV3 ONNX model and metadata used by app inference.

Expected files:
  meatlens_mobilenetv3small_cnn_only.onnx
  meatlens_mobilenetv3small_*_metadata.json

Expected metadata values:
  backbone: MobileNetV3Small
  preprocess_function_name: mobilenet_v3.preprocess_input
  input_size: [224, 224]
  image_crop_mode: center_crop
  label_order: ["fresh", "not fresh", "spoiled"]

Notes:
- The app reads metadata dynamically at runtime and applies deterministic
  preprocess only (no augmentation during inference).
- `npm run build` runs `scripts/sync-onnx-model.mjs` which copies ONNX and
  metadata into stable public paths consumed by the runtime.
- If model load fails, the app falls back to rule-based classification.
