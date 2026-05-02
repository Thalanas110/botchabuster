import { useRef, useState, useCallback, useEffect } from "react";
import { Camera, RotateCcw, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { assessCanvasQuality, assessFileQuality } from "@/lib/captureQuality";
import {
  createCroppedResizedImageFile,
  DEFAULT_MEATLENS_INPUT_SIZE,
  type SquareGuideBox,
} from "@/lib/offlineAnalysis/meatLensPipeline";

export interface CapturedImagePayload {
  file: File;
  guideBox?: SquareGuideBox | null;
  source: "camera" | "file";
}

const GUIDE_BOX_SIZE_RATIO = 0.72;
const GUIDE_BOX_X_RATIO = (1 - GUIDE_BOX_SIZE_RATIO) / 2;
const GUIDE_BOX_Y_RATIO = (1 - GUIDE_BOX_SIZE_RATIO) / 2;
const PREVIEW_EXPORT_QUALITY = 0.92;

function readBlobAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Failed to render model-input preview."));
    reader.readAsDataURL(blob);
  });
}

interface CameraCaptureProps {
  onCapture: (payload: CapturedImagePayload) => void;
  className?: string;
  disabled?: boolean;
}

export function CameraCapture({ onCapture, className, disabled = false }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewRequestIdRef = useRef(0);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [qualitySource, setQualitySource] = useState<"canvas" | "file">("canvas");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [captureGuideBox, setCaptureGuideBox] = useState<SquareGuideBox | null>(null);
  const [modelInputPreview, setModelInputPreview] = useState<string | null>(null);
  const [isPreparingModelPreview, setIsPreparingModelPreview] = useState(false);

  const updateModelInputPreview = useCallback(async (sourceFile: File, guideBox: SquareGuideBox | null) => {
    const requestId = ++previewRequestIdRef.current;
    setIsPreparingModelPreview(true);

    try {
      const preprocessedFile = await createCroppedResizedImageFile(sourceFile, {
        guideBox,
        size: DEFAULT_MEATLENS_INPUT_SIZE,
        mimeType: "image/jpeg",
        quality: PREVIEW_EXPORT_QUALITY,
      });
      const previewDataUrl = await readBlobAsDataUrl(preprocessedFile);

      if (previewRequestIdRef.current === requestId) {
        setModelInputPreview(previewDataUrl);
      }
    } catch (previewError) {
      console.warn("[Capture] Failed to prepare 224x224 model preview:", previewError);
      if (previewRequestIdRef.current === requestId) {
        setModelInputPreview(null);
      }
    } finally {
      if (previewRequestIdRef.current === requestId) {
        setIsPreparingModelPreview(false);
      }
    }
  }, []);

  const startCamera = useCallback(async () => {
    if (disabled) return;

    setError(null);
    setIsStarting(true);
    setIsStreaming(true);
    setCapturedImage(null);
    setIsVideoReady(false);
    setCaptureGuideBox(null);
    setModelInputPreview(null);
    setIsPreparingModelPreview(false);
    previewRequestIdRef.current += 1;

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
    setQualitySource("canvas");
    setUploadedFile(null);
    const guideBox: SquareGuideBox = {
      x: GUIDE_BOX_X_RATIO,
      y: GUIDE_BOX_Y_RATIO,
      size: GUIDE_BOX_SIZE_RATIO,
      normalized: true,
    };
    setCaptureGuideBox(guideBox);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          return;
        }

        const previewSourceFile = new File([blob], `preview-${Date.now()}.jpg`, { type: "image/jpeg" });
        void updateModelInputPreview(previewSourceFile, guideBox);
      },
      "image/jpeg",
      PREVIEW_EXPORT_QUALITY
    );

    stream?.getTracks().forEach((track) => track.stop());
    setStream(null);
    setIsStreaming(false);
    setIsVideoReady(false);
  }, [disabled, stream, updateModelInputPreview]);

  const confirmCapture = useCallback(() => {
    if (disabled) return;

    if (qualitySource === "file") {
      if (uploadedFile) {
        // Uploaded files already pass assessFileQuality() before preview.
        onCapture({
          file: uploadedFile,
          guideBox: null,
          source: "file",
        });
      }
      return;
    }

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
          onCapture({
            file,
            guideBox: captureGuideBox,
            source: "camera",
          });
        }
      },
      "image/jpeg",
      0.9
    );
  }, [captureGuideBox, disabled, onCapture, qualitySource, uploadedFile]);

  const retake = useCallback(() => {
    if (disabled) return;

    setCapturedImage(null);
    setUploadedFile(null);
    setCaptureGuideBox(null);
    setModelInputPreview(null);
    setIsPreparingModelPreview(false);
    previewRequestIdRef.current += 1;
    setQualitySource("canvas");
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

        setUploadedFile(file);
        setQualitySource("file");
        setCaptureGuideBox(null);
        void updateModelInputPreview(file, null);
        const reader = new FileReader();
        reader.onload = (ev) => setCapturedImage(ev.target?.result as string);
        reader.readAsDataURL(file);
      }
    },
    [disabled, onCapture, updateModelInputPreview]
  );

  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      <div className="relative w-full overflow-hidden rounded-2xl border border-border/70 bg-secondary aspect-[4/3] shadow-inner">
        {capturedImage ? (
          <>
            <img src={capturedImage} alt="Captured" className="h-full w-full object-cover" />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div
                className="rounded-2xl border-2 border-dashed border-primary/75 shadow-[0_0_0_9999px_rgba(0,0,0,0.14)]"
                style={{
                  width: `${GUIDE_BOX_SIZE_RATIO * 100}%`,
                  aspectRatio: "1 / 1",
                }}
              />
              <p className="absolute bottom-4 rounded-full border border-primary/40 bg-background/80 px-3 py-1 text-[10px] uppercase tracking-wide text-primary">
                {qualitySource === "file" ? "Center crop -> 224x224 model input" : "Guide crop -> 224x224 model input"}
              </p>
            </div>

            <div className="absolute right-3 top-3 rounded-lg border border-primary/30 bg-background/86 p-1.5 shadow-md">
              <p className="mb-1 text-[9px] font-display uppercase tracking-widest text-muted-foreground">
                Model Input
              </p>
              <div className="h-14 w-14 overflow-hidden rounded-md border border-border/70 bg-secondary">
                {modelInputPreview ? (
                  <img
                    src={modelInputPreview}
                    alt="224 by 224 model input preview"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[9px] text-muted-foreground">
                    {isPreparingModelPreview ? "..." : "N/A"}
                  </div>
                )}
              </div>
              <p className="mt-1 text-[9px] font-display uppercase tracking-widest text-muted-foreground">224x224</p>
            </div>
          </>
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
                  <div
                    className="rounded-2xl border-2 border-dashed border-primary/75 shadow-[0_0_0_9999px_rgba(0,0,0,0.14)]"
                    style={{
                      width: `${GUIDE_BOX_SIZE_RATIO * 100}%`,
                      aspectRatio: "1 / 1",
                    }}
                  />
                  <p className="absolute bottom-4 rounded-full border border-primary/40 bg-background/70 px-3 py-1 text-[10px] uppercase tracking-wide text-primary">
                    Place pork inside guide box
                  </p>
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
