import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Valid scope types that are allowed
const VALID_SCOPE_TYPES = ['RE-FRAME', 'RE_FRAME', 'ADDITION', 'FIXING', 'RE-INSTALL', 'RE_INSTALL', 'ADJUST'];

// Sanitize string input - remove potentially dangerous characters and limit length
function sanitizeString(input: unknown, maxLength: number = 500): string {
  if (typeof input !== 'string') {
    return '';
  }
  // Remove control characters and limit to alphanumeric, spaces, and common punctuation
  return input
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
    .replace(/[<>{}[\]\\]/g, '') // Remove potentially dangerous characters
    .slice(0, maxLength)
    .trim();
}

// Validate and sanitize materials array
function validateMaterials(materials: unknown): Array<{ quantity: number; unit: string; item: string; category: string }> {
  if (!Array.isArray(materials)) {
    return [];
  }
  if (materials.length > 50) {
    throw new Error('Too many materials (max 50 items)');
  }
  return materials.slice(0, 50).map((m: unknown) => {
    if (typeof m !== 'object' || m === null) {
      return { quantity: 0, unit: '', item: '', category: '' };
    }
    const material = m as Record<string, unknown>;
    return {
      quantity: typeof material.quantity === 'number' && material.quantity >= 0 && material.quantity <= 999999 
        ? material.quantity : 0,
      unit: sanitizeString(material.unit, 20),
      item: sanitizeString(material.item, 100),
      category: sanitizeString(material.category, 100),
    };
  });
}

// Validate and sanitize equipment array
function validateEquipment(equipment: unknown): Array<{ item: string; category: string }> {
  if (!Array.isArray(equipment)) {
    return [];
  }
  if (equipment.length > 50) {
    throw new Error('Too many equipment items (max 50 items)');
  }
  return equipment.slice(0, 50).map((e: unknown) => {
    if (typeof e !== 'object' || e === null) {
      return { item: '', category: '' };
    }
    const equip = e as Record<string, unknown>;
    return {
      item: sanitizeString(equip.item, 100),
      category: sanitizeString(equip.category, 100),
    };
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with user's JWT and verify authentication
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Authenticated user:', user.id);

    // Parse and validate input
    const rawInput = await req.json();
    
    // Validate required fields
    if (!rawInput.scopeType || !rawInput.location) {
      return new Response(
        JSON.stringify({ error: 'scopeType and location are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate scopeType is in allowed list
    const scopeType = String(rawInput.scopeType).toUpperCase();
    if (!VALID_SCOPE_TYPES.includes(scopeType)) {
      return new Response(
        JSON.stringify({ error: 'Invalid scopeType' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sanitize and validate inputs
    const location = sanitizeString(rawInput.location, 500);
    if (!location) {
      return new Response(
        JSON.stringify({ error: 'Location cannot be empty' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate laborHours
    let laborHours = 0;
    if (rawInput.laborHours !== undefined && rawInput.laborHours !== null) {
      if (typeof rawInput.laborHours !== 'number' || rawInput.laborHours < 0 || rawInput.laborHours > 10000) {
        return new Response(
          JSON.stringify({ error: 'Invalid laborHours (must be 0-10000)' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      laborHours = rawInput.laborHours;
    }

    // Validate materials and equipment arrays
    let materials: Array<{ quantity: number; unit: string; item: string; category: string }> = [];
    let equipment: Array<{ item: string; category: string }> = [];
    
    try {
      materials = validateMaterials(rawInput.materials);
      equipment = validateEquipment(rawInput.equipment);
    } catch (validationError) {
      return new Response(
        JSON.stringify({ error: validationError instanceof Error ? validationError.message : 'Validation error' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Build context for AI with sanitized inputs
    const materialsContext = materials.length > 0 
      ? `Materials needed: ${materials.map((m) => `${m.quantity} ${m.unit} of ${m.item || m.category}`).join(', ')}`
      : '';
    
    const equipmentContext = equipment.length > 0
      ? `Equipment: ${equipment.map((e) => e.item || e.category).join(', ')}`
      : '';

    const laborContext = laborHours > 0 ? `Estimated labor: ${laborHours} hours` : '';

    const scopeDescriptions: Record<string, string> = {
      'RE-FRAME': 'reframing or structural modifications',
      'RE_FRAME': 'reframing or structural modifications',
      'ADDITION': 'adding new elements or features',
      'FIXING': 'repairs or corrections to existing work',
      'RE-INSTALL': 'reinstalling previously installed components',
      'RE_INSTALL': 'reinstalling previously installed components',
      'ADJUST': 'adjustments or minor modifications',
    };

    const systemPrompt = `You are a construction change order assistant. Generate clear, professional descriptions for change orders. Keep descriptions concise (2-3 sentences max), specific to the work type, and use construction industry terminology appropriately. Do not use markdown formatting.`;

    const userPrompt = `Generate a professional change order description for the following:
- Location: ${location}
- Type of work: ${scopeDescriptions[scopeType] || scopeType}
${materialsContext}
${equipmentContext}
${laborContext}

Write a clear, concise description of the work to be performed.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 200,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const generatedDescription = data.choices?.[0]?.message?.content?.trim() || '';

    return new Response(
      JSON.stringify({ description: generatedDescription }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating description:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to generate description' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
