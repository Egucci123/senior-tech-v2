import { NextRequest, NextResponse } from 'next/server';
import { AI_MODELS, MAX_TOKENS, ANTHROPIC_API_URL, ANTHROPIC_VERSION } from '@/lib/ai-config';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const SYSTEM_PROMPT = `You are writing internal service ticket notes for an HVAC technician. This goes directly into their dispatch software (ServiceTitan, Housecall Pro, etc.). It is NOT customer-facing.

Write in plain field-tech language. Short sentences. No formal headers, no markdown, no bullet symbols. Just a clean block of text the tech can copy and paste as service notes.

Format exactly like this (fill in from the conversation, skip any line if unknown):

[Brand] [Model] | SN: [serial] | [year]
Complaint: [what was reported]
Found: [measurements, test results, visual findings — be specific]
Cause: [root cause in plain words]
Steps: [numbered list of what was done or needs to be done — 1. 2. 3. etc]
Status: [RESOLVED / PARTS NEEDED / QUOTED / FURTHER DIAG NEEDED]

No intro sentence. No sign-off. Just the block. Write like a tech who has been doing this 20 years.`;

const securityHeaders: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
};

export async function POST(req: NextRequest) {
  try {
    const { conversation } = await req.json();

    if (!ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500, headers: securityHeaders }
      );
    }

    const condensed = conversation.slice(-20).map((msg: { role: string; content: string }) => ({
      role: msg.role,
      content: msg.content.slice(0, 800),
    }));

    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model: AI_MODELS.HAIKU,
        max_tokens: MAX_TOKENS.summary,
        system: SYSTEM_PROMPT,
        messages: condensed,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Anthropic API error:', errorData);
      return NextResponse.json(
        { error: 'API call failed' },
        { status: 500, headers: securityHeaders }
      );
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || '';

    return NextResponse.json(
      {
        result: text,
        usage: {
          input_tokens: data.usage?.input_tokens || 0,
          output_tokens: data.usage?.output_tokens || 0,
          model: AI_MODELS.HAIKU,
          estimated_cost: ((data.usage?.input_tokens || 0) * 0.0000008 + (data.usage?.output_tokens || 0) * 0.000004),
        },
      },
      { headers: securityHeaders }
    );
  } catch (error) {
    console.error('Summary generation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: securityHeaders }
    );
  }
}
