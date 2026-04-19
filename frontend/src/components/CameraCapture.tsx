import { useRef, useState, useCallback, useEffect } from "react";
import { Camera, RotateCcw, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  className?: string;
  disabled?: boolean;
}

interface CaptureQualityResult {
  accepted: boolean;
  reasons: string[];
}

const CLIENT_BLUR_THRESHOLD = 110;
const CLIENT_MAX_CENTER_OFFSET = 0.2;

export function CameraCapture({ onCapture, className, disabled = false }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  const startCamera = useCallback(async () => {
    if (disabled) return;

    setError(null);
    setIsStarting(true);
    setIsStreaming(true);
    setCapturedImage(null);
    setIsVideoReady(false);

    await new Promise((resolve) => setTimeout(resolve, 50));

    try {
      let mediaStream: MediaStream | null = null;

      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 960 },
          },
        });
      } catch {
        mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
        await videoRef.current.play();
      } else {
        setError("Video element not available");
        setIsStreaming(false);
        if (mediaStream) {
          mediaStream.getTracks().forEach((track) => track.stop());
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      toast.error(`Camera error: ${errorMessage}`);
      setIsStreaming(false);
    } finally {
      setIsStarting(false);
    }
  }, [disabled]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream) return;

    const handleLoadedMetadata = () => setIsVideoReady(true);
    const handleCanPlay = () => setIsVideoReady(true);

    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("canplay", handleCanPlay);

    if (video.readyState >= 2) {
      setIsVideoReady(true);
    }

    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("canplay", handleCanPlay);
    };
  }, [stream]);

  useEffect(() => {
    return () => {
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [stream]);

  const capturePhoto = useCallback(() => {
    if (disabled) return;

    if (!videoRef.current || !canvasRef.current) {
      toast.error("Camera not ready");
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video.videoWidth === 0 || video.videoHeight === 0) {
      toast.error("Camera feed not ready. Please wait a moment.");
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      toast.error("Failed to capture photo");
      return;
    }

    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setCapturedImage(dataUrl);

    stream?.getTracks().forEach((track) => track.stop());
    setStream(null);
    setIsStreaming(false);
    setIsVideoReady(false);
  }, [disabled, stream]);

  const confirmCapture = useCallback(() => {
    if (disabled) return;

    if (!canvasRef.current) return;

    const quality = assessCanvasQuality(canvasRef.current);
    if (!quality.accepted) {
      toast.error(quality.reasons.join(" "));
      return;
    }

    canvasRef.current.toBlob(
      (blob) => {
        if (blob) {
          const file = new File([blob], `inspection-${Date.now()}.jpg`, { type: "image/jpeg" });
          onCapture(file);
        }
      },
      "image/jpeg",
      0.9
    );
  }, [disabled, onCapture]);

  const retake = useCallback(() => {
    if (disabled) return;

    setCapturedImage(null);
    void startCamera();
  }, [disabled, startCamera]);

  const handleFileInput = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (disabled) return;

      const file = e.target.files?.[0];
      if (file) {
        const quality = await assessFileQuality(file);
        if (!quality.accepted) {
          toast.error(quality.reasons.join(" "));
          e.target.value = "";
          return;
        }

        onCapture(file);
        const reader = new FileReader();
        reader.onload = (ev) => setCapturedImage(ev.target?.result as string);
        reader.readAsDataURL(file);
      }
    },
    [disabled, onCapture]
  );

  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      <div className="relative w-full overflow-hidden rounded-2xl border border-border/70 bg-secondary aspect-[4/3] shadow-inner">
        {capturedImage ? (
          <img src={capturedImage} alt="Captured" className="h-full w-full object-cover" />
        ) : isStreaming ? (
          <>
            <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />

            {!isVideoReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-secondary/80">
                <div className="text-center text-muted-foreground">
                  <Camera className="mx-auto mb-2 h-12 w-12 animate-pulse" />
                  <p className="font-display text-xs uppercase tracking-wider">Starting camera...</p>
                </div>
              </div>
            )}

            {isVideoReady && (
              <>
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="absolute bottom-4 right-4 h-10 w-16 rounded-md border-2 border-dashed border-primary/50" />
                  <p className="absolute bottom-16 right-2 text-[10px] uppercase tracking-wide text-primary/70">Place color card here</p>
                </div>
                <div className="absolute inset-x-0 h-0.5 bg-primary/60 animate-scan-line" />
              </>
            )}
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
            <Camera className="h-12 w-12" />
            <p className="font-display text-xs uppercase tracking-wider">Ready to capture</p>
            {error && <p className="mt-2 px-4 text-center text-[10px] text-destructive">Error: {error}</p>}
          </div>
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      <div className="flex w-full flex-col gap-3 min-[380px]:flex-row">
        {capturedImage ? (
          <>
            <Button variant="outline" onClick={retake} disabled={disabled} className="w-full gap-2 rounded-xl min-[380px]:flex-1">
              <RotateCcw className="h-4 w-4" /> Retake
            </Button>
            <Button onClick={confirmCapture} disabled={disabled} className="w-full gap-2 rounded-xl min-[380px]:flex-1">
              <Check className="h-4 w-4" /> Use Photo
            </Button>
          </>
        ) : isStreaming ? (
          <Button onClick={capturePhoto} size="lg" className="w-full gap-2 rounded-xl" disabled={disabled || !isVideoReady}>
            <Camera className="h-5 w-5" /> {isVideoReady ? "Capture" : "Starting..."}
          </Button>
        ) : (
          <div className="flex w-full flex-col gap-3 min-[380px]:flex-row">
            <Button onClick={() => void startCamera()} size="lg" className="w-full gap-2 rounded-xl min-[380px]:flex-1" disabled={disabled || isStarting}>
              <Camera className="h-5 w-5" /> {isStarting ? "Starting..." : "Open Camera"}
            </Button>
            <label className="w-full min-[380px]:flex-1">
              <Button
                variant="outline"
                size="lg"
                className="w-full cursor-pointer gap-2 rounded-xl"
                disabled={disabled}
                asChild
              >
                <span>Upload File</span>
              </Button>
              <input type="file" accept="image/*" className="hidden" disabled={disabled} onChange={handleFileInput} />
            </label>
          </div>
        )}
      </div>
    </div>
  );
}

function assessCanvasQuality(canvas: HTMLCanvasElement): CaptureQualityResult {
  const { data, width, height } = getDownscaledImageData(canvas);
  const grayscale = toGrayscale(data, width, height);
  const blurScore = computeLaplacianVariance(grayscale, width, height);
  const centerOffset = computeForegroundCenterOffset(grayscale, width, height);

  const reasons: string[] = [];
  if (blurScore < CLIENT_BLUR_THRESHOLD) {
    reasons.push("Image is blurry. Retake with better focus.");
  }
  if (
    Math.abs(centerOffset.offsetX) > CLIENT_MAX_CENTER_OFFSET ||
    Math.abs(centerOffset.offsetY) > CLIENT_MAX_CENTER_OFFSET
  ) {
    reasons.push("Image is off-center. Center the sample before using this photo.");
  }

  return { accepted: reasons.length === 0, reasons };
}

async function assessFileQuality(file: File): Promise<CaptureQualityResult> {
  const imageBitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = imageBitmap.width;
  canvas.height = imageBitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return { accepted: false, reasons: ["Unable to analyze selected image."] };
  }

  ctx.drawImage(imageBitmap, 0, 0);
  imageBitmap.close();
  return assessCanvasQuality(canvas);
}

function getDownscaledImageData(canvas: HTMLCanvasElement): {
  data: Uint8ClampedArray;
  width: number;
  height: number;
} {
  const maxSide = 320;
  const scale = Math.min(1, maxSide / Math.max(canvas.width, canvas.height));
  const width = Math.max(1, Math.round(canvas.width * scale));
  const height = Math.max(1, Math.round(canvas.height * scale));

  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = width;
  tempCanvas.height = height;
  const tempCtx = tempCanvas.getContext("2d");
  if (!tempCtx) {
    return { data: new Uint8ClampedArray(), width: 0, height: 0 };
  }

  tempCtx.drawImage(canvas, 0, 0, width, height);
  const imageData = tempCtx.getImageData(0, 0, width, height);
  return { data: imageData.data, width, height };
}

function toGrayscale(data: Uint8ClampedArray, width: number, height: number): Uint8Array {
  const grayscale = new Uint8Array(width * height);
  for (let i = 0, p = 0; i < grayscale.length; i++, p += 4) {
    grayscale[i] = Math.round(0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2]);
  }
  return grayscale;
}

function computeLaplacianVariance(pixels: Uint8Array, width: number, height: number): number {
  if (width < 3 || height < 3) return 0;
  let sum = 0;
  let sumSquares = 0;
  let count = 0;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const laplacian =
        pixels[idx - 1] +
        pixels[idx + 1] +
        pixels[idx - width] +
        pixels[idx + width] -
        4 * pixels[idx];

      sum += laplacian;
      sumSquares += laplacian * laplacian;
      count++;
    }
  }

  if (count === 0) return 0;
  const mean = sum / count;
  return sumSquares / count - mean * mean;
}

function computeForegroundCenterOffset(
  pixels: Uint8Array,
  width: number,
  height: number
): { offsetX: number; offsetY: number } {
  if (width === 0 || height === 0) return { offsetX: 0, offsetY: 0 };

  const borderSamples: number[] = [];
  for (let x = 0; x < width; x++) {
    borderSamples.push(pixels[x]);
    borderSamples.push(pixels[(height - 1) * width + x]);
  }
  for (let y = 1; y < height - 1; y++) {
    borderSamples.push(pixels[y * width]);
    borderSamples.push(pixels[y * width + (width - 1)]);
  }

  const backgroundLevel = median(borderSamples);
  const deltaThreshold = 25;

  let sumX = 0;
  let sumY = 0;
  let count = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const intensity = pixels[y * width + x];
      if (Math.abs(intensity - backgroundLevel) > deltaThreshold) {
        sumX += x;
        sumY += y;
        count++;
      }
    }
  }

  if (count === 0) return { offsetX: 1, offsetY: 1 };

  const centroidX = sumX / count;
  const centroidY = sumY / count;
  const centerX = (width - 1) / 2;
  const centerY = (height - 1) / 2;

  return {
    offsetX: (centroidX - centerX) / width,
    offsetY: (centroidY - centerY) / height,
  };
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}
