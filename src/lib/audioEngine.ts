/**
 * Synapsis Bio-Cosmic Synthesizer
 * Uses Web Audio API to procedurally generate relaxing, high-quality audio
 * blending mechanical space hums, cosmic winds, organic forest rustles, and soft synth pads.
 * Zero external files needed. Full offline compatibility.
 */

class BioCosmicSynth {
  private ctx: AudioContext | null = null;
  private masterVolume: GainNode | null = null;
  private windVolume: GainNode | null = null;
  private padVolume: GainNode | null = null;
  private oscillators: { osc: OscillatorNode; gain: GainNode }[] = [];
  private windInterval: any = null;
  private padInterval: any = null;
  private isPlaying: boolean = false;
  private currentVolumeLevel: number = 0.3; // Default 30%

  constructor() {
    // Lazy initialisation on first play due to browser user-interaction rules
  }

  private initCtx() {
    if (this.ctx) return;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    
    this.ctx = new AudioContextClass();
    this.masterVolume = this.ctx.createGain();
    this.masterVolume.gain.setValueAtTime(this.currentVolumeLevel, this.ctx.currentTime);
    this.masterVolume.connect(this.ctx.destination);
    
    this.setupCosmicWind();
    this.setupCelestialPads();
  }

  private setupCosmicWind() {
    if (!this.ctx || !this.masterVolume) return;

    // Create custom noise generator for wind/rustle
    const bufferSize = 2 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const noiseNode = this.ctx.createBufferSource();
    noiseNode.buffer = noiseBuffer;
    noiseNode.loop = true;

    // Low-pass sweeping filter to make noise sound like cosmic wind or forest waves
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 1.2;
    filter.frequency.setValueAtTime(320, this.ctx.currentTime);

    this.windVolume = this.ctx.createGain();
    this.windVolume.gain.setValueAtTime(0.08, this.ctx.currentTime); // Soft background wind

    // Connections
    noiseNode.connect(filter);
    filter.connect(this.windVolume);
    this.windVolume.connect(this.masterVolume);
    
    noiseNode.start();

    // Dynamically modulate filter frequency periodically to simulate wind blows / ocean waves
    let filterSweepDir = 1;
    this.windInterval = setInterval(() => {
      if (!this.ctx || !this.isPlaying) return;
      const t = this.ctx.currentTime;
      // Synthesize elegant wave pattern
      const centerFreq = 280 + Math.sin(t * 0.15) * 120;
      filter.frequency.exponentialRampToValueAtTime(centerFreq, t + 4);
    }, 4000);
  }

  private setupCelestialPads() {
    if (!this.ctx || !this.masterVolume) return;

    this.padVolume = this.ctx.createGain();
    this.padVolume.gain.setValueAtTime(0.12, this.ctx.currentTime); // Soft celestial pad volume
    this.padVolume.connect(this.masterVolume);

    // Harmonic chord triads representing calming forest-galactic notes (Cmaj7, Fmaj7, G6, Am9)
    // Scale frequencies (Hz):
    // C3 (130.81), E3 (164.81), G3 (196.00), B3 (246.94)
    // F3 (174.61), A3 (220.00), C4 (261.63), E4 (329.63)
    // A2 (110.00), C3 (130.81), E3 (164.81), G3 (196.00), B3 (246.94)
    // G3 (196.00), B3 (246.94), D4 (293.66), E4 (329.63)
    const chords = [
      [130.81, 164.81, 196.00, 246.94], // Cmaj7 (soothing cosmic core)
      [174.61, 220.00, 261.63, 329.63], // Fmaj7 (organic earth root)
      [110.00, 164.81, 196.00, 246.94], // Am9 (relaxing nocturnal twilight)
      [196.00, 246.94, 293.66, 329.63]  // G6 (healing solar aurora)
    ];

    let currentChordIndex = 0;

    // Sparkle / delay feedback line for outer space reverb simulation
    const delay = this.ctx.createDelay(1.0);
    delay.delayTime.setValueAtTime(0.4, this.ctx.currentTime);
    const delayFeedback = this.ctx.createGain();
    delayFeedback.gain.setValueAtTime(0.35, this.ctx.currentTime);
    
    delay.connect(delayFeedback);
    delayFeedback.connect(delay);
    delay.connect(this.padVolume);

    const playChord = () => {
      if (!this.ctx || !this.isPlaying || !this.padVolume) return;
      const t = this.ctx.currentTime;
      const activeChord = chords[currentChordIndex];

      // Clean existing notes
      this.oscillators.forEach(oscObj => {
        try {
          oscObj.gain.gain.setValueAtTime(oscObj.gain.gain.value, t);
          oscObj.gain.gain.exponentialRampToValueAtTime(0.0001, t + 2);
          setTimeout(() => oscObj.osc.disconnect(), 2100);
        } catch (e) {}
      });
      this.oscillators = [];

      // Orchestrate the new chord notes
      activeChord.forEach((freq) => {
        if (!this.ctx || !this.padVolume) return;
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();

        // Make sound soothing: Triangle + Sine mix (warm organic pad)
        osc.type = Math.random() > 0.5 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

        // Smooth gradual fade-in to prevent clicks
        oscGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
        oscGain.gain.linearRampToValueAtTime(0.035, this.ctx.currentTime + 3);

        // Connect
        osc.connect(oscGain);
        oscGain.connect(this.padVolume);
        
        // Connect some portion to delay lines for galaxy reverb effect
        if (Math.random() > 0.3) {
          oscGain.connect(delay);
        }

        osc.start();
        this.oscillators.push({ osc, gain: oscGain });
      });

      // Advance chord
      currentChordIndex = (currentChordIndex + 1) % chords.length;
    };

    // Initial play after transition
    setTimeout(() => playChord(), 400);

    // Transition chords every 9 seconds smoothly
    this.padInterval = setInterval(() => {
      if (this.isPlaying) playChord();
    }, 9000);
  }

  public togglePlay(forceState?: boolean): boolean {
    const targetState = forceState !== undefined ? forceState : !this.isPlaying;
    if (this.isPlaying === targetState) return this.isPlaying;

    if (targetState) {
      this.initCtx();
      this.isPlaying = true;
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      if (this.masterVolume && this.ctx) {
        this.masterVolume.gain.setValueAtTime(0.0001, this.ctx.currentTime);
        this.masterVolume.gain.linearRampToValueAtTime(this.currentVolumeLevel, this.ctx.currentTime + 2);
      }
    } else {
      this.isPlaying = false;
      if (this.ctx && this.masterVolume) {
        const t = this.ctx.currentTime;
        this.masterVolume.gain.setValueAtTime(this.masterVolume.gain.value, t);
        this.masterVolume.gain.linearRampToValueAtTime(0.0001, t + 1.5);
        // Suppress browser audio components after 2s
        setTimeout(() => {
          if (!this.isPlaying && this.ctx && this.ctx.state === 'running') {
            this.ctx.suspend();
          }
        }, 1600);
      }
    }
    return this.isPlaying;
  }

  public setVolume(vol: number) {
    this.currentVolumeLevel = Math.max(0, Math.min(1, vol));
    if (this.ctx && this.masterVolume) {
      this.masterVolume.gain.setValueAtTime(this.masterVolume.gain.value, this.ctx.currentTime);
      this.masterVolume.gain.linearRampToValueAtTime(this.currentVolumeLevel, this.ctx.currentTime + 0.5);
    }
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getVolume(): number {
    return this.currentVolumeLevel;
  }

  public stop() {
    this.togglePlay(false);
    if (this.windInterval) clearInterval(this.windInterval);
    if (this.padInterval) clearInterval(this.padInterval);
  }
}

export const bioCosmicSynth = new BioCosmicSynth();
