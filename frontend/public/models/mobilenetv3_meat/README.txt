This directory holds the TF.js GraphModel for MobileNetV3-Small fine-tuned on
meat freshness classification (4 classes: fresh | acceptable | warning | spoiled).

Expected files after model export:
  model.json        — topology + weight manifest
  group1-shard*.bin — weight shards

How to add the model
──────────────────────────────────────────────────────────────────────────────
1. Train a MobileNetV3-Small head on your labelled meat freshness dataset.

2. Export from Python to TF.js GraphModel:

   pip install tensorflowjs
   tensorflowjs_converter \
     --input_format=tf_saved_model \
     --output_format=tfjs_graph_model \
     --signature_name=serving_default \
     --saved_model_tags=serve \
     path/to/saved_model/ \
     frontend/public/models/mobilenetv3_meat/

   OR from a Keras .h5 model:

   tensorflowjs_converter \
     --input_format=keras \
     path/to/model.h5 \
     frontend/public/models/mobilenetv3_meat/

3. Expected model input: [batch, 224, 224, 3] float32 normalized to [-1, 1]
   Expected model output: [batch, 4] softmax probabilities
   Class order: ["fresh", "acceptable", "warning", "spoiled"]

4. Run `npm run build` — Workbox will automatically precache the model files
   (see globPatterns in vite.config.ts).

Until the model files are present, the app uses the rule-based classifier
(Lab* color + GLCM texture against NMIS thresholds) which is always available
and produces identical output format.
