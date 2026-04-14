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

  async createUserByAdmin(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, full_name, inspector_code, location, avatar_url } = req.body as {
        email?: string;
        password?: string;
        full_name?: string | null;
        inspector_code?: string | null;
        location?: string | null;
        avatar_url?: string | null;
      };

      if (!email || !password) {
        res.status(400).json({ error: "Email and password are required" });
        return;
      }

      if (password.length < 6) {
        res.status(400).json({ error: "Password must be at least 6 characters" });
        return;
      }

      const createdUser = await profileService.createUserByAdmin({
        email,
        password,
        full_name,
        inspector_code,
        location,
        avatar_url,
      });

      res.status(201).json(createdUser);
    } catch (error) {
      console.error("Create user by admin error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to create user" });
    }
  }

  async updateUserByAdmin(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ error: "User ID is required" });
        return;
      }

      const { email, password, full_name, inspector_code, location, avatar_url } = req.body as {
        email?: string;
        password?: string;
        full_name?: string | null;
        inspector_code?: string | null;
        location?: string | null;
        avatar_url?: string | null;
      };

      if (password !== undefined && password.length < 6) {
        res.status(400).json({ error: "Password must be at least 6 characters" });
        return;
      }

      const updatedUser = await profileService.updateUserByAdmin(id, {
        email,
        password,
        full_name,
        inspector_code,
        location,
        avatar_url,
      });

      res.json(updatedUser);
    } catch (error) {
      console.error("Update user by admin error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to update user" });
    }
  }

  async deleteUserByAdmin(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ error: "User ID is required" });
        return;
      }

      await profileService.deleteUserByAdmin(id);
      res.status(204).send();
    } catch (error) {
      console.error("Delete user by admin error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to delete user" });
    }
  }
}
