import { Request, Response } from "express";
import { accessCodeService } from "../services/AccessCodeService";

// this function is the one that handles all the access code related 
// endpoints. 
export class AccessCodeController {
  // validate first if a code is active. If the said code is active then
  // the thing must return a correct boolean.
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

  // asynch function that fetches all access codes
  // this is used in the admin dash only lol
  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const codes = await accessCodeService.getAll();
      res.json(codes);
    } catch (error) {
      console.error("Get access codes error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to fetch access codes" });
    }
  }

  // you use this to create new access code.
  // first validate if code is present, if not, return bad req lol
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

  // deletion of access codes haha
  // you first validate if id is here, if not, return bad reqa as uzual
  // if present then literally just call delete function bruh
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

  // toggles active state of access code LOL
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
