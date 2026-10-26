import { Category } from '@prisma/client';

export type SuggestedSource = {
    title: string;
    url: string;
};

export type PrimaryNodePayload = {
    title: string;
    category: Category;
    aiSummary: string;
    steps: string[];
    difficulty: number;
    timeEstimate: string;
    costEstimate: string;
    tools: string[];
    materials: string[];
    commonMistakes: string[];
};

export type BranchNodeSpec = {
    title: string;
    parentTitle: string;
    aiSummary: string;
};

export type GeneratedTopicGraph = {
    primary: PrimaryNodePayload;
    pathTitles: string[];
    branches: BranchNodeSpec[];
    disambiguationNote?: string;
    suggestedSources?: SuggestedSource[];
};

export type GenerationMeta = {
    generatorModel?: string;
    reviewerModel?: string;
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    reviewIssues?: string[];
};

export type ReviewResult = {
    status: 'approved' | 'needs_fix';
    issues: string[];
    revised?: GeneratedTopicGraph;
};
