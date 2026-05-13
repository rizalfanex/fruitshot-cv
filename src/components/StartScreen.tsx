import { Camera, Info, MousePointer2, Play } from "lucide-react";
import type { WebcamStatus } from "../hooks/useWebcam";
import type { TrackerStatus } from "./GameCanvas";
import { HomeFruitCanvas } from "./HomeFruitCanvas";

interface StartScreenProps {
  highScore: number;
  webcamStatus: WebcamStatus;
  trackerStatus: TrackerStatus;
  preparingCamera: boolean;
  errorMessage: string;
  onStartWithCamera: () => void;
  onStartWithMouse: () => void;
  onOpenHelp: () => void;
  onOpenAbout: () => void;
}

export function StartScreen({
  highScore,
  webcamStatus,
  trackerStatus,
  preparingCamera,
  errorMessage,
  onStartWithCamera,
  onStartWithMouse,
  onOpenHelp,
  onOpenAbout
}: StartScreenProps) {
  const isPreparing = webcamStatus === "requesting" || preparingCamera;
  const cameraButtonText =
    webcamStatus === "requesting"
      ? "Requesting Camera..."
      : preparingCamera && trackerStatus !== "ready"
        ? "Loading Hand Tracking..."
        : "Enable Camera & Play";

  return (
    <main className="start-screen">
      <HomeFruitCanvas />

      <section className="start-copy">
        <p className="eyebrow">FruitShot CV</p>
        <h1>Shoot the fruits. Avoid the bombs.</h1>
        <p className="tagline">Control everything with your hand.</p>
        <p className="instructions">
          Move your hand to aim. Pull the pistol trigger or clench your hand to shoot fruits. Avoid bombs.
        </p>

        <div className="start-actions">
          <button className="primary-button" type="button" onClick={onStartWithCamera} disabled={isPreparing}>
            <Camera size={20} />
            {cameraButtonText}
          </button>
          <button className="secondary-button" type="button" onClick={onStartWithMouse}>
            <MousePointer2 size={20} />
            Play With Mouse
          </button>
          <button className="ghost-button" type="button" onClick={onOpenHelp}>
            <Play size={18} />
            How to play
          </button>
        </div>

        {errorMessage ? <p className="camera-error">{errorMessage}. Mouse controls still work.</p> : null}
      </section>

      <aside className="start-stats" aria-label="Game summary">
        <div>
          <span>Best score</span>
          <strong>{highScore.toLocaleString()}</strong>
        </div>
        <div>
          <span>Mode</span>
          <strong>Classic 60s</strong>
        </div>
        <div>
          <span>Controls</span>
          <strong>Hand + Mouse</strong>
        </div>
        <button className="about-game" type="button" onClick={onOpenAbout}>
          <Info size={22} />
          <span>About Game</span>
          <strong>Open credits</strong>
        </button>
      </aside>
    </main>
  );
}
