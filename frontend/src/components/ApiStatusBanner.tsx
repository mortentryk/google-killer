import React, { useEffect, useState } from 'react';
import { getApiBase } from '../api/config';

type Banner = { kind: 'error' | 'info'; message: string };

export function ApiStatusBanner() {
    const [banner, setBanner] = useState<Banner | null>(null);

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
                const data = JSON.parse(text) as { openaiConfigured?: boolean };
                if (cancelled) return;
                if (data.openaiConfigured === false) {
                    setBanner({
                        kind: 'info',
                        message:
                            'OpenAI is not configured on the API — new searches save a basic offline mind map. Add OPENAI_API_KEY in backend/.env for full AI answers.',
                    });
                    return;
                }
                setBanner(null);
            } catch {
                if (!cancelled) {
                    setBanner({
                        kind: 'error',
                        message:
                            'Backend API is not reachable. In a second terminal run: cd backend && npx prisma db push && npm run dev (port 3001).',
                    });
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

    if (!banner) return null;

    const styles =
        banner.kind === 'error'
            ? 'bg-[#fce8e6] text-[#c5221f] border-[#f5c2c0]'
            : 'bg-[#fef7e0] text-[#5f6368] border-[#f9e8a8]';

    return (
        <div
            className={`${styles} text-sm text-center px-4 py-2 border-b z-50 shrink-0`}
        >
            {banner.message}
        </div>
    );
}
