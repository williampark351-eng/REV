const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const MAX_BYTES = 25 * 1024 * 1024;
const HOSTS = [
  'https://maas.qwencloudapi.com/compatible-mode/v1',
  'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
];
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
  if (type.includes('wav') || filename.toLowerCase().endsWith('.wav')) return 'wav';
  if (type.includes('mpeg') || filename.toLowerCase().endsWith('.mp3')) return 'mp3';
  if (type.includes('mp4') || type.includes('m4a') || filename.toLowerCase().endsWith('.m4a')) return 'm4a';
  if (type.includes('ogg')) return 'ogg';
  return 'webm';
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: corsHeaders });

  try {
    if (req.method !== 'POST') return response({ error: 'Method not allowed.' }, 405);
    const apiKey = Deno.env.get('DASHSCOPE_API_KEY')?.trim();
    if (!apiKey) return response({ error: 'Transcription is not configured yet.' }, 503);

    const form = await req.formData();
    const audio = form.get('audio');
    if (!(audio instanceof File)) return response({ error: 'Choose an audio recording first.' }, 400);
    if (audio.size > MAX_BYTES) return response({ error: 'Audio must be no larger than 25 MB.' }, 413);
    if (audio.type && !allowedTypes.has(audio.type)) return response({ error: 'Use a webm, wav, mp3, m4a, or ogg recording.' }, 415);

    const bytes = new Uint8Array(await audio.arrayBuffer());
    const requestBody = JSON.stringify({
      model: 'qwen3-asr-flash',
      messages: [{
        role: 'user',
        content: [{
          type: 'input_audio',
          input_audio: { data: base64(bytes), format: formatForModel(audio.type, audio.name) },
        }],
      }],
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
