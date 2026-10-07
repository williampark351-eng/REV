const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const HOSTS = [
  'https://maas.qwencloudapi.com/compatible-mode/v1',
  'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
];
const MAX_TRANSCRIPT = 60000;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function text(value: unknown, max = 2000): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function list(value: unknown, max: number): string[] {
  return Array.isArray(value) ? value.map((v) => text(v, 300)).filter(Boolean).slice(0, max) : [];
}

const SYSTEM = `You are Atlas, the AI note-taker for REV University, a business coaching program.
Never refer to yourself as Qwen or by any other model or company name.
From a coaching call transcript, write first drafts the coach will review.
Respond ONLY with JSON of this exact shape:
{
  "summary": "3-5 sentence plain summary of the call",
  "topics": ["short topic", "..."],
  "action_items": ["concrete next step for the client", "..."],
  "homework": [{"title": "short title", "description": "what to do and how it will be judged", "due_in_days": 7}],
  "next_call_focus": "one sentence on what the next call should cover"
}
Use only what is in the transcript. If the transcript is too short, keep lists short or empty.`;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: corsHeaders });

  try {
    if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
    const apiKey = Deno.env.get('DASHSCOPE_API_KEY')?.trim();
    if (!apiKey) return json({ error: 'AI drafting is not configured yet.' }, 503);

    const body = await req.json().catch(() => null);
    const transcript = text(body?.transcript, MAX_TRANSCRIPT);
    if (transcript.length < 40) return json({ error: 'Not enough conversation yet to draft notes.' }, 422);
    const context = text(body?.context, 2000);

    let payload: unknown = null;
    for (const host of HOSTS) {
      const upstream = await fetch(`${host}/chat/completions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'qwen-plus',
          response_format: { type: 'json_object' },
          temperature: 0.3,
          messages: [
            { role: 'system', content: SYSTEM },
            { role: 'user', content: `Client context:\n${context || 'None provided'}\n\nTranscript:\n${transcript}` },
          ],
        }),
      });
      if (upstream.ok) {
        payload = await upstream.json();
        break;
      }
      if (![401, 403, 404].includes(upstream.status)) {
        console.error('call-drafts upstream', host, upstream.status, await upstream.text());
        return json({ error: 'The AI drafting service is busy. Try again shortly.' }, 502);
      }
    }
    if (!payload) return json({ error: 'The AI drafting service rejected the request.' }, 502);

    const content = (payload as { choices?: Array<{ message?: { content?: unknown } }> }).choices?.[0]?.message?.content;
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(typeof content === 'string' ? content : '');
    } catch {
      return json({ error: 'The AI returned an unreadable draft. Try again.' }, 502);
    }

    const homework = Array.isArray(parsed.homework)
      ? parsed.homework
          .map((h) => {
            const item = h as Record<string, unknown>;
            const days = Number(item.due_in_days);
            return {
              title: text(item.title, 140),
              description: text(item.description, 1200),
              due_in_days: Number.isFinite(days) ? Math.min(Math.max(Math.round(days), 1), 60) : 7,
            };
          })
          .filter((h) => h.title)
          .slice(0, 5)
      : [];

    return json({
      summary: text(parsed.summary, 2000),
      topics: list(parsed.topics, 8),
      action_items: list(parsed.action_items, 10),
      homework,
      next_call_focus: text(parsed.next_call_focus, 400),
    });
  } catch (error) {
    console.error('call-drafts failed', error);
    return json({ error: 'We could not draft notes for this call.' }, 500);
  }
});
