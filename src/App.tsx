import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AboutGame } from "./components/AboutGame";
import { GameCanvas, type TrackerStatus } from "./components/GameCanvas";
import { GameOverScreen } from "./components/GameOverScreen";
import { HowToPlay } from "./components/HowToPlay";
import { HUD } from "./components/HUD";
import { StartScreen } from "./components/StartScreen";
import { WebcamView } from "./components/WebcamView";
import { EMPTY_GESTURE, type GestureState } from "./cv/gestureDetector";
import { GameAudio } from "./game/audio";
import { GAME_CONFIG } from "./game/constants";
import {
  addLeaderboardEntry,
  createLeaderboardEntry,
  EMPTY_LEADERBOARD,
  LEADERBOARD_STORAGE_KEY,
  type Leaderboard
} from "./game/leaderboard";
import type { ControlMode, GameSnapshot } from "./game/types";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { useWebcam } from "./hooks/useWebcam";

type Screen = "start" | "playing" | "gameover";

const INITIAL_SNAPSHOT: GameSnapshot = {
  phase: "playing",
  controlMode: "mouse",
  score: 0,
  hearts: GAME_CONFIG.startingHearts,
  comboHits: 0,
  comboMultiplier: 1,
  timeRemaining: GAME_CONFIG.durationSeconds,
  difficulty: 0,
  fruitsHit: 0,
  bombsHit: 0,
  misses: 0,
  handShots: 0,
  fallbackShots: 0,
  debugFps: 0
};

export default function App() {
  const webcam = useWebcam();
  const audio = useMemo(() => new GameAudio(), []);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [screen, setScreen] = useState<Screen>("start");
  const [sessionId, setSessionId] = useState(0);
  const [snapshot, setSnapshot] = useState<GameSnapshot>(INITIAL_SNAPSHOT);
  const [finalSnapshot, setFinalSnapshot] = useState<GameSnapshot>(INITIAL_SNAPSHOT);
  const [gesture, setGesture] = useState<GestureState>(EMPTY_GESTURE);
  const [highScore, setHighScore] = useLocalStorage<number>(GAME_CONFIG.highScoreKey, 0);
  const [leaderboard, setLeaderboard] = useLocalStorage<Leaderboard>(LEADERBOARD_STORAGE_KEY, EMPTY_LEADERBOARD);
  const [runControlMode, setRunControlMode] = useState<ControlMode>("mouse");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [helpOpen, setHelpOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [trackerStatus, setTrackerStatus] = useState<TrackerStatus>("idle");
  const [trackerError, setTrackerError] = useState("");
  const [pendingCameraStart, setPendingCameraStart] = useState(false);

  const beginRun = useCallback((mode: ControlMode = "mouse") => {
    audio.stopMusic();
    void audio.resume().then(() => {
      audio.startMusic();
    });
    setPendingCameraStart(false);
    const initialSnapshot = { ...INITIAL_SNAPSHOT, controlMode: mode };
    setRunControlMode(mode);
    setSnapshot(initialSnapshot);
    setFinalSnapshot(initialSnapshot);
    setGesture(EMPTY_GESTURE);
    setScreen("playing");
    setSessionId((value) => value + 1);
  }, [audio]);

  const handleStartWithCamera = useCallback(async () => {
    setTrackerError("");
    await audio.resume();
    const cameraStarted = await webcam.start();
    if (cameraStarted) {
      setPendingCameraStart(true);
    }
  }, [audio, webcam]);

  useEffect(() => {
    if (!pendingCameraStart) {
      return;
    }

    if (trackerStatus === "ready") {
      beginRun("hand");
    }

    if (trackerStatus === "error") {
      setPendingCameraStart(false);
    }
  }, [beginRun, pendingCameraStart, trackerStatus]);

  const handleSnapshot = useCallback(
    (nextSnapshot: GameSnapshot) => {
      setSnapshot(nextSnapshot);
      setHighScore((current) => Math.max(current, nextSnapshot.score));
    },
    [setHighScore]
  );

  const handleGameOver = useCallback(
    (nextSnapshot: GameSnapshot) => {
      setFinalSnapshot(nextSnapshot);
      setHighScore((current) => Math.max(current, nextSnapshot.score));
      setScreen("gameover");
    },
    [setHighScore]
  );

  const handleTrackerStatus = useCallback((status: TrackerStatus, error = "") => {
    setTrackerStatus(status);
    setTrackerError(error);
  }, []);

  const handleSaveLeaderboard = useCallback(
    (name: string, gameSnapshot: GameSnapshot) => {
      const entry = createLeaderboardEntry(name, gameSnapshot);
      setLeaderboard((current) => addLeaderboardEntry(current, entry));
    },
    [setLeaderboard]
  );

  return (
    <div className="app">
      <GameCanvas
        isRunning={screen === "playing"}
        sessionId={sessionId}
        controlMode={runControlMode}
        audio={audio}
        videoRef={webcam.videoRef}
        overlayCanvasRef={overlayCanvasRef}
        webcamReady={webcam.status === "ready"}
        debug={true}
        soundEnabled={soundEnabled}
        onSnapshot={handleSnapshot}
        onGameOver={handleGameOver}
        onGesture={setGesture}
        onTrackerStatus={handleTrackerStatus}
      />

      {screen === "playing" ? (
        <>
          <HUD
            snapshot={snapshot}
            highScore={highScore}
            gesture={gesture}
            webcamStatus={webcam.status}
            trackerStatus={trackerStatus}
            soundEnabled={soundEnabled}
            onToggleSound={() => setSoundEnabled((value) => !value)}
          />
          <WebcamView
            videoRef={webcam.videoRef}
            overlayCanvasRef={overlayCanvasRef}
            stream={webcam.stream}
            webcamStatus={webcam.status}
            trackerStatus={trackerStatus}
            showLandmarks={true}
          />
          <div className="hand-warning" data-visible={webcam.status === "ready" && trackerStatus === "ready" && !gesture.hasHand}>
            Show your hand to the camera.
          </div>
          {trackerError ? <div className="toast-warning">{trackerError}. Mouse controls still work.</div> : null}
        </>
      ) : null}

      {screen === "start" ? (
        <StartScreen
          highScore={highScore}
          webcamStatus={webcam.status}
          trackerStatus={trackerStatus}
          preparingCamera={pendingCameraStart}
          errorMessage={webcam.errorMessage || trackerError}
          onStartWithCamera={handleStartWithCamera}
          onStartWithMouse={() => beginRun("mouse")}
          onOpenHelp={() => setHelpOpen(true)}
          onOpenAbout={() => setAboutOpen(true)}
        />
      ) : null}

      {screen === "gameover" ? (
        <>
          <div className="game-over-backdrop" />
          <GameOverScreen
            snapshot={finalSnapshot}
            highScore={highScore}
            leaderboard={leaderboard}
            onSaveScore={handleSaveLeaderboard}
            onRestart={() => beginRun(finalSnapshot.controlMode)}
            onHome={() => setScreen("start")}
          />
        </>
      ) : null}

      <HowToPlay open={helpOpen} onClose={() => setHelpOpen(false)} />
      <AboutGame open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </div>
  );
}
