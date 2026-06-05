import { createId } from "./create-default-project";
import type {
  EmotionValue,
  FrameworkValue,
  RhythmValue,
  ScriptClip,
} from "./types";

export function splitScriptText(text: string): string[] {
  return text
    .replace(/\r\n/g, "\n")
    .split(/(?<=[。！？；.!?;])|\n+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function estimateDuration(text: string, charsPerSecond = 4.5): number {
  const normalized = text.replace(/\s/g, "");
  const duration = normalized.length / charsPerSecond;
  return Math.max(1.2, Number(duration.toFixed(2)));
}

export function getCharsCount(text: string): number {
  return text.replace(/\s/g, "").length;
}

export function getRhythmWarning(charsCount: number, duration: number) {
  const cps = charsCount / duration;
  if (cps > 6) return "too-fast";
  if (cps < 2.5) return "too-slow";
  return "normal";
}

export function getTextMetadata(text: string, duration: number) {
  const charsCount = getCharsCount(text);
  const charsPerSecond = duration
    ? Number((charsCount / duration).toFixed(2))
    : 0;

  return {
    charsCount,
    charsPerSecond,
    wordCount: text.trim() ? text.trim().split(/\s+/).length : charsCount,
    rhythmWarning: getRhythmWarning(charsCount, duration),
    informationDensity: Math.min(1, charsPerSecond / 6),
    emotionalIntensity: 0.3,
  } satisfies ScriptClip["metadata"];
}

export function createARollClipsFromText(
  text: string,
  charsPerSecond = 4.5,
): ScriptClip[] {
  const segments = splitScriptText(text);
  let cursor = 0;

  return segments.map((segment, index) => {
    const duration = estimateDuration(segment, charsPerSecond);
    const start = cursor;
    const end = Number((start + duration).toFixed(2));
    cursor = end;

    return {
      id: createId(),
      trackId: "track-a-roll",
      clipType: "text",
      textRole: "a-roll",
      text: segment,
      start,
      duration,
      end,
      orderIndex: index,
      status: "draft",
      directAttributes: {
        emotion: "neutral",
        rhythm: "steady",
        framework: index === 0 ? "hook" : "explanation",
      },
      metadata: getTextMetadata(segment, duration),
    };
  });
}

const emotionAliases: Record<string, EmotionValue> = {
  中性: "neutral",
  好奇: "curious",
  惊讶: "surprised",
  兴奋: "excited",
  平静: "calm",
  严肃: "serious",
  幽默: "humorous",
  困惑: "confused",
  质疑: "questioning",
  戏剧: "dramatic",
  温暖: "warm",
  紧急: "urgent",
  neutral: "neutral",
  curious: "curious",
  surprised: "surprised",
  excited: "excited",
  calm: "calm",
  serious: "serious",
  humorous: "humorous",
  confused: "confused",
  questioning: "questioning",
  dramatic: "dramatic",
  warm: "warm",
  urgent: "urgent",
};

const rhythmAliases: Record<string, RhythmValue> = {
  慢: "slow",
  稳: "steady",
  快: "fast",
  停顿: "pause",
  有力: "punchy",
  密集: "dense",
  呼吸: "breath",
  高潮: "climax",
  slow: "slow",
  steady: "steady",
  fast: "fast",
  pause: "pause",
  punchy: "punchy",
  dense: "dense",
  breath: "breath",
  climax: "climax",
};

const frameworkAliases: Record<string, FrameworkValue> = {
  开头: "hook",
  钩子: "hook",
  铺垫: "setup",
  冲突: "conflict",
  问题: "question",
  解释: "explanation",
  案例: "example",
  转折: "turning-point",
  证明: "proof",
  总结: "summary",
  行动: "cta",
  hook: "hook",
  setup: "setup",
  conflict: "conflict",
  question: "question",
  explanation: "explanation",
  example: "example",
  "turning-point": "turning-point",
  proof: "proof",
  summary: "summary",
  cta: "cta",
};

function findAlias<T extends string>(line: string, aliases: Record<string, T>) {
  const normalized = line.toLowerCase();
  return Object.entries(aliases).find(([key]) =>
    normalized.includes(key.toLowerCase()),
  )?.[1];
}

export function createClipsFromDocumentText(
  text: string,
  charsPerSecond = 4.5,
): ScriptClip[] {
  const lines = text
    .replace(/\r\n/g, "\n")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const clips: ScriptClip[] = [];
  let cursor = 0;
  let sectionTitle = "";
  let currentEmotion: EmotionValue = "neutral";
  let currentRhythm: RhythmValue = "steady";
  let currentFramework: FrameworkValue = "explanation";

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,6})\s*(.+)$/);
    const explicitEmotion = line.match(/情绪(?:点|属性)?[:：]\s*(.+)$/i);
    const explicitRhythm = line.match(/节奏(?:点|属性)?[:：]\s*(.+)$/i);
    const explicitFramework = line.match(/框架(?:点|阶段|属性)?[:：]\s*(.+)$/i);

    if (headingMatch) {
      sectionTitle = headingMatch[2].trim();
      currentFramework =
        findAlias(sectionTitle, frameworkAliases) ??
        (headingMatch[1].length <= 2 ? "hook" : "explanation");
      currentEmotion = findAlias(sectionTitle, emotionAliases) ?? currentEmotion;
      currentRhythm = findAlias(sectionTitle, rhythmAliases) ?? currentRhythm;
      continue;
    }

    if (explicitEmotion) {
      currentEmotion =
        findAlias(explicitEmotion[1], emotionAliases) ?? currentEmotion;
      continue;
    }

    if (explicitRhythm) {
      currentRhythm = findAlias(explicitRhythm[1], rhythmAliases) ?? currentRhythm;
      continue;
    }

    if (explicitFramework) {
      currentFramework =
        findAlias(explicitFramework[1], frameworkAliases) ?? currentFramework;
      continue;
    }

    const segmentSource = line.replace(/^[-*]\s+/, "");
    const segments = splitScriptText(segmentSource);

    for (const segment of segments) {
      const duration = estimateDuration(segment, charsPerSecond);
      const start = cursor;
      const end = Number((start + duration).toFixed(2));
      cursor = end;

      clips.push({
        id: createId(),
        trackId: "track-a-roll",
        clipType: "text",
        textRole: "a-roll",
        text: segment,
        start,
        duration,
        end,
        orderIndex: clips.length,
        status: "draft",
        directAttributes: {
          emotion: findAlias(segment, emotionAliases) ?? currentEmotion,
          rhythm: findAlias(segment, rhythmAliases) ?? currentRhythm,
          framework: findAlias(segment, frameworkAliases) ?? currentFramework,
        },
        metadata: {
          ...getTextMetadata(segment, duration),
          note: sectionTitle ? `来自标题：${sectionTitle}` : undefined,
          tags: sectionTitle ? [sectionTitle] : [],
        },
      });
    }
  }

  return clips;
}
