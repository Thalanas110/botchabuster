import { Request, Response } from "express";
import { authService } from "../services/AuthService";
import { profileService } from "../services/ProfileService";
import { auditLogService, type AuditLogWriteInput } from "../services/AuditLogService";

export class AuthController {
  private async writeAuditLogSafely(input: AuditLogWriteInput): Promise<void> {
    try {
      await auditLogService.write(input);
    } catch (error) {
      console.error("Audit log write error:", error);
    }
  }

  async signIn(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body as { email?: string; password?: string };

      if (!email || !password) {
        res.status(400).json({ error: "Email and password are required" });
        return;
      }

      const result = await authService.signIn({ email, password });
      const isAdmin = await profileService.hasRole(result.user.id, "admin");

      await this.writeAuditLogSafely({
        payload: {
          event_type: "auth.sign_in",
          event_time: new Date().toISOString(),
          actor: {
            id: result.user.id,
            role: isAdmin ? "admin" : "inspector",
          },
          source: {
            ip: req.ip || null,
            user_agent: req.header("user-agent") || null,
          },
          data: {
            email: result.user.email,
          },
        },
      });

      res.json(result);
    } catch (error) {
      console.error("Sign in error:", error);
      res.status(401).json({ error: error instanceof Error ? error.message : "Sign in failed" });
    }
  }

  async signUp(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, fullName, accessCode, emailRedirectTo } = req.body as {
        email?: string;
        password?: string;
        fullName?: string;
        accessCode?: string;
        emailRedirectTo?: string;
      };

      if (!email || !password) {
        res.status(400).json({ error: "Email and password are required" });
        return;
      }

      if (password.length < 6) {
        res.status(400).json({ error: "Password must be at least 6 characters" });
        return;
      }

      if (!accessCode || !accessCode.trim()) {
        res.status(400).json({ error: "Access code is required" });
        return;
      }

      const result = await authService.signUp({
        email,
        password,
        fullName,
        accessCode: accessCode.trim(),
        emailRedirectTo,
      });
      res.status(201).json(result);
    } catch (error) {
      console.error("Sign up error:", error);
      res.status(400).json({ error: error instanceof Error ? error.message : "Sign up failed" });
    }
  }

  async signOut(req: Request, res: Response): Promise<void> {
    try {
      const authorizationHeader = req.header("authorization");
      if (!authorizationHeader?.startsWith("Bearer ")) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }

      const accessToken = authorizationHeader.slice("Bearer ".length).trim();
      if (!accessToken) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }

      const user = await authService.getUserByAccessToken(accessToken);
      const isAdmin = await profileService.hasRole(user.id, "admin");

      await authService.signOut();

      await this.writeAuditLogSafely({
        payload: {
          event_type: "auth.sign_out",
          event_time: new Date().toISOString(),
          actor: {
            id: user.id,
            role: isAdmin ? "admin" : "inspector",
          },
          source: {
            ip: req.ip || null,
            user_agent: req.header("user-agent") || null,
          },
        },
      });

      res.status(204).send();
    } catch (error) {
      console.error("Sign out error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Sign out failed" });
    }
  }

  async sendPasswordReset(req: Request, res: Response): Promise<void> {
    try {
      const { email, redirectTo } = req.body as { email?: string; redirectTo?: string };
      if (!email) {
        res.status(400).json({ error: "Email is required" });
        return;
      }

      await authService.sendPasswordReset(email, redirectTo);
      res.status(204).send();
    } catch (error) {
      console.error("Send password reset error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to send password reset" });
    }
  }

  async updateEmail(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { email } = req.body as { email?: string };

      if (!id || !email) {
        res.status(400).json({ error: "User ID and email are required" });
        return;
      }

      const user = await authService.updateEmail(id, email);
      res.json(user);
    } catch (error) {
      console.error("Update email error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to update email" });
    }
  }

  async updatePassword(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { password } = req.body as { password?: string };

      if (!id || !password) {
        res.status(400).json({ error: "User ID and password are required" });
        return;
      }

      if (password.length < 6) {
        res.status(400).json({ error: "Password must be at least 6 characters" });
        return;
      }

      await authService.updatePassword(id, password);
      res.status(204).send();
    } catch (error) {
      console.error("Update password error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to update password" });
    }
  }

  async updatePasswordWithRecoveryToken(req: Request, res: Response): Promise<void> {
    try {
      const { accessToken, password } = req.body as { accessToken?: string; password?: string };

      if (!accessToken || !password) {
        res.status(400).json({ error: "Recovery token and password are required" });
        return;
      }

      if (password.length < 6) {
        res.status(400).json({ error: "Password must be at least 6 characters" });
        return;
      }

      await authService.updatePasswordWithRecoveryToken(accessToken, password);
      res.status(204).send();
    } catch (error) {
      console.error("Recovery password update error:", error);
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to update password" });
    }
  }
}
