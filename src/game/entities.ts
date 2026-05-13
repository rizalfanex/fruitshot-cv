import type { Vec2 } from "../utils/math";
import { FRUIT_KINDS } from "./constants";
import type { FruitRarity, TargetEntity } from "./types";

export type FruitKind = (typeof FRUIT_KINDS)[number];

interface FruitPalette {
  body: string;
  accent: string;
  dark: string;
  seed: string;
}

export function getFruitPalette(kind: FruitKind, rarity: FruitRarity = "normal"): FruitPalette {
  if (rarity === "golden") {
    return {
      body: "#ffd83d",
      accent: "#fff2a6",
      dark: "#d99a00",
      seed: "#8a5a00"
    };
  }

  const palettes: Record<FruitKind, FruitPalette> = {
    apple: { body: "#ff4b5f", accent: "#ff8c95", dark: "#b51e35", seed: "#6b1524" },
    banana: { body: "#ffd84a", accent: "#fff39c", dark: "#c2891d", seed: "#8c5e1a" },
    orange: { body: "#ff9b28", accent: "#ffd15d", dark: "#d35f00", seed: "#a94400" },
    watermelon: { body: "#2dbb62", accent: "#ff5a72", dark: "#176b36", seed: "#26352d" },
    strawberry: { body: "#f73755", accent: "#ff99a8", dark: "#9f1230", seed: "#ffe8a8" },
    grape: { body: "#8c5cff", accent: "#c7a7ff", dark: "#4c1db8", seed: "#2f136f" }
  };

  return palettes[kind];
}

export function drawTarget(ctx: CanvasRenderingContext2D, entity: TargetEntity, time: number) {
  if (entity.type === "bomb") {
    drawBomb(ctx, entity, time);
    return;
  }

  drawFruit(ctx, entity, time);
}

function drawFruit(ctx: CanvasRenderingContext2D, entity: TargetEntity, time: number) {
  const kind = entity.kind ?? "apple";
  const rarity = entity.rarity ?? "normal";
  const palette = getFruitPalette(kind, rarity);
  const wobble = Math.sin(time * 3 + entity.wobbleSeed) * 0.07;

  ctx.save();
  ctx.translate(entity.position.x, entity.position.y + Math.sin(entity.age * 4 + entity.wobbleSeed) * 3);
  ctx.rotate(entity.rotation + wobble);

  if (rarity === "golden") {
    drawGlow(ctx, entity.radius, "#ffe66c", 0.28);
  }

  switch (kind) {
    case "apple":
      drawApple(ctx, entity.radius, palette);
      break;
    case "banana":
      drawBanana(ctx, entity.radius, palette);
      break;
    case "orange":
      drawOrange(ctx, entity.radius, palette);
      break;
    case "watermelon":
      drawWatermelon(ctx, entity.radius, palette);
      break;
    case "strawberry":
      drawStrawberry(ctx, entity.radius, palette);
      break;
    case "grape":
      drawGrapes(ctx, entity.radius, palette);
      break;
  }

  if (rarity === "rare") {
    ctx.lineWidth = Math.max(3, entity.radius * 0.08);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.82)";
    ctx.setLineDash([entity.radius * 0.22, entity.radius * 0.16]);
    ctx.beginPath();
    ctx.arc(0, 0, entity.radius * 1.05, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.restore();
}

function drawBomb(ctx: CanvasRenderingContext2D, entity: TargetEntity, time: number) {
  const pulse = 0.5 + Math.sin(time * 7 + entity.wobbleSeed) * 0.5;

  ctx.save();
  ctx.translate(entity.position.x, entity.position.y);
  ctx.rotate(entity.rotation * 0.4);

  ctx.fillStyle = `rgba(255, 80, 50, ${0.14 + pulse * 0.14})`;
  ctx.beginPath();
  ctx.arc(0, 0, entity.radius * (1.18 + pulse * 0.08), 0, Math.PI * 2);
  ctx.fill();

  const gradient = ctx.createRadialGradient(-entity.radius * 0.35, -entity.radius * 0.45, 2, 0, 0, entity.radius);
  gradient.addColorStop(0, "#59606f");
  gradient.addColorStop(0.6, "#1e2330");
  gradient.addColorStop(1, "#05070d");

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(0, entity.radius * 0.08, entity.radius * 0.82, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#f6f0d5";
  ctx.beginPath();
  ctx.arc(-entity.radius * 0.26, -entity.radius * 0.25, entity.radius * 0.16, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#26211d";
  ctx.lineWidth = Math.max(4, entity.radius * 0.13);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(entity.radius * 0.35, -entity.radius * 0.55);
  ctx.quadraticCurveTo(entity.radius * 0.82, -entity.radius * 1.05, entity.radius * 0.48, -entity.radius * 1.22);
  ctx.stroke();

  ctx.fillStyle = "#ffcc36";
  drawStar(ctx, entity.radius * 0.52, -entity.radius * 1.26, entity.radius * (0.14 + pulse * 0.05), 6);

  ctx.restore();
}

function drawApple(ctx: CanvasRenderingContext2D, radius: number, palette: FruitPalette) {
  ctx.fillStyle = palette.body;
  ctx.beginPath();
  ctx.ellipse(-radius * 0.18, radius * 0.1, radius * 0.58, radius * 0.72, -0.08, 0, Math.PI * 2);
  ctx.ellipse(radius * 0.18, radius * 0.1, radius * 0.58, radius * 0.72, 0.08, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = palette.accent;
  ctx.beginPath();
  ctx.ellipse(-radius * 0.24, -radius * 0.18, radius * 0.16, radius * 0.24, 0.7, 0, Math.PI * 2);
  ctx.fill();

  drawStemAndLeaf(ctx, radius);
}

function drawBanana(ctx: CanvasRenderingContext2D, radius: number, palette: FruitPalette) {
  ctx.lineCap = "round";
  ctx.strokeStyle = palette.dark;
  ctx.lineWidth = radius * 0.62;
  ctx.beginPath();
  ctx.moveTo(-radius * 0.62, -radius * 0.18);
  ctx.quadraticCurveTo(-radius * 0.05, radius * 0.85, radius * 0.72, -radius * 0.18);
  ctx.stroke();

  ctx.strokeStyle = palette.body;
  ctx.lineWidth = radius * 0.5;
  ctx.beginPath();
  ctx.moveTo(-radius * 0.62, -radius * 0.18);
  ctx.quadraticCurveTo(-radius * 0.05, radius * 0.72, radius * 0.72, -radius * 0.18);
  ctx.stroke();

  ctx.strokeStyle = palette.accent;
  ctx.lineWidth = radius * 0.12;
  ctx.beginPath();
  ctx.moveTo(-radius * 0.28, radius * 0.08);
  ctx.quadraticCurveTo(radius * 0.06, radius * 0.44, radius * 0.46, radius * 0.02);
  ctx.stroke();
}

function drawOrange(ctx: CanvasRenderingContext2D, radius: number, palette: FruitPalette) {
  const gradient = ctx.createRadialGradient(-radius * 0.3, -radius * 0.35, 2, 0, 0, radius);
  gradient.addColorStop(0, palette.accent);
  gradient.addColorStop(0.6, palette.body);
  gradient.addColorStop(1, palette.dark);

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.82, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
  for (let i = 0; i < 14; i += 1) {
    const angle = (i / 14) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(Math.cos(angle) * radius * 0.45, Math.sin(angle) * radius * 0.45, radius * 0.035, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawWatermelon(ctx: CanvasRenderingContext2D, radius: number, palette: FruitPalette) {
  ctx.fillStyle = palette.body;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.88, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#d7ff89";
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.7, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = palette.accent;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.58, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = palette.seed;
  for (let i = 0; i < 6; i += 1) {
    const angle = -0.9 + i * 0.36;
    ctx.beginPath();
    ctx.ellipse(Math.cos(angle) * radius * 0.28, Math.sin(angle) * radius * 0.28, radius * 0.045, radius * 0.09, angle, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawStrawberry(ctx: CanvasRenderingContext2D, radius: number, palette: FruitPalette) {
  ctx.fillStyle = palette.body;
  ctx.beginPath();
  ctx.moveTo(0, radius * 0.85);
  ctx.bezierCurveTo(-radius * 0.85, radius * 0.25, -radius * 0.68, -radius * 0.68, 0, -radius * 0.42);
  ctx.bezierCurveTo(radius * 0.68, -radius * 0.68, radius * 0.85, radius * 0.25, 0, radius * 0.85);
  ctx.fill();

  ctx.fillStyle = palette.seed;
  for (let row = 0; row < 4; row += 1) {
    for (let col = 0; col < 3; col += 1) {
      const x = (col - 1) * radius * 0.23 + (row % 2) * radius * 0.08;
      const y = -radius * 0.16 + row * radius * 0.22;
      ctx.beginPath();
      ctx.ellipse(x, y, radius * 0.035, radius * 0.07, 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.fillStyle = "#29a34b";
  for (let i = -2; i <= 2; i += 1) {
    ctx.beginPath();
    ctx.ellipse(i * radius * 0.12, -radius * 0.46, radius * 0.08, radius * 0.22, i * 0.35, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawGrapes(ctx: CanvasRenderingContext2D, radius: number, palette: FruitPalette) {
  const grapeRadius = radius * 0.28;
  const positions: Vec2[] = [
    { x: -0.28, y: -0.24 },
    { x: 0.05, y: -0.3 },
    { x: 0.36, y: -0.08 },
    { x: -0.12, y: 0.08 },
    { x: 0.22, y: 0.22 },
    { x: -0.02, y: 0.5 }
  ];

  for (const point of positions) {
    const gradient = ctx.createRadialGradient(
      point.x * radius - grapeRadius * 0.35,
      point.y * radius - grapeRadius * 0.35,
      1,
      point.x * radius,
      point.y * radius,
      grapeRadius
    );
    gradient.addColorStop(0, palette.accent);
    gradient.addColorStop(0.7, palette.body);
    gradient.addColorStop(1, palette.dark);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(point.x * radius, point.y * radius, grapeRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  drawStemAndLeaf(ctx, radius * 0.8);
}

function drawStemAndLeaf(ctx: CanvasRenderingContext2D, radius: number) {
  ctx.strokeStyle = "#6f4518";
  ctx.lineWidth = radius * 0.1;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, -radius * 0.48);
  ctx.lineTo(radius * 0.08, -radius * 0.78);
  ctx.stroke();

  ctx.fillStyle = "#38a852";
  ctx.beginPath();
  ctx.ellipse(radius * 0.26, -radius * 0.68, radius * 0.24, radius * 0.11, -0.45, 0, Math.PI * 2);
  ctx.fill();
}

function drawGlow(ctx: CanvasRenderingContext2D, radius: number, color: string, alpha: number) {
  const gradient = ctx.createRadialGradient(0, 0, radius * 0.4, 0, 0, radius * 1.45);
  gradient.addColorStop(0, color === "#ffe66c" ? `rgba(255, 230, 108, ${alpha})` : color);
  gradient.addColorStop(1, "rgba(255, 216, 61, 0)");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 1.45, 0, Math.PI * 2);
  ctx.fill();
}

function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, points: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  for (let i = 0; i < points * 2; i += 1) {
    const r = i % 2 === 0 ? radius : radius * 0.45;
    const angle = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const px = Math.cos(angle) * r;
    const py = Math.sin(angle) * r;
    if (i === 0) {
      ctx.moveTo(px, py);
    } else {
      ctx.lineTo(px, py);
    }
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
