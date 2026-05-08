import { Request, Response } from "express";
import { accessCodeService } from "../services/AccessCodeService";
import { authService } from "../services/AuthService";
import { profileService } from "../services/ProfileService";
import { auditLogService } from "../services/AuditLogService";

// this function is the one that handles all the access code related 
// endpoints. 
export class AccessCodeController {
  private async resolveActor(req: Request): Promise<{ id: string; role: string } | null> {
    const authorizationHeader = req.header("authorization");
    if (!authorizationHeader?.startsWith("Bearer ")) {
      return null;
    }

    const accessToken = authorizationHeader.slice("Bearer ".length).trim();
    if (!accessToken) return null;

    try {
      const user = await authService.getUserByAccessToken(accessToken);
      const isAdmin = await profileService.hasRole(user.id, "admin");
      return { id: user.id, role: isAdmin ? "admin" : "inspector" };
    } catch {
      return null;
    }
  }

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

      const actor = await this.resolveActor(req);
      if (actor) {
        await auditLogService.write({
          payload: {
            event_type: "admin.access_code.create",
            event_time: new Date().toISOString(),
            actor: {
              id: actor.id,
              role: actor.role,
            },
            source: {
              ip: req.ip || null,
              user_agent: req.header("user-agent") || null,
            },
            data: {
              access_code_id: created.id,
              is_active: created.is_active,
            },
          },
        });
      }

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

      const actor = await this.resolveActor(req);
      if (actor) {
        await auditLogService.write({
          payload: {
            event_type: "admin.access_code.delete",
            event_time: new Date().toISOString(),
            actor: {
              id: actor.id,
              role: actor.role,
            },
            source: {
              ip: req.ip || null,
              user_agent: req.header("user-agent") || null,
            },
            data: {
              access_code_id: id,
            },
          },
        });
      }

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

      const actor = await this.resolveActor(req);
      if (actor) {
        await auditLogService.write({
          payload: {
            event_type: "admin.access_code.toggle",
            event_time: new Date().toISOString(),
            actor: {
              id: actor.id,
              role: actor.role,
            },
            source: {
              ip: req.ip || null,
              user_agent: req.header("user-agent") || null,
            },
            data: {
              access_code_id: updated.id,
              is_active: updated.is_active,
            },
          },
        });
      }

      res.json(updated);
    } catch (error) {
      console.error("Toggle access code error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to toggle access code" });
    }
  }
}
