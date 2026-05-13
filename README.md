# FruitShot CV

**Shoot the fruits. Avoid the bombs. Control everything with your hand.**

FruitShot CV is a fully client-side browser arcade game built with React, Vite, TypeScript, Canvas, webcam input, and MediaPipe Tasks Vision Hand Landmarker. Move your hand to aim, shoot with a pistol trigger or clenched fist, and chase a high score before the 60-second timer runs out.

## Demo

Live demo: _add your Vercel or GitHub Pages URL here_

## Screenshot

Screenshot: _add a gameplay screenshot here_

## Features

- Browser-only computer vision game with no backend and no Python.
- MediaPipe Hand Landmarker detects 21 hand landmarks from webcam video.
- Pistol-hand aiming with trigger-style shooting.
- Mouse movement, mouse click, and Space fallback controls.
- Canvas-rendered fruit, bombs, particles, explosions, score popups, crosshair, and animated background.
- Classic Mode: 60 seconds, 3 hearts, combo multiplier, increasing difficulty.
- High score persisted in local browser storage.
- Debug mode with FPS, gesture confidence, trigger state, and landmark overlay.
- Web Audio API sound effects generated in the browser.
- Vercel-ready Vite build.

## Computer Vision Pipeline

1. The browser asks for webcam permission with `navigator.mediaDevices.getUserMedia`.
2. The webcam stream is attached to a hidden/live preview video element.
3. MediaPipe Tasks Vision initializes `HandLandmarker` in `VIDEO` mode.
4. Each animation frame samples the latest video frame with `detectForVideo`.
5. The first detected hand's 21 normalized landmarks are passed to the gesture detector.
6. The stable knuckle-center anchor maps to Canvas coordinates with mirrored x-axis movement.
7. Exponential smoothing keeps the crosshair stable.
8. A rule-based pistol pose and trigger rule decide when a hand shot should fire.

## Gesture Mapping

| Hand Gesture | Action |
|---|---|
| Hand / knuckle-center aiming | Move crosshair |
| Pistol hand pose | Enable pistol shooting mode |
| Trigger gesture | Shoot |
| Clenched fist | Shoot from the last stable aim point |
| No hand detected | Pause aiming / show warning |
| Mouse fallback | Aim and shoot for testing |

## Gameplay Rules

- Normal fruit: `+10`
- Rare fruit: `+25`
- Golden fruit: `+50`
- Combo multiplier increases every 5 successful fruit hits.
- Bomb hit: `-30` score, `-1` heart, explosion, screen shake, combo reset.
- Miss: combo reset.
- Game ends when the 60-second timer reaches 0 or all 3 hearts are gone.
- Difficulty ramps up by increasing spawn rate, target speed, and bomb probability.

## Tech Stack

- React + Vite
- TypeScript
- HTML Canvas
- MediaPipe Tasks Vision Hand Landmarker
- Browser webcam API
- Web Audio API
- Local storage

## Installation

```powershell
npm install
```

## Local Development

```powershell
npm run dev
```

Then open the URL Vite prints, usually:

```text
http://localhost:5173
```

For webcam access, use `localhost` or HTTPS. Most browsers block camera access on insecure origins.

## Build

```powershell
npm run build
```

Preview the production build:

```powershell
npm run preview
```

## Deploy To Vercel

1. Push this repository to GitHub.
2. Import the repo in Vercel.
3. Use the default Vite settings:
   - Build command: `npm run build`
   - Output directory: `dist`
4. Deploy.

The app is fully static and client-side, so no serverless functions or environment variables are required.

## Optional GitHub Pages

GitHub Pages works too. If deploying to a repository subpath, build with a matching Vite base:

```powershell
npm run build -- --base=/fruitshot-cv/
```

Then publish the `dist` folder with your preferred Pages workflow.

## Project Structure

```text
fruitshot-cv/
  package.json
  index.html
  vite.config.ts
  tsconfig.json
  README.md
  .gitignore
  src/
    main.tsx
    App.tsx
    styles/
      global.css
    components/
      GameCanvas.tsx
      WebcamView.tsx
      HUD.tsx
      StartScreen.tsx
      GameOverScreen.tsx
      HowToPlay.tsx
    cv/
      handTracker.ts
      gestureDetector.ts
      landmarkUtils.ts
    game/
      engine.ts
      entities.ts
      spawner.ts
      collision.ts
      scoring.ts
      difficulty.ts
      particles.ts
      audio.ts
      constants.ts
      types.ts
    hooks/
      useAnimationFrame.ts
      useLocalStorage.ts
      useWebcam.ts
    utils/
      math.ts
      clamp.ts
```

## Future Improvements

- Add extra modes such as Survival, Zen, and Daily Challenge.
- Add hand calibration and handedness-specific trigger tuning.
- Add mobile layout refinements for small landscape screens.
- Add optional offline model hosting by copying the MediaPipe `.task` model into `public/`.
- Add lightweight automated smoke tests.

## License

MIT. All fruit, bomb, UI, and effect visuals are generated with Canvas drawing code. No copyrighted image assets are included.
