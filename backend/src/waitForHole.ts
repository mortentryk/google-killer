import prisma from './db/client'

const POLL_MS = 250
const DEFAULT_TIMEOUT_MS = 120_000

export async function waitForReadyHole(rabbitHoleId: string, timeoutMs = DEFAULT_TIMEOUT_MS) {
    const deadline = Date.now() + timeoutMs
    while (Date.now() < deadline) {
        const hole = await prisma.rabbitHole.findUnique({ where: { id: rabbitHoleId } })
        if (!hole) return null
        if (hole.status === 'READY') return hole
        if (hole.status === 'FAILED') return null
        await new Promise(resolve => setTimeout(resolve, POLL_MS))
    }
    return null
}
