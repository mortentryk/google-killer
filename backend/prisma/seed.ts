import { PrismaClient, Category, RelationType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    // Clean up existing data
    await prisma.edge.deleteMany();
    await prisma.node.deleteMany();

    // Create some nodes
    const home = await prisma.node.create({
        data: {
            title: 'Home',
            category: Category.GENERAL,
            aiSummary: 'The starting point for all home improvement tasks.',
            steps: [],
            tools: [],
            materials: [],
            commonMistakes: [],
            timeEstimate: '',
            costEstimate: ''
        }
    });

    const plumbing = await prisma.node.create({
        data: {
            title: 'Plumbing',
            category: Category.PLUMBING,
            aiSummary: 'Everything related to pipes, water, and drainage.',
            steps: [],
            tools: [],
            materials: [],
            commonMistakes: [],
            timeEstimate: '',
            costEstimate: ''
        }
    });

    const radiator = await prisma.node.create({
        data: {
            title: 'Radiator',
            category: Category.PLUMBING,
            aiSummary: 'Heating unit that warms the room.',
            steps: [],
            tools: [],
            materials: [],
            commonMistakes: [],
            timeEstimate: '',
            costEstimate: ''
        }
    });

    const leak = await prisma.node.create({
        data: {
            title: 'Fix Leaking Radiator',
            category: Category.PLUMBING,
            aiSummary: 'How to diagnose and fix a leaking radiator.',
            steps: ['Identify the source of the leak', 'Turn off the valve', 'Tighten the nut', 'Replace the valve if needed'],
            tools: ['Adjustable Wrench', 'Bucket', 'Towel'],
            materials: ['PTFE Tape', 'Replacement Valve'],
            commonMistakes: ['Overtightening the nut', 'Not turning off the water'],
            difficulty: 3,
            timeEstimate: '1 hour',
            costEstimate: '200 DKK'
        }
    });

    // Create edges
    await prisma.edge.create({
        data: {
            fromNodeId: home.id,
            toNodeId: plumbing.id,
            relationType: RelationType.CHILD
        }
    });

    await prisma.edge.create({
        data: {
            fromNodeId: plumbing.id,
            toNodeId: radiator.id,
            relationType: RelationType.CHILD
        }
    });

    await prisma.edge.create({
        data: {
            fromNodeId: radiator.id,
            toNodeId: leak.id,
            relationType: RelationType.CHILD
        }
    });

    console.log('Seeding completed.');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
