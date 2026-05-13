import {
  FilesetResolver,
  HandLandmarker,
  type HandLandmarkerResult,
  type NormalizedLandmark
} from "@mediapipe/tasks-vision";

export interface HandTrackingFrame {
  landmarks: NormalizedLandmark[] | null;
  handednessScore: number;
  handLabel: string;
  raw: HandLandmarkerResult | null;
  timestamp: number;
}

const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm";
const HAND_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task";

export class HandTracker {
  private landmarker: HandLandmarker | null = null;
  private lastVideoTime = -1;
  private lastInferenceAt = 0;
  private lastFrame: HandTrackingFrame = {
    landmarks: null,
    handednessScore: 0,
    handLabel: "",
    raw: null,
    timestamp: 0
  };

  async initialize() {
    if (this.landmarker) {
      return;
    }

    const vision = await FilesetResolver.forVisionTasks(WASM_URL);
    try {
      this.landmarker = await createLandmarker(vision, "GPU");
    } catch {
      this.landmarker = await createLandmarker(vision, "CPU");
    }
  }

  detect(video: HTMLVideoElement, now = performance.now()): HandTrackingFrame {
    if (!this.landmarker || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      return this.lastFrame;
    }

    if (video.currentTime === this.lastVideoTime || now - this.lastInferenceAt < 28) {
      return this.lastFrame;
    }

    this.lastVideoTime = video.currentTime;
    this.lastInferenceAt = now;

    const raw = this.landmarker.detectForVideo(video, now);
    const landmarks = raw.landmarks?.[0] ?? null;
    const handedness = getHandedness(raw);

    this.lastFrame = {
      landmarks,
      handednessScore: handedness?.score ?? 0,
      handLabel: handedness?.categoryName ?? "",
      raw,
      timestamp: now
    };

    return this.lastFrame;
  }

  dispose() {
    this.landmarker?.close();
    this.landmarker = null;
  }
}

function createLandmarker(vision: Awaited<ReturnType<typeof FilesetResolver.forVisionTasks>>, delegate: "GPU" | "CPU") {
  return HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: HAND_MODEL_URL,
      delegate
    },
    runningMode: "VIDEO",
    numHands: 1,
    minHandDetectionConfidence: 0.55,
    minHandPresenceConfidence: 0.55,
    minTrackingConfidence: 0.5
  });
}

function getHandedness(result: HandLandmarkerResult): { score?: number; categoryName?: string } | null {
  const withLegacyName = result as HandLandmarkerResult & {
    handednesses?: Array<Array<{ score?: number; categoryName?: string }>>;
    handedness?: Array<Array<{ score?: number; categoryName?: string }>>;
  };

  return withLegacyName.handednesses?.[0]?.[0] ?? withLegacyName.handedness?.[0]?.[0] ?? null;
}
