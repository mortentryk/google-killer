import { generateTopicGraphWithReview } from './generateWithReview';
import { persistTopicGraphToDb } from './persistTopicGraph';
import { GenerationMeta } from './topicGraphTypes';

export type CreateTopicResult = {
    primaryNodeId: string;
    reviewRevisionUsed: boolean;
    reviewedAt?: Date;
    generationMeta: GenerationMeta;
};

export async function createTopicGraphFromGeneration(rawQuery: string): Promise<CreateTopicResult> {
    const { graph, reviewRevisionUsed, reviewedAt, generationMeta } =
        await generateTopicGraphWithReview(rawQuery);
    const primaryNodeId = await persistTopicGraphToDb(graph);
    return { primaryNodeId, reviewRevisionUsed, reviewedAt, generationMeta };
}

/** @deprecated use createTopicGraphFromGeneration */
export async function createTopicFromGeneration(rawQuery: string): Promise<string> {
    const result = await createTopicGraphFromGeneration(rawQuery);
    return result.primaryNodeId;
}
