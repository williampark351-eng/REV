const WORKLET = `
class Pcm16Downsampler extends AudioWorkletProcessor {
  constructor() {
    super();
    this.ratio = sampleRate / 16000;
    this.buffer = [];
    this.pos = 0;
    this.level = 0;
  }
  process(inputs) {
    const channel = inputs[0] && inputs[0][0];
    if (!channel) return true;
    for (; this.pos < channel.length; this.pos += this.ratio) {
      const s = Math.max(-1, Math.min(1, channel[Math.floor(this.pos)]));
      this.level = Math.max(this.level, Math.abs(s));
      this.buffer.push(s < 0 ? s * 0x8000 : s * 0x7fff);
    }
    this.pos -= channel.length;
    if (this.buffer.length >= 1600) {
      const out = Int16Array.from(this.buffer);
      this.buffer = [];
      this.port.postMessage({ pcm: out.buffer, level: this.level }, [out.buffer]);
      this.level = 0;
    }
    return true;
  }
}
registerProcessor('pcm16-downsampler', Pcm16Downsampler);
`;

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

export interface PcmStreamer {
  stop: () => void;
}

export async function streamPcm16(
  stream: MediaStream,
  onChunk: (base64: string) => void,
  onLevel?: (level: number) => void,
): Promise<PcmStreamer> {
  const context = new AudioContext();
  if (context.state === 'suspended') await context.resume();
  const url = URL.createObjectURL(new Blob([WORKLET], { type: 'application/javascript' }));
  try {
    await context.audioWorklet.addModule(url);
  } finally {
    URL.revokeObjectURL(url);
  }
  const source = context.createMediaStreamSource(stream);
  const node = new AudioWorkletNode(context, 'pcm16-downsampler');
  node.port.onmessage = (event: MessageEvent<{ pcm: ArrayBuffer; level: number }>) => {
    onChunk(toBase64(event.data.pcm));
    onLevel?.(event.data.level);
  };
  source.connect(node);
  const silent = context.createGain();
  silent.gain.value = 0;
  node.connect(silent);
  silent.connect(context.destination);
  return {
    stop: () => {
      node.port.onmessage = null;
      try { source.disconnect(); } catch { /* already disconnected */ }
      try { node.disconnect(); } catch { /* already disconnected */ }
      try { silent.disconnect(); } catch { /* already disconnected */ }
      void context.close();
    },
  };
}

export class PcmPlayer {
  private context = new AudioContext();
  private nextTime = 0;
  private sources = new Map<AudioScheduledSourceNode, number>();

  constructor() {
    if (this.context.state === 'suspended') void this.context.resume();
  }

  play(base64: string) {
    if (this.context.state === 'suspended') void this.context.resume();
    let samples: Int16Array;
    try {
      const binary = atob(base64);
      samples = new Int16Array(binary.length / 2);
      for (let i = 0; i < samples.length; i++) {
        samples[i] = binary.charCodeAt(i * 2) | (binary.charCodeAt(i * 2 + 1) << 8);
      }
    } catch {
      return;
    }
    if (samples.length === 0) return;
    const buffer = this.context.createBuffer(1, samples.length, 24000);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < samples.length; i++) data[i] = samples[i] / 0x8000;
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.connect(this.context.destination);
    const start = Math.max(this.context.currentTime + 0.02, this.nextTime);
    source.start(start);
    this.nextTime = start + buffer.duration;
    this.sources.set(source, start);
    source.onended = () => this.sources.delete(source);
  }

  interrupt() {
    // Stop only audio that hasn't started yet; already-playing audio finishes its sentence.
    const now = this.context.currentTime;
    let latest = 0;
    for (const started of this.sources.values()) latest = Math.max(latest, started);
    this.sources.forEach((started, source) => {
      if (started > now) {
        try { source.stop(); } catch { /* already stopped */ }
      }
    });
    this.sources.clear();
    this.nextTime = Math.max(now + 0.02, latest);
  }

  close() {
    this.interrupt();
    void this.context.close();
  }
}

export interface CapturedAudio {
  stream: MediaStream;
  stop: () => void;
}

export async function captureCallAudio(includeMeetingTab: boolean): Promise<CapturedAudio> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('This browser cannot use a microphone here. Open the app in its own browser tab and try again.');
  }
  let mic: MediaStream;
  try {
    mic = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
    });
  } catch (cause) {
    const name = cause instanceof DOMException ? cause.name : '';
    if (name === 'NotFoundError') throw new Error('No microphone was found. Connect one and try again.');
    throw new Error(
      'Microphone access was blocked. Allow the microphone for this site (or open the app in its own tab) and try again.',
    );
  }
  let tab: MediaStream | null = null;
  if (includeMeetingTab) {
    try {
      tab = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
    } catch {
      mic.getTracks().forEach((t) => t.stop());
      throw new Error('Screen sharing was cancelled. Choose the meeting tab and turn on "Share tab audio".');
    }
    if (!tab.getAudioTracks().length) {
      tab.getTracks().forEach((t) => t.stop());
      mic.getTracks().forEach((t) => t.stop());
      throw new Error('No meeting audio was shared. Pick the browser tab and turn on "Share tab audio".');
    }
  }
  if (!tab) return { stream: mic, stop: () => mic.getTracks().forEach((t) => t.stop()) };

  const context = new AudioContext();
  if (context.state === 'suspended') await context.resume();
  const destination = context.createMediaStreamDestination();
  context.createMediaStreamSource(mic).connect(destination);
  context.createMediaStreamSource(new MediaStream(tab.getAudioTracks())).connect(destination);
  return {
    stream: destination.stream,
    stop: () => {
      mic.getTracks().forEach((t) => t.stop());
      tab?.getTracks().forEach((t) => t.stop());
      void context.close();
    },
  };
}

export function preferredRecordingType(): string {
  const options = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
  return options.find((t) => MediaRecorder.isTypeSupported(t)) ?? '';
}
