import { Request, Response } from "express";
import { inspectionService } from "../services/InspectionService";
import type { InspectionInsert } from "../types/inspection";

export class InspectionController {
  async getStatistics(req: Request, res: Response): Promise<void> {
    try {
      const stats = await inspectionService.getStatistics();
      res.json(stats);
    } catch (error) {
      console.error("Get inspection statistics error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to fetch inspection statistics" });
    }
  }

  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const inspections = await inspectionService.getAll(limit, offset);
      res.json(inspections);
    } catch (error) {
      console.error("Get inspections error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to fetch inspections" });
    }
  }

  async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ error: "Inspection ID is required" });
        return;
      }
      const inspection = await inspectionService.getById(id);
      if (!inspection) {
        res.status(404).json({ error: "Inspection not found" });
        return;
      }
      res.json(inspection);
    } catch (error) {
      console.error("Get inspection error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to fetch inspection" });
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const inspection = await inspectionService.create(req.body as InspectionInsert);
      res.status(201).json(inspection);
    } catch (error) {
      console.error("Create inspection error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to create inspection" });
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ error: "Inspection ID is required" });
        return;
      }
      await inspectionService.delete(id);
      res.status(204).send();
    } catch (error) {
      console.error("Delete inspection error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to delete inspection" });
    }
  }
}
