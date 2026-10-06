import { supabase } from '@/lib/supabase';

export interface CallDrafts {
  summary: string;
  topics: string[];
  action_items: string[];
  homework: { title: string; description: string; due_in_days: number }[];
  next_call_focus: string;
}

export async function transcribeAudio(audio: Blob, name: string): Promise<string> {
  const body = new FormData();
  body.append('audio', new File([audio], name, { type: audio.type || 'audio/webm' }));
  const { data, error } = await supabase.functions.invoke('transcribe-call', { body });
  if (error) {
    const detail = await error.context?.json?.().catch(() => null);
    throw new Error(detail?.error ?? 'The transcription service is unavailable right now.');
  }
  if (!data || typeof data.transcript !== 'string') throw new Error('No transcript was returned.');
  return data.transcript;
}

export async function draftCall(transcript: string, context: string): Promise<CallDrafts> {
  const { data, error } = await supabase.functions.invoke('call-drafts', { body: { transcript, context } });
  if (error) {
    const detail = await error.context?.json?.().catch(() => null);
    throw new Error(detail?.error ?? 'The AI drafting service is unavailable right now.');
  }
  if (!data || typeof data.summary !== 'string' || !Array.isArray(data.action_items)) {
    throw new Error('The AI returned an incomplete draft.');
  }
  return data as CallDrafts;
}

export async function uploadRecording(studentId: string, callId: string, audio: Blob): Promise<string> {
  const ext = audio.type.includes('mp4') ? 'm4a' : audio.type.includes('ogg') ? 'ogg' : 'webm';
  const path = `${studentId}/${callId}/${crypto.randomUUID()}.${ext}`;
  const contentType = audio.type.split(';')[0] || 'audio/webm';
  const { error } = await supabase.storage.from('call-recordings').upload(path, audio, { contentType });
  if (error) throw new Error('The recording could not be uploaded.');
  return supabase.storage.from('call-recordings').getPublicUrl(path).data.publicUrl;
}

export function newMeetingLink(): string {
  return `https://meet.jit.si/REV-Coaching-${crypto.randomUUID().slice(0, 13)}`;
}
