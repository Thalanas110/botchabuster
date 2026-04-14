import { Router } from "express";
import { InspectionController } from "../controllers/InspectionController";

const router = Router();
const controller = new InspectionController();

router.get("/stats", (req, res) => controller.getStatistics(req, res));
router.get("/", (req, res) => controller.getAll(req, res));
router.get("/:id", (req, res) => controller.getById(req, res));
router.post("/", (req, res) => controller.create(req, res));
router.delete("/:id", (req, res) => controller.delete(req, res));

export default router;
