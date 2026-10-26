import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'rabbithole.searchHistory';
const MAX = 8;

export function useSearchHistory() {
    const [history, setHistory] = useState<string[]>([]);

    useEffect(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) setHistory(JSON.parse(raw));
        } catch {
            setHistory([]);
        }
    }, []);

    const push = useCallback((query: string) => {
        const trimmed = query.trim();
        if (!trimmed) return;
        setHistory((prev) => {
            const next = [trimmed, ...prev.filter((q) => q.toLowerCase() !== trimmed.toLowerCase())].slice(0, MAX);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
            return next;
        });
    }, []);

    return { history, push };
}
