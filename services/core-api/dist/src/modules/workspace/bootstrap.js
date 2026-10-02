import { DEFAULT_AGENCY_STAGES, DEFAULT_SALES_STAGES } from '@continuum/shared';
import { prisma } from '../../db/client.js';
import { orgId } from '../../db/context.js';
/**
 * A new workspace must be immediately usable — no configuration screen stands
 * between signup and first value (FR-PIPE-02, Journey 1 step 5). Selecting a
 * motion is the only setup question, and it decides both the default pipeline
 * template and whether the Project object is visible at all.
 */
export function stageTemplateFor(motion) {
    return motion === 'AGENCY' ? DEFAULT_AGENCY_STAGES : DEFAULT_SALES_STAGES;
}
export function showProjectsFor(motion) {
    return motion === 'AGENCY' || motion === 'HYBRID';
}
export async function createDefaultPipeline(motion, name = 'Sales Pipeline') {
    const template = stageTemplateFor(motion);
    return prisma.pipeline.create({
        data: {
            organizationId: orgId(),
            name: motion === 'AGENCY' ? 'Client Pipeline' : name,
            isDefault: true,
            stages: {
                create: template.map((stage, index) => ({
                    name: stage.name,
                    order: index,
                    winProbability: stage.winProbability,
                    isWonStage: 'isWonStage' in stage ? Boolean(stage.isWonStage) : false,
                    isLostStage: 'isLostStage' in stage ? Boolean(stage.isLostStage) : false,
                })),
            },
        },
        include: { stages: true },
    });
}
/** Resolves the workspace's default pipeline, creating one if it somehow lacks any. */
export async function defaultPipeline(motion) {
    const existing = await prisma.pipeline.findFirst({
        where: { isDefault: true },
        include: { stages: { orderBy: { order: 'asc' } } },
    });
    if (existing)
        return existing;
    return createDefaultPipeline(motion);
}
/** The stage a newly captured or created deal starts in. */
export async function firstStageId(pipelineId) {
    const stage = await prisma.stage.findFirst({
        where: { pipelineId },
        orderBy: { order: 'asc' },
    });
    if (!stage)
        throw new Error(`Pipeline ${pipelineId} has no stages`);
    return stage.id;
}
