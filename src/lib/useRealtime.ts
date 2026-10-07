import { useCallback, useEffect, useRef, useState } from 'react';
import { PcmPlayer, streamPcm16 } from '@/lib/audio';
import type { PcmStreamer } from '@/lib/audio';

export type RealtimeMode = 'assistant' | 'translate';
export type RealtimeStatus = 'idle' | 'connecting' | 'live' | 'ending' | 'error';
export interface RealtimeEvent {
  type: string;
  [key: string]: unknown;
}

const RELAY_URL = `${(import.meta.env.VITE_SUPABASE_URL as string).replace(/^http/, 'ws')}/functions/v1/realtime-relay`;

export function useRealtime(mode: RealtimeMode, onEvent: (event: RealtimeEvent) => void) {
  const [status, setStatus] = useState<RealtimeStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [level, setLevel] = useState(0);
  const socketRef = useRef<WebSocket | null>(null);
  const streamerRef = useRef<PcmStreamer | null>(null);
  const playerRef = useRef<PcmPlayer | null>(null);
  const releaseRef = useRef<(() => void) | null>(null);
  const connectTimerRef = useRef<number | undefined>(undefined);
  const endingRef = useRef(false);
  const handlerRef = useRef(onEvent);
  handlerRef.current = onEvent;

  const teardown = useCallback(() => {
    window.clearTimeout(connectTimerRef.current);
    streamerRef.current?.stop();
    streamerRef.current = null;
    playerRef.current?.close();
    playerRef.current = null;
    releaseRef.current?.();
    releaseRef.current = null;
    const socket = socketRef.current;
    socketRef.current = null;
    if (socket && socket.readyState <= WebSocket.OPEN) socket.close();
    setLevel(0);
  }, []);

  useEffect(() => () => teardown(), [teardown]);

  const start = useCallback(
    (session: Record<string, unknown>, stream: MediaStream, release: () => void, playAudio: boolean) => {
      teardown();
      endingRef.current = false;
      setError(null);
      setStatus('connecting');
      releaseRef.current = release;
      if (playAudio) playerRef.current = new PcmPlayer();

      const socket = new WebSocket(`${RELAY_URL}?mode=${mode}`);
      socketRef.current = socket;
      const fail = (message: string) => {
        if (socketRef.current !== socket) return;
        setError(message);
        setStatus('error');
        teardown();
      };
      connectTimerRef.current = window.setTimeout(
        () => fail('Atlas took too long to respond. Please try again.'),
        15000,
      );

      socket.onmessage = async (message) => {
        let event: RealtimeEvent;
        try {
          event = JSON.parse(String(message.data));
        } catch {
          return;
        }
        if (event.type === 'relay.ready') {
          socket.send(JSON.stringify({ type: 'session.update', session }));
          return;
        }
        if (event.type === 'session.updated' && !streamerRef.current) {
          try {
            streamerRef.current = await streamPcm16(
              stream,
              (audio) => {
                if (socket.readyState === WebSocket.OPEN) {
                  socket.send(JSON.stringify({ type: 'input_audio_buffer.append', audio }));
                }
              },
              setLevel,
            );
            window.clearTimeout(connectTimerRef.current);
            setStatus('live');
          } catch {
            fail('Your browser could not start audio streaming.');
          }
        }
        if (event.type === 'relay.error') return fail(String(event.message ?? 'The live session stopped.'));
        if (event.type === 'error') {
          const detail = (event.error as { message?: string } | undefined)?.message;
          return fail(detail ? `Atlas ran into a problem: ${detail}` : 'Atlas ran into a problem. Please try again.');
        }
        if (event.type === 'response.audio.delta' && typeof event.delta === 'string') playerRef.current?.play(event.delta);
        if (event.type === 'input_audio_buffer.speech_started' && mode === 'assistant') playerRef.current?.interrupt();
        handlerRef.current(event);
      };
      socket.onerror = () => fail('Could not connect to Atlas.');
      socket.onclose = () => {
        if (socketRef.current !== socket) return;
        if (endingRef.current) {
          teardown();
          setStatus('idle');
          return;
        }
        fail(
          streamerRef.current
            ? 'The live session was disconnected. Press start to reconnect.'
            : 'Could not open a live session. Check your connection and try again.',
        );
      };
    },
    [mode, teardown],
  );

  const stop = useCallback(async () => {
    const socket = socketRef.current;
    if (!socket) return setStatus('idle');
    const wasLive = streamerRef.current !== null;
    endingRef.current = true;
    setStatus('ending');
    window.clearTimeout(connectTimerRef.current);
    streamerRef.current?.stop();
    streamerRef.current = null;
    if (mode === 'translate' && wasLive && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'session.finish' }));
      await new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, 4000);
        socket.addEventListener('close', () => resolve());
        socket.addEventListener('message', (m) => {
          if (String(m.data).includes('"session.finished"')) {
            clearTimeout(timer);
            resolve();
          }
        });
      });
    }
    if (socketRef.current !== socket) return;
    teardown();
    setStatus('idle');
  }, [mode, teardown]);

  const send = useCallback((event: Record<string, unknown>) => {
    const socket = socketRef.current;
    if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(event));
  }, []);

  return { status, error, level, start, stop, send };
}
