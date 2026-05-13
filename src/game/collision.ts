import { distance, type Vec2 } from "../utils/math";
import type { TargetEntity } from "./types";

export function findHitTarget(entities: TargetEntity[], crosshair: Vec2): TargetEntity | null {
  let best: TargetEntity | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const entity of entities) {
    const hitDistance = distance(entity.position, crosshair);
    if (hitDistance <= entity.radius * 1.06 && hitDistance < bestDistance) {
      best = entity;
      bestDistance = hitDistance;
    }
  }

  return best;
}
