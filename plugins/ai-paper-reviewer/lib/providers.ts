/**
 * AI Paper Reviewer - Provider Module
 *
 * Abstraction over OpenAI, Anthropic, and Gemini API calls.
 */

export interface ProviderOptions {
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
  systemPrompt: string;
  userContent: string;
}

/**
 * Call OpenAI Chat Completions API
 */
export async function callOpenAI(opts: ProviderOptions): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${opts.apiKey}`,
    },
    body: JSON.stringify({
      model: opts.model,
      max_tokens: opts.maxTokens,
      temperature: opts.temperature,
      messages: [
        { role: 'system', content: opts.systemPrompt },
        { role: 'user', content: opts.userContent },
      ],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenAI API error (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

/**
 * Call Anthropic Messages API
 */
export async function callAnthropic(opts: ProviderOptions): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': opts.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: opts.model,
      max_tokens: opts.maxTokens,
      temperature: opts.temperature,
      system: opts.systemPrompt,
      messages: [{ role: 'user', content: opts.userContent }],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Anthropic API error (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

/**
 * Call Google Gemini API
 */
export async function callGemini(opts: ProviderOptions): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${opts.model}:generateContent?key=${opts.apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: `${opts.systemPrompt}\n\n${opts.userContent}` }],
        },
      ],
      generationConfig: {
        maxOutputTokens: opts.maxTokens,
        temperature: opts.temperature,
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

/**
 * Dispatcher - call the appropriate provider
 */
export async function callProvider(
  provider: string,
  opts: ProviderOptions
): Promise<string> {
  switch (provider) {
    case 'openai':
      return callOpenAI(opts);
    case 'anthropic':
      return callAnthropic(opts);
    case 'gemini':
      return callGemini(opts);
    default:
      throw new Error(`Unsupported AI provider: ${provider}`);
  }
}
