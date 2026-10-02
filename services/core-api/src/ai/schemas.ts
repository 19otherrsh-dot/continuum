import { z } from 'zod';

/**
 * Output contracts for the model.
 *
 * `nextStep` is nullable on purpose. Making "no suggestion" representable in
 * the schema is what stops the model from inventing one to fill a required
 * field — the difference between an empty next step and a fabricated one is
 * the difference between a trustworthy timeline and a misleading pipeline
 * (FR-AC-03).
 */
export const activitySummarySchema = z.object({
  summary: z
    .string()
    .describe('Two to three sentences describing what was discussed and what was decided.'),
  sentiment: z
    .enum(['POSITIVE', 'NEUTRAL', 'NEGATIVE'])
    .describe('The counterparty\'s disposition toward moving forward.'),
  nextStep: z
    .string()
    .nullable()
    .describe(
      'The concrete next action if one was explicitly agreed or clearly implied. ' +
        'Null when no next step was established — do not invent one.',
    ),
});
export type ActivitySummary = z.infer<typeof activitySummarySchema>;

export const proposedActionSchema = z.object({
  type: z.enum([
    'CREATE_CONTACT',
    'UPDATE_CONTACT',
    'CHANGE_DEAL_STAGE',
    'UPDATE_DEAL',
    'CREATE_TASK',
    'LINK_CONTACT_TO_DEAL',
  ]),
  payload: z
    .record(z.unknown())
    .describe('The concrete change being proposed, as field/value pairs.'),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe(
      'How certain you are, given only what this activity actually states. ' +
        'Reserve values above 0.8 for explicit statements, not inferences.',
    ),
  rationale: z
    .string()
    .describe('One sentence citing the specific evidence in the activity.'),
});
export type ProposedAction = z.infer<typeof proposedActionSchema>;

export const proposalBatchSchema = z.object({
  actions: z.array(proposedActionSchema).describe('Empty when nothing warrants a change.'),
});

/** Converts a zod schema to the JSON Schema shape `output_config.format` expects. */
export function jsonSchemaFor(name: string, shape: Record<string, unknown>) {
  return {
    type: 'json_schema' as const,
    name,
    schema: { ...shape, additionalProperties: false },
  };
}

export const ACTIVITY_SUMMARY_JSON_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    sentiment: { type: 'string', enum: ['POSITIVE', 'NEUTRAL', 'NEGATIVE'] },
    nextStep: { type: ['string', 'null'] },
  },
  required: ['summary', 'sentiment', 'nextStep'],
  additionalProperties: false,
} as const;

export const PROPOSAL_BATCH_JSON_SCHEMA = {
  type: 'object',
  properties: {
    actions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: [
              'CREATE_CONTACT',
              'UPDATE_CONTACT',
              'CHANGE_DEAL_STAGE',
              'UPDATE_DEAL',
              'CREATE_TASK',
              'LINK_CONTACT_TO_DEAL',
            ],
          },
          payload: { type: 'object', additionalProperties: true },
          confidence: { type: 'number' },
          rationale: { type: 'string' },
        },
        required: ['type', 'payload', 'confidence', 'rationale'],
        additionalProperties: false,
      },
    },
  },
  required: ['actions'],
  additionalProperties: false,
} as const;
