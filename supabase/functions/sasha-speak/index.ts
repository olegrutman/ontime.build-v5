const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text } = await req.json();
    if (!text || typeof text !== 'string') {
      return new Response(JSON.stringify({ error: 'text is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'Voice is not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const clean = text
      .replace(/```[\s\S]*?```/g, '')
      .replace(/[*_#>`]/g, '')
      .slice(0, 1200);

    const resp = await fetch('https://ai.gateway.lovable.dev/v1/audio/speech', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini-tts',
        voice: 'sage',
        input: clean,
        response_format: 'mp3',
        instructions:
          'Warm, confident, friendly construction-software guide. Natural pace, conversational, not robotic.',
      }),
    });

    if (!resp.ok) {
      const body = await resp.text();
      console.error(`TTS failed [${resp.status}]: ${body}`);
      return new Response(
        JSON.stringify({ error: 'Voice generation failed', status: resp.status, details: body }),
        { status: resp.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const audio = await resp.arrayBuffer();
    return new Response(audio, {
      headers: { ...corsHeaders, 'Content-Type': 'audio/mpeg' },
    });
  } catch (e) {
    console.error('sasha-speak error:', e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
