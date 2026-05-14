import dotenv from "dotenv";
import { getAllowedOrigins } from "./cors";

dotenv.config();

export class Config {
  private static instance: Config;

  readonly port: number;
  readonly supabaseUrl: string;
  readonly supabaseServiceKey: string;
  readonly auditLogKey: string;
  readonly auditLogKeyId: string;
  readonly uploadDir: string;
  readonly maxFileSize: number;
  readonly developerOptionsPassword: string;
  readonly developerOptionsTokenSecret: string;
  readonly developerOptionsTokenTtlSeconds: number;
  readonly allowedOrigins: string[];

  private constructor() {
    this.port = parseInt(process.env.PORT || "3001", 10);
    this.supabaseUrl = process.env.SUPABASE_URL || "";
    this.supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || "";
    this.auditLogKey = process.env.AUDIT_LOG_KEY || "";
    this.auditLogKeyId = process.env.AUDIT_LOG_KEY_ID || "v1";
    this.uploadDir = process.env.UPLOAD_DIR || "./uploads";
    this.maxFileSize = 10 * 1024 * 1024; // 10MB
    this.developerOptionsPassword = process.env.DEVELOPER_OPTIONS_PASSWORD || "";
    this.developerOptionsTokenSecret = process.env.DEVELOPER_OPTIONS_TOKEN_SECRET || this.developerOptionsPassword;
    this.developerOptionsTokenTtlSeconds = Math.max(
      60,
      parseInt(process.env.DEVELOPER_OPTIONS_TOKEN_TTL_SECONDS || "21600", 10),
    );
    this.allowedOrigins = getAllowedOrigins(process.env);
  }

  static getInstance(): Config {
    if (!Config.instance) {
      Config.instance = new Config();
    }
    return Config.instance;
  }
}
