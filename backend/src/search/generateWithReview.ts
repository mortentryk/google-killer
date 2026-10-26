import { chatJson, isOpenAIConfigured, mergeUsage } from './openaiJson';
import {
    fallbackTopicGraph,
    GENERATOR_SYSTEM_PROMPT,
    parseReviewResult,
    parseTopicGraph,
    REVIEWER_SYSTEM_PROMPT,
} from './parseTopicGraph';
import { GeneratedTopicGraph, GenerationMeta } from './topicGraphTypes';

export type GenerateWithReviewResult = {
    graph: GeneratedTopicGraph;
    reviewRevisionUsed: boolean;
    reviewedAt?: Date;
    generationMeta: GenerationMeta;
};

async function generateDraft(rawQuery: string): Promise<{
    graph: GeneratedTopicGraph;
    usage?: GenerationMeta;
}> {
    if (!isOpenAIConfigured()) {
        return { graph: fallbackTopicGraph(rawQuery) };
    }

    const result = await chatJson(GENERATOR_SYSTEM_PROMPT, rawQuery);
    if (!result) {
        return { graph: fallbackTopicGraph(rawQuery) };
    }

    return {
        graph: parseTopicGraph(result.parsed, rawQuery),
        usage: {
            generatorModel: result.model,
            promptTokens: result.usage?.prompt_tokens,
            completionTokens: result.usage?.completion_tokens,
            totalTokens: result.usage?.total_tokens,
        },
    };
}

async function reviewDraft(
    rawQuery: string,
    draft: GeneratedTopicGraph
): Promise<{
    graph: GeneratedTopicGraph;
    reviewRevisionUsed: boolean;
    issues: string[];
    usage?: GenerationMeta;
}> {
    if (!isOpenAIConfigured()) {
        return { graph: draft, reviewRevisionUsed: false, issues: [] };
    }

    const reviewModel = process.env.OPENAI_REVIEW_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini';
    const userPayload = JSON.stringify({ query: rawQuery, draft });
    const result = await chatJson(REVIEWER_SYSTEM_PROMPT, userPayload, { model: reviewModel });

    if (!result) {
        return { graph: draft, reviewRevisionUsed: false, issues: ['reviewer_unavailable'] };
    }

    const review = parseReviewResult(result.parsed, rawQuery);
    const usage: GenerationMeta = {
        reviewerModel: result.model,
        promptTokens: result.usage?.prompt_tokens,
        completionTokens: result.usage?.completion_tokens,
        totalTokens: result.usage?.total_tokens,
    };

    if (!review) {
        return { graph: draft, reviewRevisionUsed: false, issues: ['review_parse_failed'], usage };
    }

    if (review.status === 'approved') {
        return { graph: draft, reviewRevisionUsed: false, issues: review.issues, usage };
    }

    if (review.revised) {
        return {
            graph: review.revised,
            reviewRevisionUsed: true,
            issues: review.issues,
            usage,
        };
    }

    return { graph: draft, reviewRevisionUsed: false, issues: review.issues, usage };
}

export async function generateTopicGraphWithReview(rawQuery: string): Promise<GenerateWithReviewResult> {
    const draftResult = await generateDraft(rawQuery);
    const reviewResult = await reviewDraft(rawQuery, draftResult.graph);

    const mergedUsage = mergeUsage(
        draftResult.usage
            ? {
                  prompt_tokens: draftResult.usage.promptTokens,
                  completion_tokens: draftResult.usage.completionTokens,
                  total_tokens: draftResult.usage.totalTokens,
              }
            : undefined,
        reviewResult.usage
            ? {
                  prompt_tokens: reviewResult.usage.promptTokens,
                  completion_tokens: reviewResult.usage.completionTokens,
                  total_tokens: reviewResult.usage.totalTokens,
              }
            : undefined
    );

    const generationMeta: GenerationMeta = {
        generatorModel: draftResult.usage?.generatorModel,
        reviewerModel: reviewResult.usage?.reviewerModel,
        promptTokens: mergedUsage?.prompt_tokens,
        completionTokens: mergedUsage?.completion_tokens,
        totalTokens: mergedUsage?.total_tokens,
        reviewIssues: reviewResult.issues.length ? reviewResult.issues : undefined,
    };

    return {
        graph: reviewResult.graph,
        reviewRevisionUsed: reviewResult.reviewRevisionUsed,
        reviewedAt: isOpenAIConfigured() ? new Date() : undefined,
        generationMeta,
    };
}
