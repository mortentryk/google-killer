export function formatRelativeTime(iso: string): string {
    const then = new Date(iso).getTime();
    if (Number.isNaN(then)) return '';

    const diffSec = Math.round((Date.now() - then) / 1000);
    if (diffSec < 45) return 'just now';
    if (diffSec < 90) return '1 min ago';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)} min ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} hr ago`;
    if (diffSec < 604800) return `${Math.floor(diffSec / 86400)} d ago`;
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
