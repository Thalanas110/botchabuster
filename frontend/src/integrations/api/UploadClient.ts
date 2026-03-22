const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export class UploadClient {
  private static instance: UploadClient;

  private constructor() {}

  static getInstance(): UploadClient {
    if (!UploadClient.instance) {
      UploadClient.instance = new UploadClient();
    }
    return UploadClient.instance;
  }

  /**
   * Upload an inspection image through the backend API
   * @param file The image file to upload
   * @param userId The authenticated user's ID
   * @returns The public URL of the uploaded image
   */
  async uploadInspectionImage(file: File, userId: string): Promise<string> {
    const formData = new FormData();
    formData.append("image", file);
    formData.append("userId", userId);

    const res = await fetch(`${API_BASE_URL}/upload/inspection-image`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: "Upload failed" }));
      throw new Error(error.error || `Upload failed: ${res.statusText}`);
    }

    const data = await res.json();
    return data.imageUrl;
  }
}

export const uploadClient = UploadClient.getInstance();
