export type ScriptTrackType =
	| "a-roll"
	| "b-roll"
	| "music"
	| "subtitle"
	| "emotion"
	| "rhythm"
	| "framework"
	| "note";

export type ScriptClipType = "text" | "attribute" | "audio";

export type TextRole = "a-roll" | "b-roll" | "subtitle" | "note";

export type AttributeType = "emotion" | "rhythm" | "framework";

export type EmotionValue =
	| "neutral"
	| "curious"
	| "surprised"
	| "excited"
	| "calm"
	| "serious"
	| "humorous"
	| "confused"
	| "questioning"
	| "dramatic"
	| "warm"
	| "urgent";

export type RhythmValue =
	| "slow"
	| "steady"
	| "fast"
	| "pause"
	| "punchy"
	| "dense"
	| "breath"
	| "climax";

export type FrameworkValue =
	| "hook"
	| "setup"
	| "conflict"
	| "question"
	| "explanation"
	| "example"
	| "turning-point"
	| "proof"
	| "summary"
	| "cta";

export type ClipStatus =
	| "draft"
	| "locked"
	| "approved"
	| "weak"
	| "discarded"
	| "needs-rewrite";

export type ScriptProject = {
	id: string;
	title: string;
	version: number;
	createdAt: string;
	updatedAt: string;
	duration: number;
	settings: ScriptProjectSettings;
	tracks: ScriptTrack[];
	clips: ScriptClip[];
};

export type ScriptProjectSettings = {
	defaultCharsPerSecond: number;
	minClipDuration: number;
	snapEnabled: boolean;
	snapThreshold: number;
	scrollLongTextInMonitor: boolean;
};

export type ScriptTrack = {
	id: string;
	name: string;
	type: ScriptTrackType;
	order: number;
	visible: boolean;
	locked: boolean;
	muted: boolean;
};

export type ScriptClip = {
	id: string;
	trackId: string;
	clipType: ScriptClipType;
	start: number;
	duration: number;
	end: number;
	orderIndex: number;
	text?: string;
	textRole?: TextRole;
	audioName?: string;
	audioUrl?: string;
	audioMimeType?: string;
	audioSize?: number;
	audioKind?: "music" | "sound-effect";
	attributeType?: AttributeType;
	emotion?: EmotionValue;
	rhythm?: RhythmValue;
	framework?: FrameworkValue;
	intensity?: number;
	directAttributes?: {
		emotion?: EmotionValue;
		rhythm?: RhythmValue;
		framework?: FrameworkValue;
	};
	parentClipId?: string;
	targetClipIds?: string[];
	status: ClipStatus;
	color?: string;
	locked?: boolean;
	metadata?: {
		charsCount?: number;
		charsPerSecond?: number;
		wordCount?: number;
		rhythmWarning?: "too-fast" | "too-slow" | "normal";
		informationDensity?: number;
		emotionalIntensity?: number;
		note?: string;
		tags?: string[];
	};
};

export const EMOTION_VALUES: EmotionValue[] = [
	"neutral",
	"curious",
	"surprised",
	"excited",
	"calm",
	"serious",
	"humorous",
	"confused",
	"questioning",
	"dramatic",
	"warm",
	"urgent",
];

export const RHYTHM_VALUES: RhythmValue[] = [
	"slow",
	"steady",
	"fast",
	"pause",
	"punchy",
	"dense",
	"breath",
	"climax",
];

export const FRAMEWORK_VALUES: FrameworkValue[] = [
	"hook",
	"setup",
	"conflict",
	"question",
	"explanation",
	"example",
	"turning-point",
	"proof",
	"summary",
	"cta",
];

export const CLIP_STATUS_VALUES: ClipStatus[] = [
	"draft",
	"locked",
	"approved",
	"weak",
	"discarded",
	"needs-rewrite",
];
