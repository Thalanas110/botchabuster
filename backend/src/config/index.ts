import dotenv from "dotenv";
dotenv.config();

export class Config {
  private static instance: Config;

  readonly port: number;
  readonly supabaseUrl: string;
  readonly supabaseServiceKey: string;
  readonly uploadDir: string;
  readonly maxFileSize: number;

  private constructor() {
    this.port = parseInt(process.env.PORT || "3001", 10);
    this.supabaseUrl = process.env.SUPABASE_URL || "";
    this.supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || "";
    this.uploadDir = process.env.UPLOAD_DIR || "./uploads";
    this.maxFileSize = 10 * 1024 * 1024; // 10MB
  }

  static getInstance(): Config {
    if (!Config.instance) {
      Config.instance = new Config();
    }
    return Config.instance;
  }
}
