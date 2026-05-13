import { useEffect, useRef } from "react";

export function useAnimationFrame(callback: (time: number, delta: number) => void, active = true) {
  const callbackRef = useRef(callback);
  const lastTimeRef = useRef<number | null>(null);

  callbackRef.current = callback;

  useEffect(() => {
    if (!active) {
      return;
    }

    let frameId = 0;

    const tick = (time: number) => {
      const lastTime = lastTimeRef.current ?? time;
      const delta = Math.min(0.05, (time - lastTime) / 1000);
      lastTimeRef.current = time;
      callbackRef.current(time, delta);
      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frameId);
      lastTimeRef.current = null;
    };
  }, [active]);
}
