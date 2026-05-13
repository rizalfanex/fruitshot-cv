type SoundKind = "shoot" | "fruit" | "bomb" | "miss" | "combo" | "start";

export class GameAudio {
  private context: AudioContext | null = null;
  private enabled = true;
  private musicTimer: number | null = null;
  private musicStep = 0;
  private musicGain: GainNode | null = null;

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) {
      this.stopMusic();
    }
  }

  get isEnabled() {
    return this.enabled;
  }

  async resume() {
    if (!this.enabled) {
      return;
    }

    const AudioCtor = window.AudioContext ?? window.webkitAudioContext;
    if (!AudioCtor) {
      return;
    }

    this.context ??= new AudioCtor();
    if (this.context.state === "suspended") {
      await this.context.resume();
    }
  }

  play(kind: SoundKind) {
    if (!this.enabled) {
      return;
    }

    void this.resume().then(() => {
      if (!this.context) {
        return;
      }

      const now = this.context.currentTime;

      switch (kind) {
        case "shoot":
          this.tone(now, 640, 0.045, "square", 0.055);
          this.tone(now + 0.025, 980, 0.05, "triangle", 0.035);
          break;
        case "fruit":
          this.tone(now, 520, 0.055, "sine", 0.065);
          this.tone(now + 0.045, 840, 0.08, "triangle", 0.06);
          break;
        case "bomb":
          this.noise(now, 0.24, 0.22);
          this.tone(now, 96, 0.24, "sawtooth", 0.12);
          break;
        case "miss":
          this.tone(now, 170, 0.09, "sine", 0.045);
          break;
        case "combo":
          this.tone(now, 780, 0.07, "triangle", 0.05);
          this.tone(now + 0.055, 1170, 0.08, "triangle", 0.045);
          break;
        case "start":
          this.tone(now, 392, 0.08, "triangle", 0.05);
          this.tone(now + 0.08, 523, 0.1, "triangle", 0.05);
          break;
      }
    });
  }

  startMusic() {
    if (!this.enabled || this.musicTimer !== null) {
      return;
    }

    void this.resume().then(() => {
      if (!this.context || !this.enabled || this.musicTimer !== null) {
        return;
      }

      this.musicGain = this.context.createGain();
      this.musicGain.gain.setValueAtTime(0.0001, this.context.currentTime);
      this.musicGain.gain.exponentialRampToValueAtTime(0.52, this.context.currentTime + 0.8);
      this.musicGain.connect(this.context.destination);
      this.musicStep = 0;
      this.scheduleMusicBar();
      this.musicTimer = window.setInterval(() => this.scheduleMusicBar(), 1800);
    });
  }

  stopMusic() {
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }

    if (this.musicGain && this.context) {
      const now = this.context.currentTime;
      this.musicGain.gain.cancelScheduledValues(now);
      this.musicGain.gain.setValueAtTime(Math.max(0.0001, this.musicGain.gain.value), now);
      this.musicGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
      const gain = this.musicGain;
      window.setTimeout(() => gain.disconnect(), 360);
    }

    this.musicGain = null;
  }

  private tone(start: number, frequency: number, duration: number, type: OscillatorType, volume: number) {
    if (!this.context) {
      return;
    }

    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(this.context.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }

  private musicTone(start: number, frequency: number, duration: number, type: OscillatorType, volume: number) {
    if (!this.context || !this.musicGain) {
      return;
    }

    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    const filter = this.context.createBiquadFilter();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(type === "square" ? 1450 : 2200, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.04);
  }

  private scheduleMusicBar() {
    if (!this.context || !this.musicGain || !this.enabled) {
      return;
    }

    const now = this.context.currentTime + 0.04;
    const beat = 0.225;
    const melody = [523.25, 659.25, 783.99, 659.25, 587.33, 739.99, 880, 739.99];
    const bass = [130.81, 130.81, 174.61, 174.61, 146.83, 146.83, 196, 196];

    for (let i = 0; i < 8; i += 1) {
      const index = (this.musicStep + i) % melody.length;
      const start = now + i * beat;
      this.musicTone(start, melody[index], beat * 0.58, "triangle", 0.16);

      if (i % 2 === 0) {
        this.musicTone(start, bass[index], beat * 1.35, "square", 0.09);
      }

      if (i === 2 || i === 6) {
        this.musicTone(start + beat * 0.5, melody[index] * 1.5, beat * 0.36, "sine", 0.075);
      }
    }

    this.musicStep = (this.musicStep + 8) % melody.length;
  }

  private noise(start: number, duration: number, volume: number) {
    if (!this.context) {
      return;
    }

    const bufferSize = Math.floor(this.context.sampleRate * duration);
    const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }

    const source = this.context.createBufferSource();
    const gain = this.context.createGain();
    const filter = this.context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(680, start);
    source.buffer = buffer;
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.context.destination);
    source.start(start);
  }
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
