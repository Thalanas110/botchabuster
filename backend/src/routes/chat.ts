import { Router } from "express";
import { ChatController } from "../controllers/ChatController";

const router = Router();
const controller = new ChatController();

router.post("/", (req, res) => controller.chat(req, res));

export default router;
