import { Router } from "express";
import { UploadController } from "../controllers/UploadController";
import { upload } from "../middleware/upload";

const router = Router();
const controller = new UploadController();

// POST /api/upload/inspection-image
router.post(
  "/inspection-image",
  upload.single("image"),
  (req, res) => controller.uploadInspectionImage(req, res)
);

export default router;
