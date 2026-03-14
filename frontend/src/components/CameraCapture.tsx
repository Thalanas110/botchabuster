import { useRef, useState, useCallback } from "react";
import { Camera, RotateCcw, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 960 } },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
        setIsStreaming(true);
        setCapturedImage(null);
      }
    } catch (err) {
      console.error("Camera access denied:", err);
    }
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setCapturedImage(dataUrl);
    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);
    setIsStreaming(false);
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
            <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
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
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
            <Camera className="h-12 w-12" />
            <p className="font-display text-xs uppercase tracking-wider">Ready to capture</p>
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
          <Button onClick={capturePhoto} size="lg" className="w-full gap-2">
            <Camera className="h-5 w-5" /> Capture
          </Button>
        ) : (
          <div className="flex w-full gap-3">
            <Button onClick={startCamera} size="lg" className="flex-1 gap-2">
              <Camera className="h-5 w-5" /> Open Camera
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
