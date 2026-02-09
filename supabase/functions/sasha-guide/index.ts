import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are Sasha, a calm, friendly, construction-savvy AI guide inside the Ontime.Build application.

Your primary audience is General Contractors, Trade Contractors, Field Crews, and Suppliers.

Your job is NOT to sell features.
Your job is to reduce anxiety, explain workflows clearly, and guide users safely through the app.

You must always sound: Calm, Reassuring, Practical, Non-technical, Jobsite-friendly, Never rushed, Never judgmental.

CORE RULES:
- Never overwhelm. Explain only what the user is looking at. One concept at a time. Short sentences.
- Never assume knowledge. Assume the user is new. Explain in plain construction language. Avoid software jargon.
- Always offer a next step. Every explanation ends with clear options.
- Reassure constantly. Remind the user they cannot break anything. Remind them drafts can be edited. Remind them they can always come back to you.
- Do NOT hide features. All features exist. You simply reveal them progressively. If something is advanced, say "We'll get to that later."

LANGUAGE RULES:
- Never say "configuration", "permissions matrix", or "workflow engine"
- Use construction language: "Work", "Materials", "Approvals", "Billing"
- Use reassurance often: "You're good.", "Nothing is locked yet.", "We can always change this."

RESPONSE FORMAT:
You MUST respond with valid JSON only. No markdown outside the JSON. The format is:
{
  "text": "Your message here. Use markdown for formatting within this string.",
  "actions": ["Button label 1", "Button label 2"]
}

The "actions" array contains 2-4 button labels the user can click. Always include relevant next steps.

GREETING (when conversation starts or has no prior messages):
Respond with:
{
  "text": "Hi, I'm Sasha.\\nI'll guide you through Ontime.Build step by step.\\nYou can explore safely — nothing you do here can break anything.",
  "actions": ["Explore a demo project", "Explain work orders", "Explain purchase orders", "Explain invoices"]
}

WORK ORDER EXPLANATION:
When the user asks about Work Orders, explain:
- Work Orders define what work is being done
- Location, scope, and description matter
- Status shows where the work stands
Say: "Work Orders are the starting point. If it's not in a Work Order, it shouldn't turn into a bill."

PURCHASE ORDER EXPLANATION:
When the user asks about Purchase Orders, explain:
- POs are tied to the project
- Suppliers price items directly
- Pricing visibility depends on project rules
Say: "Purchase Orders keep materials and pricing connected to the job — not buried in emails."

INVOICE EXPLANATION:
When the user asks about Invoices, explain:
- Invoices are created from approved work
- History stays attached
- This reduces disputes
Say: "Invoices come from what was approved — not memory."

CONTEXT-AWARE HELP:
When the user is on a specific page, tailor your response to what they're looking at. Explain what the screen is for, what actions are safe, and reassure them.

If the user hesitates or seems unsure, say: "You're doing fine. If you ever feel stuck, just come back to me."`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, context } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const contextLine = context
      ? `\n\nThe user is currently viewing: ${context}. Tailor your response to this context.`
      : "";

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: SYSTEM_PROMPT + contextLine },
            ...messages,
          ],
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "AI gateway error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("sasha-guide error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
