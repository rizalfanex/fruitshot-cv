import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { clamp } from "../utils/clamp";
import { HAND, getPalmSize, landmarkDistance } from "./landmarkUtils";

export interface FingerStates {
  thumb: boolean;
  index: boolean;
  middle: boolean;
  ring: boolean;
  pinky: boolean;
}

export interface GestureState {
  hasHand: boolean;
  isPistol: boolean;
  isFist: boolean;
  triggerPressed: boolean;
  shootGesture: "pistol-trigger" | "fist" | null;
  confidence: number;
  aimLandmark: NormalizedLandmark | null;
  handLabel: string;
  message: string;
  fingerStates: FingerStates;
  triggerDistance: number;
}

export const EMPTY_GESTURE: GestureState = {
  hasHand: false,
  isPistol: false,
  isFist: false,
  triggerPressed: false,
  shootGesture: null,
  confidence: 0,
  aimLandmark: null,
  handLabel: "",
  message: "Show your hand to the camera.",
  fingerStates: {
    thumb: false,
    index: false,
    middle: false,
    ring: false,
    pinky: false
  },
  triggerDistance: 999
};

interface DetectGestureOptions {
  handednessScore?: number;
  handLabel?: string;
}

export function detectGesture(
  landmarks: NormalizedLandmark[] | null | undefined,
  options: DetectGestureOptions = {}
): GestureState {
  if (!landmarks || landmarks.length < 21) {
    return EMPTY_GESTURE;
  }

  const palmSize = getPalmSize(landmarks);
  const indexExtended = isFingerExtended(landmarks, HAND.indexMcp, HAND.indexPip, HAND.indexTip, palmSize);
  const middleExtended = isFingerExtended(landmarks, HAND.middleMcp, HAND.middlePip, HAND.middleTip, palmSize);
  const ringExtended = isFingerExtended(landmarks, HAND.ringMcp, HAND.ringPip, HAND.ringTip, palmSize);
  const pinkyExtended = isFingerExtended(landmarks, HAND.pinkyMcp, HAND.pinkyPip, HAND.pinkyTip, palmSize);

  const indexFolded = isFingerFolded(landmarks, HAND.indexMcp, HAND.indexPip, HAND.indexTip, palmSize);
  const middleFolded = isFingerFolded(landmarks, HAND.middleMcp, HAND.middlePip, HAND.middleTip, palmSize);
  const ringFolded = isFingerFolded(landmarks, HAND.ringMcp, HAND.ringPip, HAND.ringTip, palmSize);
  const pinkyFolded = isFingerFolded(landmarks, HAND.pinkyMcp, HAND.pinkyPip, HAND.pinkyTip, palmSize);

  const thumbTip = landmarks[HAND.thumbTip];
  const indexMcp = landmarks[HAND.indexMcp];
  const indexPip = landmarks[HAND.indexPip];
  const thumbToIndexMcp = landmarkDistance(thumbTip, indexMcp) / palmSize;
  const thumbToIndexPip = landmarkDistance(thumbTip, indexPip) / palmSize;
  const thumbToWrist = landmarkDistance(thumbTip, landmarks[HAND.wrist]) / palmSize;
  const thumbExtended = thumbToWrist > 0.82 && thumbToIndexMcp > 0.42;

  // Trigger rule: keep the index extended and folded fingers down, then pull the thumb
  // toward the index base/PIP area. A short cooldown outside this function debounces shots.
  const triggerDistance = Math.min(thumbToIndexMcp, thumbToIndexPip);
  const triggerPulled = triggerDistance < 0.48;
  const foldedScore = Number(middleFolded) + Number(ringFolded) + Number(pinkyFolded);
  const pistolCore = indexExtended && foldedScore >= 2;
  const isPistol = pistolCore && (thumbExtended || triggerPulled);
  const isFist = indexFolded && middleFolded && ringFolded && pinkyFolded;

  const poseScore =
    Number(indexExtended) * 0.34 +
    (foldedScore / 3) * 0.38 +
    Number(thumbExtended || triggerPulled) * 0.2 +
    clamp(options.handednessScore ?? 0.85, 0, 1) * 0.08;

  const confidence = clamp(poseScore, 0, 1);
  const fistConfidence =
    (Number(indexFolded) + Number(middleFolded) + Number(ringFolded) + Number(pinkyFolded)) / 4;
  const pistolTriggerPressed = isPistol && triggerPulled && confidence >= 0.68;
  const fistTriggerPressed = isFist && fistConfidence >= 0.92;
  const triggerPressed = pistolTriggerPressed || fistTriggerPressed;

  return {
    hasHand: true,
    isPistol: isPistol && confidence >= 0.62,
    isFist,
    triggerPressed,
    shootGesture: fistTriggerPressed ? "fist" : pistolTriggerPressed ? "pistol-trigger" : null,
    confidence,
    aimLandmark: landmarks[HAND.indexTip],
    handLabel: options.handLabel ?? "",
    message: fistTriggerPressed ? "Fist Shot" : isPistol ? "Pistol Ready" : "Aim, then clench to shoot.",
    fingerStates: {
      thumb: thumbExtended,
      index: indexExtended,
      middle: middleExtended,
      ring: ringExtended,
      pinky: pinkyExtended
    },
    triggerDistance
  };
}

function isFingerExtended(
  landmarks: NormalizedLandmark[],
  mcpIndex: number,
  pipIndex: number,
  tipIndex: number,
  palmSize: number
): boolean {
  const wrist = landmarks[HAND.wrist];
  const mcp = landmarks[mcpIndex];
  const pip = landmarks[pipIndex];
  const tip = landmarks[tipIndex];
  const tipReach = landmarkDistance(tip, wrist);
  const pipReach = landmarkDistance(pip, wrist);
  const tipFromMcp = landmarkDistance(tip, mcp) / palmSize;
  const pipFromMcp = landmarkDistance(pip, mcp) / palmSize;

  return tipReach > pipReach * 1.06 && tipFromMcp > pipFromMcp * 1.18 && tipFromMcp > 0.52;
}

function isFingerFolded(
  landmarks: NormalizedLandmark[],
  mcpIndex: number,
  pipIndex: number,
  tipIndex: number,
  palmSize: number
): boolean {
  const wrist = landmarks[HAND.wrist];
  const mcp = landmarks[mcpIndex];
  const pip = landmarks[pipIndex];
  const tip = landmarks[tipIndex];
  const tipReach = landmarkDistance(tip, wrist);
  const pipReach = landmarkDistance(pip, wrist);
  const tipFromMcp = landmarkDistance(tip, mcp) / palmSize;

  return tipReach < pipReach * 1.1 || tipFromMcp < 0.58;
}
