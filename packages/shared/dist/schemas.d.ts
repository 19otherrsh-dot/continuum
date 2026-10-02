import { z } from 'zod';
/**
 * Request schemas shared by the API (for validation) and the web app (for
 * client-side form checks), so the two can never drift.
 */
export declare const recordSourceSchema: z.ZodEnum<["HUMAN", "AGENT_INFERRED", "IMPORTED", "ENRICHED"]>;
export declare const entityTypeSchema: z.ZodEnum<["CONTACT", "COMPANY", "DEAL", "PROJECT", "TASK"]>;
export declare const workspaceMotionSchema: z.ZodEnum<["SALES", "AGENCY", "HYBRID"]>;
export declare const userRoleSchema: z.ZodEnum<["ADMIN", "MANAGER", "MEMBER"]>;
export declare const signupSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    name: z.ZodString;
    organizationName: z.ZodString;
    motion: z.ZodEnum<["SALES", "AGENCY", "HYBRID"]>;
}, "strip", z.ZodTypeAny, {
    name: string;
    email: string;
    password: string;
    organizationName: string;
    motion: "SALES" | "AGENCY" | "HYBRID";
}, {
    name: string;
    email: string;
    password: string;
    organizationName: string;
    motion: "SALES" | "AGENCY" | "HYBRID";
}>;
export declare const loginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
}, {
    email: string;
    password: string;
}>;
export declare const createCompanySchema: z.ZodObject<{
    name: z.ZodString;
    domain: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    website: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    customFields: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    domain?: string | null | undefined;
    website?: string | null | undefined;
    tags?: string[] | undefined;
    customFields?: Record<string, unknown> | undefined;
}, {
    name: string;
    domain?: string | null | undefined;
    website?: string | null | undefined;
    tags?: string[] | undefined;
    customFields?: Record<string, unknown> | undefined;
}>;
export declare const updateCompanySchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    domain: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    website: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    tags: z.ZodOptional<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
    customFields: z.ZodOptional<z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    domain?: string | null | undefined;
    website?: string | null | undefined;
    tags?: string[] | undefined;
    customFields?: Record<string, unknown> | undefined;
}, {
    name?: string | undefined;
    domain?: string | null | undefined;
    website?: string | null | undefined;
    tags?: string[] | undefined;
    customFields?: Record<string, unknown> | undefined;
}>;
export declare const createContactSchema: z.ZodObject<{
    email: z.ZodString;
    firstName: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    lastName: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    phone: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    title: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    companyId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    customFields: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    email: string;
    tags?: string[] | undefined;
    customFields?: Record<string, unknown> | undefined;
    title?: string | null | undefined;
    firstName?: string | null | undefined;
    lastName?: string | null | undefined;
    phone?: string | null | undefined;
    companyId?: string | null | undefined;
}, {
    email: string;
    tags?: string[] | undefined;
    customFields?: Record<string, unknown> | undefined;
    title?: string | null | undefined;
    firstName?: string | null | undefined;
    lastName?: string | null | undefined;
    phone?: string | null | undefined;
    companyId?: string | null | undefined;
}>;
export declare const updateContactSchema: z.ZodObject<Omit<{
    email: z.ZodOptional<z.ZodString>;
    firstName: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    lastName: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    phone: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    title: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    companyId: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    tags: z.ZodOptional<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
    customFields: z.ZodOptional<z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
}, "email"> & {
    email: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    tags?: string[] | undefined;
    customFields?: Record<string, unknown> | undefined;
    email?: string | undefined;
    title?: string | null | undefined;
    firstName?: string | null | undefined;
    lastName?: string | null | undefined;
    phone?: string | null | undefined;
    companyId?: string | null | undefined;
}, {
    tags?: string[] | undefined;
    customFields?: Record<string, unknown> | undefined;
    email?: string | undefined;
    title?: string | null | undefined;
    firstName?: string | null | undefined;
    lastName?: string | null | undefined;
    phone?: string | null | undefined;
    companyId?: string | null | undefined;
}>;
export declare const createDealSchema: z.ZodObject<{
    name: z.ZodString;
    pipelineId: z.ZodOptional<z.ZodString>;
    stageId: z.ZodOptional<z.ZodString>;
    valueCents: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    currency: z.ZodOptional<z.ZodString>;
    ownerId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    companyId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    contactIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    expectedCloseDate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    customFields: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    tags?: string[] | undefined;
    customFields?: Record<string, unknown> | undefined;
    companyId?: string | null | undefined;
    pipelineId?: string | undefined;
    stageId?: string | undefined;
    valueCents?: number | null | undefined;
    currency?: string | undefined;
    ownerId?: string | null | undefined;
    contactIds?: string[] | undefined;
    expectedCloseDate?: string | null | undefined;
}, {
    name: string;
    tags?: string[] | undefined;
    customFields?: Record<string, unknown> | undefined;
    companyId?: string | null | undefined;
    pipelineId?: string | undefined;
    stageId?: string | undefined;
    valueCents?: number | null | undefined;
    currency?: string | undefined;
    ownerId?: string | null | undefined;
    contactIds?: string[] | undefined;
    expectedCloseDate?: string | null | undefined;
}>;
export declare const updateDealSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    pipelineId: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    stageId: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    valueCents: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
    currency: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    ownerId: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    companyId: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    contactIds: z.ZodOptional<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
    expectedCloseDate: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    tags: z.ZodOptional<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
    customFields: z.ZodOptional<z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    tags?: string[] | undefined;
    customFields?: Record<string, unknown> | undefined;
    companyId?: string | null | undefined;
    pipelineId?: string | undefined;
    stageId?: string | undefined;
    valueCents?: number | null | undefined;
    currency?: string | undefined;
    ownerId?: string | null | undefined;
    contactIds?: string[] | undefined;
    expectedCloseDate?: string | null | undefined;
}, {
    name?: string | undefined;
    tags?: string[] | undefined;
    customFields?: Record<string, unknown> | undefined;
    companyId?: string | null | undefined;
    pipelineId?: string | undefined;
    stageId?: string | undefined;
    valueCents?: number | null | undefined;
    currency?: string | undefined;
    ownerId?: string | null | undefined;
    contactIds?: string[] | undefined;
    expectedCloseDate?: string | null | undefined;
}>;
/** Stage moves are separate from generic updates so `stageSource` is always set explicitly. */
export declare const moveDealStageSchema: z.ZodObject<{
    stageId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    stageId: string;
}, {
    stageId: string;
}>;
export declare const addDealContactSchema: z.ZodObject<{
    contactId: z.ZodString;
    role: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    contactId: string;
    role?: string | null | undefined;
}, {
    contactId: string;
    role?: string | null | undefined;
}>;
export declare const createActivityNoteSchema: z.ZodObject<{
    subject: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    body: z.ZodString;
    entityType: z.ZodEnum<["CONTACT", "COMPANY", "DEAL", "PROJECT", "TASK"]>;
    entityId: z.ZodString;
    contactIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    occurredAt: z.ZodOptional<z.ZodString>;
    /** Client-generated id lets an offline note sync exactly once (FR-MOBILE-04 groundwork). */
    clientRequestId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    body: string;
    entityType: "CONTACT" | "COMPANY" | "DEAL" | "PROJECT" | "TASK";
    entityId: string;
    subject?: string | null | undefined;
    occurredAt?: string | undefined;
    contactIds?: string[] | undefined;
    clientRequestId?: string | undefined;
}, {
    body: string;
    entityType: "CONTACT" | "COMPANY" | "DEAL" | "PROJECT" | "TASK";
    entityId: string;
    subject?: string | null | undefined;
    occurredAt?: string | undefined;
    contactIds?: string[] | undefined;
    clientRequestId?: string | undefined;
}>;
export declare const createTaskSchema: z.ZodObject<{
    title: z.ZodString;
    notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    dueAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    ownerId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    entityType: z.ZodOptional<z.ZodNullable<z.ZodEnum<["CONTACT", "COMPANY", "DEAL", "PROJECT", "TASK"]>>>;
    entityId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    title: string;
    ownerId?: string | null | undefined;
    entityType?: "CONTACT" | "COMPANY" | "DEAL" | "PROJECT" | "TASK" | null | undefined;
    entityId?: string | null | undefined;
    notes?: string | null | undefined;
    dueAt?: string | null | undefined;
}, {
    title: string;
    ownerId?: string | null | undefined;
    entityType?: "CONTACT" | "COMPANY" | "DEAL" | "PROJECT" | "TASK" | null | undefined;
    entityId?: string | null | undefined;
    notes?: string | null | undefined;
    dueAt?: string | null | undefined;
}>;
export declare const updateTaskSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    dueAt: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    ownerId: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    entityType: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodEnum<["CONTACT", "COMPANY", "DEAL", "PROJECT", "TASK"]>>>>;
    entityId: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
} & {
    status: z.ZodOptional<z.ZodEnum<["OPEN", "COMPLETED", "CANCELLED"]>>;
}, "strip", z.ZodTypeAny, {
    title?: string | undefined;
    status?: "OPEN" | "COMPLETED" | "CANCELLED" | undefined;
    ownerId?: string | null | undefined;
    entityType?: "CONTACT" | "COMPANY" | "DEAL" | "PROJECT" | "TASK" | null | undefined;
    entityId?: string | null | undefined;
    notes?: string | null | undefined;
    dueAt?: string | null | undefined;
}, {
    title?: string | undefined;
    status?: "OPEN" | "COMPLETED" | "CANCELLED" | undefined;
    ownerId?: string | null | undefined;
    entityType?: "CONTACT" | "COMPANY" | "DEAL" | "PROJECT" | "TASK" | null | undefined;
    entityId?: string | null | undefined;
    notes?: string | null | undefined;
    dueAt?: string | null | undefined;
}>;
export declare const convertDealSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    ownerId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    ownerId?: string | null | undefined;
}, {
    name?: string | undefined;
    ownerId?: string | null | undefined;
}>;
export declare const createMilestoneSchema: z.ZodObject<{
    title: z.ZodString;
    ownerId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    dueDate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    title: string;
    ownerId?: string | null | undefined;
    dueDate?: string | null | undefined;
}, {
    title: string;
    ownerId?: string | null | undefined;
    dueDate?: string | null | undefined;
}>;
export declare const updateMilestoneSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    ownerId: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    dueDate: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
} & {
    completed: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    title?: string | undefined;
    ownerId?: string | null | undefined;
    dueDate?: string | null | undefined;
    completed?: boolean | undefined;
}, {
    title?: string | undefined;
    ownerId?: string | null | undefined;
    dueDate?: string | null | undefined;
    completed?: boolean | undefined;
}>;
export declare const updateProjectSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<["ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"]>>;
    ownerId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    customFields: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    customFields?: Record<string, unknown> | undefined;
    status?: "ACTIVE" | "ON_HOLD" | "COMPLETED" | "CANCELLED" | undefined;
    ownerId?: string | null | undefined;
}, {
    name?: string | undefined;
    customFields?: Record<string, unknown> | undefined;
    status?: "ACTIVE" | "ON_HOLD" | "COMPLETED" | "CANCELLED" | undefined;
    ownerId?: string | null | undefined;
}>;
/**
 * Confirming a proposal may carry a corrected payload. When present, the
 * corrected value — not the original AI proposal — is what gets applied, and
 * the delta is retained as future inference context (FR-AGENT-03/04).
 */
export declare const confirmAgentActionSchema: z.ZodObject<{
    correctedPayload: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    correctedPayload?: Record<string, unknown> | undefined;
}, {
    correctedPayload?: Record<string, unknown> | undefined;
}>;
export declare const rejectAgentActionSchema: z.ZodObject<{
    reason: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    reason?: string | null | undefined;
}, {
    reason?: string | null | undefined;
}>;
export declare const placeCallSchema: z.ZodObject<{
    contactId: z.ZodString;
    dealId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    toNumber: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    contactId: string;
    dealId?: string | null | undefined;
    toNumber?: string | undefined;
}, {
    contactId: string;
    dealId?: string | null | undefined;
    toNumber?: string | undefined;
}>;
export declare const createExclusionSchema: z.ZodObject<{
    kind: z.ZodEnum<["SENDER", "DOMAIN", "THREAD"]>;
    value: z.ZodString;
    connectionId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    value: string;
    kind: "SENDER" | "DOMAIN" | "THREAD";
    connectionId?: string | null | undefined;
}, {
    value: string;
    kind: "SENDER" | "DOMAIN" | "THREAD";
    connectionId?: string | null | undefined;
}>;
export declare const createCustomFieldSchema: z.ZodObject<{
    entityType: z.ZodEnum<["CONTACT", "COMPANY", "DEAL", "PROJECT", "TASK"]>;
    key: z.ZodString;
    label: z.ZodString;
    type: z.ZodEnum<["TEXT", "NUMBER", "DATE", "BOOLEAN", "SELECT"]>;
    options: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    type: "TEXT" | "NUMBER" | "DATE" | "BOOLEAN" | "SELECT";
    entityType: "CONTACT" | "COMPANY" | "DEAL" | "PROJECT" | "TASK";
    key: string;
    label: string;
    options?: string[] | undefined;
}, {
    type: "TEXT" | "NUMBER" | "DATE" | "BOOLEAN" | "SELECT";
    entityType: "CONTACT" | "COMPANY" | "DEAL" | "PROJECT" | "TASK";
    key: string;
    label: string;
    options?: string[] | undefined;
}>;
export declare const updateOrgSettingsSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    motion: z.ZodOptional<z.ZodEnum<["SALES", "AGENCY", "HYBRID"]>>;
    showProjectsUi: z.ZodOptional<z.ZodBoolean>;
    stallingThresholdDays: z.ZodOptional<z.ZodNumber>;
    agentHighThreshold: z.ZodOptional<z.ZodNumber>;
    agentMediumThreshold: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    motion?: "SALES" | "AGENCY" | "HYBRID" | undefined;
    showProjectsUi?: boolean | undefined;
    stallingThresholdDays?: number | undefined;
    agentHighThreshold?: number | undefined;
    agentMediumThreshold?: number | undefined;
}, {
    name?: string | undefined;
    motion?: "SALES" | "AGENCY" | "HYBRID" | undefined;
    showProjectsUi?: boolean | undefined;
    stallingThresholdDays?: number | undefined;
    agentHighThreshold?: number | undefined;
    agentMediumThreshold?: number | undefined;
}>;
export declare const inviteUserSchema: z.ZodObject<{
    email: z.ZodString;
    name: z.ZodString;
    role: z.ZodEnum<["ADMIN", "MANAGER", "MEMBER"]>;
    teamId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    name: string;
    email: string;
    password: string;
    role: "ADMIN" | "MANAGER" | "MEMBER";
    teamId?: string | null | undefined;
}, {
    name: string;
    email: string;
    password: string;
    role: "ADMIN" | "MANAGER" | "MEMBER";
    teamId?: string | null | undefined;
}>;
export declare const updateUserRoleSchema: z.ZodObject<{
    role: z.ZodOptional<z.ZodEnum<["ADMIN", "MANAGER", "MEMBER"]>>;
    teamId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    role?: "ADMIN" | "MANAGER" | "MEMBER" | undefined;
    teamId?: string | null | undefined;
}, {
    role?: "ADMIN" | "MANAGER" | "MEMBER" | undefined;
    teamId?: string | null | undefined;
}>;
export declare const createApiTokenSchema: z.ZodObject<{
    name: z.ZodString;
}, "strip", z.ZodTypeAny, {
    name: string;
}, {
    name: string;
}>;
export declare const createPipelineSchema: z.ZodObject<{
    name: z.ZodString;
    stages: z.ZodOptional<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        winProbability: z.ZodOptional<z.ZodNumber>;
        isWonStage: z.ZodOptional<z.ZodBoolean>;
        isLostStage: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        winProbability?: number | undefined;
        isWonStage?: boolean | undefined;
        isLostStage?: boolean | undefined;
    }, {
        name: string;
        winProbability?: number | undefined;
        isWonStage?: boolean | undefined;
        isLostStage?: boolean | undefined;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    name: string;
    stages?: {
        name: string;
        winProbability?: number | undefined;
        isWonStage?: boolean | undefined;
        isLostStage?: boolean | undefined;
    }[] | undefined;
}, {
    name: string;
    stages?: {
        name: string;
        winProbability?: number | undefined;
        isWonStage?: boolean | undefined;
        isLostStage?: boolean | undefined;
    }[] | undefined;
}>;
export declare const sendProposalSchema: z.ZodObject<{
    dealId: z.ZodString;
    title: z.ZodString;
    body: z.ZodString;
    signerContactId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    title: string;
    body: string;
    dealId: string;
    signerContactId: string;
}, {
    title: string;
    body: string;
    dealId: string;
    signerContactId: string;
}>;
export declare const listQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    pageSize: z.ZodDefault<z.ZodNumber>;
    q: z.ZodOptional<z.ZodString>;
    tag: z.ZodOptional<z.ZodString>;
    ownerId: z.ZodOptional<z.ZodString>;
    stageId: z.ZodOptional<z.ZodString>;
    pipelineId: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    page: number;
    pageSize: number;
    status?: string | undefined;
    pipelineId?: string | undefined;
    stageId?: string | undefined;
    ownerId?: string | undefined;
    q?: string | undefined;
    tag?: string | undefined;
}, {
    status?: string | undefined;
    pipelineId?: string | undefined;
    stageId?: string | undefined;
    ownerId?: string | undefined;
    page?: number | undefined;
    pageSize?: number | undefined;
    q?: string | undefined;
    tag?: string | undefined;
}>;
export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateContactInput = z.infer<typeof createContactSchema>;
export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
export type CreateDealInput = z.infer<typeof createDealSchema>;
export type ListQuery = z.infer<typeof listQuerySchema>;
