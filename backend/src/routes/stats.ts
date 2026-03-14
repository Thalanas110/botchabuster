import { Router } from "express";
import { StatsController } from "../controllers/StatsController";

const router = Router();
const controller = new StatsController();

router.get("/landing-page", (req, res) => controller.getLandingPageStats(req, res));

export default router;
