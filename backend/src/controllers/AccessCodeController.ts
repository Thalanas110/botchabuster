import { Request, Response } from "express";
import { accessCodeService } from "../services/AccessCodeService";

export class AccessCodeController {
  async validate(req: Request, res: Response): Promise<void> {
    try {
      const { code } = req.body as { code?: string };
      if (!code) {
        res.status(400).json({ error: "Code is required" });
        return;
      }

      const isValid = await accessCodeService.validate(code);
      res.json({ valid: isValid });
    } catch (error) {
      console.error("Validate access code error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to validate access code" });
    }
  }

  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const codes = await accessCodeService.getAll();
      res.json(codes);
    } catch (error) {
      console.error("Get access codes error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to fetch access codes" });
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const { code, description } = req.body;
      if (!code) {
        res.status(400).json({ error: "Code is required" });
        return;
      }
      const created = await accessCodeService.create(code, description);
      res.status(201).json(created);
    } catch (error) {
      console.error("Create access code error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to create access code" });
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ error: "Access code ID is required" });
        return;
      }
      await accessCodeService.delete(id);
      res.status(204).send();
    } catch (error) {
      console.error("Delete access code error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to delete access code" });
    }
  }

  async toggleActive(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { is_active } = req.body;
      if (!id) {
        res.status(400).json({ error: "Access code ID is required" });
        return;
      }
      if (typeof is_active !== "boolean") {
        res.status(400).json({ error: "is_active must be a boolean" });
        return;
      }
      const updated = await accessCodeService.toggleActive(id, is_active);
      res.json(updated);
    } catch (error) {
      console.error("Toggle access code error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to toggle access code" });
    }
  }
}
