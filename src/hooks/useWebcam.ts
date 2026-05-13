import { useCallback, useEffect, useRef, useState } from "react";

export type WebcamStatus = "idle" | "requesting" | "ready" | "denied" | "unsupported" | "error";

export function useWebcam() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState<WebcamStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const attachStream = useCallback(async (nextStream: MediaStream) => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    video.srcObject = nextStream;
    video.muted = true;
    video.playsInline = true;
    await video.play();
  }, []);

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("unsupported");
      setErrorMessage("This browser does not support webcam access.");
      return false;
    }

    setStatus("requesting");
    setErrorMessage("");

    try {
      const nextStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      setStream(nextStream);
      await attachStream(nextStream);
      setStatus("ready");
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to access the camera.";
      setStatus(message.toLowerCase().includes("permission") ? "denied" : "error");
      setErrorMessage(message);
      return false;
    }
  }, [attachStream]);

  const stop = useCallback(() => {
    stream?.getTracks().forEach((track) => track.stop());
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setStream(null);
    setStatus("idle");
  }, [stream]);

  useEffect(() => {
    if (stream && videoRef.current?.srcObject !== stream) {
      void attachStream(stream);
    }
  }, [attachStream, stream]);

  useEffect(() => {
    return () => {
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [stream]);

  return {
    videoRef,
    stream,
    status,
    errorMessage,
    start,
    stop
  };
}
