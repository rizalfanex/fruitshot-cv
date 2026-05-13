import { Info, X } from "lucide-react";

interface AboutGameProps {
  open: boolean;
  onClose: () => void;
}

export function AboutGame({ open, onClose }: AboutGameProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="about-modal" role="dialog" aria-modal="true" aria-labelledby="about-title" onMouseDown={(event) => event.stopPropagation()}>
        <button className="icon-button modal-close" type="button" onClick={onClose} aria-label="Close">
          <X size={20} />
        </button>
        <div className="about-badge">
          <Info size={26} />
        </div>
        <p className="eyebrow">About Game</p>
        <h2 id="about-title">FruitShot CV</h2>
        <p className="about-maker">Made by Mochamad Rizal Fauzan</p>
        <p className="about-text">
          A playful browser game where your hand becomes the controller. Shoot fruits, dodge bombs, and chase the best score.
        </p>
      </section>
    </div>
  );
}
