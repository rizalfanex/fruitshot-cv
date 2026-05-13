import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { distance, type Vec2 } from "../utils/math";

export const HAND = {
  wrist: 0,
  thumbCmc: 1,
  thumbMcp: 2,
  thumbIp: 3,
  thumbTip: 4,
  indexMcp: 5,
  indexPip: 6,
  indexDip: 7,
  indexTip: 8,
  middleMcp: 9,
  middlePip: 10,
  middleDip: 11,
  middleTip: 12,
  ringMcp: 13,
  ringPip: 14,
  ringDip: 15,
  ringTip: 16,
  pinkyMcp: 17,
  pinkyPip: 18,
  pinkyDip: 19,
  pinkyTip: 20
} as const;

export const HAND_CONNECTIONS: Array<[number, number]> = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [0, 5],
  [5, 6],
  [6, 7],
  [7, 8],
  [5, 9],
  [9, 10],
  [10, 11],
  [11, 12],
  [9, 13],
  [13, 14],
  [14, 15],
  [15, 16],
  [13, 17],
  [0, 17],
  [17, 18],
  [18, 19],
  [19, 20]
];

export function pointFromLandmark(landmark: NormalizedLandmark): Vec2 {
  return { x: landmark.x, y: landmark.y };
}

export function landmarkDistance(a: NormalizedLandmark, b: NormalizedLandmark): number {
  return distance(pointFromLandmark(a), pointFromLandmark(b));
}

export function mapLandmarkToCanvas(
  landmark: NormalizedLandmark,
  width: number,
  height: number,
  mirrorX = true
): Vec2 {
  return {
    x: (mirrorX ? 1 - landmark.x : landmark.x) * width,
    y: landmark.y * height
  };
}

export function getPalmSize(landmarks: NormalizedLandmark[]): number {
  const wristToMiddle = landmarkDistance(landmarks[HAND.wrist], landmarks[HAND.middleMcp]);
  const palmWidth = landmarkDistance(landmarks[HAND.indexMcp], landmarks[HAND.pinkyMcp]);
  return Math.max(0.001, Math.max(wristToMiddle, palmWidth));
}

export function drawLandmarkOverlay(
  ctx: CanvasRenderingContext2D,
  landmarks: NormalizedLandmark[] | null,
  width: number,
  height: number
) {
  ctx.clearRect(0, 0, width, height);

  if (!landmarks) {
    return;
  }

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.scale(-1, 1);
  ctx.translate(-width, 0);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.78)";
  ctx.lineWidth = 3;

  for (const [from, to] of HAND_CONNECTIONS) {
    ctx.beginPath();
    ctx.moveTo(landmarks[from].x * width, landmarks[from].y * height);
    ctx.lineTo(landmarks[to].x * width, landmarks[to].y * height);
    ctx.stroke();
  }

  landmarks.forEach((landmark, index) => {
    const isTip = [4, 8, 12, 16, 20].includes(index);
    ctx.fillStyle = index === HAND.indexTip ? "#ff335f" : isTip ? "#fff375" : "#42f5c8";
    ctx.beginPath();
    ctx.arc(landmark.x * width, landmark.y * height, isTip ? 5 : 3.5, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.restore();
}
