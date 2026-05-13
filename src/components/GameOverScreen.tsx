import { Clipboard, Hand, Home, MousePointer2, RotateCcw, Trophy } from "lucide-react";
import { useMemo, useState } from "react";
import type { Leaderboard } from "../game/leaderboard";
import { sanitizePlayerName } from "../game/leaderboard";
import type { ControlMode, GameSnapshot } from "../game/types";

interface GameOverScreenProps {
  snapshot: GameSnapshot;
  highScore: number;
  leaderboard: Leaderboard;
  onSaveScore: (name: string, snapshot: GameSnapshot) => void;
  onRestart: () => void;
  onHome: () => void;
}

export function GameOverScreen({
  snapshot,
  highScore,
  leaderboard,
  onSaveScore,
  onRestart,
  onHome
}: GameOverScreenProps) {
  const [playerName, setPlayerName] = useState("");
  const [saved, setSaved] = useState(false);
  const modeLabel = snapshot.controlMode === "hand" ? "Hand Gesture" : "Mouse";
  const cleanedName = useMemo(() => sanitizePlayerName(playerName), [playerName]);

  const share = async () => {
    const text = `I scored ${snapshot.score.toLocaleString()} in FruitShot CV. Shoot fruits, avoid bombs, and aim with your hand.`;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      window.prompt("Share your score:", text);
    }
  };

  const saveScore = () => {
    if (saved) {
      return;
    }

    onSaveScore(cleanedName, snapshot);
    setSaved(true);
  };

  return (
    <section className="game-over" role="dialog" aria-labelledby="game-over-title">
      <p className="eyebrow">Game Over</p>
      <h2 id="game-over-title">{snapshot.hearts <= 0 ? "The bombs got you." : "Time is up."}</h2>
      <div className="final-score">{snapshot.score.toLocaleString()}</div>
      <p className="final-sub">
        High score {highScore.toLocaleString()} | Sector {modeLabel}
      </p>

      <div className="result-grid">
        <div>
          <span>Fruit hits</span>
          <strong>{snapshot.fruitsHit}</strong>
        </div>
        <div>
          <span>Bombs</span>
          <strong>{snapshot.bombsHit}</strong>
        </div>
        <div>
          <span>Misses</span>
          <strong>{snapshot.misses}</strong>
        </div>
        <div>
          <span>Best combo</span>
          <strong>x{snapshot.comboMultiplier}</strong>
        </div>
      </div>

      <div className="save-score-panel">
        <div className="save-score-copy">
          <Trophy size={22} />
          <div>
            <strong>{saved ? "Score saved!" : "Save your score?"}</strong>
            <span>{saved ? `${cleanedName} entered the ${modeLabel} leaderboard.` : "Name is optional. You can skip anytime."}</span>
          </div>
        </div>

        {!saved ? (
          <div className="save-score-form">
            <input
              type="text"
              value={playerName}
              maxLength={18}
              placeholder="Your name"
              aria-label="Player name"
              onChange={(event) => setPlayerName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  saveScore();
                }
              }}
            />
            <button className="primary-button compact" type="button" onClick={saveScore}>
              Save
            </button>
          </div>
        ) : null}
      </div>

      <LeaderboardBoard leaderboard={leaderboard} currentMode={snapshot.controlMode} />

      <div className="game-over-actions">
        <button className="primary-button" type="button" onClick={onRestart}>
          <RotateCcw size={20} />
          Restart
        </button>
        <button className="secondary-button" type="button" onClick={share}>
          <Clipboard size={20} />
          Share score
        </button>
        {!saved ? (
          <button className="secondary-button" type="button" onClick={onHome}>
            Skip & Home
          </button>
        ) : null}
        <button className="icon-button large" type="button" onClick={onHome} aria-label="Back to start">
          <Home size={22} />
        </button>
      </div>
    </section>
  );
}

interface LeaderboardBoardProps {
  leaderboard: Leaderboard;
  currentMode: ControlMode;
}

function LeaderboardBoard({ leaderboard, currentMode }: LeaderboardBoardProps) {
  return (
    <div className="leaderboard-board" aria-label="Leaderboard">
      <LeaderboardColumn mode="hand" active={currentMode === "hand"} entries={leaderboard.hand} />
      <LeaderboardColumn mode="mouse" active={currentMode === "mouse"} entries={leaderboard.mouse} />
    </div>
  );
}

interface LeaderboardColumnProps {
  mode: ControlMode;
  active: boolean;
  entries: Leaderboard[ControlMode];
}

function LeaderboardColumn({ mode, active, entries }: LeaderboardColumnProps) {
  const title = mode === "hand" ? "Hand Gesture" : "Mouse";
  const Icon = mode === "hand" ? Hand : MousePointer2;

  return (
    <section className={`leaderboard-column ${active ? "is-active" : ""}`}>
      <h3>
        <Icon size={18} />
        {title}
      </h3>
      {entries.length > 0 ? (
        <ol>
          {entries.slice(0, 5).map((entry, index) => (
            <li key={entry.id}>
              <span className="rank">#{index + 1}</span>
              <span className="player">{entry.name}</span>
              <strong>{entry.score.toLocaleString()}</strong>
            </li>
          ))}
        </ol>
      ) : (
        <p className="empty-leaderboard">No scores yet</p>
      )}
    </section>
  );
}
