// Shared Anthropic API caller with retry on overload (529)

const API_URL = 'https://api.anthropic.com/v1/messages'
const MAX_ATTEMPTS = 3

interface AnthropicCallOptions {
  apiKey: string
  model: string
  maxTokens: number
  system: string
  messages: Array<{ role: string; content: string }>
}

export interface AnthropicResult {
  text: string
}

function delay(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}

export async function callAnthropic(opts: AnthropicCallOptions): Promise<AnthropicResult> {
  const body = {
    model: opts.model,
    max_tokens: opts.maxTokens,
    system: opts.system,
    messages: opts.messages,
  }

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'x-api-key': opts.apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (response.ok) {
      const data = await response.json() as { content: Array<{ text: string }> }
      return { text: data.content[0]?.text ?? '' }
    }

    // Clone body before reading so we can inspect it
    const errText = await response.text()
    const isOverloaded = response.status === 529 ||
      errText.includes('overloaded_error')

    if (isOverloaded && attempt < MAX_ATTEMPTS) {
      // Exponential backoff: 1s, 2s
      await delay(1000 * attempt)
      continue
    }

    // Non-retryable or exhausted retries — throw with context
    const err = new Error(`Anthropic ${response.status}: ${errText}`)
    ;(err as NodeJS.ErrnoException).code = isOverloaded ? 'overloaded' : 'upstream_error'
    throw err
  }

  // Should not reach here
  const err = new Error('Anthropic call failed after retries')
  ;(err as NodeJS.ErrnoException).code = 'overloaded'
  throw err
}
