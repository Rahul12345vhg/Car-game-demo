/**
 * Web Audio API synthesizer for realistic procedural car audio:
 * - Multi-oscillator engine rumble with dynamic RPM & harmonics
 * - Tire squeal / drift friction noise
 * - Brake hiss / disc squeak
 * - Collision impact crunch & metal deform thud
 * - Turn signal ticking
 * - Horn honk
 * - UI click & reward fanfares
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private isMusicMuted: boolean = false;
  private isEngineMuted: boolean = false;

  // Engine sound nodes
  private engineOsc1: OscillatorNode | null = null;
  private engineOsc2: OscillatorNode | null = null;
  private engineOscSub: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private isEngineRunning: boolean = false;

  // Tire squeal nodes
  private tireNoiseNode: AudioBufferSourceNode | null = null;
  private tireFilter: BiquadFilterNode | null = null;
  private tireGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  // Ambient city loop
  private ambientGain: GainNode | null = null;

  constructor() {
    // AudioContext will be initialized on first user interaction
  }

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.generateNoiseBuffer();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  private generateNoiseBuffer() {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buffer;
  }

  public setMuted(soundMuted: boolean, musicMuted: boolean, engineMuted: boolean) {
    this.isMuted = soundMuted;
    this.isMusicMuted = musicMuted;
    this.isEngineMuted = engineMuted;

    if (this.engineGain) {
      this.engineGain.gain.value = (this.isMuted || this.isEngineMuted) ? 0 : 0.18;
    }
    if (this.ambientGain) {
      this.ambientGain.gain.value = (this.isMuted || this.isMusicMuted) ? 0 : 0.08;
    }
  }

  public startEngine() {
    this.initContext();
    if (!this.ctx || this.isEngineRunning) return;

    try {
      // Create multi-oscillator engine synthesis for a rich exhaust purr
      this.engineOsc1 = this.ctx.createOscillator();
      this.engineOsc2 = this.ctx.createOscillator();
      this.engineOscSub = this.ctx.createOscillator();

      this.engineOsc1.type = 'sawtooth';
      this.engineOsc2.type = 'triangle';
      this.engineOscSub.type = 'sine';

      this.engineFilter = this.ctx.createBiquadFilter();
      this.engineFilter.type = 'lowpass';
      this.engineFilter.frequency.value = 350;

      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = (this.isMuted || this.isEngineMuted) ? 0 : 0.18;

      this.engineOsc1.connect(this.engineFilter);
      this.engineOsc2.connect(this.engineFilter);
      this.engineOscSub.connect(this.engineFilter);
      this.engineFilter.connect(this.engineGain);
      this.engineGain.connect(this.ctx.destination);

      this.engineOsc1.start();
      this.engineOsc2.start();
      this.engineOscSub.start();
      this.isEngineRunning = true;

      // Tire screech setup
      if (this.noiseBuffer) {
        const noiseNode = this.ctx.createBufferSource();
        noiseNode.buffer = this.noiseBuffer;
        noiseNode.loop = true;

        this.tireFilter = this.ctx.createBiquadFilter();
        this.tireFilter.type = 'bandpass';
        this.tireFilter.frequency.value = 1200;
        this.tireFilter.Q.value = 3.5;

        this.tireGain = this.ctx.createGain();
        this.tireGain.gain.value = 0;

        noiseNode.connect(this.tireFilter);
        this.tireFilter.connect(this.tireGain);
        this.tireGain.connect(this.ctx.destination);
        noiseNode.start();
        this.tireNoiseNode = noiseNode;
      }
    } catch {
      // Ignore audio start issues on autoplay restriction
    }
  }

  public updateEngineRPM(rpmNormalized: number, throttle: number, isDrifting: boolean = false, isBraking: boolean = false) {
    if (!this.ctx || !this.isEngineRunning) return;
    if (this.isMuted || this.isEngineMuted) {
      if (this.engineGain) this.engineGain.gain.value = 0;
      return;
    }

    const t = this.ctx.currentTime;
    const baseFreq = 42 + rpmNormalized * 140; // 42Hz idle to 182Hz redline

    if (this.engineOsc1 && this.engineOsc2 && this.engineOscSub && this.engineFilter && this.engineGain) {
      this.engineOsc1.frequency.setTargetAtTime(baseFreq, t, 0.05);
      this.engineOsc2.frequency.setTargetAtTime(baseFreq * 1.5, t, 0.05);
      this.engineOscSub.frequency.setTargetAtTime(baseFreq * 0.5, t, 0.05);

      const filterFreq = 300 + throttle * 600 + rpmNormalized * 500;
      this.engineFilter.frequency.setTargetAtTime(filterFreq, t, 0.08);

      const targetVol = 0.12 + throttle * 0.15 + (rpmNormalized > 0.85 ? 0.06 : 0);
      this.engineGain.gain.setTargetAtTime(targetVol, t, 0.06);
    }

    // Dynamic Tire squeal on drift or hard braking at speed
    if (this.tireGain && this.tireFilter) {
      if (isDrifting || (isBraking && rpmNormalized > 0.35)) {
        const squealVol = isDrifting ? 0.22 : 0.14;
        this.tireGain.gain.setTargetAtTime(squealVol, t, 0.04);
        this.tireFilter.frequency.setTargetAtTime(1000 + Math.random() * 400, t, 0.05);
      } else {
        this.tireGain.gain.setTargetAtTime(0, t, 0.08);
      }
    }
  }

  public stopEngine() {
    if (!this.isEngineRunning) return;
    try {
      if (this.engineOsc1) { this.engineOsc1.stop(); this.engineOsc1.disconnect(); }
      if (this.engineOsc2) { this.engineOsc2.stop(); this.engineOsc2.disconnect(); }
      if (this.engineOscSub) { this.engineOscSub.stop(); this.engineOscSub.disconnect(); }
      if (this.tireNoiseNode) { this.tireNoiseNode.stop(); this.tireNoiseNode.disconnect(); }
      this.isEngineRunning = false;
    } catch {
      this.isEngineRunning = false;
    }
  }

  // Sound Effects (Crash, Click, Coin, Honk, Fanfare, Indicator)
  public playCrash(intensity: number = 1.0) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    // Metal crunch noise + low thud
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.35);

    gain.gain.setValueAtTime(0.4 * Math.min(1.5, intensity), t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.4);

    // Noise burst for glass/metal shatter
    if (this.noiseBuffer) {
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1800;
      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.3 * intensity, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);
      noise.start(t);
      noise.stop(t + 0.3);
    }
  }

  public playHorn() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'triangle';
    osc2.type = 'sawtooth';
    osc1.frequency.value = 440; // A4
    osc2.frequency.value = 554.37; // C#5 - Classic dual-tone car horn

    gain.gain.setValueAtTime(0.22, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 0.45);
    osc2.stop(t + 0.45);
  }

  public playTurnIndicator() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1400, t);
    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.04);
  }

  public playGearShift() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(180, t + 0.08);

    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.08);
  }

  public playButtonClick() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.exponentialRampToValueAtTime(900, t + 0.06);

    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.06);
  }

  public playCoin() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(987.77, t); // B5
    osc.frequency.setValueAtTime(1318.51, t + 0.08); // E6

    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.3);
  }

  public playParkingBeep(frequencyHz: number = 800) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequencyHz, t);
    gain.gain.setValueAtTime(0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.07);
  }

  public playSuccess() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 triumphant chord
    notes.forEach((freq, idx) => {
      if (!this.ctx) return;
      const t = this.ctx.currentTime + idx * 0.09;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.45);
    });
  }

  public playFailure() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const notes = [349.23, 311.13, 277.18, 233.08]; // Descending sad horn
    notes.forEach((freq, idx) => {
      if (!this.ctx) return;
      const t = this.ctx.currentTime + idx * 0.12;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.35);
    });
  }
}

export const sound = new SoundEngine();
