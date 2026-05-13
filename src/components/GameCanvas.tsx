import { useCallback, useEffect, useRef } from "react";
import type { RefObject } from "react";
import { EMPTY_GESTURE, detectGesture, type GestureState } from "../cv/gestureDetector";
import { HandTracker } from "../cv/handTracker";
import { HAND, drawLandmarkOverlay } from "../cv/landmarkUtils";
import { GameAudio } from "../game/audio";
import { GAME_HEIGHT, GAME_WIDTH } from "../game/constants";
import { GameEngine } from "../game/engine";
import type { ControlMode, GameSnapshot } from "../game/types";
import { useAnimationFrame } from "../hooks/useAnimationFrame";
import { lerpVec, type Vec2 } from "../utils/math";

export type TrackerStatus = "idle" | "loading" | "ready" | "error";

interface GameCanvasProps {
  isRunning: boolean;
  sessionId: number;
  controlMode: ControlMode;
  audio: GameAudio;
  videoRef: RefObject<HTMLVideoElement | null>;
  overlayCanvasRef: RefObject<HTMLCanvasElement | null>;
  webcamReady: boolean;
  debug: boolean;
  soundEnabled: boolean;
  onSnapshot: (snapshot: GameSnapshot) => void;
  onGameOver: (snapshot: GameSnapshot) => void;
  onGesture: (gesture: GestureState) => void;
  onTrackerStatus: (status: TrackerStatus, error?: string) => void;
}

export function GameCanvas({
  isRunning,
  sessionId,
  controlMode,
  audio,
  videoRef,
  overlayCanvasRef,
  webcamReady,
  debug,
  soundEnabled,
  onSnapshot,
  onGameOver,
  onGesture,
  onTrackerStatus
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const trackerRef = useRef<HandTracker | null>(null);
  const smoothedCrosshairRef = useRef<Vec2>({ x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 });
  const mousePointRef = useRef<Vec2>({ x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 });
  const lastPointerAtRef = useRef(-10000);
  const previousTriggerRef = useRef(false);
  const lastGestureEmitRef = useRef(0);
  const lastSnapshotEmitRef = useRef(0);
  const sizeRef = useRef({ width: GAME_WIDTH, height: GAME_HEIGHT, dpr: 1 });

  useEffect(() => {
    audio.setEnabled(soundEnabled);
    if (soundEnabled && isRunning) {
      audio.startMusic();
    }
  }, [audio, isRunning, soundEnabled]);

  useEffect(() => {
    engineRef.current ??= new GameEngine(audio, onGameOver);
    engineRef.current.setGameOverHandler(onGameOver);
  }, [audio, onGameOver]);

  useEffect(() => {
    if (!engineRef.current) {
      return;
    }

    engineRef.current.start(controlMode);
    audio.startMusic();
    previousTriggerRef.current = false;
    smoothedCrosshairRef.current = {
      x: sizeRef.current.width / 2,
      y: sizeRef.current.height / 2
    };
  }, [audio, controlMode, sessionId]);

  useEffect(() => {
    if (isRunning) {
      return;
    }

    audio.stopMusic();
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const { width, height, dpr } = sizeRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
  }, [audio, isRunning]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) {
      return;
    }

    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(320, rect.width);
      const height = Math.max(240, rect.height);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      sizeRef.current = { width, height, dpr };
      engineRef.current?.setSize(width, height);
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(wrap);
    window.addEventListener("resize", resize);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", resize);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!webcamReady) {
      trackerRef.current?.dispose();
      trackerRef.current = null;
      onTrackerStatus("idle");
      return;
    }

    const tracker = new HandTracker();
    trackerRef.current = tracker;
    onTrackerStatus("loading");

    tracker
      .initialize()
      .then(() => {
        if (!cancelled) {
          onTrackerStatus("ready");
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          onTrackerStatus("error", error instanceof Error ? error.message : "Unable to initialize hand tracking.");
        }
      });

    return () => {
      cancelled = true;
      tracker.dispose();
    };
  }, [onTrackerStatus, webcamReady]);

  const eventToCanvasPoint = useCallback((event: PointerEvent | React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return { x: 0, y: 0 };
    }

    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  }, []);

  const shootWithFallback = useCallback(
    (source: "mouse" | "keyboard", point?: Vec2) => {
      const engine = engineRef.current;
      if (!engine || !isRunning) {
        return;
      }

      void audio.resume();
      const crosshair = point ?? smoothedCrosshairRef.current;
      smoothedCrosshairRef.current = crosshair;
      engine.setInput({
        crosshair,
        hasAim: true,
        pistolReady: true,
        triggerPressed: true,
        usingHand: false
      });
      engine.requestShot(source);
    },
    [audio, isRunning]
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space") {
        return;
      }

      event.preventDefault();
      shootWithFallback("keyboard");
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shootWithFallback]);

  useAnimationFrame(
    (time, dt) => {
      const canvas = canvasRef.current;
      const engine = engineRef.current;
      if (!canvas || !engine) {
        return;
      }

      const { width, height, dpr } = sizeRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        return;
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const frame = detectHandFrame(videoRef.current, trackerRef.current, webcamReady, time);
      const gesture = detectGesture(frame.landmarks, {
        handednessScore: frame.handednessScore,
        handLabel: frame.handLabel
      });

      drawPreviewOverlay(overlayCanvasRef.current, frame.landmarks, debug);

      let target = smoothedCrosshairRef.current;
      let usingHand = false;
      let hasAim = false;
      let pistolReady = false;

      if (gesture.hasHand && frame.landmarks) {
        target = getHandAimPoint(frame.landmarks, width, height);
        usingHand = true;
        hasAim = true;
        pistolReady = gesture.isPistol || gesture.isFist;
      }

      if (!usingHand && lastPointerAtRef.current > -9999) {
        target = mousePointRef.current;
        usingHand = false;
        hasAim = true;
        pistolReady = true;
      }

      const smoothing = usingHand ? 0.34 : 0.58;
      const crosshair = lerpVec(smoothedCrosshairRef.current, target, smoothing);
      smoothedCrosshairRef.current = crosshair;

      engine.setInput({
        crosshair,
        hasAim,
        pistolReady,
        triggerPressed: gesture.triggerPressed,
        usingHand
      });

      if (gesture.triggerPressed && !previousTriggerRef.current && usingHand) {
        void audio.resume();
        engine.requestShot("hand", time);
      }
      previousTriggerRef.current = gesture.triggerPressed;

      engine.update(dt);
      engine.draw(ctx);

      if (time - lastGestureEmitRef.current > 100) {
        onGesture(usingHand ? gesture : gesture.hasHand ? gesture : EMPTY_GESTURE);
        lastGestureEmitRef.current = time;
      }

      if (time - lastSnapshotEmitRef.current > 120) {
        onSnapshot(engine.getSnapshot());
        lastSnapshotEmitRef.current = time;
      }
    },
    isRunning
  );

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const point = eventToCanvasPoint(event);
    mousePointRef.current = point;
    lastPointerAtRef.current = performance.now();
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const point = eventToCanvasPoint(event);
    mousePointRef.current = point;
    lastPointerAtRef.current = performance.now();
    shootWithFallback("mouse", point);
  };

  return (
    <div className="game-shell" ref={wrapRef}>
      <canvas
        ref={canvasRef}
        className="game-canvas"
        aria-label="FruitShot CV game canvas"
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}
      />
    </div>
  );
}

function detectHandFrame(
  video: HTMLVideoElement | null,
  tracker: HandTracker | null,
  webcamReady: boolean,
  time: number
) {
  if (!video || !tracker || !webcamReady) {
    return {
      landmarks: null,
      handednessScore: 0,
      handLabel: "",
      raw: null,
      timestamp: time
    };
  }

  return tracker.detect(video, time);
}

function drawPreviewOverlay(
  canvas: HTMLCanvasElement | null,
  landmarks: Parameters<typeof drawLandmarkOverlay>[1],
  enabled: boolean
) {
  if (!canvas) {
    return;
  }

  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(1, rect.width);
  const height = Math.max(1, rect.height);

  if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return;
  }

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  if (!enabled) {
    ctx.clearRect(0, 0, width, height);
    return;
  }

  drawLandmarkOverlay(ctx, landmarks, width, height);
}

function getHandAimPoint(
  landmarks: NonNullable<Parameters<typeof drawLandmarkOverlay>[1]>,
  width: number,
  height: number
): Vec2 {
  const knuckles = [HAND.indexMcp, HAND.middleMcp, HAND.ringMcp, HAND.pinkyMcp];
  const center = knuckles.reduce(
    (sum, index) => ({
      x: sum.x + landmarks[index].x,
      y: sum.y + landmarks[index].y
    }),
    { x: 0, y: 0 }
  );

  center.x /= knuckles.length;
  center.y /= knuckles.length;

  return {
    x: (1 - center.x) * width,
    y: center.y * height
  };
}
