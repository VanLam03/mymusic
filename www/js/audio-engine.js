/* ==========================================================================
   SoundPulse Audio Engine (Web Audio API & 10-Band EQ)
   ========================================================================== */

export const EQ_FREQUENCIES = [60, 170, 310, 600, 1000, 3000, 6000, 12000, 14000, 16000];

export const EQ_PRESETS = {
  flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  bass: [8, 6, 5, 2, 0, -1, -2, -3, -3, -4],
  pop: [-1, 2, 4, 5, 3, 0, -1, -2, -1, 0],
  rock: [5, 3, -1, -3, 0, 2, 4, 6, 6, 5],
  jazz: [3, 2, 0, 2, -1, -1, 0, 2, 3, 4],
  vocal: [-2, -1, 1, 3, 5, 4, 2, 0, -1, -2],
  electronic: [6, 5, 0, -2, 2, 4, 5, 6, 5, 4]
};

export class AudioEngine {
  constructor() {
    this.audioCtx = null;
    this.audioElement = new Audio();
    this.audioElement.crossOrigin = 'anonymous';

    this.sourceNode = null;
    this.preampNode = null;
    this.eqNodes = [];
    this.analyserNode = null;
    this.volumeNode = null;

    this.isInitialized = false;
    this.isEqEnabled = true;
    this.currentPreset = 'flat';

    this.onEndedCallback = null;
    this.onTimeUpdateCallback = null;

    this.initAudioElementEvents();
  }

  initAudioContext() {
    if (this.isInitialized) {
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      return;
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    this.audioCtx = new AudioContextClass();

    // Source Node
    this.sourceNode = this.audioCtx.createMediaElementSource(this.audioElement);

    // Preamp Gain Node
    this.preampNode = this.audioCtx.createGain();

    // 10 BiquadFilter Nodes for EQ
    this.eqNodes = EQ_FREQUENCIES.map((freq, index) => {
      const filter = this.audioCtx.createBiquadFilter();
      if (index === 0) {
        filter.type = 'lowshelf';
      } else if (index === EQ_FREQUENCIES.length - 1) {
        filter.type = 'highshelf';
      } else {
        filter.type = 'peaking';
        filter.Q.value = 1.4;
      }
      filter.frequency.value = freq;
      filter.gain.value = 0;
      return filter;
    });

    // Analyser Node for Visualizer
    this.analyserNode = this.audioCtx.createAnalyser();
    this.analyserNode.fftSize = 256;
    this.analyserNode.smoothingTimeConstant = 0.8;

    // Volume Node
    this.volumeNode = this.audioCtx.createGain();

    // Connect Node Chain: Source -> Preamp -> EQ Filters -> Analyser -> Volume -> Destination
    let currentNode = this.sourceNode;
    currentNode.connect(this.preampNode);
    currentNode = this.preampNode;

    this.eqNodes.forEach(filterNode => {
      currentNode.connect(filterNode);
      currentNode = filterNode;
    });

    currentNode.connect(this.analyserNode);
    this.analyserNode.connect(this.volumeNode);
    this.volumeNode.connect(this.audioCtx.destination);

    this.isInitialized = true;
  }

  initAudioElementEvents() {
    this.audioElement.addEventListener('ended', () => {
      if (this.onEndedCallback) this.onEndedCallback();
    });

    this.audioElement.addEventListener('timeupdate', () => {
      if (this.onTimeUpdateCallback) {
        this.onTimeUpdateCallback(this.audioElement.currentTime, this.audioElement.duration);
      }
    });
  }

  playTrackUrl(url) {
    this.initAudioContext();
    this.audioElement.src = url;
    this.audioElement.play();
  }

  play() {
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioElement.play();
  }

  pause() {
    this.audioElement.pause();
  }

  seek(timeInSeconds) {
    if (this.audioElement.duration) {
      this.audioElement.currentTime = Math.max(0, Math.min(timeInSeconds, this.audioElement.duration));
    }
  }

  setVolume(vol) {
    this.audioElement.volume = Math.max(0, Math.min(1, vol));
  }

  setSpeed(speed) {
    this.audioElement.playbackRate = speed;
  }

  setPreamp(gainDb) {
    if (!this.preampNode) return;
    // Convert dB to linear gain factor: 10^(dB/20)
    const factor = Math.pow(10, gainDb / 20);
    this.preampNode.gain.value = factor;
  }

  setEqBandGain(bandIndex, gainDb) {
    if (!this.eqNodes[bandIndex]) return;
    this.eqNodes[bandIndex].gain.value = gainDb;
  }

  applyPreset(presetKey) {
    const gains = EQ_PRESETS[presetKey] || EQ_PRESETS.flat;
    this.currentPreset = presetKey;
    gains.forEach((gain, idx) => {
      this.setEqBandGain(idx, gain);
    });
  }

  setEqEnabled(enabled) {
    this.isEqEnabled = enabled;
    if (!enabled) {
      this.eqNodes.forEach(node => node.gain.value = 0);
    } else {
      this.applyPreset(this.currentPreset);
    }
  }

  getFrequencyData(array) {
    if (this.analyserNode) {
      this.analyserNode.getByteFrequencyData(array);
    }
  }

  getWaveformData(array) {
    if (this.analyserNode) {
      this.analyserNode.getByteTimeDomainData(array);
    }
  }
}
