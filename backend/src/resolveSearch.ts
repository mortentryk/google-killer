import { Category, Prisma, RelationType } from '@prisma/client'
import prisma from './db/client'
import { generateRabbitHoleGraph } from './generateHole'
import { intentSignature, pickBestHole, tokenSet, vocabularyFromTexts } from './intent'

type NodeRow = {
    id: string
    title: string
    aiSummary: string
    slug: string | null
}

type EdgeRow = {
    id: string
    fromNodeId: string
    toNodeId: string
    relationType: string
}

function nodeTexts(node: NodeRow): string[] {
    return [node.title, node.aiSummary]
}

function slugify(title: string): string {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'topic'
}

function buildPath(nodeIds: Set<string>, edges: EdgeRow[], focusId: string): string[] {
    const parents = new Map<string, string>()
    for (const edge of edges) {
        if (edge.relationType !== 'CHILD') continue
        if (!nodeIds.has(edge.fromNodeId) || !nodeIds.has(edge.toNodeId)) continue
        parents.set(edge.toNodeId, edge.fromNodeId)
    }
    const path: string[] = []
    let current: string | undefined = focusId
    const guard = new Set<string>()
    while (current && nodeIds.has(current) && !guard.has(current)) {
        guard.add(current)
        path.unshift(current)
        current = parents.get(current)
    }
    return path.length ? path : [focusId]
}

function connectedComponent(seedId: string, edges: EdgeRow[]): Set<string> {
    const adj = new Map<string, Set<string>>()
    const touch = (a: string, b: string) => {
        if (!adj.has(a)) adj.set(a, new Set())
        adj.get(a)!.add(b)
    }
    for (const edge of edges) {
        touch(edge.fromNodeId, edge.toNodeId)
        touch(edge.toNodeId, edge.fromNodeId)
    }
    const seen = new Set<string>()
    const stack = [seedId]
    while (stack.length) {
        const id = stack.pop()!
        if (seen.has(id)) continue
        seen.add(id)
        for (const next of adj.get(id) || []) stack.push(next)
    }
    return seen
}

function scoreNode(query: Set<string>, node: NodeRow): number {
    const nodeTokens = tokenSet(node.title + ' ' + node.aiSummary)
    let overlap = 0
    for (const token of query) {
        if (nodeTokens.has(token)) overlap += 1
    }
    if (overlap === 0) return 0
    return overlap / query.size + overlap / Math.max(nodeTokens.size, 1)
}

async function loadHoleGraph(rabbitHoleId: string) {
    const nodes = await prisma.node.findMany({ where: { rabbitHoleId } })
    const ids = nodes.map(node => node.id)
    const edges = ids.length
        ? await prisma.edge.findMany({
            where: { fromNodeId: { in: ids }, toNodeId: { in: ids } },
        })
        : []
    return { nodes, edges }
}

async function recordQuery(text: string, rabbitHoleId: string) {
    await prisma.searchQuery.create({
        data: {
            text,
            intentSignature: intentSignature(text),
            rabbitHoleId,
        },
    })
}

async function holeVocabulary(holeId: string, nodes: NodeRow[], priorQueries: { text: string }[]) {
    const texts = [
        ...priorQueries.map(query => query.text),
        ...nodes.flatMap(node => nodeTexts(node)),
    ]
    return vocabularyFromTexts(texts)
}

export async function resolveSearch(query: string) {
    const signature = intentSignature(query)

    const exact = await prisma.searchQuery.findFirst({
        where: { intentSignature: signature },
        orderBy: { createdAt: 'asc' },
        include: { rabbitHole: true },
    })
    if (exact?.rabbitHole) {
        const graph = await loadHoleGraph(exact.rabbitHole.id)
        const focus = graph.nodes.find(node => node.id === exact.rabbitHole!.focusNodeId)
            || graph.nodes[0]
        return {
            ...graph,
            path: focus ? buildPath(new Set(graph.nodes.map(node => node.id)), graph.edges, focus.id) : [],
            rabbitHoleId: exact.rabbitHole.id,
            matched: 'exact' as const,
        }
    }

    const holes = await prisma.rabbitHole.findMany({
        include: {
            nodes: true,
            searchQueries: { select: { text: true } },
        },
    })

    const ranked = pickBestHole(
        query,
        await Promise.all(holes.map(async hole => ({
            hole,
            vocabulary: await holeVocabulary(hole.id, hole.nodes, hole.searchQueries),
        }))),
    )

    if (ranked) {
        await recordQuery(query, ranked.hole.id)
        const graph = await loadHoleGraph(ranked.hole.id)
        const focus = graph.nodes.find(node => node.id === ranked.hole.focusNodeId) || graph.nodes[0]
        return {
            ...graph,
            path: focus ? buildPath(new Set(graph.nodes.map(node => node.id)), graph.edges, focus.id) : [],
            rabbitHoleId: ranked.hole.id,
            matched: 'fuzzy' as const,
        }
    }

    const allNodes = await prisma.node.findMany()
    const allEdges = await prisma.edge.findMany()
    const queryTokens = tokenSet(query)

    let bestNode: NodeRow | null = null
    let bestScore = 0
    for (const node of allNodes) {
        const score = scoreNode(queryTokens, node)
        if (score > bestScore) {
            bestScore = score
            bestNode = node
        }
    }

    if (bestNode && bestScore >= 0.35) {
        const component = connectedComponent(bestNode.id, allEdges)
        const nodes = allNodes.filter(node => component.has(node.id))
        const edges = allEdges.filter(edge => component.has(edge.fromNodeId) && component.has(edge.toNodeId))

        const hole = await prisma.rabbitHole.create({
            data: {
                slug: slugify(bestNode.title),
                title: bestNode.title,
                focusNodeId: bestNode.id,
                seedQuery: query,
                nodes: { connect: nodes.map(node => ({ id: node.id })) },
            },
        })
        await recordQuery(query, hole.id)
        return {
            nodes,
            edges,
            path: buildPath(component, edges, bestNode.id),
            rabbitHoleId: hole.id,
            matched: 'discovered' as const,
        }
    }

    const aiGraph = await generateRabbitHoleGraph(query)
    if (aiGraph) {
        const generated = await persistGeneratedGraph(query, aiGraph)
        await recordQuery(query, generated.rabbitHoleId)
        return generated
    }

    const generated = await createPlaceholderHole(query)
    await recordQuery(query, generated.rabbitHoleId)
    return generated
}

async function persistGeneratedGraph(query: string, graph: NonNullable<Awaited<ReturnType<typeof generateRabbitHoleGraph>>>) {
    const slug = slugify(graph.title)
    const hole = await prisma.rabbitHole.create({
        data: { slug, title: graph.title, seedQuery: query },
    })
    const ids = new Map<string, string>()
    for (const node of graph.nodes) {
        const created = await prisma.node.create({
            data: {
                slug: node.slug,
                title: node.title,
                category: Category.GENERAL,
                aiSummary: node.aiSummary,
                steps: node.steps,
                tools: node.tools,
                materials: node.materials,
                commonMistakes: node.commonMistakes,
                difficulty: node.difficulty,
                timeEstimate: node.timeEstimate,
                costEstimate: node.costEstimate,
                rabbitHoleId: hole.id,
            },
        })
        ids.set(node.slug, created.id)
    }
    const edges: EdgeRow[] = []
    for (const edge of graph.edges) {
        const fromNodeId = ids.get(edge.from)
        const toNodeId = ids.get(edge.to)
        if (!fromNodeId || !toNodeId) continue
        const created = await prisma.edge.create({
            data: {
                fromNodeId,
                toNodeId,
                relationType: RelationType[edge.relationType],
            },
        })
        edges.push(created)
    }
    const focusNodeId = ids.get(graph.focusSlug) || [...ids.values()][0]
    await prisma.rabbitHole.update({ where: { id: hole.id }, data: { focusNodeId } })
    const nodes = await prisma.node.findMany({ where: { rabbitHoleId: hole.id } })
    return {
        nodes,
        edges,
        path: focusNodeId ? buildPath(new Set(nodes.map(node => node.id)), edges, focusNodeId) : [],
        rabbitHoleId: hole.id,
        matched: 'generated' as const,
    }
}

/** Single-node stub until generateRabbitHoleGraph is implemented. */
async function createPlaceholderHole(query: string) {
    const title = query.trim().replace(/\?$/, '')
    const slug = slugify(title)
    const uniqueSlug = `${slug}-${Date.now().toString(36)}`

    const hole = await prisma.rabbitHole.create({
        data: {
            slug: uniqueSlug,
            title,
            seedQuery: query,
        },
    })

    const node = await prisma.node.create({
        data: {
            slug: `${uniqueSlug}-root`,
            title,
            category: Category.GENERAL,
            aiSummary: 'This rabbit hole will be expanded by AI from your search.',
            steps: [] as Prisma.InputJsonValue,
            tools: [] as Prisma.InputJsonValue,
            materials: [] as Prisma.InputJsonValue,
            commonMistakes: [] as Prisma.InputJsonValue,
            timeEstimate: '',
            costEstimate: '',
            rabbitHoleId: hole.id,
        },
    })

    await prisma.rabbitHole.update({
        where: { id: hole.id },
        data: { focusNodeId: node.id },
    })

    return {
        nodes: [node],
        edges: [] as EdgeRow[],
        path: [node.id],
        rabbitHoleId: hole.id,
        matched: 'generated' as const,
    }
}
