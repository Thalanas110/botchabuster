import { Request, Response } from "express";
import { profileService } from "../services/ProfileService";

export class ProfileController {
  async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ error: "User ID is required" });
        return;
      }
      const profile = await profileService.getProfile(id);
      res.json(profile);
    } catch (error) {
      console.error("Get profile error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to fetch profile" });
    }
  }

  async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { full_name, avatar_url, location } = req.body;
      if (!id) {
        res.status(400).json({ error: "User ID is required" });
        return;
      }
      const profile = await profileService.updateProfile(id, { full_name, avatar_url, location });
      res.json(profile);
    } catch (error) {
      console.error("Update profile error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to update profile" });
    }
  }

  async getAllProfiles(req: Request, res: Response): Promise<void> {
    try {
      const profiles = await profileService.getAllProfiles();
      res.json(profiles);
    } catch (error) {
      console.error("Get all profiles error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to fetch profiles" });
    }
  }

  async getUserStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await profileService.getUserStats();
      res.json(stats);
    } catch (error) {
      console.error("Get user stats error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to fetch stats" });
    }
  }

  async checkUserRole(req: Request, res: Response): Promise<void> {
    try {
      const { userId, role } = req.params;
      if (!userId || !role) {
        res.status(400).json({ error: "User ID and role are required" });
        return;
      }
      const hasRole = await profileService.hasRole(userId, role);
      res.json({ hasRole });
    } catch (error) {
      console.error("Check user role error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to check user role" });
    }
  }
}
