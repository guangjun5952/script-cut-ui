import type { ScriptProject, ScriptTrack } from "./types";

export const defaultTracks = [
	{
		id: "track-a-roll",
		name: "A Roll 口播",
		type: "a-roll",
		order: 0,
		visible: true,
		locked: false,
		muted: false,
	},
	{
		id: "track-b-roll",
		name: "B Roll 画面",
		type: "b-roll",
		order: 1,
		visible: true,
		locked: false,
		muted: false,
	},
	{
		id: "track-music",
		name: "音乐 / 音效",
		type: "music",
		order: 2,
		visible: true,
		locked: false,
		muted: false,
	},
] as const;

export const defaultSettings = {
	defaultCharsPerSecond: 4.5,
	minClipDuration: 1.2,
	snapEnabled: true,
	snapThreshold: 0.15,
	scrollLongTextInMonitor: true,
};

export function createDefaultProject(): ScriptProject {
	const now = new Date().toISOString();

	return {
		id: createId(),
		title: "Untitled script cut",
		version: 1,
		createdAt: now,
		updatedAt: now,
		duration: 30,
		settings: { ...defaultSettings },
		tracks: defaultTracks.map((track) => ({ ...track })) as ScriptTrack[],
		clips: [],
	};
}

export function createId() {
	if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
		return crypto.randomUUID();
	}

	return `script-${Math.random().toString(36).slice(2, 10)}`;
}
