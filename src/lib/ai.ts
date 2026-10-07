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

export async function transcribeRecordingUrl(audioUrl: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke('transcribe-call', { body: { audio_url: audioUrl } });
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
    throw new Error(detail?.error ?? 'Atlas could not draft notes right now.');
  }
  if (!data || typeof data.summary !== 'string' || !Array.isArray(data.action_items)) {
    throw new Error('Atlas returned an incomplete draft.');
  }
  return data as CallDrafts;
}

function recordingType(audio: Blob): { ext: string; contentType: string } {
  const type = audio.type.split(';')[0].toLowerCase();
  if (type.includes('wav')) return { ext: 'wav', contentType: 'audio/wav' };
  if (type.includes('mpeg') || type.includes('mp3')) return { ext: 'mp3', contentType: 'audio/mpeg' };
  if (type.includes('mp4') || type.includes('m4a')) return { ext: 'm4a', contentType: 'audio/mp4' };
  if (type.includes('ogg')) return { ext: 'ogg', contentType: 'audio/ogg' };
  return { ext: 'webm', contentType: 'audio/webm' };
}

export async function uploadRecording(studentId: string, callId: string, audio: Blob): Promise<string> {
  const { ext, contentType } = recordingType(audio);
  const path = `${studentId}/${callId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from('call-recordings').upload(path, audio, { contentType });
  if (error) throw new Error('The recording could not be uploaded.');
  return supabase.storage.from('call-recordings').getPublicUrl(path).data.publicUrl;
}

export function newMeetingLink(): string {
  return `https://meet.jit.si/REV-Coaching-${crypto.randomUUID().slice(0, 13)}`;
}
