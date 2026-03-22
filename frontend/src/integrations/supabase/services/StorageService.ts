import { supabase } from "@/integrations/supabase/client";

export class StorageService {
  private static instance: StorageService;
  private readonly bucketName = "inspection-images";

  private constructor() {}

  static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  /**
   * Upload an inspection image to Supabase Storage
   * @param file The image file to upload
   * @param userId The user ID for organizing files
   * @returns The public URL of the uploaded image
   */
  async uploadInspectionImage(file: File, userId: string): Promise<string> {
    const fileExt = file.name.split(".").pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from(this.bucketName)
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      throw new Error(`Failed to upload image: ${error.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(this.bucketName)
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  }

  /**
   * Delete an inspection image from storage
   * @param imageUrl The full URL of the image to delete
   */
  async deleteInspectionImage(imageUrl: string): Promise<void> {
    // Extract the file path from the URL
    const url = new URL(imageUrl);
    const pathParts = url.pathname.split(`/${this.bucketName}/`);
    if (pathParts.length < 2) {
      throw new Error("Invalid image URL");
    }
    const filePath = pathParts[1];

    const { error } = await supabase.storage
      .from(this.bucketName)
      .remove([filePath]);

    if (error) {
      throw new Error(`Failed to delete image: ${error.message}`);
    }
  }
}

export const storageService = StorageService.getInstance();
