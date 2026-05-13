import { useEffect } from "react";
import type { RefObject } from "react";
import type { WebcamStatus } from "../hooks/useWebcam";
import type { TrackerStatus } from "./GameCanvas";

interface WebcamViewProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  overlayCanvasRef: RefObject<HTMLCanvasElement | null>;
  stream: MediaStream | null;
  webcamStatus: WebcamStatus;
  trackerStatus: TrackerStatus;
  showLandmarks: boolean;
}

export function WebcamView({
  videoRef,
  overlayCanvasRef,
  stream,
  webcamStatus,
  trackerStatus,
  showLandmarks
}: WebcamViewProps) {
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream) {
      return;
    }

    if (video.srcObject !== stream) {
      video.srcObject = stream;
    }

    video.muted = true;
    video.playsInline = true;
    void video.play().catch(() => {
      // The start button is a user gesture, but some browsers still race autoplay.
    });
  }, [stream, videoRef]);

  const statusText =
    webcamStatus === "ready"
      ? trackerStatus === "ready"
        ? "Hand tracking"
        : trackerStatus === "loading"
          ? "Loading CV"
          : "Camera ready"
      : webcamStatus === "requesting"
        ? "Requesting camera"
        : "Mouse fallback";

  return (
    <section className="webcam-panel" aria-label="Webcam preview">
      <div className="webcam-frame">
        <video ref={videoRef} className="webcam-video" playsInline muted />
        <canvas
          ref={overlayCanvasRef}
          className={`webcam-landmarks ${showLandmarks ? "is-visible" : ""}`}
          aria-hidden="true"
        />
        {webcamStatus !== "ready" ? <div className="webcam-placeholder">Camera off</div> : null}
      </div>
      <div className="webcam-status">
        <span className={`status-dot ${trackerStatus === "ready" ? "is-live" : ""}`} />
        {statusText}
      </div>
    </section>
  );
}
