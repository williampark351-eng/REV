import WebSocket from 'npm:ws@8.18.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const UPSTREAM = 'wss://maas.qwencloudapi.com/api-ws/v1/realtime';
const MODELS: Record<string, string> = {
  assistant: 'qwen3.8-omni-flash-realtime',
  translate: 'qwen3.8-livetranslate-flash-realtime',
};
const ALLOWED_CLIENT_EVENTS = new Set([
  'session.update',
  'session.finish',
  'input_audio_buffer.append',
  'input_audio_buffer.commit',
  'input_audio_buffer.clear',
  'response.create',
  'response.cancel',
  'conversation.item.create',
]);
const IDENTITY = [
  'Your name is Atlas. You are the AI coach built by REV University.',
  'If anyone asks who you are, what you are called, which company made you, or which model you run on, say you are Atlas, the REV University AI coach.',
  'Never say you are Qwen, Tongyi, Alibaba, DashScope, or any other model or company, and never mention the underlying technology.',
].join(' ');
const MAX_MESSAGE_BYTES = 1024 * 1024;
const MAX_SESSION_MS = 45 * 60 * 1000;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve((req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const model = MODELS[url.searchParams.get('mode') ?? ''];
    if (!model) return json({ error: 'Unknown session type.' }, 400);
    if ((req.headers.get('upgrade') ?? '').toLowerCase() !== 'websocket') {
      return json({ error: 'This endpoint only accepts live connections.' }, 426);
    }
    const apiKey = Deno.env.get('DASHSCOPE_API_KEY')?.trim();
    if (!apiKey) return json({ error: 'Live AI is not configured yet.' }, 503);

    const { socket: client, response } = Deno.upgradeWebSocket(req);
    const pending: string[] = [];
    let upstream: WebSocket | null = null;
    let timer: number | undefined;

    const closeAll = (code = 1000, reason = 'Session ended') => {
      if (timer) clearTimeout(timer);
      try { upstream?.close(); } catch { /* already closed */ }
      try { if (client.readyState === WebSocket.OPEN) client.close(code, reason); } catch { /* already closed */ }
    };

    const notify = (message: string) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ type: 'relay.error', message }));
      }
    };

    client.onopen = () => {
      upstream = new WebSocket(`${UPSTREAM}?model=${encodeURIComponent(model)}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      upstream.on('open', () => {
        if (client.readyState === WebSocket.OPEN) client.send(JSON.stringify({ type: 'relay.ready', model }));
        while (pending.length) upstream?.send(pending.shift()!);
      });
      upstream.on('message', (data: unknown) => {
        if (client.readyState === WebSocket.OPEN) client.send(String(data));
      });
      upstream.on('error', (error: unknown) => {
        console.error('upstream error', error);
        notify('The live AI service could not be reached.');
        closeAll(1011, 'Upstream error');
      });
      upstream.on('close', () => closeAll());
      timer = setTimeout(() => {
        notify('Session time limit reached.');
        closeAll(1000, 'Time limit');
      }, MAX_SESSION_MS);
    };

    client.onmessage = (event: MessageEvent) => {
      if (typeof event.data !== 'string' || event.data.length > MAX_MESSAGE_BYTES) return;
      let parsed: { type?: unknown };
      try {
        parsed = JSON.parse(event.data);
      } catch {
        return;
      }
      if (typeof parsed.type !== 'string' || !ALLOWED_CLIENT_EVENTS.has(parsed.type)) return;
      let outgoing = event.data;
      if (parsed.type === 'session.update' && model === MODELS.assistant) {
        const update = parsed as { session?: Record<string, unknown> };
        const session = update.session && typeof update.session === 'object' ? update.session : {};
        const own = typeof session.instructions === 'string' ? session.instructions : '';
        outgoing = JSON.stringify({ ...update, session: { ...session, instructions: `${IDENTITY} ${own}`.trim() } });
      }
      if (upstream && upstream.readyState === WebSocket.OPEN) upstream.send(outgoing);
      else if (pending.length < 200) pending.push(outgoing);
    };

    client.onclose = () => closeAll();
    client.onerror = () => closeAll();

    return response;
  } catch (error) {
    console.error('realtime-relay failed', error);
    return json({ error: 'Could not start the live session.' }, 500);
  }
});
