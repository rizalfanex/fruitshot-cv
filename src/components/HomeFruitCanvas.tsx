import { useEffect, useRef } from "react";
import { drawTarget } from "../game/entities";
import type { FruitKind } from "../game/entities";
import type { FruitRarity, TargetEntity } from "../game/types";

interface HomeFruit {
  kind: FruitKind;
  rarity: FruitRarity;
  x: number;
  y: number;
  radius: number;
  delay: number;
  drift: number;
}

const HOME_FRUITS: HomeFruit[] = [
  { kind: "apple", rarity: "normal", x: 0.09, y: 0.24, radius: 42, delay: 0.1, drift: 18 },
  { kind: "banana", rarity: "normal", x: 0.89, y: 0.22, radius: 46, delay: 1.4, drift: 22 },
  { kind: "orange", rarity: "rare", x: 0.17, y: 0.78, radius: 38, delay: 2.6, drift: 17 },
  { kind: "watermelon", rarity: "normal", x: 0.84, y: 0.77, radius: 44, delay: 0.8, drift: 19 },
  { kind: "strawberry", rarity: "normal", x: 0.28, y: 0.12, radius: 34, delay: 3.2, drift: 16 },
  { kind: "grape", rarity: "golden", x: 0.72, y: 0.12, radius: 36, delay: 4.1, drift: 20 }
];

export function HomeFruitCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    let frameId = 0;

    const draw = (time: number) => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(320, rect.width);
      const height = Math.max(320, rect.height);

      if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        return;
      }

      const seconds = time / 1000;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      for (const fruit of HOME_FRUITS) {
        const bob = Math.sin(seconds * 1.6 + fruit.delay) * fruit.drift;
        const sway = Math.cos(seconds * 1.2 + fruit.delay) * fruit.drift * 0.35;
        drawTarget(ctx, makeFruitEntity(fruit, width, height, seconds, bob, sway), seconds);
      }

      frameId = requestAnimationFrame(draw);
    };

    frameId = requestAnimationFrame(draw);

    return () => cancelAnimationFrame(frameId);
  }, []);

  return <canvas ref={canvasRef} className="home-fruit-canvas" aria-hidden="true" />;
}

function makeFruitEntity(
  fruit: HomeFruit,
  width: number,
  height: number,
  time: number,
  bob: number,
  sway: number
): TargetEntity {
  return {
    id: 0,
    type: "fruit",
    kind: fruit.kind,
    rarity: fruit.rarity,
    position: {
      x: fruit.x * width + sway,
      y: fruit.y * height + bob
    },
    velocity: { x: 0, y: 0 },
    radius: fruit.radius,
    rotation: Math.sin(time + fruit.delay) * 0.22,
    spin: 0,
    age: time,
    ttl: 999,
    wobbleSeed: fruit.delay
  };
}
