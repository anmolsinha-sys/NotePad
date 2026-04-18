'use client';

export type ThemeMode = 'dark' | 'light' | 'system';
export type AccentName = 'emerald' | 'amber' | 'violet' | 'blue' | 'rose';

const LS_MODE = 'np.theme.mode';
const LS_ACCENT = 'np.theme.accent';

export const ACCENTS: Record<AccentName, { swatch: string; label: string }> = {
    emerald: { swatch: '#10b981', label: 'Emerald' },
    amber: { swatch: '#f59e0b', label: 'Amber' },
    violet: { swatch: '#8b5cf6', label: 'Violet' },
    blue: { swatch: '#3b82f6', label: 'Blue' },
    rose: { swatch: '#f43f5e', label: 'Rose' },
};

export const getStoredMode = (): ThemeMode => {
    if (typeof window === 'undefined') return 'dark';
    return ((localStorage.getItem(LS_MODE) as ThemeMode) || 'dark');
};

export const getStoredAccent = (): AccentName => {
    if (typeof window === 'undefined') return 'emerald';
    return ((localStorage.getItem(LS_ACCENT) as AccentName) || 'emerald');
};

const effectiveMode = (mode: ThemeMode): 'dark' | 'light' => {
    if (mode !== 'system') return mode;
    if (typeof window === 'undefined') return 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export const applyTheme = (mode: ThemeMode, accent: AccentName) => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.setAttribute('data-theme', effectiveMode(mode));
    root.setAttribute('data-accent', accent);
};

export const setMode = (mode: ThemeMode) => {
    localStorage.setItem(LS_MODE, mode);
    applyTheme(mode, getStoredAccent());
};

export const setAccent = (accent: AccentName) => {
    localStorage.setItem(LS_ACCENT, accent);
    applyTheme(getStoredMode(), accent);
};

export const initTheme = () => {
    applyTheme(getStoredMode(), getStoredAccent());
    if (typeof window !== 'undefined') {
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        mq.addEventListener('change', () => {
            if (getStoredMode() === 'system') applyTheme('system', getStoredAccent());
        });
    }
};
