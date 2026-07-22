const SCROLL_SPEED_KEY = 'genshin-combo-trainer:scrollSpeed';
export const DEFAULT_SCROLL_SPEED = 0.5;
export const MIN_SCROLL_SPEED = 0.1;
export const MAX_SCROLL_SPEED = 1;

export function getScrollSpeed(): number {
	const raw = localStorage.getItem(SCROLL_SPEED_KEY);
	if (raw === null) return DEFAULT_SCROLL_SPEED;

	const parsed = Number(raw);
	if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_SCROLL_SPEED;

	return Math.min(MAX_SCROLL_SPEED, Math.max(MIN_SCROLL_SPEED, parsed));
}

export function setScrollSpeed(speed: number): void {
	const clamped = Math.min(MAX_SCROLL_SPEED, Math.max(MIN_SCROLL_SPEED, speed));
	localStorage.setItem(SCROLL_SPEED_KEY, String(clamped));
}
