import React from 'react';

const COLORS = ['#4285F4', '#EA4335', '#FBBC05', '#4285F4', '#34A853', '#EA4335'];

interface Props {
    size?: 'hero' | 'compact';
    onClick?: () => void;
}

export function Logo({ size = 'hero', onClick }: Props) {
    const letters = 'SeekMap'.split('');
    const textClass = size === 'hero' ? 'text-5xl sm:text-6xl' : 'text-xl';

    const inner = (
        <span className={`font-normal tracking-tight select-none ${textClass}`} style={{ fontFamily: 'Roboto, sans-serif' }}>
            {letters.map((char, i) => (
                <span key={i} style={{ color: COLORS[i % COLORS.length] }}>
                    {char}
                </span>
            ))}
        </span>
    );

    if (onClick) {
        return (
            <button type="button" onClick={onClick} className="inline-block hover:opacity-90 transition-opacity">
                {inner}
            </button>
        );
    }

    return inner;
}
