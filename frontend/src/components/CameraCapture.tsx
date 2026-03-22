import { useRef, useState, useCallback, useEffect } from "react";
import { Camera, RotateCcw, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  className?: string;
}

export function CameraCapture({ onCapture, className }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  const startCamera = useCallback(async () => {
    setError(null);
    setIsStarting(true);
    setIsStreaming(true);
    setCapturedImage(null);
    setIsVideoReady(false);
    console.log("Starting camera...");

    await new Promise(resolve => setTimeout(resolve, 50));

    try {
      let mediaStream: MediaStream | null = null;

      try {
        const constraints = {
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 960 },
          },
        };
        console.log("Requesting camera with constraints:", constraints);
        mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (firstErr) {
        console.warn("Failed with environment camera, trying default:", firstErr);
        mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      console.log("Got media stream:", mediaStream.getTracks());

      if (videoRef.current) {
        console.log("Setting video srcObject");
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);

        try {
          await videoRef.current.play();
          console.log("Video playing");
        } catch (playErr) {
          console.error("Video play failed:", playErr);
        }
      } else {
        console.error("Video ref is null");
        setError("Video element not available");
        setIsStreaming(false);
        if (mediaStream) {
          mediaStream.getTracks().forEach(track => track.stop());
        }
      }
    } catch (err) {
      console.error("Camera access error:", err);
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      toast.error(`Camera error: ${errorMessage}`);
      setIsStreaming(false);
    } finally {
      setIsStarting(false);
    }
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream) return;

    const handleLoadedMetadata = () => {
      console.log("Video metadata loaded:", video.videoWidth, "x", video.videoHeight);
      setIsVideoReady(true);
    };

    const handleCanPlay = () => {
      console.log("Video can play");
      setIsVideoReady(true);
    };

    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("canplay", handleCanPlay);

    // Check if video is already ready
    if (video.readyState >= 2) {
      console.log("Video already ready, setting isVideoReady");
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
  }, [stream]);

  const confirmCapture = useCallback(() => {
    if (!canvasRef.current) return;
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
  }, [onCapture]);

  const retake = useCallback(() => {
    setCapturedImage(null);
    startCamera();
  }, [startCamera]);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        onCapture(file);
        const reader = new FileReader();
        reader.onload = (ev) => setCapturedImage(ev.target?.result as string);
        reader.readAsDataURL(file);
      }
    },
    [onCapture]
  );

  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      <div className="relative w-full overflow-hidden rounded-lg border-2 border-border bg-secondary aspect-[4/3]">
        {capturedImage ? (
          <img src={capturedImage} alt="Captured" className="h-full w-full object-cover" />
        ) : isStreaming ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-cover"
            />

            {!isVideoReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-secondary/80">
                <div className="text-center text-muted-foreground">
                  <Camera className="h-12 w-12 mx-auto mb-2 animate-pulse" />
                  <p className="font-display text-xs uppercase tracking-wider">Starting camera...</p>
                </div>
              </div>
            )}

            {isVideoReady && (
              <>
                {/* Calibration card overlay guide */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="border-2 border-dashed border-primary/50 rounded-md w-16 h-10 absolute bottom-4 right-4" />
                  <p className="absolute bottom-16 right-2 text-[10px] font-display text-primary/70 uppercase tracking-wide">
                    Place color card here
                  </p>
                </div>
                {/* Scanning animation */}
                <div className="absolute inset-x-0 h-0.5 bg-primary/60 animate-scan-line" />
              </>
            )}
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
            <Camera className="h-12 w-12" />
            <p className="font-display text-xs uppercase tracking-wider">Ready to capture</p>
            {error && (
              <p className="text-[10px] text-destructive px-4 text-center mt-2">
                Error: {error}
              </p>
            )}
          </div>
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      <div className="flex w-full gap-3">
        {capturedImage ? (
          <>
            <Button variant="outline" onClick={retake} className="flex-1 gap-2">
              <RotateCcw className="h-4 w-4" /> Retake
            </Button>
            <Button onClick={confirmCapture} className="flex-1 gap-2">
              <Check className="h-4 w-4" /> Use Photo
            </Button>
          </>
        ) : isStreaming ? (
          <Button
            onClick={capturePhoto}
            size="lg"
            className="w-full gap-2"
            disabled={!isVideoReady}
          >
            <Camera className="h-5 w-5" /> {isVideoReady ? "Capture" : "Starting..."}
          </Button>
        ) : (
          <div className="flex w-full gap-3">
            <Button
              onClick={startCamera}
              size="lg"
              className="flex-1 gap-2"
              disabled={isStarting}
            >
              <Camera className="h-5 w-5" /> {isStarting ? "Starting..." : "Open Camera"}
            </Button>
            <label>
              <Button variant="outline" size="lg" className="gap-2 cursor-pointer" asChild>
                <span>Upload File</span>
              </Button>
              <input type="file" accept="image/*" className="hidden" onChange={handleFileInput} />
            </label>
          </div>
        )}
      </div>
    </div>
  );
}
