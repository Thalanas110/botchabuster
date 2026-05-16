import { Router } from "express";
import { UserChatController } from "../controllers/UserChatController";

const router = Router();
const controller = new UserChatController();

router.get("/contacts", (req, res) => controller.getContacts(req, res));
router.get("/messages/:counterpartyId", (req, res) => controller.getConversation(req, res));
router.post("/messages", (req, res) => controller.sendMessage(req, res));

export default router;
