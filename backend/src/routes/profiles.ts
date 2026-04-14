import { Router } from "express";
import { ProfileController } from "../controllers/ProfileController";

const router = Router();
const controller = new ProfileController();

// GET stats must come before :id to avoid ambiguity
router.get("/stats", (req, res) => controller.getUserStats(req, res));
router.get("/", (req, res) => controller.getAllProfiles(req, res));
router.post("/admin/users", (req, res) => controller.createUserByAdmin(req, res));
router.put("/admin/users/:id", (req, res) => controller.updateUserByAdmin(req, res));
router.delete("/admin/users/:id", (req, res) => controller.deleteUserByAdmin(req, res));
router.get("/:id", (req, res) => controller.getProfile(req, res));
router.put("/:id", (req, res) => controller.updateProfile(req, res));
router.get("/:userId/has-role/:role", (req, res) => controller.checkUserRole(req, res));

export default router;
