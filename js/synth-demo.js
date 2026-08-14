/* ==========================================================================
   SoundPulse Demo Synthesizer Track Generator
   ========================================================================== */

export class SynthDemoGenerator {
  static async generateDemoTracks() {
    return [];
  }

  static generateSynthwaveAudioUrl() {
    const sampleRate = 44100;
    const durationSec = 30;
    const numSamples = sampleRate * durationSec;
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const buffer = ctx.createBuffer(1, numSamples, sampleRate);
    const data = buffer.getChannelData(0);

    const bpm = 120;
    const noteSec = 60 / bpm / 2;

    // Arpeggio frequencies (C minor chord synth wave)
    const freqs = [130.81, 155.56, 196.00, 261.63, 311.13, 392.00, 523.25];

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const noteIdx = Math.floor(t / noteSec) % freqs.length;
      const freq = freqs[noteIdx];

      // Sawtooth + Square blend synth wave
      const saw = 2 * ((t * freq) - Math.floor(t * freq + 0.5));
      const square = Math.sin(2 * Math.PI * freq * t) > 0 ? 0.3 : -0.3;

      // Bass kick drum on beat
      const beatProgress = (t % (60 / bpm));
      const kick = Math.sin(2 * Math.PI * 60 * Math.exp(-beatProgress * 20)) * Math.exp(-beatProgress * 8);

      data[i] = (saw * 0.2 + square * 0.15 + kick * 0.4) * 0.5;
    }

    return this.bufferToWavUrl(buffer);
  }

  static generateLofiAudioUrl() {
    const sampleRate = 44100;
    const durationSec = 25;
    const numSamples = sampleRate * durationSec;
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const buffer = ctx.createBuffer(1, numSamples, sampleRate);
    const data = buffer.getChannelData(0);

    const chords = [220.00, 261.63, 329.63, 392.00]; // Am7 chord pad

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      let sample = 0;

      chords.forEach((f) => {
        sample += Math.sin(2 * Math.PI * f * t) * 0.1;
      });

      // Lofi vinyl crackle noise simulation
      const noise = (Math.random() - 0.5) * 0.02;

      data[i] = (sample + noise) * 0.6;
    }

    return this.bufferToWavUrl(buffer);
  }

  static bufferToWavUrl(buffer) {
    const numOfChan = buffer.numberOfChannels;
    const length = buffer.length * numOfChan * 2 + 44;
    const outBuffer = new ArrayBuffer(length);
    const view = new DataView(outBuffer);

    let offset = 0;

    function writeString(str) {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset++, str.charCodeAt(i));
      }
    }

    /* WAV Header */
    writeString('RIFF');
    view.setUint32(offset, length - 8, true); offset += 4;
    writeString('WAVE');
    writeString('fmt ');
    view.setUint32(offset, 16, true); offset += 4; // SubChunk1Size
    view.setUint16(offset, 1, true); offset += 2;  // AudioFormat (PCM)
    view.setUint16(offset, numOfChan, true); offset += 2;
    view.setUint32(offset, buffer.sampleRate, true); offset += 4;
    view.setUint32(offset, buffer.sampleRate * 2 * numOfChan, true); offset += 4; // ByteRate
    view.setUint16(offset, numOfChan * 2, true); offset += 2; // BlockAlign
    view.setUint16(offset, 16, true); offset += 2; // BitsPerSample
    writeString('data');
    view.setUint32(offset, length - offset - 4, true); offset += 4;

    /* WritePCM Data */
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < buffer.length; i++) {
      let s = Math.max(-1, Math.min(1, channelData[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
      offset += 2;
    }

    const blob = new Blob([outBuffer], { type: 'audio/wav' });
    return URL.createObjectURL(blob);
  }
}
