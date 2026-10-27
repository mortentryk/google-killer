import { Category, RelationType, RabbitHoleStatus } from '@prisma/client'
import prisma from './db/client'
import { generateRabbitHoleGraph } from './generateHole'
import { intentSignature, pickBestHole, tokenSet, vocabularyFromTexts } from './intent'
import { waitForReadyHole } from './waitForHole'

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

export type SearchResult = {
    nodes: NodeRow[]
    edges: EdgeRow[]
    path: string[]
    rabbitHoleId: string
    matched: 'exact' | 'fuzzy' | 'discovered' | 'generated'
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

async function holeVocabulary(nodes: NodeRow[], priorQueries: { text: string }[]) {
    const texts = [
        ...priorQueries.map(query => query.text),
        ...nodes.flatMap(node => nodeTexts(node)),
    ]
    return vocabularyFromTexts(texts)
}

async function resultFromHole(
    rabbitHoleId: string,
    focusNodeId: string | null | undefined,
    matched: SearchResult['matched'],
): Promise<SearchResult> {
    const graph = await loadHoleGraph(rabbitHoleId)
    const focus = graph.nodes.find(node => node.id === focusNodeId) || graph.nodes[0]
    return {
        ...graph,
        path: focus ? buildPath(new Set(graph.nodes.map(node => node.id)), graph.edges, focus.id) : [],
        rabbitHoleId,
        matched,
    }
}

async function resolveLockedHole(query: string, signature: string): Promise<SearchResult | null> {
    const byIntent = await prisma.rabbitHole.findUnique({ where: { intentSignature: signature } })
    if (!byIntent) return null
    if (byIntent.status === RabbitHoleStatus.READY) {
        return resultFromHole(byIntent.id, byIntent.focusNodeId, 'generated')
    }
    if (byIntent.status === RabbitHoleStatus.GENERATING) {
        const ready = await waitForReadyHole(byIntent.id)
        if (ready) return resultFromHole(ready.id, ready.focusNodeId, 'generated')
    }
    return null
}

export async function resolveSearch(query: string): Promise<SearchResult> {
    const signature = intentSignature(query)

    const exact = await prisma.searchQuery.findFirst({
        where: { intentSignature: signature },
        orderBy: { createdAt: 'asc' },
        include: { rabbitHole: true },
    })
    if (exact?.rabbitHole?.status === RabbitHoleStatus.READY) {
        return resultFromHole(exact.rabbitHole.id, exact.rabbitHole.focusNodeId, 'exact')
    }

    const locked = await resolveLockedHole(query, signature)
    if (locked) {
        await recordQuery(query, locked.rabbitHoleId)
        return { ...locked, matched: 'exact' }
    }

    const holes = await prisma.rabbitHole.findMany({
        where: { status: RabbitHoleStatus.READY },
        include: {
            nodes: true,
            searchQueries: { select: { text: true } },
        },
    })

    const ranked = pickBestHole(
        query,
        await Promise.all(holes.map(async hole => ({
            hole,
            vocabulary: await holeVocabulary(hole.nodes, hole.searchQueries),
        }))),
    )

    if (ranked) {
        await recordQuery(query, ranked.hole.id)
        return resultFromHole(ranked.hole.id, ranked.hole.focusNodeId, 'fuzzy')
    }

    const allNodes = await prisma.node.findMany({ where: { rabbitHoleId: null } })
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
                intentSignature: signature,
                status: RabbitHoleStatus.READY,
                nodes: { connect: nodes.map(node => ({ id: node.id })) },
            },
        })
        await recordQuery(query, hole.id)
        return {
            nodes,
            edges,
            path: buildPath(component, edges, bestNode.id),
            rabbitHoleId: hole.id,
            matched: 'discovered',
        }
    }

    return generateWithLock(query, signature)
}

async function generateWithLock(query: string, signature: string): Promise<SearchResult> {
    const slug = `${slugify(query.slice(0, 48))}-${signature.slice(0, 10)}`
    let holeId: string

    try {
        const created = await prisma.rabbitHole.create({
            data: {
                slug,
                title: query.trim().replace(/\?$/, ''),
                seedQuery: query,
                intentSignature: signature,
                status: RabbitHoleStatus.GENERATING,
            },
        })
        holeId = created.id
    } catch {
        const raced = await resolveLockedHole(query, signature)
        if (raced) {
            await recordQuery(query, raced.rabbitHoleId)
            return { ...raced, matched: 'exact' }
        }
        throw new Error('Could not acquire generation lock')
    }

    try {
        const { graph, audit } = await generateRabbitHoleGraph(query)
        const result = await persistGeneratedGraph(graph, holeId)
        await prisma.rabbitHole.update({
            where: { id: holeId },
            data: {
                status: RabbitHoleStatus.READY,
                title: graph.title,
                generationAudit: audit,
            },
        })
        await recordQuery(query, holeId)
        return { ...result, matched: 'generated' as const }
    } catch (error) {
        await prisma.rabbitHole.update({
            where: { id: holeId },
            data: { status: RabbitHoleStatus.FAILED },
        })
        throw error
    }
}

async function persistGeneratedGraph(
    graph: import('./generateHole').GeneratedGraph,
    rabbitHoleId: string,
) {
    const ids = new Map<string, string>()
    for (const node of graph.nodes) {
        const created = await prisma.node.create({
            data: {
                slug: `${rabbitHoleId.slice(0, 8)}-${node.slug}`,
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
                rabbitHoleId,
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
    await prisma.rabbitHole.update({ where: { id: rabbitHoleId }, data: { focusNodeId } })
    const nodes = await prisma.node.findMany({ where: { rabbitHoleId } })
    return {
        nodes,
        edges,
        path: focusNodeId ? buildPath(new Set(nodes.map(node => node.id)), edges, focusNodeId) : [],
        rabbitHoleId,
    }
}
