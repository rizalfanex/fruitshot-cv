import { randomBetween, type Vec2 } from "../utils/math";
import { getFruitPalette } from "./entities";
import type { FruitKind } from "./entities";
import type { FruitRarity, Particle, PopupText, ShotEffect } from "./types";

let nextParticleId = 1;

export function createFruitSplash(kind: FruitKind, rarity: FruitRarity, origin: Vec2, count = 18): Particle[] {
  const palette = getFruitPalette(kind, rarity);
  return Array.from({ length: count }, () => {
    const angle = randomBetween(0, Math.PI * 2);
    const speed = randomBetween(110, 420);
    return {
      id: nextParticleId++,
      position: { ...origin },
      velocity: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed - randomBetween(20, 160) },
      radius: randomBetween(3, 8),
      color: Math.random() > 0.55 ? palette.accent : palette.body,
      life: randomBetween(0.38, 0.78),
      maxLife: 0.78,
      gravity: 620,
      spin: randomBetween(-9, 9),
      rotation: randomBetween(0, Math.PI * 2),
      shape: Math.random() > 0.5 ? "slice" : "circle"
    };
  });
}

export function createExplosion(origin: Vec2, count = 30): Particle[] {
  const colors = ["#ff3b2e", "#ff9f1c", "#ffd166", "#3a3a46", "#12131a"];
  return Array.from({ length: count }, () => {
    const angle = randomBetween(0, Math.PI * 2);
    const speed = randomBetween(160, 640);
    return {
      id: nextParticleId++,
      position: { ...origin },
      velocity: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
      radius: randomBetween(4, 14),
      color: colors[Math.floor(Math.random() * colors.length)],
      life: randomBetween(0.45, 0.95),
      maxLife: 0.95,
      gravity: 220,
      spin: randomBetween(-14, 14),
      rotation: randomBetween(0, Math.PI * 2),
      shape: Math.random() > 0.45 ? "spark" : "circle"
    };
  });
}

export function createShotBurst(origin: Vec2, hit: boolean): Particle[] {
  const colors = hit ? ["#fff7a8", "#7cffcb", "#ffffff"] : ["#d9e2ef", "#ffffff", "#8b9bb2"];
  return Array.from({ length: hit ? 8 : 5 }, () => {
    const angle = randomBetween(0, Math.PI * 2);
    const speed = randomBetween(80, hit ? 260 : 160);
    return {
      id: nextParticleId++,
      position: { ...origin },
      velocity: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
      radius: randomBetween(2, 5),
      color: colors[Math.floor(Math.random() * colors.length)],
      life: randomBetween(0.16, 0.32),
      maxLife: 0.32,
      gravity: 0,
      spin: randomBetween(-12, 12),
      rotation: randomBetween(0, Math.PI * 2),
      shape: "spark"
    };
  });
}

export function createPopup(text: string, origin: Vec2, color: string, size = 28): PopupText {
  return {
    id: nextParticleId++,
    text,
    position: { x: origin.x, y: origin.y },
    velocity: { x: randomBetween(-18, 18), y: -82 },
    color,
    life: 0.85,
    maxLife: 0.85,
    size
  };
}

export function createShotEffect(origin: Vec2, source: ShotEffect["source"], hit: boolean): ShotEffect {
  return {
    id: nextParticleId++,
    position: { ...origin },
    source,
    hit,
    life: 0.2,
    maxLife: 0.2
  };
}

export function updateParticles(particles: Particle[], dt: number): Particle[] {
  return particles
    .map((particle) => ({
      ...particle,
      position: {
        x: particle.position.x + particle.velocity.x * dt,
        y: particle.position.y + particle.velocity.y * dt
      },
      velocity: {
        x: particle.velocity.x * 0.985,
        y: particle.velocity.y + particle.gravity * dt
      },
      rotation: particle.rotation + particle.spin * dt,
      life: particle.life - dt
    }))
    .filter((particle) => particle.life > 0);
}

export function updatePopups(popups: PopupText[], dt: number): PopupText[] {
  return popups
    .map((popup) => ({
      ...popup,
      position: {
        x: popup.position.x + popup.velocity.x * dt,
        y: popup.position.y + popup.velocity.y * dt
      },
      velocity: { x: popup.velocity.x, y: popup.velocity.y - 6 * dt },
      life: popup.life - dt
    }))
    .filter((popup) => popup.life > 0);
}

export function updateShots(shots: ShotEffect[], dt: number): ShotEffect[] {
  return shots
    .map((shot) => ({ ...shot, life: shot.life - dt }))
    .filter((shot) => shot.life > 0);
}

export function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]) {
  for (const particle of particles) {
    const alpha = Math.max(0, particle.life / particle.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(particle.position.x, particle.position.y);
    ctx.rotate(particle.rotation);
    ctx.fillStyle = particle.color;

    if (particle.shape === "spark") {
      ctx.fillRect(-particle.radius * 0.45, -particle.radius * 2, particle.radius * 0.9, particle.radius * 4);
    } else if (particle.shape === "slice") {
      ctx.beginPath();
      ctx.moveTo(0, -particle.radius * 1.4);
      ctx.lineTo(particle.radius * 1.4, particle.radius);
      ctx.lineTo(-particle.radius * 1.1, particle.radius * 0.8);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, particle.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

export function drawPopups(ctx: CanvasRenderingContext2D, popups: PopupText[]) {
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";

  for (const popup of popups) {
    const alpha = Math.max(0, popup.life / popup.maxLife);
    ctx.globalAlpha = alpha;
    ctx.font = `900 ${popup.size}px Inter, ui-sans-serif, system-ui, sans-serif`;
    ctx.lineWidth = 5;
    ctx.strokeStyle = "rgba(0, 0, 0, 0.22)";
    ctx.fillStyle = popup.color;
    ctx.strokeText(popup.text, popup.position.x, popup.position.y);
    ctx.fillText(popup.text, popup.position.x, popup.position.y);
  }

  ctx.restore();
}

export function drawShotEffects(ctx: CanvasRenderingContext2D, shots: ShotEffect[]) {
  for (const shot of shots) {
    const t = 1 - shot.life / shot.maxLife;
    const radius = 18 + t * 34;

    ctx.save();
    ctx.globalAlpha = 1 - t;
    ctx.translate(shot.position.x, shot.position.y);
    ctx.strokeStyle = shot.hit ? "#fff375" : "#ffffff";
    ctx.lineWidth = shot.hit ? 4 : 2;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = shot.hit ? "#fff375" : "#d8e4f7";
    ctx.font = `900 ${22 + t * 8}px Inter, ui-sans-serif, system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(shot.hit ? "PEW" : "TAP", 0, -radius - 12);
    ctx.restore();
  }
}
