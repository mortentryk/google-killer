import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { appendJourneyStep, createJourney, getJourney } from '../api/client';
import { JourneyStep, RabbitHoleStory } from '../types';

const STORAGE_KEY = 'rabbithole.journeyId';

type RecordInput = {
    nodeId: string;
    slug: string;
    displayQuery: string;
    source?: 'search' | 'trail' | 'topic';
};

type RabbitHoleContextValue = {
    journeyId: string | null;
    steps: JourneyStep[];
    loading: boolean;
    recordVisit: (input: RecordInput) => Promise<void>;
    refresh: () => Promise<void>;
    startNewHole: () => Promise<void>;
    sharePath: string | null;
};

const RabbitHoleContext = createContext<RabbitHoleContextValue | null>(null);

export function RabbitHoleProvider({ children }: { children: React.ReactNode }) {
    const [journeyId, setJourneyId] = useState<string | null>(() => sessionStorage.getItem(STORAGE_KEY));
    const [steps, setSteps] = useState<JourneyStep[]>([]);
    const [loading, setLoading] = useState(false);

    const applyStory = useCallback((story: RabbitHoleStory | null) => {
        if (!story) {
            setSteps([]);
            return;
        }
        setJourneyId(story.id);
        sessionStorage.setItem(STORAGE_KEY, story.id);
        setSteps(story.steps);
    }, []);

    const refresh = useCallback(async () => {
        const id = sessionStorage.getItem(STORAGE_KEY);
        if (!id) {
            setSteps([]);
            setJourneyId(null);
            return;
        }
        setLoading(true);
        try {
            applyStory(await getJourney(id));
        } catch {
            sessionStorage.removeItem(STORAGE_KEY);
            setJourneyId(null);
            setSteps([]);
        } finally {
            setLoading(false);
        }
    }, [applyStory]);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    const ensureJourneyId = useCallback(async (): Promise<string> => {
        const existing = sessionStorage.getItem(STORAGE_KEY);
        if (existing) {
            setJourneyId(existing);
            return existing;
        }
        const created = await createJourney();
        sessionStorage.setItem(STORAGE_KEY, created.id);
        setJourneyId(created.id);
        return created.id;
    }, []);

    const recordVisit = useCallback(
        async (input: RecordInput) => {
            const id = await ensureJourneyId();
            const last = steps[steps.length - 1];
            if (last?.slug === input.slug) return;

            try {
                const step = await appendJourneyStep(id, input);
                setSteps((prev) => {
                    if (prev.some((s) => s.id === step.id)) return prev;
                    if (prev.length > 0 && prev[prev.length - 1].slug === step.slug) return prev;
                    return [...prev, step].sort((a, b) => a.order - b.order);
                });
            } catch {
                await refresh();
            }
        },
        [ensureJourneyId, refresh, steps]
    );

    const startNewHole = useCallback(async () => {
        sessionStorage.removeItem(STORAGE_KEY);
        setSteps([]);
        const created = await createJourney();
        sessionStorage.setItem(STORAGE_KEY, created.id);
        setJourneyId(created.id);
    }, []);

    const sharePath = journeyId ? `/holes/${journeyId}` : null;

    const value = useMemo(
        () => ({
            journeyId,
            steps,
            loading,
            recordVisit,
            refresh,
            startNewHole,
            sharePath,
        }),
        [journeyId, steps, loading, recordVisit, refresh, startNewHole, sharePath]
    );

    return <RabbitHoleContext.Provider value={value}>{children}</RabbitHoleContext.Provider>;
}

export function useRabbitHole(): RabbitHoleContextValue {
    const ctx = useContext(RabbitHoleContext);
    if (!ctx) {
        throw new Error('useRabbitHole must be used within RabbitHoleProvider');
    }
    return ctx;
}
