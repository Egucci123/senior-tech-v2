import { NextRequest, NextResponse } from 'next/server';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

export async function POST(req: NextRequest) {
  try {
    const { conversation, type } = await req.json();

    if (!ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    const isChecklist = type === 'checklist';
    const systemPrompt = isChecklist
      ? 'Based on this diagnostic conversation, generate a 5-item close-out checklist specific to what was found. Plain language. One line per item. No intro text. Just the 5 items numbered 1-5.'
      : 'Based on this diagnostic conversation, generate a brief one-paragraph job summary. Include: equipment info, symptoms reported, diagnosis reached, and resolution or next steps. Keep it under 3 sentences. No intro text.';

    const maxTokens = isChecklist ? 150 : 200;

    // Condense conversation to last relevant messages
    const condensed = conversation.slice(-10).map((msg: { role: string; content: string }) => ({
      role: msg.role,
      content: msg.content.slice(0, 500),
    }));

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: condensed,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Anthropic API error:', errorData);
      return NextResponse.json({ error: 'API call failed' }, { status: 500 });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || '';

    return NextResponse.json({
      result: text,
      usage: {
        input_tokens: data.usage?.input_tokens || 0,
        output_tokens: data.usage?.output_tokens || 0,
        model: 'claude-haiku-4-5-20251001',
        estimated_cost: ((data.usage?.input_tokens || 0) * 0.0000008 + (data.usage?.output_tokens || 0) * 0.000004),
      },
    });
  } catch (error) {
    console.error('Summary generation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
