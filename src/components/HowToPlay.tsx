import { RotateCcw, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { drawTarget } from "../game/entities";
import {
  createExplosion,
  createFruitSplash,
  createPopup,
  drawParticles,
  drawPopups,
  updateParticles,
  updatePopups
} from "../game/particles";
import type { FruitRarity, Particle, PopupText, TargetEntity } from "../game/types";

interface HowToPlayProps {
  open: boolean;
  onClose: () => void;
}

export function HowToPlay({ open, onClose }: HowToPlayProps) {
  const [replayKey, setReplayKey] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    let frameId = 0;
    let startTime = performance.now();
    let lastTime = startTime;
    let lastLoop = -1;
    let fruitHit = false;
    let bombHit = false;
    let particles: Particle[] = [];
    let popups: PopupText[] = [];

    const draw = (time: number) => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(320, rect.width);
      const height = Math.max(190, rect.height);

      if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        return;
      }

      const loopDuration = 5.2;
      const elapsed = (time - startTime) / 1000;
      const loop = Math.floor(elapsed / loopDuration);
      const localTime = elapsed % loopDuration;
      const dt = Math.min(0.05, (time - lastTime) / 1000);
      lastTime = time;

      if (loop !== lastLoop) {
        lastLoop = loop;
        fruitHit = false;
        bombHit = false;
        particles = [];
        popups = [];
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawDemoBackground(ctx, width, height, localTime);

      const fruitPosition = { x: width * 0.62, y: height * 0.42 };
      const orangePosition = { x: width * 0.76, y: height * 0.25 };
      const bombPosition = { x: width * 0.84, y: height * 0.68 };
      const aimPosition =
        localTime < 2.5
          ? interpolatePoint({ x: width * 0.26, y: height * 0.68 }, fruitPosition, Math.min(1, localTime / 1.45))
          : interpolatePoint(fruitPosition, bombPosition, Math.min(1, (localTime - 2.5) / 1.25));

      if (localTime >= 1.62 && !fruitHit) {
        fruitHit = true;
        particles.push(...createFruitSplash("apple", "normal", fruitPosition, 20));
        popups.push(createPopup("+10", fruitPosition, "#0aa36c", 30));
      }

      if (localTime >= 3.8 && !bombHit) {
        bombHit = true;
        particles.push(...createExplosion(bombPosition, 28));
        popups.push(createPopup("-30", bombPosition, "#ff335f", 30));
      }

      if (!fruitHit) {
        drawTarget(ctx, demoTarget("fruit", fruitPosition, 36, localTime, "apple", "normal"), localTime);
      }
      drawTarget(ctx, demoTarget("fruit", orangePosition, 31, localTime, "orange", "rare"), localTime);
      if (!bombHit) {
        drawTarget(ctx, demoTarget("bomb", bombPosition, 36, localTime), localTime);
      }

      drawDemoHand(ctx, aimPosition, localTime);
      drawDemoCrosshair(ctx, aimPosition);
      drawDemoShot(ctx, aimPosition, fruitPosition, localTime, 1.62);
      drawDemoShot(ctx, aimPosition, bombPosition, localTime, 3.8);

      particles = updateParticles(particles, dt);
      popups = updatePopups(popups, dt);
      drawParticles(ctx, particles);
      drawPopups(ctx, popups);

      frameId = requestAnimationFrame(draw);
    };

    startTime = performance.now();
    lastTime = startTime;
    frameId = requestAnimationFrame(draw);

    return () => cancelAnimationFrame(frameId);
  }, [open, replayKey]);

  if (!open) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="how-to-play" role="dialog" aria-modal="true" aria-labelledby="how-title" onMouseDown={(event) => event.stopPropagation()}>
        <button className="icon-button modal-close" type="button" onClick={onClose} aria-label="Close">
          <X size={20} />
        </button>
        <p className="eyebrow">Classic Mode</p>
        <h2 id="how-title">How to play</h2>

        <div className="play-demo" key={replayKey} aria-label="Animated gameplay demo">
          <canvas ref={canvasRef} className="how-demo-canvas" aria-label="FruitShot gameplay animation" />
          <button className="demo-replay" type="button" onClick={() => setReplayKey((value) => value + 1)}>
            <RotateCcw size={17} />
            Replay demo
          </button>
        </div>

        <div className="how-steps">
          <div className="how-step">
            <span className="step-number">1</span>
            <strong>Aim</strong>
            <p>Move your hand. The crosshair follows the stable palm/knuckle center.</p>
          </div>
          <div className="how-step">
            <span className="step-number">2</span>
            <strong>Shoot fruit</strong>
            <p>Clench your hand or pull the pistol trigger to score points.</p>
          </div>
          <div className="how-step">
            <span className="step-number">3</span>
            <strong>Avoid bombs</strong>
            <p>Bombs explode, remove 1 heart, subtract score, and reset combo.</p>
          </div>
          <div className="how-step">
            <span className="step-number">4</span>
            <strong>Build combo</strong>
            <p>Every 5 fruit hits increases the multiplier. Misses reset it.</p>
          </div>
        </div>
      </section>
    </div>
  );
}

function demoTarget(
  type: TargetEntity["type"],
  position: TargetEntity["position"],
  radius: number,
  age: number,
  kind?: TargetEntity["kind"],
  rarity?: FruitRarity
): TargetEntity {
  return {
    id: 1,
    type,
    kind,
    rarity,
    position,
    velocity: { x: 0, y: 0 },
    radius,
    rotation: age * 0.8,
    spin: 0,
    age,
    ttl: 99,
    wobbleSeed: type === "bomb" ? 2 : 1
  };
}

function drawDemoBackground(ctx: CanvasRenderingContext2D, width: number, height: number, time: number) {
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#fff3b8");
  gradient.addColorStop(0.46, "#8ee7f2");
  gradient.addColorStop(1, "#7bd68b");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.globalAlpha = 0.26;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 3;
  const gap = 74;
  const offset = (time * 24) % gap;
  for (let x = -width; x < width * 2; x += gap) {
    ctx.beginPath();
    ctx.moveTo(x + offset, height + 24);
    ctx.lineTo(x + offset + width * 0.7, -24);
    ctx.stroke();
  }
  ctx.restore();

  ctx.fillStyle = "rgba(255, 255, 255, 0.32)";
  ctx.fillRect(0, height - 42, width, 42);
}

function drawDemoHand(ctx: CanvasRenderingContext2D, point: { x: number; y: number }, time: number) {
  const clenched = time > 1.46 && time < 1.9;
  ctx.save();
  ctx.translate(point.x - 112, point.y + 50);
  ctx.rotate(-0.18);
  ctx.fillStyle = "#ffd4a3";
  ctx.strokeStyle = "rgba(133, 76, 37, 0.18)";
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.roundRect(-26, -30, 68, 58, 18);
  ctx.fill();
  ctx.stroke();

  const fingerHeight = clenched ? 24 : 44;
  for (let i = 0; i < 4; i += 1) {
    ctx.beginPath();
    ctx.roundRect(-20 + i * 17, -30 - fingerHeight + Math.abs(i - 1.5) * 4, 15, fingerHeight + 14, 9);
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
}

function drawDemoCrosshair(ctx: CanvasRenderingContext2D, point: { x: number; y: number }) {
  ctx.save();
  ctx.translate(point.x, point.y);
  ctx.strokeStyle = "#ff335f";
  ctx.fillStyle = "#ff335f";
  ctx.lineWidth = 3.5;
  ctx.lineCap = "round";
  ctx.shadowColor = "rgba(255, 51, 95, 0.35)";
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.arc(0, 0, 23, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-40, 0);
  ctx.lineTo(-18, 0);
  ctx.moveTo(18, 0);
  ctx.lineTo(40, 0);
  ctx.moveTo(0, -40);
  ctx.lineTo(0, -18);
  ctx.moveTo(0, 18);
  ctx.lineTo(0, 40);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawDemoShot(
  ctx: CanvasRenderingContext2D,
  from: { x: number; y: number },
  to: { x: number; y: number },
  time: number,
  hitTime: number
) {
  const flash = 1 - Math.min(1, Math.abs(time - hitTime) / 0.12);
  if (flash <= 0) {
    return;
  }

  ctx.save();
  ctx.globalAlpha = flash;
  ctx.strokeStyle = "#fff375";
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.shadowColor = "#fff375";
  ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
  ctx.restore();
}

function interpolatePoint(from: { x: number; y: number }, to: { x: number; y: number }, t: number) {
  const clamped = Math.min(1, Math.max(0, t));
  return {
    x: from.x + (to.x - from.x) * clamped,
    y: from.y + (to.y - from.y) * clamped
  };
}
