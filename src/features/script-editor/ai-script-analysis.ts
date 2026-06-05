import type {
	EmotionValue,
	FrameworkValue,
	RhythmValue,
	ScriptClip,
} from "./types";

export type ScriptSegmentAnalysis = {
	emotion: EmotionValue;
	rhythm: RhythmValue;
	framework: FrameworkValue;
	emotionalIntensity: number;
	note?: string;
	tags?: string[];
};

type AnalyzeScriptSegmentsParams = {
	segments: string[];
	projectTitle?: string;
};

const emotionPatterns: Array<[EmotionValue, RegExp]> = [
	["urgent", /必须|马上|立刻|危机|紧急|错过|来不及|倒计时|deadline/i],
	["dramatic", /崩溃|反转|爆炸|震撼|荒唐|灾难|戏剧|失控|真相/i],
	["excited", /太好了|厉害|爽|爆|兴奋|惊喜|机会|增长|突破/i],
	["surprised", /没想到|居然|竟然|意外|惊讶|反常|第一次/i],
	["questioning", /为什么|凭什么|是不是|难道|到底|吗|？|\?/i],
	["confused", /困惑|混乱|不知道|看不懂|迷茫|卡住/i],
	["humorous", /好笑|离谱|笑死|调侃|段子|玩笑/i],
	["serious", /本质|问题|风险|代价|现实|关键|严肃|结论/i],
	["curious", /发现|好奇|试试|探索|秘密|方法|机制/i],
	["warm", /谢谢|陪伴|温暖|相信|慢慢|一起|普通人/i],
	["calm", /稳定|平静|耐心|长期|慢|沉淀|复盘/i],
];

const frameworkPatterns: Array<[FrameworkValue, RegExp]> = [
	["hook", /^(很多人|你有没有|有没有|先说结论|注意看|别急|如果你)/i],
	["conflict", /但|可是|问题是|真正难的是|矛盾|冲突|误区|以为/i],
	["question", /为什么|怎么|如何|到底|吗|？|\?/i],
	["proof", /数据|证据|验证|案例|事实|结果|证明/i],
	["example", /比如|举个例子|例如|像是|案例/i],
	["turning-point", /所以|于是|直到|转折|关键变化|真正/i],
	["summary", /总结|归根结底|说白了|本质上|最后/i],
	["cta", /关注|收藏|评论|转发|试试|行动|现在就/i],
	["setup", /背景|先看|前提|第一步|开始/i],
];

function estimateRhythm(segment: string): RhythmValue {
	const chars = segment.replace(/\s/g, "").length;
	const punctuationCount = (segment.match(/[，,。！？!?；;]/g) ?? []).length;

	if (/停顿|喘口气|慢一点|先别急|等一下/i.test(segment)) return "pause";
	if (/高潮|爆发|关键时刻|最后一击/i.test(segment)) return "climax";
	if (/马上|立刻|快速|冲刺|密集|连续/i.test(segment)) return "fast";
	if (/有力|重击|一句话|重点|记住/i.test(segment)) return "punchy";
	if (/呼吸|留白|缓一缓|慢慢/i.test(segment)) return "breath";
	if (chars > 54 || punctuationCount >= 4) return "dense";
	if (chars < 14) return "punchy";
	if (chars < 24) return "fast";
	return "steady";
}

function matchPattern<T extends string>(
	segment: string,
	patterns: Array<[T, RegExp]>,
	fallback: T,
) {
	return patterns.find(([, pattern]) => pattern.test(segment))?.[0] ?? fallback;
}

function analyzeSegmentLocally(
	segment: string,
	index: number,
	total: number,
): ScriptSegmentAnalysis {
	const framework =
		matchPattern(segment, frameworkPatterns, "explanation") ??
		(index === 0 ? "hook" : index === total - 1 ? "summary" : "explanation");
	const emotion = matchPattern(segment, emotionPatterns, "neutral");
	const rhythm = estimateRhythm(segment);
	const emotionalIntensity =
		emotion === "neutral"
			? 0.32
			: emotion === "dramatic" || emotion === "urgent" || emotion === "excited"
				? 0.82
				: 0.58;

	return {
		emotion,
		rhythm,
		framework,
		emotionalIntensity,
		note: "本地规则分析；接入大模型 API 后可替换为模型输出。",
		tags: ["auto-analysis", emotion, rhythm, framework],
	};
}

async function analyzeWithModelApi(
	_params: AnalyzeScriptSegmentsParams,
): Promise<ScriptSegmentAnalysis[] | null> {
	// TODO: 在这里接入大模型 API。
	// 建议返回与 params.segments 等长的 JSON 数组：
	// [{ emotion, rhythm, framework, emotionalIntensity, note, tags }]
	// 当前先保持空实现，自动走本地规则兜底。
	return null;
}

export async function analyzeScriptSegments(
	params: AnalyzeScriptSegmentsParams,
): Promise<ScriptSegmentAnalysis[]> {
	const modelResult = await analyzeWithModelApi(params);
	if (modelResult?.length === params.segments.length) return modelResult;

	return params.segments.map((segment, index) =>
		analyzeSegmentLocally(segment, index, params.segments.length),
	);
}

export function applyAnalysisToClips(
	clips: ScriptClip[],
	analysis: ScriptSegmentAnalysis[],
) {
	return clips.map((clip, index) => {
		const item = analysis[index];
		if (!item || clip.clipType !== "text" || clip.textRole !== "a-roll") {
			return clip;
		}

		return {
			...clip,
			directAttributes: {
				...clip.directAttributes,
				emotion: item.emotion,
				rhythm: item.rhythm,
				framework: item.framework,
			},
			metadata: {
				...clip.metadata,
				emotionalIntensity: item.emotionalIntensity,
				note: item.note ?? clip.metadata?.note,
				tags: Array.from(
					new Set([...(clip.metadata?.tags ?? []), ...(item.tags ?? [])]),
				),
			},
		};
	});
}
