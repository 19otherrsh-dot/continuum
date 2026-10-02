import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config.js';

let client: Anthropic | null = null;

export function claude(): Anthropic {
  if (!client) {
    client = new Anthropic({ apiKey: config.ai.apiKey, maxRetries: 2 });
  }
  return client;
}

export interface StructuredCallOptions {
  system: string;
  userContent: string;
  schema: Record<string, unknown>;
  /** Used only in error messages — the API identifies the format by shape. */
  schemaName: string;
  /**
   * `medium` for summarization (high volume, bounded task); `high` for agent
   * proposals, where a wrong call costs user trust rather than a few tokens.
   */
  effort: 'low' | 'medium' | 'high';
  maxTokens?: number;
  timeoutMs?: number;
}

/**
 * One structured call to Claude.
 *
 * Notes on the shape of this request:
 *
 * - `output_config.format` constrains the response to the schema, so the
 *   caller gets valid JSON rather than prose it has to salvage.
 * - Adaptive thinking lets the model decide how much reasoning a given message
 *   needs — a one-line "sounds good" and a dense procurement thread should not
 *   cost the same.
 * - The system prompt is passed as a cacheable block. It is identical on every
 *   call while the activity content differs, which is exactly the prefix shape
 *   prompt caching rewards.
 */
export async function callStructured<T>(options: StructuredCallOptions): Promise<T> {
  const response = await claude().messages.create(
    {
      model: config.ai.model,
      max_tokens: options.maxTokens ?? 2048,
      thinking: { type: 'adaptive' },
      output_config: {
        effort: options.effort,
        format: {
          type: 'json_schema',
          schema: options.schema,
        },
      },
      system: [
        {
          type: 'text',
          text: options.system,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [{ role: 'user', content: options.userContent }],
    },
    { timeout: options.timeoutMs ?? 60_000 },
  );

  // A refused request returns HTTP 200 with an empty content array, so this
  // has to be checked before reading content — not caught as an exception.
  if (response.stop_reason === 'refusal') {
    throw new Error(
      `Model declined to process this content${
        response.stop_details ? ` (${JSON.stringify(response.stop_details)})` : ''
      }`,
    );
  }

  const text = response.content.find((block) => block.type === 'text');
  if (!text || text.type !== 'text') {
    throw new Error('Model returned no text content');
  }

  return JSON.parse(text.text) as T;
}
