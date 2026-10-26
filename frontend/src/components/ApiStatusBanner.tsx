import React, { useEffect, useState } from 'react';
import { getApiBase } from '../api/config';

export function ApiStatusBanner() {
    const [problem, setProblem] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        const check = async () => {
            try {
                const res = await fetch(`${getApiBase()}/health`);
                const text = await res.text();
                if (!res.ok) throw new Error('not ok');
                if (text.includes('<!DOCTYPE html>')) {
                    throw new Error('html');
                }
                JSON.parse(text);
                if (!cancelled) setProblem(null);
            } catch {
                if (!cancelled) {
                    setProblem(
                        'Backend API is not reachable. In a second terminal run: cd backend && npx prisma db push && npm run dev (port 3001).'
                    );
                }
            }
        };
        void check();
        const t = window.setInterval(() => void check(), 60_000);
        return () => {
            cancelled = true;
            window.clearInterval(t);
        };
    }, []);

    if (!problem) return null;

    return (
        <div className="bg-[#fce8e6] text-[#c5221f] text-sm text-center px-4 py-2 border-b border-[#f5c2c0] z-50 shrink-0">
            {problem}
        </div>
    );
}
