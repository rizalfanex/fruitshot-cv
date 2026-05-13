import type { ControlMode, GameSnapshot } from "./types";

export const LEADERBOARD_STORAGE_KEY = "fruitshot-cv-leaderboard";
export const MAX_LEADERBOARD_ENTRIES_PER_MODE = 10;

export interface LeaderboardEntry {
  id: string;
  name: string;
  score: number;
  mode: ControlMode;
  fruitsHit: number;
  bombsHit: number;
  misses: number;
  comboMultiplier: number;
  createdAt: string;
}

export type Leaderboard = Record<ControlMode, LeaderboardEntry[]>;

export const EMPTY_LEADERBOARD: Leaderboard = {
  hand: [],
  mouse: []
};

export function createLeaderboardEntry(name: string, snapshot: GameSnapshot): LeaderboardEntry {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: sanitizePlayerName(name),
    score: snapshot.score,
    mode: snapshot.controlMode,
    fruitsHit: snapshot.fruitsHit,
    bombsHit: snapshot.bombsHit,
    misses: snapshot.misses,
    comboMultiplier: snapshot.comboMultiplier,
    createdAt: new Date().toISOString()
  };
}

export function addLeaderboardEntry(leaderboard: Leaderboard, entry: LeaderboardEntry): Leaderboard {
  return {
    hand: sortEntries(entry.mode === "hand" ? [...leaderboard.hand, entry] : leaderboard.hand),
    mouse: sortEntries(entry.mode === "mouse" ? [...leaderboard.mouse, entry] : leaderboard.mouse)
  };
}

export function sanitizePlayerName(name: string): string {
  const clean = name.trim().replace(/\s+/g, " ").slice(0, 18);
  return clean || "Player";
}

function sortEntries(entries: LeaderboardEntry[]): LeaderboardEntry[] {
  return [...entries]
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    })
    .slice(0, MAX_LEADERBOARD_ENTRIES_PER_MODE);
}
