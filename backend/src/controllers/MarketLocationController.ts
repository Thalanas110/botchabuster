import { Request, Response } from "express";
import { authService } from "../services/AuthService";
import { profileService } from "../services/ProfileService";
import { marketLocationService } from "../services/MarketLocationService";

class MarketLocationAccessError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

export class MarketLocationController {
  private async requireAdmin(req: Request): Promise<void> {
    const authorizationHeader = req.header("authorization");
    if (!authorizationHeader?.startsWith("Bearer ")) {
      throw new MarketLocationAccessError(401, "Authentication required");
    }

    const accessToken = authorizationHeader.slice("Bearer ".length).trim();
    if (!accessToken) {
      throw new MarketLocationAccessError(401, "Authentication required");
    }

    let userId: string;

    try {
      const user = await authService.getUserByAccessToken(accessToken);
      userId = user.id;
    } catch (error) {
      throw new MarketLocationAccessError(401, error instanceof Error ? error.message : "Authentication required");
    }

    const isAdmin = await profileService.hasRole(userId, "admin");
    if (!isAdmin) {
      throw new MarketLocationAccessError(403, "Admin access required");
    }
  }

  private handleError(action: string, res: Response, error: unknown, fallbackMessage: string): void {
    console.error(`${action} error:`, error);

    if (error instanceof MarketLocationAccessError) {
      res.status(error.status).json({ error: error.message });
      return;
    }

    res.status(500).json({ error: error instanceof Error ? error.message : fallbackMessage });
  }

  async getAll(_req: Request, res: Response): Promise<void> {
    try {
      const locations = await marketLocationService.getAll();
      res.json(locations);
    } catch (error) {
      this.handleError("Get market locations", res, error, "Failed to fetch market locations");
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      await this.requireAdmin(req);

      const { name } = req.body as { name?: string };
      if (!name || !name.trim()) {
        res.status(400).json({ error: "Market location name is required" });
        return;
      }

      const createdLocation = await marketLocationService.create(name);
      res.status(201).json(createdLocation);
    } catch (error) {
      this.handleError("Create market location", res, error, "Failed to create market location");
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      await this.requireAdmin(req);

      const { id } = req.params;
      if (!id) {
        res.status(400).json({ error: "Market location ID is required" });
        return;
      }

      await marketLocationService.delete(id);
      res.status(204).send();
    } catch (error) {
      this.handleError("Delete market location", res, error, "Failed to delete market location");
    }
  }
}
