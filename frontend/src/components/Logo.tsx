import React from 'react';

const COLORS = ['#4285F4', '#EA4335', '#FBBC05', '#34A853', '#4285F4', '#EA4335'];

interface Props {
    size?: 'hero' | 'compact';
    onClick?: () => void;
}

function ColoredWord({ word, colorOffset }: { word: string; colorOffset: number }) {
    return (
        <>
            {word.split('').map((char, i) => (
                <span key={i} style={{ color: COLORS[(colorOffset + i) % COLORS.length] }}>
                    {char}
                </span>
            ))}
        </>
    );
}

export function Logo({ size = 'hero', onClick }: Props) {
    const textClass = size === 'hero' ? 'text-5xl sm:text-6xl' : 'text-lg sm:text-xl';

    const inner = (
        <span className={`font-normal tracking-tight select-none ${textClass}`} style={{ fontFamily: 'Roboto, sans-serif' }}>
            <ColoredWord word="Rabbit" colorOffset={0} />
            <span className="text-[#202124]"> </span>
            <ColoredWord word="Hole" colorOffset={3} />
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
