import type { Vec2 } from "../utils/math";
import type { FruitKind } from "./entities";

export type GamePhase = "playing" | "gameover";
export type TargetType = "fruit" | "bomb";
export type FruitRarity = "normal" | "rare" | "golden";
export type ShotSource = "hand" | "mouse" | "keyboard";
export type ControlMode = "hand" | "mouse";

export interface TargetEntity {
  id: number;
  type: TargetType;
  kind?: FruitKind;
  rarity?: FruitRarity;
  position: Vec2;
  velocity: Vec2;
  radius: number;
  rotation: number;
  spin: number;
  age: number;
  ttl: number;
  wobbleSeed: number;
}

export interface Particle {
  id: number;
  position: Vec2;
  velocity: Vec2;
  radius: number;
  color: string;
  life: number;
  maxLife: number;
  gravity: number;
  spin: number;
  rotation: number;
  shape: "circle" | "slice" | "spark";
}

export interface PopupText {
  id: number;
  text: string;
  position: Vec2;
  velocity: Vec2;
  color: string;
  life: number;
  maxLife: number;
  size: number;
}

export interface ShotEffect {
  id: number;
  position: Vec2;
  source: ShotSource;
  life: number;
  maxLife: number;
  hit: boolean;
}

export interface ComboBanner {
  id: number;
  multiplier: number;
  text: string;
  life: number;
  maxLife: number;
}

export interface GameInput {
  crosshair: Vec2;
  hasAim: boolean;
  pistolReady: boolean;
  triggerPressed: boolean;
  usingHand: boolean;
}

export interface GameState {
  phase: GamePhase;
  controlMode: ControlMode;
  elapsed: number;
  timeRemaining: number;
  score: number;
  hearts: number;
  comboHits: number;
  comboMultiplier: number;
  difficulty: number;
  entities: TargetEntity[];
  particles: Particle[];
  popups: PopupText[];
  shots: ShotEffect[];
  comboBanners: ComboBanner[];
  spawnTimer: number;
  lastShotAt: number;
  screenShake: number;
  fruitsHit: number;
  bombsHit: number;
  misses: number;
  handShots: number;
  fallbackShots: number;
  debugFps: number;
}

export interface GameSnapshot {
  phase: GamePhase;
  controlMode: ControlMode;
  score: number;
  hearts: number;
  comboHits: number;
  comboMultiplier: number;
  timeRemaining: number;
  difficulty: number;
  fruitsHit: number;
  bombsHit: number;
  misses: number;
  handShots: number;
  fallbackShots: number;
  debugFps: number;
}
