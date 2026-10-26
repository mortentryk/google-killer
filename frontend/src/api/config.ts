/** Same-origin in dev (CRA proxy) and when UI and API share a host in production. */
export function getApiBase(): string {
    const fromEnv = process.env.REACT_APP_API_URL?.replace(/\/$/, '');
    if (fromEnv) return fromEnv;
    return '';
}
