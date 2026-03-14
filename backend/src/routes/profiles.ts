import { Router } from "express";
import { ProfileController } from "../controllers/ProfileController";

const router = Router();
const controller = new ProfileController();

// GET stats must come before :id to avoid ambiguity
router.get("/stats", (req, res) => controller.getUserStats(req, res));
router.get("/", (req, res) => controller.getAllProfiles(req, res));
router.get("/:id", (req, res) => controller.getProfile(req, res));
router.put("/:id", (req, res) => controller.updateProfile(req, res));
router.get("/:userId/has-role/:role", (req, res) => controller.checkUserRole(req, res));

export default router;
