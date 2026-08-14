/* ==========================================================================
   SoundPulse Real-time Audio Visualizer Canvas Renderer
   ========================================================================== */

export class AudioVisualizer {
  constructor(canvasElement, audioEngine) {
    this.canvas = canvasElement;
    this.ctx = this.canvas.getContext('2d');
    this.audioEngine = audioEngine;
    this.mode = 'bars'; // 'bars' | 'circle' | 'wave' | 'particles'
    this.animationFrameId = null;

    this.particles = [];
    this.initParticles();
    this.resizeCanvas();

    window.addEventListener('resize', () => this.resizeCanvas());
  }

  resizeCanvas() {
    if (!this.canvas) return;
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.canvas.width = rect.width * window.devicePixelRatio || 800;
    this.canvas.height = rect.height * window.devicePixelRatio || 500;
  }

  setMode(modeName) {
    this.mode = modeName;
  }

  start() {
    if (!this.animationFrameId) {
      this.render();
    }
  }

  stop() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  initParticles() {
    this.particles = [];
    for (let i = 0; i < 80; i++) {
      this.particles.push({
        x: Math.random() * 800,
        y: Math.random() * 500,
        radius: Math.random() * 3 + 1,
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        hue: Math.random() * 360
      });
    }
  }

  render() {
    this.animationFrameId = requestAnimationFrame(() => this.render());

    const width = this.canvas.width;
    const height = this.canvas.height;
    const ctx = this.ctx;

    // Clear background with translucent fade for trails
    ctx.fillStyle = 'rgba(10, 13, 20, 0.25)';
    ctx.fillRect(0, 0, width, height);

    if (!this.audioEngine.isInitialized) return;

    const bufferLength = 64;
    const freqData = new Uint8Array(bufferLength);
    this.audioEngine.getFrequencyData(freqData);

    if (this.mode === 'bars') {
      this.renderBars(freqData, width, height);
    } else if (this.mode === 'circle') {
      this.renderCircle(freqData, width, height);
    } else if (this.mode === 'wave') {
      this.renderWaveform(width, height);
    } else if (this.mode === 'particles') {
      this.renderParticles(freqData, width, height);
    }
  }

  renderBars(freqData, width, height) {
    const ctx = this.ctx;
    const barWidth = (width / freqData.length) * 1.4;
    let x = 0;

    for (let i = 0; i < freqData.length; i++) {
      const barHeight = (freqData[i] / 255) * height * 0.8;

      const gradient = ctx.createLinearGradient(0, height, 0, height - barHeight);
      gradient.addColorStop(0, '#7000ff');
      gradient.addColorStop(0.5, '#00f0ff');
      gradient.addColorStop(1, '#ff007b');

      ctx.fillStyle = gradient;
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 10;
      ctx.fillRect(x, height - barHeight, barWidth - 4, barHeight);

      // Top glowing cap
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x, height - barHeight - 4, barWidth - 4, 3);

      x += barWidth;
    }
    ctx.shadowBlur = 0;
  }

  renderCircle(freqData, width, height) {
    const ctx = this.ctx;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.25;

    // Bass energy for pulsing center
    const bass = (freqData[0] + freqData[1] + freqData[2]) / 3;
    const pulseRadius = radius + (bass / 255) * 30;

    ctx.save();
    ctx.translate(centerX, centerY);

    // Glowing center circle
    ctx.beginPath();
    ctx.arc(0, 0, pulseRadius, 0, Math.PI * 2);
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 25;
    ctx.stroke();

    // Frequency rays
    const count = freqData.length;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const barLen = (freqData[i] / 255) * 120;

      const x1 = Math.cos(angle) * pulseRadius;
      const y1 = Math.sin(angle) * pulseRadius;
      const x2 = Math.cos(angle) * (pulseRadius + barLen);
      const y2 = Math.sin(angle) * (pulseRadius + barLen);

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = `hsl(${(i * 5) % 360}, 100%, 65%)`;
      ctx.lineWidth = 4;
      ctx.stroke();
    }

    ctx.restore();
    ctx.shadowBlur = 0;
  }

  renderWaveform(width, height) {
    const ctx = this.ctx;
    const waveData = new Uint8Array(128);
    this.audioEngine.getWaveformData(waveData);

    ctx.beginPath();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#00f0ff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 15;

    const sliceWidth = width / waveData.length;
    let x = 0;

    for (let i = 0; i < waveData.length; i++) {
      const v = waveData[i] / 128.0;
      const y = (v * height) / 2;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    ctx.lineTo(width, height / 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  renderParticles(freqData, width, height) {
    const ctx = this.ctx;
    const bass = freqData[1] / 255;

    this.particles.forEach((p, idx) => {
      p.x += p.vx * (1 + bass * 2);
      p.y += p.vy * (1 + bass * 2);

      if (p.x < 0 || p.x > width) p.vx *= -1;
      if (p.y < 0 || p.y > height) p.vy *= -1;

      const currentRadius = p.radius + bass * 8;

      ctx.beginPath();
      ctx.arc(p.x, p.y, currentRadius, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${p.hue + bass * 100}, 100%, 65%, 0.8)`;
      ctx.shadowColor = `hsl(${p.hue}, 100%, 50%)`;
      ctx.shadowBlur = 12;
      ctx.fill();
    });

    ctx.shadowBlur = 0;
  }
}
