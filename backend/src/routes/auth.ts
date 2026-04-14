import { Router } from "express";
import { AuthController } from "../controllers/AuthController";

const router = Router();
const controller = new AuthController();

router.post("/sign-in", (req, res) => controller.signIn(req, res));
router.post("/sign-up", (req, res) => controller.signUp(req, res));
router.post("/sign-out", (req, res) => controller.signOut(req, res));
router.post("/reset-password", (req, res) => controller.sendPasswordReset(req, res));
router.patch("/users/:id/email", (req, res) => controller.updateEmail(req, res));
router.patch("/users/:id/password", (req, res) => controller.updatePassword(req, res));
router.post("/recovery/password", (req, res) => controller.updatePasswordWithRecoveryToken(req, res));

export default router;
