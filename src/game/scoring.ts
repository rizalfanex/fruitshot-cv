import { BOMB_SCORE_PENALTY, FRUIT_POINTS, GAME_CONFIG } from "./constants";
import type { FruitRarity } from "./types";

export function getComboMultiplier(comboHits: number): number {
  return Math.min(GAME_CONFIG.maxComboMultiplier, 1 + Math.floor(comboHits / 5));
}

export function getFruitScore(rarity: FruitRarity, multiplier: number): number {
  return FRUIT_POINTS[rarity] * multiplier;
}

export function applyBombPenalty(score: number): number {
  return Math.max(0, score - BOMB_SCORE_PENALTY);
}
