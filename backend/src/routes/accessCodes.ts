import { Router } from "express";
import { AccessCodeController } from "../controllers/AccessCodeController";

const router = Router();
const controller = new AccessCodeController();

router.get("/", (req, res) => controller.getAll(req, res));
router.post("/", (req, res) => controller.create(req, res));
router.delete("/:id", (req, res) => controller.delete(req, res));
router.patch("/:id/toggle", (req, res) => controller.toggleActive(req, res));

export default router;
