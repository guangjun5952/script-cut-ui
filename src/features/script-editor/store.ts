"use client";

import { create } from "zustand";
import {
	analyzeScriptSegments,
	applyAnalysisToClips,
} from "./ai-script-analysis";
import {
	createDefaultProject,
	createId,
	defaultTracks,
} from "./create-default-project";
import {
	createARollClipsFromText,
	createClipsFromDocumentText,
	getTextMetadata,
} from "./script-parser";
import { roundTime } from "./time";
import type {
	AttributeType,
	EmotionValue,
	FrameworkValue,
	RhythmValue,
	ScriptClip,
	ScriptProject,
	ScriptTrack,
	ScriptTrackType,
	TextRole,
} from "./types";

export const SCRIPT_EDITOR_STORAGE_KEY =
	"script-timeline-editor-current-project";
export const SCRIPT_NEW_TRACK_DROP_ID = "__script-new-track__";

type AttributeValue = EmotionValue | RhythmValue | FrameworkValue;

type AddAttributeClipParams = {
	attributeType: AttributeType;
	value: AttributeValue;
	start: number;
	duration: number;
	trackId?: string;
	targetClipIds?: string[];
};

type AddAudioClipFromFileParams = {
	start?: number;
	trackId?: string;
};

type ScriptEditorState = {
	project: ScriptProject;
	selectedClipIds: string[];
	currentTime: number;
	isPlaying: boolean;
	zoom: number;
	setProject: (project: ScriptProject) => void;
	importPlainText: (text: string) => Promise<void>;
	importDocumentText: (text: string, title?: string) => Promise<void>;
	importJSON: (project: ScriptProject) => void;
	exportJSON: () => ScriptProject;
	addClip: (clip: Partial<ScriptClip>) => void;
	addClipToNewTrack: (
		type?: ScriptTrackType,
		clip?: Partial<ScriptClip>,
	) => void;
	addAudioClipFromFile: (
		file: File,
		params?: AddAudioClipFromFileParams,
	) => Promise<void>;
	updateClip: (clipId: string, patch: Partial<ScriptClip>) => void;
	deleteClip: (clipId: string) => void;
	duplicateClip: (clipId: string) => void;
	moveClip: (clipId: string, nextStart: number, nextTrackId?: string) => void;
	resizeClip: (clipId: string, nextDuration: number) => void;
	trimClipStart: (clipId: string, nextStart: number) => void;
	splitClip: (
		clipId: string,
		splitTime?: number,
		splitTextIndex?: number,
	) => void;
	mergeClips: (clipIds: string[]) => void;
	addAttributeClip: (params: AddAttributeClipParams) => void;
	applyDirectAttributeToClip: (
		clipId: string,
		attributeType: AttributeType,
		value: AttributeValue,
	) => void;
	selectClip: (clipId: string, multi?: boolean) => void;
	clearSelection: () => void;
	setCurrentTime: (time: number) => void;
	setZoom: (zoom: number) => void;
	setSnapEnabled: (enabled: boolean) => void;
	play: () => void;
	pause: () => void;
	addTrack: (type?: ScriptTrackType) => void;
	generateSubtitleTrackFromARoll: () => void;
	generateBRollPlaceholdersFromARoll: () => void;
	saveToLocalStorage: () => void;
	loadFromLocalStorage: () => void;
};

function getTrackTextRole(trackType: ScriptTrackType): TextRole {
	if (trackType === "b-roll") return "b-roll";
	if (trackType === "subtitle") return "subtitle";
	if (trackType === "note") return "note";
	return "a-roll";
}

function isVisibleTrackType(trackType: ScriptTrackType) {
	return (
		trackType === "a-roll" || trackType === "b-roll" || trackType === "music"
	);
}

function getTrackById(project: ScriptProject, trackId?: string) {
	return project.tracks.find((track) => track.id === trackId);
}

function getTrackByType(project: ScriptProject, type: ScriptTrackType) {
	return project.tracks.find((track) => track.type === type);
}

function getAttributeDefaults(attributeType: AttributeType) {
	if (attributeType === "emotion") {
		return { emotion: "neutral" as EmotionValue, color: "#f59e0b" };
	}
	if (attributeType === "rhythm") {
		return { rhythm: "steady" as RhythmValue, color: "#22c55e" };
	}
	return { framework: "explanation" as FrameworkValue, color: "#38bdf8" };
}

function getAttributeTypeForTrack(trackType: ScriptTrackType): AttributeType {
	if (trackType === "emotion") return "emotion";
	if (trackType === "rhythm") return "rhythm";
	return "framework";
}

function normalizeDuration(duration: number, minDuration = 1.2) {
	return Math.max(minDuration, roundTime(duration));
}

function createTrack(
	project: ScriptProject,
	type: ScriptTrackType,
): ScriptTrack {
	const baseTrack =
		defaultTracks.find((track) => track.type === type) ?? defaultTracks[0];
	const count = project.tracks.filter((track) => track.type === type).length;

	return {
		...baseTrack,
		id: `track-${type}-${createId()}`,
		name: `${baseTrack.name} ${count + 1}`,
		order: project.tracks.length,
	};
}

function getTrackTypeForClip(clip: ScriptClip): ScriptTrackType {
	if (clip.clipType === "audio") return "music";
	if (clip.textRole === "b-roll") return "b-roll";
	return "a-roll";
}

function getSnapCandidates(project: ScriptProject, ignoredClipId: string) {
	return [
		0,
		...project.clips
			.filter((clip) => clip.id !== ignoredClipId)
			.flatMap((clip) => [clip.start, clip.end]),
	];
}

export function snapClipStart(
	project: ScriptProject,
	clipId: string,
	start: number,
	duration: number,
) {
	if (!project.settings.snapEnabled) return roundTime(start);

	const threshold = project.settings.snapThreshold;
	let snapped = roundTime(start);
	let bestDistance = threshold;

	for (const candidate of getSnapCandidates(project, clipId)) {
		const startDistance = Math.abs(candidate - start);
		if (startDistance <= bestDistance) {
			snapped = candidate;
			bestDistance = startDistance;
		}

		const endDistance = Math.abs(candidate - (start + duration));
		if (endDistance <= bestDistance) {
			snapped = candidate - duration;
			bestDistance = endDistance;
		}
	}

	return roundTime(Math.max(0, snapped));
}

export function snapClipBoundary(
	project: ScriptProject,
	clipId: string,
	time: number,
) {
	if (!project.settings.snapEnabled) return roundTime(time);

	const threshold = project.settings.snapThreshold;
	let snapped = roundTime(time);
	let bestDistance = threshold;

	for (const candidate of getSnapCandidates(project, clipId)) {
		const distance = Math.abs(candidate - time);
		if (distance <= bestDistance) {
			snapped = candidate;
			bestDistance = distance;
		}
	}

	return roundTime(Math.max(0, snapped));
}

export function snapClipEnd(
	project: ScriptProject,
	clipId: string,
	end: number,
) {
	return snapClipBoundary(project, clipId, end);
}

function readAudioDuration(url: string) {
	return new Promise<number>((resolve) => {
		const audio = new Audio();
		const finish = (duration: number) => {
			audio.removeAttribute("src");
			audio.load();
			resolve(Number.isFinite(duration) && duration > 0 ? duration : 4);
		};

		audio.preload = "metadata";
		audio.onloadedmetadata = () => finish(audio.duration);
		audio.onerror = () => finish(4);
		audio.src = url;
	});
}

function recalculateProject(project: ScriptProject): ScriptProject {
	const contentTracks = project.tracks.filter((track) =>
		isVisibleTrackType(track.type),
	);
	const withRequiredTracks: ScriptTrack[] = [...contentTracks];
	for (const track of defaultTracks) {
		if (
			withRequiredTracks.some(
				(item) => item.id === track.id || item.type === track.type,
			)
		) {
			continue;
		}
		withRequiredTracks.push({ ...track, order: withRequiredTracks.length });
	}
	const validTrackIds = new Set(withRequiredTracks.map((track) => track.id));
	const fallbackTrackIdByRole = {
		"a-roll":
			withRequiredTracks.find((track) => track.type === "a-roll")?.id ??
			withRequiredTracks[0]?.id,
		"b-roll":
			withRequiredTracks.find((track) => track.type === "b-roll")?.id ??
			withRequiredTracks[0]?.id,
		music:
			withRequiredTracks.find((track) => track.type === "music")?.id ??
			withRequiredTracks[0]?.id,
		subtitle:
			withRequiredTracks.find((track) => track.type === "a-roll")?.id ??
			withRequiredTracks[0]?.id,
		note:
			withRequiredTracks.find((track) => track.type === "a-roll")?.id ??
			withRequiredTracks[0]?.id,
	};
	const clips = project.clips.map((clip) => {
		if (validTrackIds.has(clip.trackId)) return clip;
		const parent = clip.parentClipId
			? project.clips.find((item) => item.id === clip.parentClipId)
			: undefined;
		const parentTrackId =
			parent && validTrackIds.has(parent.trackId) ? parent.trackId : undefined;

		return {
			...clip,
			trackId:
				parentTrackId ??
				(clip.clipType === "audio"
					? fallbackTrackIdByRole.music
					: fallbackTrackIdByRole[clip.textRole ?? "note"]) ??
				withRequiredTracks[0]?.id ??
				clip.trackId,
		};
	});
	const duration = Math.max(
		1,
		roundTime(Math.max(...clips.map((clip) => clip.end), 0) + 2),
	);

	return {
		...project,
		tracks: withRequiredTracks.map((track, index) => ({
			...track,
			order: index,
		})),
		clips,
		duration,
		updatedAt: new Date().toISOString(),
	};
}

function normalizeTextClip(clip: ScriptClip, minDuration: number): ScriptClip {
	const duration = normalizeDuration(clip.duration, minDuration);
	const text = clip.text ?? "";

	return {
		...clip,
		clipType: "text",
		duration,
		end: roundTime(clip.start + duration),
		metadata: {
			...getTextMetadata(text, duration),
			...clip.metadata,
			charsCount: getTextMetadata(text, duration).charsCount,
			charsPerSecond: getTextMetadata(text, duration).charsPerSecond,
			rhythmWarning: getTextMetadata(text, duration).rhythmWarning,
			informationDensity: getTextMetadata(text, duration).informationDensity,
		},
	};
}

function normalizeAudioClip(clip: ScriptClip, minDuration: number): ScriptClip {
	const duration = normalizeDuration(clip.duration, minDuration);
	const audioName = clip.audioName ?? clip.text ?? "音乐 / 音效";

	return {
		...clip,
		clipType: "audio",
		textRole: undefined,
		attributeType: undefined,
		text: clip.text ?? audioName,
		audioName,
		audioKind: clip.audioKind ?? "music",
		color: clip.color ?? "#7dd3fc",
		duration,
		end: roundTime(clip.start + duration),
	};
}

function coerceClipToTrack(
	clip: ScriptClip,
	track: ScriptTrack,
	minDuration: number,
): ScriptClip {
	const base = {
		...clip,
		trackId: track.id,
		start: roundTime(clip.start),
		duration: normalizeDuration(clip.duration, minDuration),
	};

	if (track.type === "music") {
		return normalizeAudioClip(
			{
				...base,
				clipType: "audio",
				end: roundTime(base.start + base.duration),
			},
			minDuration,
		);
	}

	if (
		base.clipType === "attribute" ||
		track.type === "emotion" ||
		track.type === "rhythm" ||
		track.type === "framework"
	) {
		const attributeType =
			base.attributeType ??
			(track.type === "emotion" ||
			track.type === "rhythm" ||
			track.type === "framework"
				? getAttributeTypeForTrack(track.type)
				: "emotion");
		return {
			...base,
			clipType: "attribute",
			textRole: undefined,
			attributeType,
			text: base.text,
			intensity: base.intensity ?? 0.65,
			...getAttributeDefaults(attributeType),
			...pickAttributeValue(clip, attributeType),
			end: roundTime(base.start + base.duration),
		};
	}

	return normalizeTextClip(
		{
			...base,
			clipType: "text",
			attributeType: undefined,
			textRole: getTrackTextRole(track.type),
			end: roundTime(base.start + base.duration),
		},
		minDuration,
	);
}

function pickAttributeValue(clip: ScriptClip, attributeType: AttributeType) {
	if (attributeType === "emotion" && clip.emotion) {
		return { emotion: clip.emotion };
	}
	if (attributeType === "rhythm" && clip.rhythm) {
		return { rhythm: clip.rhythm };
	}
	if (attributeType === "framework" && clip.framework) {
		return { framework: clip.framework };
	}
	return {};
}

function createClipForTrack(
	project: ScriptProject,
	track: ScriptTrack,
	patch: Partial<ScriptClip>,
) {
	const start = roundTime(patch.start ?? 0);
	const duration = normalizeDuration(
		patch.duration ?? project.settings.minClipDuration,
		project.settings.minClipDuration,
	);
	const orderIndex = project.clips.length;

	const base: ScriptClip = {
		id: patch.id ?? createId(),
		trackId: track.id,
		clipType: patch.clipType ?? "text",
		start,
		duration,
		end: roundTime(start + duration),
		orderIndex,
		status: patch.status ?? "draft",
		color: patch.color,
		locked: patch.locked ?? false,
		metadata: patch.metadata,
		text: patch.text,
		parentClipId: patch.parentClipId,
		targetClipIds: patch.targetClipIds,
		audioName: patch.audioName,
		audioUrl: patch.audioUrl,
		audioMimeType: patch.audioMimeType,
		audioSize: patch.audioSize,
		audioKind: patch.audioKind,
	};

	if (patch.clipType === "audio" || track.type === "music") {
		return normalizeAudioClip(
			{
				...base,
				...patch,
				clipType: "audio",
				text:
					patch.text ?? patch.audioName ?? getPlaceholderForTrack(track.type),
			},
			project.settings.minClipDuration,
		);
	}

	if (
		patch.clipType === "attribute" ||
		track.type === "emotion" ||
		track.type === "rhythm" ||
		track.type === "framework"
	) {
		const attributeType =
			patch.attributeType ??
			(track.type === "emotion" ||
			track.type === "rhythm" ||
			track.type === "framework"
				? getAttributeTypeForTrack(track.type)
				: "emotion");
		return {
			...base,
			...patch,
			clipType: "attribute" as const,
			attributeType,
			...getAttributeDefaults(attributeType),
			intensity: patch.intensity ?? 0.65,
			color: patch.color ?? getAttributeDefaults(attributeType).color,
			...pickAttributeValue(patch as ScriptClip, attributeType),
		};
	}

	const textRole = patch.textRole ?? getTrackTextRole(track.type);
	const text = patch.text ?? getPlaceholderForTrack(track.type);

	return normalizeTextClip(
		{
			...base,
			...patch,
			clipType: "text",
			textRole,
			text,
			directAttributes: {
				emotion: "neutral",
				rhythm: "steady",
				framework: textRole === "a-roll" ? "explanation" : undefined,
				...patch.directAttributes,
			},
		},
		project.settings.minClipDuration,
	);
}

function getPlaceholderForTrack(trackType: ScriptTrackType) {
	if (trackType === "b-roll") return "画面待补充";
	if (trackType === "music") return "音乐 / 音效占位";
	if (trackType === "subtitle") return "字幕待补充";
	if (trackType === "note") return "备注";
	return "新的口播内容";
}

function setAttributeValue(
	clip: ScriptClip,
	attributeType: AttributeType,
	value: AttributeValue,
): ScriptClip {
	if (attributeType === "emotion") {
		return { ...clip, emotion: value as EmotionValue };
	}
	if (attributeType === "rhythm") {
		return { ...clip, rhythm: value as RhythmValue };
	}
	return { ...clip, framework: value as FrameworkValue };
}

export const useScriptEditorStore = create<ScriptEditorState>((set, get) => ({
	project: createDefaultProject(),
	selectedClipIds: [],
	currentTime: 0,
	isPlaying: false,
	zoom: 88,

	setProject: (project) =>
		set({
			project: recalculateProject(project),
			currentTime: 0,
			selectedClipIds: [],
			isPlaying: false,
		}),

	importPlainText: async (text) => {
		const state = get();
		const baseClips = createARollClipsFromText(
			text,
			state.project.settings.defaultCharsPerSecond,
		);
		const analysis = await analyzeScriptSegments({
			segments: baseClips.map((clip) => clip.text ?? ""),
			projectTitle: state.project.title,
		});
		const aRollClips = applyAnalysisToClips(baseClips, analysis);

		set((state) => {
			const project = recalculateProject({
				...state.project,
				clips: aRollClips,
			});

			return {
				project,
				selectedClipIds: aRollClips[0] ? [aRollClips[0].id] : [],
			};
		});
	},

	importDocumentText: async (text, title) => {
		const state = get();
		const baseClips = createClipsFromDocumentText(
			text,
			state.project.settings.defaultCharsPerSecond,
		);
		const analysis = await analyzeScriptSegments({
			segments: baseClips.map((clip) => clip.text ?? ""),
			projectTitle: title || state.project.title,
		});
		const clips = applyAnalysisToClips(baseClips, analysis);

		set((state) => {
			const project = recalculateProject({
				...state.project,
				title: title || state.project.title,
				clips,
			});

			return { project, selectedClipIds: clips[0] ? [clips[0].id] : [] };
		});
	},

	importJSON: (project) =>
		set({
			project: recalculateProject(project),
			currentTime: 0,
			selectedClipIds: [],
			isPlaying: false,
		}),

	exportJSON: () => get().project,

	addClip: (clip) =>
		set((state) => {
			const track =
				getTrackById(state.project, clip.trackId) ??
				getTrackByType(state.project, "a-roll") ??
				state.project.tracks[0];

			if (!track) return state;

			const nextClip = createClipForTrack(state.project, track, clip);
			const project = recalculateProject({
				...state.project,
				clips: [...state.project.clips, nextClip],
			});

			return {
				project,
				selectedClipIds: [nextClip.id],
				currentTime: nextClip.start,
			};
		}),

	addClipToNewTrack: (type = "a-roll", clip = {}) =>
		set((state) => {
			const track = createTrack(state.project, type);
			const workingProject = {
				...state.project,
				tracks: [...state.project.tracks, track],
			};
			const nextClip = createClipForTrack(workingProject, track, {
				...clip,
				trackId: track.id,
			});

			return {
				project: recalculateProject({
					...workingProject,
					clips: [...state.project.clips, nextClip],
				}),
				selectedClipIds: [nextClip.id],
				currentTime: nextClip.start,
			};
		}),

	addAudioClipFromFile: async (file, params = {}) => {
		const audioUrl = URL.createObjectURL(file);
		const duration = await readAudioDuration(audioUrl);

		set((state) => {
			const track =
				getTrackById(state.project, params.trackId) ??
				getTrackByType(state.project, "music") ??
				createTrack(state.project, "music");
			const tracks = state.project.tracks.some((item) => item.id === track.id)
				? state.project.tracks
				: [...state.project.tracks, track];
			const workingProject = { ...state.project, tracks };
			const nextClip = createClipForTrack(workingProject, track, {
				clipType: "audio",
				start: params.start ?? state.currentTime,
				duration,
				text: file.name,
				audioName: file.name,
				audioUrl,
				audioMimeType: file.type,
				audioSize: file.size,
				audioKind: file.name.toLowerCase().match(/sfx|fx|effect|音效/)
					? "sound-effect"
					: "music",
				color: "#7dd3fc",
			});

			return {
				project: recalculateProject({
					...workingProject,
					clips: [...state.project.clips, nextClip],
				}),
				selectedClipIds: [nextClip.id],
				currentTime: nextClip.start,
			};
		});
	},

	updateClip: (clipId, patch) =>
		set((state) => {
			const clips = state.project.clips.map((clip) => {
				if (clip.id !== clipId) return clip;
				if (clip.locked && patch.locked !== false) return clip;

				const merged = {
					...clip,
					...patch,
					start: roundTime(patch.start ?? clip.start),
					duration: normalizeDuration(
						patch.duration ?? clip.duration,
						state.project.settings.minClipDuration,
					),
				};
				const track = getTrackById(state.project, merged.trackId);

				return track
					? coerceClipToTrack(
							merged,
							track,
							state.project.settings.minClipDuration,
						)
					: {
							...merged,
							end: roundTime(merged.start + merged.duration),
						};
			});

			return {
				project: recalculateProject({ ...state.project, clips }),
			};
		}),

	deleteClip: (clipId) =>
		set((state) => ({
			project: recalculateProject({
				...state.project,
				clips: state.project.clips.filter((clip) => clip.id !== clipId),
			}),
			selectedClipIds: state.selectedClipIds.filter((id) => id !== clipId),
		})),

	duplicateClip: (clipId) =>
		set((state) => {
			const source = state.project.clips.find((clip) => clip.id === clipId);
			if (!source) return state;
			const duplicate = {
				...source,
				id: createId(),
				start: roundTime(source.start + 0.4),
				end: roundTime(source.end + 0.4),
				orderIndex: state.project.clips.length,
			};

			return {
				project: recalculateProject({
					...state.project,
					clips: [...state.project.clips, duplicate],
				}),
				selectedClipIds: [duplicate.id],
				currentTime: duplicate.start,
			};
		}),

	moveClip: (clipId, nextStart, nextTrackId) =>
		set((state) => {
			let tracks = state.project.tracks;
			let createdTrack: ScriptTrack | undefined;
			const sourceClip = state.project.clips.find((clip) => clip.id === clipId);

			if (sourceClip && nextTrackId === SCRIPT_NEW_TRACK_DROP_ID) {
				createdTrack = createTrack(
					state.project,
					getTrackTypeForClip(sourceClip),
				);
				tracks = [...tracks, createdTrack];
			}

			const workingProject = { ...state.project, tracks };
			const clips = state.project.clips.map((clip) => {
				if (clip.id !== clipId || clip.locked) return clip;

				const targetTrack =
					createdTrack ??
					getTrackById(workingProject, nextTrackId) ??
					getTrackById(workingProject, clip.trackId);

				if (!targetTrack || targetTrack.locked) return clip;
				const snappedStart = snapClipStart(
					workingProject,
					clip.id,
					nextStart,
					clip.duration,
				);

				const moved = {
					...clip,
					start: snappedStart,
					end: roundTime(snappedStart + clip.duration),
				};

				return coerceClipToTrack(
					moved,
					targetTrack,
					state.project.settings.minClipDuration,
				);
			});

			return {
				project: recalculateProject({ ...workingProject, clips }),
			};
		}),

	resizeClip: (clipId, nextDuration) =>
		set((state) => {
			const clips = state.project.clips.map((clip) => {
				if (clip.id !== clipId || clip.locked) return clip;
				const track = getTrackById(state.project, clip.trackId);
				const snappedEnd = snapClipEnd(
					state.project,
					clip.id,
					clip.start + nextDuration,
				);
				const resized = {
					...clip,
					duration: normalizeDuration(
						snappedEnd - clip.start,
						state.project.settings.minClipDuration,
					),
				};

				return track
					? coerceClipToTrack(
							resized,
							track,
							state.project.settings.minClipDuration,
						)
					: resized;
			});

			return {
				project: recalculateProject({ ...state.project, clips }),
			};
		}),

	trimClipStart: (clipId, nextStart) =>
		set((state) => {
			const clips = state.project.clips.map((clip) => {
				if (clip.id !== clipId || clip.locked) return clip;
				const track = getTrackById(state.project, clip.trackId);
				const maxStart = Math.max(
					0,
					roundTime(clip.end - state.project.settings.minClipDuration),
				);
				const snappedStart = snapClipBoundary(
					state.project,
					clip.id,
					Math.min(nextStart, maxStart),
				);
				const boundedStart = roundTime(
					Math.max(0, Math.min(snappedStart, maxStart)),
				);
				const trimmed = {
					...clip,
					start: boundedStart,
					duration: normalizeDuration(
						clip.end - boundedStart,
						state.project.settings.minClipDuration,
					),
				};

				return track
					? coerceClipToTrack(
							trimmed,
							track,
							state.project.settings.minClipDuration,
						)
					: trimmed;
			});

			return {
				project: recalculateProject({ ...state.project, clips }),
			};
		}),

	splitClip: (clipId, splitTime, splitTextIndex) =>
		set((state) => {
			const source = state.project.clips.find((clip) => clip.id === clipId);
			if (!source || source.locked) return state;

			const minDuration = state.project.settings.minClipDuration;
			const splitAt = roundTime(
				splitTime && splitTime > source.start && splitTime < source.end
					? splitTime
					: source.start + source.duration / 2,
			);
			const leftDuration = roundTime(splitAt - source.start);
			const rightDuration = roundTime(source.end - splitAt);

			if (leftDuration < minDuration / 2 || rightDuration < minDuration / 2) {
				return state;
			}

			const ratio = leftDuration / source.duration;
			const text = source.text ?? "";
			const textIndex =
				splitTextIndex ??
				Math.min(text.length - 1, Math.max(1, Math.round(text.length * ratio)));

			const leftText = text.slice(0, textIndex).trim() || text;
			const rightText = text.slice(textIndex).trim() || text;
			const left = {
				...source,
				text: source.clipType === "text" ? leftText : source.text,
				duration: leftDuration,
				end: splitAt,
			};
			const right = {
				...source,
				id: createId(),
				text: source.clipType === "text" ? rightText : source.text,
				start: splitAt,
				duration: rightDuration,
				end: source.end,
				orderIndex: source.orderIndex + 0.5,
			};
			const track = getTrackById(state.project, source.trackId);
			const nextClips = state.project.clips
				.flatMap((clip) => {
					if (clip.id !== source.id) return clip;
					if (!track) return [left, right];
					return [
						coerceClipToTrack(left, track, minDuration),
						coerceClipToTrack(right, track, minDuration),
					];
				})
				.map((clip, index) => ({ ...clip, orderIndex: index }));

			return {
				project: recalculateProject({ ...state.project, clips: nextClips }),
				selectedClipIds: [right.id],
				currentTime: right.start,
			};
		}),

	mergeClips: (clipIds) =>
		set((state) => {
			const selected = state.project.clips
				.filter((clip) => clipIds.includes(clip.id))
				.filter((clip) => clip.clipType === "text")
				.sort((a, b) => a.start - b.start);

			if (selected.length < 2) return state;

			const first = selected[0];
			const last = selected.at(-1);
			if (!first || !last) return state;

			const selectedIds = new Set(selected.map((clip) => clip.id));
			const mergedText = selected
				.map((clip) => clip.text)
				.filter(Boolean)
				.join("\n");
			const merged: ScriptClip = {
				...first,
				text: mergedText,
				start: first.start,
				duration: roundTime(last.end - first.start),
				end: last.end,
			};
			const track = getTrackById(state.project, merged.trackId);
			const normalizedMerged = track
				? coerceClipToTrack(
						merged,
						track,
						state.project.settings.minClipDuration,
					)
				: merged;
			const clips = [
				...state.project.clips.filter((clip) => !selectedIds.has(clip.id)),
				normalizedMerged,
			]
				.sort((a, b) => a.start - b.start)
				.map((clip, index) => ({ ...clip, orderIndex: index }));

			return {
				project: recalculateProject({ ...state.project, clips }),
				selectedClipIds: [normalizedMerged.id],
			};
		}),

	addAttributeClip: (params) =>
		set((state) => {
			const track =
				getTrackById(state.project, params.trackId) ??
				state.project.clips
					.filter((clip) => params.targetClipIds?.includes(clip.id))
					.map((clip) => getTrackById(state.project, clip.trackId))
					.find(Boolean) ??
				getTrackByType(state.project, "note") ??
				getTrackByType(state.project, "a-roll");
			if (!track) return state;

			const clip = createClipForTrack(state.project, track, {
				clipType: "attribute",
				start: params.start,
				duration: params.duration,
				attributeType: params.attributeType,
				targetClipIds: params.targetClipIds,
			});
			const withValue = setAttributeValue(
				clip,
				params.attributeType,
				params.value,
			);

			return {
				project: recalculateProject({
					...state.project,
					clips: [...state.project.clips, withValue],
				}),
				selectedClipIds: [withValue.id],
				currentTime: withValue.start,
			};
		}),

	applyDirectAttributeToClip: (clipId, attributeType, value) =>
		set((state) => ({
			project: recalculateProject({
				...state.project,
				clips: state.project.clips.map((clip) => {
					if (clip.id !== clipId || clip.clipType !== "text") return clip;
					return {
						...clip,
						directAttributes: {
							...clip.directAttributes,
							[attributeType]: value,
						},
					};
				}),
			}),
		})),

	selectClip: (clipId, multi) =>
		set((state) => {
			const selectedClipIds = multi
				? state.selectedClipIds.includes(clipId)
					? state.selectedClipIds.filter((id) => id !== clipId)
					: [...state.selectedClipIds, clipId]
				: [clipId];

			return {
				selectedClipIds,
			};
		}),

	clearSelection: () => set({ selectedClipIds: [] }),

	setCurrentTime: (time) =>
		set((state) => ({
			currentTime: Math.min(
				Math.max(0, roundTime(time)),
				state.project.duration,
			),
		})),

	setZoom: (zoom) => set({ zoom: Math.min(220, Math.max(44, zoom)) }),

	setSnapEnabled: (enabled) =>
		set((state) => ({
			project: {
				...state.project,
				settings: {
					...state.project.settings,
					snapEnabled: enabled,
				},
				updatedAt: new Date().toISOString(),
			},
		})),

	play: () => set({ isPlaying: true }),

	pause: () => set({ isPlaying: false }),

	addTrack: (type = "a-roll") =>
		set((state) => {
			const track = createTrack(state.project, type);

			return {
				project: {
					...state.project,
					tracks: [...state.project.tracks, track],
					updatedAt: new Date().toISOString(),
				},
			};
		}),

	generateSubtitleTrackFromARoll: () =>
		set((state) => {
			const existing = new Map(
				state.project.clips
					.filter((clip) => clip.textRole === "subtitle" && clip.parentClipId)
					.map((clip) => [clip.parentClipId, clip]),
			);
			const aRollClips = state.project.clips.filter(
				(clip) => clip.clipType === "text" && clip.textRole === "a-roll",
			);
			const untouched = state.project.clips.filter(
				(clip) => !(clip.textRole === "subtitle" && clip.parentClipId),
			);
			const subtitleClips = aRollClips.map((clip, index) => {
				const current = existing.get(clip.id);
				return {
					...(current ?? clip),
					id: current?.id ?? createId(),
					trackId: "track-subtitle",
					clipType: "text" as const,
					textRole: "subtitle" as const,
					text: clip.text,
					start: clip.start,
					duration: clip.duration,
					end: clip.end,
					parentClipId: clip.id,
					orderIndex: index,
					status: current?.status ?? "draft",
					directAttributes: clip.directAttributes,
					metadata: clip.metadata,
				};
			});

			return {
				project: recalculateProject({
					...state.project,
					clips: [...untouched, ...subtitleClips],
				}),
			};
		}),

	generateBRollPlaceholdersFromARoll: () =>
		set((state) => {
			const existing = new Map(
				state.project.clips
					.filter((clip) => clip.textRole === "b-roll" && clip.parentClipId)
					.map((clip) => [clip.parentClipId, clip]),
			);
			const aRollClips = state.project.clips.filter(
				(clip) => clip.clipType === "text" && clip.textRole === "a-roll",
			);
			const untouched = state.project.clips.filter(
				(clip) => !(clip.textRole === "b-roll" && clip.parentClipId),
			);
			const bRollClips = aRollClips.map((clip, index) => {
				const current = existing.get(clip.id);
				const text = current?.text ?? "画面待补充：根据这句口播设计对应画面";

				return normalizeTextClip(
					{
						...(current ?? clip),
						id: current?.id ?? createId(),
						trackId: "track-b-roll",
						clipType: "text",
						textRole: "b-roll",
						text,
						start: clip.start,
						duration: clip.duration,
						end: clip.end,
						parentClipId: clip.id,
						orderIndex: index,
						status: current?.status ?? "draft",
						color: current?.color ?? "#14b8a6",
					},
					state.project.settings.minClipDuration,
				);
			});

			return {
				project: recalculateProject({
					...state.project,
					clips: [...untouched, ...bRollClips],
				}),
			};
		}),

	saveToLocalStorage: () => {
		const { project } = get();
		window.localStorage.setItem(
			SCRIPT_EDITOR_STORAGE_KEY,
			JSON.stringify(project),
		);
	},

	loadFromLocalStorage: () => {
		const raw = window.localStorage.getItem(SCRIPT_EDITOR_STORAGE_KEY);
		if (!raw) return;

		try {
			const project = JSON.parse(raw) as ScriptProject;
			set({
				project: recalculateProject(project),
				selectedClipIds: [],
				currentTime: 0,
				isPlaying: false,
			});
		} catch {
			window.localStorage.removeItem(SCRIPT_EDITOR_STORAGE_KEY);
		}
	},
}));
