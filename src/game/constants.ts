export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

export const GAME_CONFIG = {
  durationSeconds: 60,
  startingHearts: 3,
  shotCooldownMs: 320,
  initialSpawnInterval: 0.92,
  minimumSpawnInterval: 0.36,
  maxComboMultiplier: 5,
  highScoreKey: "fruitshot-cv-high-score"
} as const;

export const FRUIT_KINDS = [
  "apple",
  "banana",
  "orange",
  "watermelon",
  "strawberry",
  "grape"
] as const;

export const FRUIT_POINTS = {
  normal: 10,
  rare: 25,
  golden: 50
} as const;

export const BOMB_SCORE_PENALTY = 30;
