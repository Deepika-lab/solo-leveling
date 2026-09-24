/**
 * audio.js - Web Audio API Procedural Sound Synthesizer
 * Provides manhwa-authentic sound effects: system chime, level up, alerts, clicks, and 'Arise'.
 */

class SystemAudio {
  constructor() {
    this.ctx = null;
    this.enabled = localStorage.getItem('solo_audio_enabled') !== 'false';
    this.volume = parseFloat(localStorage.getItem('solo_audio_volume') || '0.5');
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleSound() {
    this.enabled = !this.enabled;
    localStorage.setItem('solo_audio_enabled', this.enabled);
    if (this.enabled) {
      this.init();
      this.playClick();
    }
    return this.enabled;
  }

  setVolume(val) {
    this.volume = Math.max(0, Math.min(1, parseFloat(val)));
    localStorage.setItem('solo_audio_volume', this.volume);
  }

  // Generic tone generator
  _playTone(freq, type = 'sine', startTime = 0, duration = 0.2, gainStart = 0.3, gainEnd = 0.001) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime + startTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(gainStart * this.volume, now);
      gain.gain.exponentialRampToValueAtTime(Math.max(gainEnd, 0.0001), now + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + duration);
    } catch (e) {
      console.warn("Audio playback error", e);
    }
  }

  // Holographic UI button click
  playClick() {
    this.triggerHaptic(12);
    if (!this.enabled) return;
    this._playTone(1200, 'sine', 0, 0.04, 0.15, 0.001);
  }

  // Iconic dual-tone System Alert chime ("DUN-DING!")
  playSystemAlert() {
    this.triggerHaptic([30, 20, 40]);
    if (!this.enabled) return;
    this._playTone(880, 'sine', 0, 0.12, 0.25, 0.01);
    this._playTone(1320, 'sine', 0.1, 0.3, 0.3, 0.001);
  }

  // Quest Completed sound (crystal chime)
  playQuestComplete() {
    this.triggerHaptic([40, 30, 80]);
    if (!this.enabled) return;
    const notes = [587.33, 739.99, 880, 1174.66]; // D5, F#5, A5, D6
    notes.forEach((freq, idx) => {
      this._playTone(freq, 'triangle', idx * 0.07, 0.25, 0.25, 0.01);
    });
  }

  // Level Up fanfare! Multi-harmonic ascending heroic chime
  playLevelUp() {
    this.triggerHaptic([80, 50, 80, 50, 150]);
    if (!this.enabled) return;
    const chords = [
      { freq: 440, delay: 0 },
      { freq: 554.37, delay: 0.08 },
      { freq: 659.25, delay: 0.16 },
      { freq: 880, delay: 0.24 },
      { freq: 1108.73, delay: 0.36 },
      { freq: 1318.51, delay: 0.48 },
      { freq: 1760, delay: 0.6 }
    ];
    chords.forEach(c => {
      this._playTone(c.freq, 'sine', c.delay, 0.45, 0.35, 0.001);
      this._playTone(c.freq * 0.5, 'triangle', c.delay, 0.4, 0.2, 0.001);
    });
  }

  // Gate Clear (Deep power chord + shimmer)
  playGateClear() {
    this.triggerHaptic([60, 40, 100]);
    if (!this.enabled) return;
    this._playTone(220, 'sawtooth', 0, 0.6, 0.15, 0.01);
    this._playTone(329.63, 'triangle', 0.1, 0.5, 0.2, 0.01);
    this._playTone(659.25, 'sine', 0.2, 0.6, 0.25, 0.01);
    this._playTone(1318.51, 'sine', 0.35, 0.8, 0.3, 0.001);
  }

  // Penalty / Warning alarm (pulsing warning frequency)
  playWarning() {
    this.triggerHaptic([150, 80, 150, 80, 250]);
    if (!this.enabled) return;
    this._playTone(400, 'sawtooth', 0, 0.15, 0.2, 0.01);
    this._playTone(350, 'sawtooth', 0.18, 0.25, 0.25, 0.001);
    this._playTone(400, 'sawtooth', 0.45, 0.15, 0.2, 0.01);
    this._playTone(350, 'sawtooth', 0.63, 0.25, 0.25, 0.001);
  }

  // Shadow Extraction "ARISE" (Sub-bass rumble + ethereal resonance)
  playArise() {
    this.triggerHaptic([80, 60, 120, 60, 220]);
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      // Sub-bass oscillator
      const sub = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      sub.type = 'sawtooth';
      sub.frequency.setValueAtTime(110, now);
      sub.frequency.exponentialRampToValueAtTime(45, now + 1.2);
      subGain.gain.setValueAtTime(0.4 * this.volume, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 1.4);
      sub.connect(subGain);
      subGain.connect(this.ctx.destination);
      sub.start(now);
      sub.stop(now + 1.4);

      // Ethereal shimmer
      [440, 523.25, 659.25, 880, 1046.5].forEach((f, idx) => {
        this._playTone(f, 'sine', 0.3 + (idx * 0.08), 0.8, 0.2, 0.001);
      });
    } catch (e) {
      console.warn("Arise audio error", e);
    }
  }

  // Stat point allocated
  playStatAllocate() {
    if (!this.enabled) return;
    this.triggerHaptic(20);
    this._playTone(700, 'sine', 0, 0.08, 0.2, 0.01);
    this._playTone(1050, 'sine', 0.06, 0.12, 0.25, 0.001);
  }

  // Mobile Haptic Feedback (Vibration API)
  triggerHaptic(pattern = 20) {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {
        // Silently ignore if not supported
      }
    }
  }

  // Mystery Box / Loot Opening
  playLootOpen() {
    if (!this.enabled) return;
    this.triggerHaptic([30, 40, 50, 60, 150]);
    [300, 450, 600, 800, 1200].forEach((freq, idx) => {
      this._playTone(freq, 'triangle', idx * 0.08, 0.3, 0.25, 0.001);
    });
    this._playTone(1600, 'sine', 0.45, 0.6, 0.3, 0.001);
  }

  // Potion / Consumable used
  playPotionConsume() {
    if (!this.enabled) return;
    this.triggerHaptic([40, 30, 60]);
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
      this._playTone(freq, 'sine', idx * 0.06, 0.2, 0.2, 0.01);
    });
  }

  // Dodge / Evasion in Penalty Zone
  playDodge() {
    if (!this.enabled) return;
    this.triggerHaptic(30);
    this._playTone(400, 'sine', 0, 0.08, 0.2, 0.01);
    this._playTone(600, 'sine', 0.04, 0.1, 0.25, 0.001);
  }
}

window.systemAudio = new SystemAudio();
