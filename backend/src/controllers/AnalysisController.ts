import { Request, Response } from "express";
import { ImageProcessingService } from "../services/ImageProcessingService";
import { ColorAnalysisService } from "../services/ColorAnalysisService";
import { TextureAnalysisService } from "../services/TextureAnalysisService";
import { ClassificationService } from "../services/ClassificationService";
import { CalibrationService } from "../services/CalibrationService";
import { InspectionResult } from "../models/InspectionResult";
import { isOpenCvRuntimeError } from "../integrations/opencv";

export class AnalysisController {
  private imageService: ImageProcessingService;
  private colorService: ColorAnalysisService;
  private textureService: TextureAnalysisService;
  private classificationService: ClassificationService;
  private calibrationService: CalibrationService;

  constructor() {
    this.imageService = ImageProcessingService.getInstance();
    this.colorService = ColorAnalysisService.getInstance();
    this.textureService = TextureAnalysisService.getInstance();
    this.classificationService = ClassificationService.getInstance();
    this.calibrationService = CalibrationService.getInstance();
  }

  /**
   * POST /api/analyze
   * 
   * Accepts multipart form with:
   * - image: JPEG/PNG file of meat sample with calibration card
   * - meat_type: pork | beef | chicken | fish | other
   * 
   * Returns: InspectionResult JSON
   */
  async analyze(req: Request, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ error: "No image file provided" });
        return;
      }

      const meatType = (req.body.meat_type as string) || "pork";
      const imagePath = req.file.path;

      const qualityAssessment = await this.imageService.validateImageQuality(imagePath);
      if (!qualityAssessment.accepted) {
        res.status(422).json({
          error: "Image rejected",
          reasons: qualityAssessment.reasons,
          metrics: qualityAssessment.metrics,
        });
        return;
      }

      // Step 1: Detect calibration card
      const cardDetection = await this.imageService.detectCalibrationCard(imagePath);

      // Step 2: Calibrate if card found
      let processedImage = await this.imageService.preprocessImage(imagePath);
      if (cardDetection.found && cardDetection.region) {
        const calibration = await this.calibrationService.calibrate(
          processedImage,
          cardDetection.region
        );
        processedImage = await this.calibrationService.applyCorrection(
          processedImage,
          calibration
        );
      }

      // Step 3: Extract meat ROI
      const meatROI = await this.imageService.extractMeatROI(imagePath);

      // Step 4: Extract Lab* color features
      const labValues = await this.colorService.extractLabValues(meatROI);

      // Step 5: Extract GLCM texture features
      const glcmFeatures = await this.textureService.computeGLCMFeatures(meatROI);

      // Step 6: Classify against NMIS standards
      const classification = this.classificationService.classify(
        labValues,
        glcmFeatures,
        meatType
      );

      // Build result
      const result = new InspectionResult({
        classification: classification.classification,
        confidence_score: classification.confidence_score,
        lab_values: labValues,
        glcm_features: glcmFeatures,
        flagged_deviations: classification.flagged_deviations,
        explanation: classification.explanation,
      });

      res.json(result.toJSON());
    } catch (error) {
      if (isOpenCvRuntimeError(error)) {
        console.error("Analysis dependency unavailable:", error instanceof Error ? error.message : String(error));
        res.status(503).json({
          error: "Analysis temporarily unavailable",
          message: "OpenCV runtime failed to initialize on this server.",
        });
        return;
      }

      console.error("Analysis error:", error);
      res.status(500).json({
        error: "Analysis failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * GET /api/health
   */
  async health(_req: Request, res: Response): Promise<void> {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      services: {
        imageProcessing: "deferred",
        colorAnalysis: "deferred",
        textureAnalysis: "ready",
        classification: "ready",
      },
    });
  }
}
