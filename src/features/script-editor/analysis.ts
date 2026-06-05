import type {
	AttributeType,
	EmotionValue,
	FrameworkValue,
	RhythmValue,
	ScriptClip,
	TextRole,
} from "./types";

export const emotionScoreMap = {
	neutral: 0.3,
	calm: 0.25,
	warm: 0.4,
	curious: 0.55,
	questioning: 0.6,
	surprised: 0.75,
	excited: 0.9,
	serious: 0.55,
	humorous: 0.65,
	confused: 0.6,
	dramatic: 0.95,
	urgent: 0.9,
} satisfies Record<EmotionValue, number>;

export const rhythmScoreMap = {
	slow: 0.2,
	steady: 0.4,
	fast: 0.7,
	pause: 0.1,
	punchy: 0.85,
	dense: 0.8,
	breath: 0.25,
	climax: 1,
} satisfies Record<RhythmValue, number>;

export const frameworkScoreMap = {
	hook: 0.85,
	setup: 0.35,
	conflict: 0.75,
	question: 0.7,
	explanation: 0.45,
	example: 0.5,
	"turning-point": 0.8,
	proof: 0.6,
	summary: 0.4,
	cta: 0.75,
} satisfies Record<FrameworkValue, number>;

export function getActiveClipsAtTime(
	clips: ScriptClip[],
	currentTime: number,
): ScriptClip[] {
	return clips.filter(
		(clip) => clip.start <= currentTime && clip.end >= currentTime,
	);
}

const displayTextRolePriority: TextRole[] = [
	"a-roll",
	"subtitle",
	"b-roll",
	"note",
];

export function getDisplayTextClipAtTime(
	clips: ScriptClip[],
	currentTime: number,
	selectedClipIds: string[] = [],
) {
	const activeTextClips = getActiveClipsAtTime(clips, currentTime)
		.filter((clip) => clip.clipType === "text")
		.sort((a, b) => {
			const aPriority = displayTextRolePriority.indexOf(a.textRole ?? "a-roll");
			const bPriority = displayTextRolePriority.indexOf(b.textRole ?? "a-roll");

			if (aPriority !== bPriority) return aPriority - bPriority;
			return b.start - a.start;
		});
	const selectedActiveClip = activeTextClips.find((clip) =>
		selectedClipIds.includes(clip.id),
	);

	return selectedActiveClip ?? activeTextClips[0];
}

export function resolveAttributesAtTime(
	clips: ScriptClip[],
	currentTime: number,
	anchorClip?: ScriptClip,
) {
	const activeClips = getActiveClipsAtTime(clips, currentTime);
	const activeTextClip =
		anchorClip?.clipType === "text"
			? anchorClip
			: activeClips
					.filter(
						(clip) => clip.clipType === "text" && clip.textRole === "a-roll",
					)
					.sort((a, b) => b.start - a.start)[0];
	const directAttributes = activeTextClip?.directAttributes ?? {};
	const targetsActiveText = (clip: ScriptClip) =>
		!clip.targetClipIds?.length ||
		(activeTextClip ? clip.targetClipIds.includes(activeTextClip.id) : true);
	const emotionClip = activeClips.find(
		(clip) =>
			clip.clipType === "attribute" &&
			clip.attributeType === "emotion" &&
			targetsActiveText(clip),
	);
	const rhythmClip = activeClips.find(
		(clip) =>
			clip.clipType === "attribute" &&
			clip.attributeType === "rhythm" &&
			targetsActiveText(clip),
	);
	const frameworkClip = activeClips.find(
		(clip) =>
			clip.clipType === "attribute" &&
			clip.attributeType === "framework" &&
			targetsActiveText(clip),
	);

	return {
		emotion: emotionClip?.emotion ?? directAttributes.emotion ?? "neutral",
		rhythm: rhythmClip?.rhythm ?? directAttributes.rhythm ?? "steady",
		framework:
			frameworkClip?.framework ?? directAttributes.framework ?? "explanation",
	};
}

export function getPrimaryClipAtTime(
	clips: ScriptClip[],
	currentTime: number,
	textRole: "a-roll" | "b-roll" | "subtitle" | "note",
) {
	return getActiveClipsAtTime(clips, currentTime)
		.filter((clip) => clip.clipType === "text" && clip.textRole === textRole)
		.sort((a, b) => b.start - a.start)[0];
}

export function getOverlappingClips(
	clips: ScriptClip[],
	source: ScriptClip,
	predicate?: (clip: ScriptClip) => boolean,
) {
	return clips
		.filter((clip) => clip.id !== source.id)
		.filter((clip) => clip.start < source.end && clip.end > source.start)
		.filter((clip) => (predicate ? predicate(clip) : true))
		.sort((a, b) => a.start - b.start);
}

export function resolveAttributesForClip(
	clips: ScriptClip[],
	clip: ScriptClip,
) {
	return resolveAttributesAtTime(clips, clip.start + clip.duration / 2);
}

export function getScoreForClip(clips: ScriptClip[], clip: ScriptClip) {
	const attributes = resolveAttributesForClip(clips, clip);
	const informationDensity = clip.metadata?.informationDensity ?? 0.35;
	const emotionScore = emotionScoreMap[attributes.emotion];
	const rhythmScore = rhythmScoreMap[attributes.rhythm];
	const frameworkScore = frameworkScoreMap[attributes.framework];
	const intensity = Number(
		(emotionScore * 0.4 + rhythmScore * 0.4 + informationDensity * 0.2).toFixed(
			3,
		),
	);

	return {
		...attributes,
		emotionScore,
		rhythmScore,
		frameworkScore,
		informationDensity,
		intensity,
	};
}

export function getAttributeValue(
	clip: ScriptClip,
	attributeType: AttributeType,
) {
	if (attributeType === "emotion") return clip.emotion;
	if (attributeType === "rhythm") return clip.rhythm;
	return clip.framework;
}
