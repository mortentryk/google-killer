export enum Category {
    PLUMBING = 'PLUMBING',
    ELECTRICAL = 'ELECTRICAL',
    GARDEN = 'GARDEN',
    CARPENTRY = 'CARPENTRY',
    CONSTRUCTION = 'CONSTRUCTION',
    GENERAL = 'GENERAL',
    TOOLS_SAFETY = 'TOOLS_SAFETY',
}

export interface Node {
    id: string;
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
    createdAt: string;
    updatedAt: string;
}

export interface Edge {
    id: string;
    fromNodeId: string;
    toNodeId: string;
    relationType: string;
}

export interface GraphData {
    nodes: Node[];
    edges: Edge[];
    path: string[]; // List of Node IDs in the path
}
