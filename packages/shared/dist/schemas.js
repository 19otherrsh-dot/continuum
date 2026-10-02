import { z } from 'zod';
/**
 * Request schemas shared by the API (for validation) and the web app (for
 * client-side form checks), so the two can never drift.
 */
export const recordSourceSchema = z.enum(['HUMAN', 'AGENT_INFERRED', 'IMPORTED', 'ENRICHED']);
export const entityTypeSchema = z.enum(['CONTACT', 'COMPANY', 'DEAL', 'PROJECT', 'TASK']);
export const workspaceMotionSchema = z.enum(['SALES', 'AGENCY', 'HYBRID']);
export const userRoleSchema = z.enum(['ADMIN', 'MANAGER', 'MEMBER']);
export const signupSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    name: z.string().min(1),
    organizationName: z.string().min(1),
    motion: workspaceMotionSchema,
});
export const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
});
export const createCompanySchema = z.object({
    name: z.string().min(1),
    domain: z.string().min(1).nullish(),
    website: z.string().url().nullish(),
    tags: z.array(z.string()).optional(),
    customFields: z.record(z.unknown()).optional(),
});
export const updateCompanySchema = createCompanySchema.partial();
export const createContactSchema = z.object({
    email: z.string().email(),
    firstName: z.string().nullish(),
    lastName: z.string().nullish(),
    phone: z.string().nullish(),
    title: z.string().nullish(),
    companyId: z.string().uuid().nullish(),
    tags: z.array(z.string()).optional(),
    customFields: z.record(z.unknown()).optional(),
});
export const updateContactSchema = createContactSchema.partial().omit({ email: true }).extend({
    email: z.string().email().optional(),
});
export const createDealSchema = z.object({
    name: z.string().min(1),
    pipelineId: z.string().uuid().optional(),
    stageId: z.string().uuid().optional(),
    valueCents: z.number().int().nonnegative().nullish(),
    currency: z.string().length(3).optional(),
    ownerId: z.string().uuid().nullish(),
    companyId: z.string().uuid().nullish(),
    contactIds: z.array(z.string().uuid()).optional(),
    expectedCloseDate: z.string().datetime().nullish(),
    tags: z.array(z.string()).optional(),
    customFields: z.record(z.unknown()).optional(),
});
export const updateDealSchema = createDealSchema.partial();
/** Stage moves are separate from generic updates so `stageSource` is always set explicitly. */
export const moveDealStageSchema = z.object({
    stageId: z.string().uuid(),
});
export const addDealContactSchema = z.object({
    contactId: z.string().uuid(),
    role: z.string().nullish(),
});
export const createActivityNoteSchema = z.object({
    subject: z.string().nullish(),
    body: z.string().min(1),
    entityType: entityTypeSchema,
    entityId: z.string().uuid(),
    contactIds: z.array(z.string().uuid()).optional(),
    occurredAt: z.string().datetime().optional(),
    /** Client-generated id lets an offline note sync exactly once (FR-MOBILE-04 groundwork). */
    clientRequestId: z.string().min(1).max(128).optional(),
});
export const createTaskSchema = z.object({
    title: z.string().min(1),
    notes: z.string().nullish(),
    dueAt: z.string().datetime().nullish(),
    ownerId: z.string().uuid().nullish(),
    entityType: entityTypeSchema.nullish(),
    entityId: z.string().uuid().nullish(),
});
export const updateTaskSchema = createTaskSchema.partial().extend({
    status: z.enum(['OPEN', 'COMPLETED', 'CANCELLED']).optional(),
});
export const convertDealSchema = z.object({
    name: z.string().min(1).optional(),
    ownerId: z.string().uuid().nullish(),
});
export const createMilestoneSchema = z.object({
    title: z.string().min(1),
    ownerId: z.string().uuid().nullish(),
    dueDate: z.string().datetime().nullish(),
});
export const updateMilestoneSchema = createMilestoneSchema.partial().extend({
    completed: z.boolean().optional(),
});
export const updateProjectSchema = z.object({
    name: z.string().min(1).optional(),
    status: z.enum(['ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED']).optional(),
    ownerId: z.string().uuid().nullish(),
    customFields: z.record(z.unknown()).optional(),
});
/**
 * Confirming a proposal may carry a corrected payload. When present, the
 * corrected value — not the original AI proposal — is what gets applied, and
 * the delta is retained as future inference context (FR-AGENT-03/04).
 */
export const confirmAgentActionSchema = z.object({
    correctedPayload: z.record(z.unknown()).optional(),
});
export const rejectAgentActionSchema = z.object({
    reason: z.string().nullish(),
});
export const placeCallSchema = z.object({
    contactId: z.string().uuid(),
    dealId: z.string().uuid().nullish(),
    toNumber: z.string().min(3).optional(),
});
export const createExclusionSchema = z.object({
    kind: z.enum(['SENDER', 'DOMAIN', 'THREAD']),
    value: z.string().min(1),
    connectionId: z.string().uuid().nullish(),
});
export const createCustomFieldSchema = z.object({
    entityType: entityTypeSchema,
    key: z
        .string()
        .min(1)
        .regex(/^[a-z][a-z0-9_]*$/, 'Key must be lowercase alphanumeric with underscores'),
    label: z.string().min(1),
    type: z.enum(['TEXT', 'NUMBER', 'DATE', 'BOOLEAN', 'SELECT']),
    options: z.array(z.string()).optional(),
});
export const updateOrgSettingsSchema = z.object({
    name: z.string().min(1).optional(),
    motion: workspaceMotionSchema.optional(),
    showProjectsUi: z.boolean().optional(),
    stallingThresholdDays: z.number().int().min(1).max(365).optional(),
    agentHighThreshold: z.number().min(0).max(1).optional(),
    agentMediumThreshold: z.number().min(0).max(1).optional(),
});
export const inviteUserSchema = z.object({
    email: z.string().email(),
    name: z.string().min(1),
    role: userRoleSchema,
    teamId: z.string().uuid().nullish(),
    password: z.string().min(8),
});
export const updateUserRoleSchema = z.object({
    role: userRoleSchema.optional(),
    teamId: z.string().uuid().nullish(),
});
export const createApiTokenSchema = z.object({
    name: z.string().min(1),
});
export const createPipelineSchema = z.object({
    name: z.string().min(1),
    stages: z
        .array(z.object({
        name: z.string().min(1),
        winProbability: z.number().min(0).max(1).optional(),
        isWonStage: z.boolean().optional(),
        isLostStage: z.boolean().optional(),
    }))
        .min(2)
        .optional(),
});
export const sendProposalSchema = z.object({
    dealId: z.string().uuid(),
    title: z.string().min(1),
    body: z.string().min(1),
    signerContactId: z.string().uuid(),
});
export const listQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(200).default(50),
    q: z.string().optional(),
    tag: z.string().optional(),
    ownerId: z.string().uuid().optional(),
    stageId: z.string().uuid().optional(),
    pipelineId: z.string().uuid().optional(),
    status: z.string().optional(),
});
