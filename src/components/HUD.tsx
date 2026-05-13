import { Crosshair, Heart, MousePointer2, Volume2, VolumeX, Webcam } from "lucide-react";
import type { GestureState } from "../cv/gestureDetector";
import type { GameSnapshot } from "../game/types";
import type { WebcamStatus } from "../hooks/useWebcam";
import type { TrackerStatus } from "./GameCanvas";

interface HUDProps {
  snapshot: GameSnapshot;
  highScore: number;
  gesture: GestureState;
  webcamStatus: WebcamStatus;
  trackerStatus: TrackerStatus;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export function HUD({
  snapshot,
  highScore,
  gesture,
  webcamStatus,
  trackerStatus,
  soundEnabled,
  onToggleSound
}: HUDProps) {
  const hearts = Array.from({ length: 3 }, (_, index) => index < snapshot.hearts);
  const hasLiveHand = webcamStatus === "ready" && trackerStatus === "ready" && gesture.hasHand;

  return (
    <header className="hud">
      <div className="hud-cluster hud-score">
        <span className="hud-label">Score</span>
        <strong>{snapshot.score.toLocaleString()}</strong>
        <span className="hud-sub">Best {highScore.toLocaleString()}</span>
      </div>

      <div className="hud-cluster hud-center">
        <div className="timer">
          <span>{Math.ceil(snapshot.timeRemaining)}</span>
          <small>sec</small>
        </div>
        <div className="hearts" aria-label={`${snapshot.hearts} hearts remaining`}>
          {hearts.map((alive, index) => (
            <Heart key={index} size={22} fill={alive ? "currentColor" : "none"} className={alive ? "heart-on" : "heart-off"} />
          ))}
        </div>
        <div className="combo">
          <span>Combo</span>
          <strong>x{snapshot.comboMultiplier}</strong>
        </div>
      </div>

      <div className="hud-cluster hud-controls">
        <div className={`gesture-pill ${gesture.isPistol ? "is-ready" : ""}`}>
          {hasLiveHand ? <Crosshair size={16} /> : webcamStatus === "ready" ? <Webcam size={16} /> : <MousePointer2 size={16} />}
          <span>{hasLiveHand ? gesture.message : webcamStatus === "ready" ? "Show your hand" : "Mouse fallback"}</span>
        </div>

        <button className="icon-button" type="button" onClick={onToggleSound} aria-label={soundEnabled ? "Mute sound" : "Enable sound"}>
          {soundEnabled ? <Volume2 size={19} /> : <VolumeX size={19} />}
        </button>
      </div>
    </header>
  );
}
