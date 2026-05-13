import { GAME_CONFIG, GAME_HEIGHT, GAME_WIDTH } from "./constants";
import { findHitTarget } from "./collision";
import { getDifficulty, getSpawnInterval } from "./difficulty";
import { drawTarget } from "./entities";
import { createTarget } from "./spawner";
import { applyBombPenalty, getComboMultiplier, getFruitScore } from "./scoring";
import {
  createExplosion,
  createFruitSplash,
  createPopup,
  createShotBurst,
  createShotEffect,
  drawParticles,
  drawPopups,
  drawShotEffects,
  updateParticles,
  updatePopups,
  updateShots
} from "./particles";
import type { ComboBanner, ControlMode, GameInput, GameSnapshot, GameState, ShotSource, TargetEntity } from "./types";
import { clamp } from "../utils/clamp";
import { randomBetween, type Vec2 } from "../utils/math";
import type { GameAudio } from "./audio";

const DEFAULT_INPUT: GameInput = {
  crosshair: { x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 },
  hasAim: false,
  pistolReady: false,
  triggerPressed: false,
  usingHand: false
};

export class GameEngine {
  private state: GameState;
  private input: GameInput = { ...DEFAULT_INPUT };
  private width = GAME_WIDTH;
  private height = GAME_HEIGHT;
  private onGameOver?: (snapshot: GameSnapshot) => void;
  private gameOverEmitted = false;
  private fpsFrames = 0;
  private fpsElapsed = 0;

  constructor(private readonly audio: GameAudio, onGameOver?: (snapshot: GameSnapshot) => void) {
    this.onGameOver = onGameOver;
    this.state = createInitialState();
  }

  setGameOverHandler(handler: (snapshot: GameSnapshot) => void) {
    this.onGameOver = handler;
  }

  setSize(width: number, height: number) {
    this.width = Math.max(320, width);
    this.height = Math.max(240, height);
  }

  start(controlMode: ControlMode = "mouse") {
    this.state = createInitialState(controlMode);
    this.input = {
      ...DEFAULT_INPUT,
      crosshair: { x: this.width / 2, y: this.height / 2 }
    };
    this.gameOverEmitted = false;
    this.audio.play("start");
  }

  setInput(input: Partial<GameInput>) {
    this.input = {
      ...this.input,
      ...input,
      crosshair: input.crosshair ?? this.input.crosshair
    };
  }

  requestShot(source: ShotSource, now = performance.now()): boolean {
    if (this.state.phase !== "playing") {
      return false;
    }

    if (now - this.state.lastShotAt < GAME_CONFIG.shotCooldownMs) {
      return false;
    }

    this.state.lastShotAt = now;
    this.handleShot(source);
    return true;
  }

  update(dt: number) {
    this.trackFps(dt);

    if (this.state.phase === "playing") {
      this.state.elapsed = Math.min(GAME_CONFIG.durationSeconds, this.state.elapsed + dt);
      this.state.timeRemaining = Math.max(0, GAME_CONFIG.durationSeconds - this.state.elapsed);
      this.state.difficulty = getDifficulty(this.state.elapsed);
      this.updateSpawning(dt);
      this.updateTargets(dt);

      if (this.state.timeRemaining <= 0 || this.state.hearts <= 0) {
        this.endGame();
      }
    }

    this.state.particles = updateParticles(this.state.particles, dt);
    this.state.popups = updatePopups(this.state.popups, dt);
    this.state.shots = updateShots(this.state.shots, dt);
    this.state.comboBanners = updateComboBanners(this.state.comboBanners, dt);
    this.state.screenShake = Math.max(0, this.state.screenShake - dt * 42);
  }

  draw(ctx: CanvasRenderingContext2D) {
    drawBackground(ctx, this.width, this.height, this.state.elapsed);

    ctx.save();
    if (this.state.screenShake > 0) {
      ctx.translate(randomBetween(-this.state.screenShake, this.state.screenShake), randomBetween(-this.state.screenShake, this.state.screenShake));
    }

    for (const entity of this.state.entities) {
      drawTarget(ctx, entity, this.state.elapsed);
    }

    drawParticles(ctx, this.state.particles);
    drawShotEffects(ctx, this.state.shots);
    drawPopups(ctx, this.state.popups);
    drawCrosshair(ctx, this.input, this.state.elapsed);
    ctx.restore();

    drawComboBanners(ctx, this.state.comboBanners, this.width, this.height);
  }

  getSnapshot(): GameSnapshot {
    return {
      phase: this.state.phase,
      controlMode: this.state.controlMode,
      score: this.state.score,
      hearts: this.state.hearts,
      comboHits: this.state.comboHits,
      comboMultiplier: this.state.comboMultiplier,
      timeRemaining: this.state.timeRemaining,
      difficulty: this.state.difficulty,
      fruitsHit: this.state.fruitsHit,
      bombsHit: this.state.bombsHit,
      misses: this.state.misses,
      handShots: this.state.handShots,
      fallbackShots: this.state.fallbackShots,
      debugFps: this.state.debugFps
    };
  }

  private updateSpawning(dt: number) {
    this.state.spawnTimer -= dt;
    if (this.state.spawnTimer > 0) {
      return;
    }

    this.state.entities.push(createTarget(this.width, this.height, this.state.difficulty));
    const interval = getSpawnInterval(this.state.difficulty);
    this.state.spawnTimer = randomBetween(interval * 0.72, interval * 1.16);

    if (this.state.difficulty > 0.72 && Math.random() < 0.18) {
      this.state.entities.push(createTarget(this.width, this.height, this.state.difficulty));
    }
  }

  private updateTargets(dt: number) {
    const margin = 120;

    this.state.entities = this.state.entities
      .map((entity) => ({
        ...entity,
        position: {
          x: entity.position.x + entity.velocity.x * dt,
          y: entity.position.y + entity.velocity.y * dt + Math.sin(entity.age * 2.4 + entity.wobbleSeed) * 8 * dt
        },
        rotation: entity.rotation + entity.spin * dt,
        age: entity.age + dt
      }))
      .filter((entity) => {
        const insideExtendedBounds =
          entity.position.x > -margin &&
          entity.position.x < this.width + margin &&
          entity.position.y > -margin &&
          entity.position.y < this.height + margin;
        return insideExtendedBounds && entity.age < entity.ttl;
      });
  }

  private handleShot(source: ShotSource) {
    const crosshair = this.input.crosshair;
    if (source === "hand") {
      this.state.handShots += 1;
      if (this.state.fallbackShots === 0) {
        this.state.controlMode = "hand";
      }
    } else {
      this.state.fallbackShots += 1;
      this.state.controlMode = "mouse";
    }

    this.audio.play("shoot");

    if (!this.input.hasAim) {
      this.registerMiss(crosshair, "NO AIM");
      return;
    }

    const hit = findHitTarget(this.state.entities, crosshair);
    const didHit = Boolean(hit);
    this.state.shots.push(createShotEffect(crosshair, source, didHit));
    this.state.particles.push(...createShotBurst(crosshair, didHit));

    if (!hit) {
      this.registerMiss(crosshair, "MISS");
      return;
    }

    this.state.entities = this.state.entities.filter((entity) => entity.id !== hit.id);

    if (hit.type === "bomb") {
      this.handleBombHit(hit);
      return;
    }

    this.handleFruitHit(hit);
  }

  private handleFruitHit(entity: TargetEntity) {
    const rarity = entity.rarity ?? "normal";
    const kind = entity.kind ?? "apple";
    const points = getFruitScore(rarity, this.state.comboMultiplier);

    this.state.score += points;
    this.state.comboHits += 1;
    const nextMultiplier = getComboMultiplier(this.state.comboHits);

    if (nextMultiplier > this.state.comboMultiplier) {
      this.audio.play("combo");
      this.state.popups.push(createPopup(`x${nextMultiplier}`, { x: entity.position.x, y: entity.position.y - 42 }, "#fff375", 34));
      this.state.comboBanners.push(createComboBanner(nextMultiplier));
    } else {
      this.audio.play("fruit");
    }

    this.state.comboMultiplier = nextMultiplier;
    this.state.fruitsHit += 1;
    this.state.popups.push(createPopup(`+${points}`, entity.position, rarity === "golden" ? "#ffd83d" : "#39f6a3"));
    this.state.particles.push(...createFruitSplash(kind, rarity, entity.position, rarity === "golden" ? 24 : 18));
  }

  private handleBombHit(entity: TargetEntity) {
    this.audio.play("bomb");
    this.state.score = applyBombPenalty(this.state.score);
    this.state.hearts = Math.max(0, this.state.hearts - 1);
    this.state.comboHits = 0;
    this.state.comboMultiplier = 1;
    this.state.bombsHit += 1;
    this.state.screenShake = 18;
    this.state.popups.push(createPopup("-30", entity.position, "#ff4b3e", 34));
    this.state.particles.push(...createExplosion(entity.position));
  }

  private registerMiss(position: Vec2, text: string) {
    this.audio.play("miss");
    this.state.comboHits = 0;
    this.state.comboMultiplier = 1;
    this.state.misses += 1;
    this.state.popups.push(createPopup(text, position, "#d9e6ff", 22));
  }

  private endGame() {
    if (this.state.phase === "gameover") {
      return;
    }

    this.state.phase = "gameover";
    this.state.timeRemaining = 0;
    if (!this.gameOverEmitted) {
      this.gameOverEmitted = true;
      this.onGameOver?.(this.getSnapshot());
    }
  }

  private trackFps(dt: number) {
    this.fpsFrames += 1;
    this.fpsElapsed += dt;
    if (this.fpsElapsed >= 0.5) {
      this.state.debugFps = Math.round(this.fpsFrames / this.fpsElapsed);
      this.fpsFrames = 0;
      this.fpsElapsed = 0;
    }
  }
}

function createInitialState(controlMode: ControlMode = "mouse"): GameState {
  return {
    phase: "playing",
    controlMode,
    elapsed: 0,
    timeRemaining: GAME_CONFIG.durationSeconds,
    score: 0,
    hearts: GAME_CONFIG.startingHearts,
    comboHits: 0,
    comboMultiplier: 1,
    difficulty: 0,
    entities: [],
    particles: [],
    popups: [],
    shots: [],
    comboBanners: [],
    spawnTimer: 0.35,
    lastShotAt: -GAME_CONFIG.shotCooldownMs,
    screenShake: 0,
    fruitsHit: 0,
    bombsHit: 0,
    misses: 0,
    handShots: 0,
    fallbackShots: 0,
    debugFps: 0
  };
}

let nextComboBannerId = 1;

function createComboBanner(multiplier: number): ComboBanner {
  return {
    id: nextComboBannerId++,
    multiplier,
    text: `COMBO x${multiplier}!`,
    life: 1.35,
    maxLife: 1.35
  };
}

function updateComboBanners(banners: ComboBanner[], dt: number): ComboBanner[] {
  return banners
    .map((banner) => ({ ...banner, life: banner.life - dt }))
    .filter((banner) => banner.life > 0);
}

function drawComboBanners(ctx: CanvasRenderingContext2D, banners: ComboBanner[], width: number, height: number) {
  if (banners.length === 0) {
    return;
  }

  const banner = banners[banners.length - 1];
  const progress = 1 - banner.life / banner.maxLife;
  const fadeIn = Math.min(1, progress / 0.14);
  const fadeOut = Math.min(1, banner.life / 0.28);
  const alpha = Math.min(fadeIn, fadeOut);
  const scale = 0.82 + Math.sin(Math.min(1, progress) * Math.PI) * 0.18;
  const y = height * 0.22 - Math.max(0, progress - 0.2) * 24;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(width / 2, y);
  ctx.scale(scale, scale);

  const panelWidth = Math.min(430, width * 0.76);
  const panelHeight = 78;
  const gradient = ctx.createLinearGradient(-panelWidth / 2, 0, panelWidth / 2, 0);
  gradient.addColorStop(0, "#ff335f");
  gradient.addColorStop(0.5, "#ffcf48");
  gradient.addColorStop(1, "#39f6a3");

  ctx.shadowColor = "rgba(255, 51, 95, 0.34)";
  ctx.shadowBlur = 28;
  ctx.fillStyle = gradient;
  roundRect(ctx, -panelWidth / 2, -panelHeight / 2, panelWidth, panelHeight, 18);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
  ctx.lineWidth = 4;
  roundRect(ctx, -panelWidth / 2 + 5, -panelHeight / 2 + 5, panelWidth - 10, panelHeight - 10, 14);
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  ctx.font = "950 38px Trebuchet MS, Arial Rounded MT Bold, Inter, sans-serif";
  ctx.lineWidth = 8;
  ctx.strokeStyle = "rgba(23, 32, 51, 0.35)";
  ctx.fillStyle = "#ffffff";
  ctx.strokeText(banner.text, 0, -4);
  ctx.fillText(banner.text, 0, -4);

  ctx.font = "900 15px Trebuchet MS, Inter, sans-serif";
  ctx.fillStyle = "#172033";
  ctx.fillText(`Keep it going for bigger points`, 0, 26);

  ctx.restore();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
}

function drawBackground(ctx: CanvasRenderingContext2D, width: number, height: number, time: number) {
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#fff3b8");
  gradient.addColorStop(0.42, "#8ee7f2");
  gradient.addColorStop(1, "#7bd68b");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.globalAlpha = 0.28;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 3;
  const stripeGap = 92;
  const offset = (time * 24) % stripeGap;
  for (let x = -width; x < width * 2; x += stripeGap) {
    ctx.beginPath();
    ctx.moveTo(x + offset, height + 30);
    ctx.lineTo(x + offset + width * 0.65, -30);
    ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = "#0f3d4a";
  for (let i = 0; i < 34; i += 1) {
    const x = ((i * 163 + time * 18) % (width + 120)) - 60;
    const y = (i * 89) % height;
    ctx.fillRect(x, y, 22, 4);
    ctx.fillRect(x + 9, y - 9, 4, 22);
  }
  ctx.restore();

  ctx.fillStyle = "rgba(255, 255, 255, 0.32)";
  ctx.fillRect(0, height - 72, width, 72);
}

function drawCrosshair(ctx: CanvasRenderingContext2D, input: GameInput, time: number) {
  const { x, y } = input.crosshair;
  const ready = input.hasAim && input.pistolReady;
  const pulse = 1 + Math.sin(time * 10) * 0.05;
  const radius = ready ? 24 * pulse : 20;

  ctx.save();
  ctx.translate(x, y);
  ctx.lineCap = "round";
  ctx.lineWidth = ready ? 3.5 : 2.5;
  ctx.strokeStyle = ready ? "#ff335f" : input.hasAim ? "#ffffff" : "rgba(255,255,255,0.65)";
  ctx.shadowColor = ready ? "rgba(255, 51, 95, 0.48)" : "rgba(0, 0, 0, 0.24)";
  ctx.shadowBlur = ready ? 18 : 10;

  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-radius - 16, 0);
  ctx.lineTo(-radius + 4, 0);
  ctx.moveTo(radius - 4, 0);
  ctx.lineTo(radius + 16, 0);
  ctx.moveTo(0, -radius - 16);
  ctx.lineTo(0, -radius + 4);
  ctx.moveTo(0, radius - 4);
  ctx.lineTo(0, radius + 16);
  ctx.stroke();

  ctx.fillStyle = ready ? "#ff335f" : "#ffffff";
  ctx.beginPath();
  ctx.arc(0, 0, 4, 0, Math.PI * 2);
  ctx.fill();

  if (!input.hasAim) {
    ctx.globalAlpha = 0.7;
    ctx.font = "800 14px Inter, ui-sans-serif, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("mouse ready", 0, 42);
  }

  ctx.restore();
}
