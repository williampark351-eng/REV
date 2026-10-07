const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const MAX_INLINE_BYTES = 7 * 1024 * 1024;
const HOSTS = [
  'https://maas.qwencloudapi.com/compatible-mode/v1',
  'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
];
const MIME_BY_FORMAT: Record<string, string> = {
  wav: 'audio/wav',
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  ogg: 'audio/ogg',
  webm: 'audio/webm',
};
const allowedTypes = new Set(['audio/webm', 'audio/wav', 'audio/wave', 'audio/mpeg', 'audio/mp4', 'audio/ogg', 'audio/x-m4a']);

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function base64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, Math.min(index + chunkSize, bytes.length)));
  }
  return btoa(binary);
}

function formatForModel(type: string, filename: string): string {
  const name = filename.toLowerCase();
  if (type.includes('wav') || name.endsWith('.wav')) return 'wav';
  if (type.includes('mpeg') || name.endsWith('.mp3')) return 'mp3';
  if (type.includes('mp4') || type.includes('m4a') || name.endsWith('.m4a') || name.endsWith('.mp4')) return 'm4a';
  if (type.includes('ogg') || name.endsWith('.ogg')) return 'ogg';
  return 'webm';
}

async function audioSource(req: Request): Promise<string | Response> {
  if ((req.headers.get('content-type') ?? '').includes('application/json')) {
    const { audio_url } = await req.json().catch(() => ({}));
    const prefix = `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/call-recordings/`;
    if (typeof audio_url !== 'string' || !audio_url.startsWith(prefix) || audio_url.includes('..')) {
      return response({ error: 'That recording link is not valid.' }, 400);
    }
    return audio_url;
  }
  const form = await req.formData();
  const audio = form.get('audio');
  if (!(audio instanceof File)) return response({ error: 'Choose an audio recording first.' }, 400);
  const baseType = audio.type.split(';')[0].trim().toLowerCase();
  if (baseType && !allowedTypes.has(baseType)) return response({ error: 'Use a webm, wav, mp3, m4a, or ogg recording.' }, 415);
  if (audio.size > MAX_INLINE_BYTES) return response({ error: 'This audio segment is too large to transcribe directly.' }, 413);
  const format = formatForModel(baseType, audio.name);
  const bytes = new Uint8Array(await audio.arrayBuffer());
  return `data:${MIME_BY_FORMAT[format]};base64,${base64(bytes)}`;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: corsHeaders });

  try {
    if (req.method !== 'POST') return response({ error: 'Method not allowed.' }, 405);
    const apiKey = Deno.env.get('DASHSCOPE_API_KEY')?.trim();
    if (!apiKey) return response({ error: 'Transcription is not configured yet.' }, 503);

    const source = await audioSource(req);
    if (source instanceof Response) return source;
    const requestBody = JSON.stringify({
      model: 'qwen3-asr-flash',
      messages: [{
        role: 'user',
        content: [{ type: 'input_audio', input_audio: { data: source } }],
      }],
      stream: false,
    });

    let payload: unknown = null;
    for (const host of HOSTS) {
      const upstream = await fetch(`${host}/chat/completions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: requestBody,
      });
      if (upstream.ok) {
        payload = await upstream.json();
        break;
      }
      if (![401, 403, 404].includes(upstream.status)) {
        console.error('transcribe-call upstream', host, upstream.status, await upstream.text());
        break;
      }
    }
    if (!payload) return response({ error: 'The transcription service could not process this recording.' }, 502);
    const content = (payload as { choices?: Array<{ message?: { content?: unknown } }> }).choices?.[0]?.message?.content;
    const transcript = typeof content === 'string'
      ? content
      : Array.isArray(content)
        ? content.map((part) => typeof part === 'string' ? part : (part as { text?: string }).text ?? '').join(' ')
        : '';
    if (!transcript.trim()) return response({ error: 'No speech was found in this recording.' }, 422);
    return response({ transcript: transcript.trim() });
  } catch (error) {
    console.error('transcribe-call failed', error);
    return response({ error: 'We could not transcribe that recording. Please try again.' }, 500);
  }
});
