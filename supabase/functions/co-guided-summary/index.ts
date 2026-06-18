// Lovable AI summary for the Guided 5-step CO Builder.
// Returns a 1-3 sentence scope description, strictly from the inputs.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

interface SummaryInput {
  problem: string;
  system: string;
  location: string;
  lines: string[];
  project_name?: string | null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = (await req.json()) as Partial<SummaryInput>;
    const problem = String(body.problem ?? '').trim();
    const system = String(body.system ?? '').trim();
    const location = String(body.location ?? '').trim();
    const lines = Array.isArray(body.lines) ? body.lines.map(String).slice(0, 12) : [];

    if (!problem || !system || lines.length === 0) {
      return new Response(
        JSON.stringify({ error: 'problem, system, and at least one line are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY missing' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const prompt = [
      `Problem: ${problem}`,
      `System: ${system}`,
      location ? `Location: ${location}` : null,
      `Scope items:\n${lines.map((l) => `- ${l}`).join('\n')}`,
    ].filter(Boolean).join('\n');

    const resp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        temperature: 0.3,
        max_tokens: 220,
        messages: [
          {
            role: 'system',
            content:
              'You write change-order scope descriptions for construction professionals. Use 1-3 plain sentences. Reference only the supplied problem, system, location, and scope items. Never invent quantities, materials, or details that are not provided. No bullets, no headings, no markdown.',
          },
          { role: 'user', content: prompt },
        ],
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      return new Response(JSON.stringify({ error: `AI gateway error`, detail: errText }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const json = await resp.json();
    const summary: string = json?.choices?.[0]?.message?.content?.trim() ?? '';

    return new Response(JSON.stringify({ summary }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
