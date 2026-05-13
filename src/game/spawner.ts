import { FRUIT_KINDS } from "./constants";
import { getBombChance, getGoldenChance, getRareChance, getSpeedMultiplier } from "./difficulty";
import type { FruitKind } from "./entities";
import type { FruitRarity, TargetEntity } from "./types";
import { pickOne, randomBetween, type Vec2 } from "../utils/math";

let nextEntityId = 1;

export function createTarget(width: number, height: number, difficulty: number): TargetEntity {
  const bombChance = getBombChance(difficulty);

  if (Math.random() < bombChance) {
    return createBomb(width, height, difficulty);
  }

  return createFruit(width, height, difficulty);
}

function createFruit(width: number, height: number, difficulty: number): TargetEntity {
  const kind = pickOne(FRUIT_KINDS) as FruitKind;
  const rarity = rollRarity(difficulty);
  const radius = rarity === "golden" ? randomBetween(30, 40) : randomBetween(28, 48);
  const { position, velocity } = makeTravelPath(width, height, difficulty, radius);

  return {
    id: nextEntityId++,
    type: "fruit",
    kind,
    rarity,
    position,
    velocity,
    radius,
    rotation: randomBetween(0, Math.PI * 2),
    spin: randomBetween(-1.7, 1.7),
    age: 0,
    ttl: 9,
    wobbleSeed: randomBetween(0, Math.PI * 2)
  };
}

function createBomb(width: number, height: number, difficulty: number): TargetEntity {
  const radius = randomBetween(30, 46);
  const { position, velocity } = makeTravelPath(width, height, difficulty, radius);

  return {
    id: nextEntityId++,
    type: "bomb",
    position,
    velocity: { x: velocity.x * 0.95, y: velocity.y * 0.95 },
    radius,
    rotation: randomBetween(0, Math.PI * 2),
    spin: randomBetween(-1.2, 1.2),
    age: 0,
    ttl: 9,
    wobbleSeed: randomBetween(0, Math.PI * 2)
  };
}

function rollRarity(difficulty: number): FruitRarity {
  if (Math.random() < getGoldenChance(difficulty)) {
    return "golden";
  }

  if (Math.random() < getRareChance(difficulty)) {
    return "rare";
  }

  return "normal";
}

function makeTravelPath(width: number, height: number, difficulty: number, radius: number) {
  const side = Math.floor(Math.random() * 4);
  const margin = radius + 36;
  let position: Vec2;

  if (side === 0) {
    position = { x: -margin, y: randomBetween(height * 0.16, height * 0.84) };
  } else if (side === 1) {
    position = { x: width + margin, y: randomBetween(height * 0.16, height * 0.84) };
  } else if (side === 2) {
    position = { x: randomBetween(width * 0.1, width * 0.9), y: -margin };
  } else {
    position = { x: randomBetween(width * 0.1, width * 0.9), y: height + margin };
  }

  const target = {
    x: randomBetween(width * 0.14, width * 0.86),
    y: randomBetween(height * 0.16, height * 0.82)
  };

  const dx = target.x - position.x;
  const dy = target.y - position.y;
  const length = Math.max(1, Math.hypot(dx, dy));
  const speed = randomBetween(135, 235) * getSpeedMultiplier(difficulty);

  return {
    position,
    velocity: {
      x: (dx / length) * speed,
      y: (dy / length) * speed
    }
  };
}
