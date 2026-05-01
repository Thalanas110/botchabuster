This directory is an optional location for the ResNet50 ONNX model.

Default filename expected by the app:
- meatlens_resnet50_exp2.onnx

Alternative filename also supported:
- model.onnx

You can also place the ONNX file under:
- frontend/public/model/

If your ONNX output classes are not exactly 4 in this order:
- fresh, acceptable, warning, spoiled
set:
- VITE_RESNET50_CLASS_LABELS=fresh,warning,spoiled
or another matching label order.
