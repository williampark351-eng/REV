import { useCallback, useEffect, useRef, useState } from 'react';
import { captureCallAudio, preferredRecordingType } from '@/lib/audio';
import type { CapturedAudio } from '@/lib/audio';
import { transcribeAudio } from '@/lib/ai';

const SEGMENT_MS = 40_000;

export type CapturePhase = 'idle' | 'starting' | 'recording' | 'finishing';
export interface Segment {
  index: number;
  offsetSec: number;
  text: string;
}

export function useCallCapture() {
  const [phase, setPhase] = useState<CapturePhase>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [pending, setPending] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const captureRef = useRef<CapturedAudio | null>(null);
  const fullRef = useRef<MediaRecorder | null>(null);
  const fullChunks = useRef<Blob[]>([]);
  const segmentRef = useRef<MediaRecorder | null>(null);
  const segmentTimer = useRef<number>();
  const clockTimer = useRef<number>();
  const startedAt = useRef(0);
  const segmentIndex = useRef(0);
  const inflight = useRef<Promise<void>[]>([]);

  const transcribeSegment = useCallback((blob: Blob, index: number, offsetSec: number) => {
    if (blob.size < 2000) return;
    setPending((n) => n + 1);
    const job = transcribeAudio(blob, `segment-${index}.webm`)
      .then((text) => {
        if (!text.trim()) return;
        setSegments((list) => [...list, { index, offsetSec, text: text.trim() }].sort((a, b) => a.index - b.index));
      })
      .catch((cause: Error) => {
        if (!/No speech/i.test(cause.message)) setError(cause.message);
      })
      .finally(() => setPending((n) => n - 1));
    inflight.current.push(job);
  }, []);

  const recordSegment = useCallback(
    (stream: MediaStream, type: string) => {
      const index = segmentIndex.current++;
      const offsetSec = Math.round((Date.now() - startedAt.current) / 1000);
      const recorder = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      recorder.onstop = () => transcribeSegment(new Blob(chunks, { type: recorder.mimeType }), index, offsetSec);
      recorder.start();
      segmentRef.current = recorder;
    },
    [transcribeSegment],
  );

  const start = useCallback(
    async (includeMeetingTab: boolean) => {
      setError(null);
      setPhase('starting');
      try {
        const capture = await captureCallAudio(includeMeetingTab);
        captureRef.current = capture;
        const type = preferredRecordingType();
        const full = new MediaRecorder(capture.stream, type ? { mimeType: type } : undefined);
        fullChunks.current = [];
        full.ondataavailable = (e) => e.data.size && fullChunks.current.push(e.data);
        full.start(1000);
        fullRef.current = full;

        startedAt.current = Date.now();
        segmentIndex.current = 0;
        inflight.current = [];
        setSegments([]);
        setElapsed(0);
        recordSegment(capture.stream, type);
        segmentTimer.current = window.setInterval(() => {
          segmentRef.current?.stop();
          recordSegment(capture.stream, type);
        }, SEGMENT_MS);
        clockTimer.current = window.setInterval(
          () => setElapsed(Math.round((Date.now() - startedAt.current) / 1000)),
          1000,
        );
        capture.stream.getAudioTracks()[0]?.addEventListener('ended', () => void stopRef.current());
        setPhase('recording');
      } catch (cause) {
        captureRef.current?.stop();
        setError(cause instanceof Error ? cause.message : 'Microphone access was blocked.');
        setPhase('idle');
      }
    },
    [recordSegment],
  );

  const stop = useCallback(async (): Promise<Blob | null> => {
    const full = fullRef.current;
    if (!full) return null;
    setPhase('finishing');
    window.clearInterval(segmentTimer.current);
    window.clearInterval(clockTimer.current);
    segmentRef.current?.stop();
    segmentRef.current = null;
    const blob = await new Promise<Blob>((resolve) => {
      full.onstop = () => resolve(new Blob(fullChunks.current, { type: full.mimeType || 'audio/webm' }));
      full.stop();
    });
    fullRef.current = null;
    captureRef.current?.stop();
    captureRef.current = null;
    await new Promise((r) => setTimeout(r, 50));
    await Promise.allSettled(inflight.current);
    setPhase('idle');
    return blob;
  }, []);

  const stopRef = useRef(stop);
  stopRef.current = stop;

  const reset = useCallback(() => {
    setSegments([]);
    setElapsed(0);
    setError(null);
  }, []);

  useEffect(
    () => () => {
      window.clearInterval(segmentTimer.current);
      window.clearInterval(clockTimer.current);
      if (fullRef.current?.state === 'recording') fullRef.current.stop();
      if (segmentRef.current?.state === 'recording') segmentRef.current.stop();
      captureRef.current?.stop();
    },
    [],
  );

  return { phase, elapsed, segments, pending, error, setError, start, stop, reset, setSegments };
}
