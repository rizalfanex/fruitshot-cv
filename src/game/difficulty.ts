import { GAME_CONFIG } from "./constants";
import { clamp } from "../utils/clamp";
import { lerp } from "../utils/math";

export function getDifficulty(elapsed: number): number {
  return clamp(elapsed / GAME_CONFIG.durationSeconds, 0, 1);
}

export function getSpawnInterval(difficulty: number): number {
  return lerp(GAME_CONFIG.initialSpawnInterval, GAME_CONFIG.minimumSpawnInterval, difficulty);
}

export function getSpeedMultiplier(difficulty: number): number {
  return lerp(1, 1.78, difficulty);
}

export function getBombChance(difficulty: number): number {
  return clamp(0.14 + difficulty * 0.12, 0.14, 0.26);
}

export function getGoldenChance(difficulty: number): number {
  return clamp(0.035 + difficulty * 0.035, 0.035, 0.07);
}

export function getRareChance(difficulty: number): number {
  return clamp(0.18 + difficulty * 0.07, 0.18, 0.25);
}
