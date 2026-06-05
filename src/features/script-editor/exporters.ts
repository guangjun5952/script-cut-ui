import {
  getOverlappingClips,
  getScoreForClip,
  resolveAttributesForClip,
} from "./analysis";
import { formatTime, formatTimeRange } from "./time";
import type { FrameworkValue, ScriptClip, ScriptProject } from "./types";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function createExportFileName(project: ScriptProject, suffix: string) {
  const safeTitle = project.title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/gi, "-")
    .replace(/^-+|-+$/g, "");

  return `${safeTitle || "script-project"}.${suffix}`;
}

export function downloadTextFile(
  filename: string,
  contents: string,
  mimeType = "text/markdown;charset=utf-8",
) {
  const blob = new Blob([contents], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function getTextClips(project: ScriptProject, role: ScriptClip["textRole"]) {
  return project.clips
    .filter((clip) => clip.clipType === "text" && clip.textRole === role)
    .sort((a, b) => a.start - b.start || a.orderIndex - b.orderIndex);
}

function getLinkedOrOverlapping(
  project: ScriptProject,
  source: ScriptClip,
  role: ScriptClip["textRole"],
) {
  return project.clips
    .filter((clip) => clip.clipType === "text" && clip.textRole === role)
    .filter(
      (clip) =>
        clip.parentClipId === source.id ||
        (clip.start < source.end && clip.end > source.start),
    )
    .sort((a, b) => a.start - b.start)[0];
}

function getNotes(project: ScriptProject, source: ScriptClip) {
  return getOverlappingClips(
    project.clips,
    source,
    (clip) => clip.clipType === "text" && clip.textRole === "note",
  )
    .map((clip) => clip.text)
    .filter(Boolean)
    .join("\n");
}

export function exportFullScriptMarkdown(project: ScriptProject) {
  const aRollClips = getTextClips(project, "a-roll");
  const sections = aRollClips
    .map((clip) => {
      const bRoll = getLinkedOrOverlapping(project, clip, "b-roll");
      const subtitle = getLinkedOrOverlapping(project, clip, "subtitle");
      const attrs = resolveAttributesForClip(project.clips, clip);
      const notes = getNotes(project, clip);

      return [
        `## ${formatTime(clip.start)} - ${formatTime(clip.end)}`,
        "### A Roll",
        clip.text ?? "",
        "### B Roll",
        bRoll?.text ?? "",
        "### 字幕",
        subtitle?.text ?? "",
        "### 属性",
        `情绪：${attrs.emotion}`,
        `节奏：${attrs.rhythm}`,
        `框架：${attrs.framework}`,
        "### 备注",
        notes || clip.metadata?.note || "",
      ].join("\n");
    })
    .join("\n\n");

  return [
    `# 脚本导出：${project.title}`,
    `总时长：${formatTime(project.duration)}`,
    "## 脚本结构概览",
    `- A Roll clips：${aRollClips.length}`,
    `- B Roll clips：${getTextClips(project, "b-roll").length}`,
    `- 字幕 clips：${getTextClips(project, "subtitle").length}`,
    "",
    sections,
  ].join("\n");
}

export function exportARollMarkdown(project: ScriptProject) {
  const rows = getTextClips(project, "a-roll").map((clip) =>
    [`[${formatTimeRange(clip.start, clip.end)}]`, clip.text ?? ""].join("\n"),
  );

  return ["# A Roll 口播逐字稿", "", ...rows].join("\n\n");
}

export function exportBRollMarkdown(project: ScriptProject) {
  const bRollClips = getTextClips(project, "b-roll");
  const rows = bRollClips.map((clip, index) => {
    const aRoll =
      project.clips.find((item) => item.id === clip.parentClipId) ??
      getLinkedOrOverlapping(project, clip, "a-roll");
    const attrs = resolveAttributesForClip(project.clips, aRoll ?? clip);
    const notes = getNotes(project, clip) || clip.metadata?.note || "";

    return [
      String(index + 1).padStart(3, "0"),
      formatTimeRange(clip.start, clip.end),
      (aRoll?.text ?? "").replace(/\|/g, "\\|"),
      (clip.text ?? "").replace(/\|/g, "\\|"),
      attrs.emotion,
      attrs.rhythm,
      notes.replace(/\|/g, "\\|"),
    ].join(" | ");
  });

  return [
    "# B Roll 分镜 List",
    "",
    "| 镜号 | 时间码 | 对应口播 | 画面内容 | 情绪 | 节奏 | 备注 |",
    "|---|---|---|---|---|---|---|",
    ...rows.map((row) => `| ${row} |`),
  ].join("\n");
}

function buildWaveformSvg(project: ScriptProject, width = 1100, height = 280) {
  const aRollClips = getTextClips(project, "a-roll");
  const duration = Math.max(project.duration, 1);
  const points = aRollClips.map((clip) => {
    const score = getScoreForClip(project.clips, clip);
    const x = (clip.start / duration) * width;
    const y = height - 28 - score.intensity * (height - 64);
    return { x, y, clip, score };
  });
  const buildPath = (
    getValue: (point: (typeof points)[number]) => number,
    offset = 0,
  ) =>
    points
      .map((point, index) => {
        const y = height - 28 - getValue(point) * (height - 64) + offset;
        return `${index === 0 ? "M" : "L"} ${point.x} ${y}`;
      })
      .join(" ");
  const path = buildPath((point) => point.score.intensity);
  const emotionPath = buildPath((point) => point.score.emotionScore, 18);
  const rhythmPath = buildPath((point) => point.score.rhythmScore, -14);
  const densityPath = buildPath((point) => point.score.informationDensity, 34);
  const areaPath = points.length
    ? `${path} L ${(aRollClips.at(-1)?.end ?? duration) / duration * width} ${height - 28} L 0 ${height - 28} Z`
    : "";

  return `<svg viewBox="0 0 ${width} ${height}" width="100%" role="img" aria-label="Script emotion rhythm waveform" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="scriptWaveFill" x1="0" x2="0" y1="0" y2="1">
      <stop stop-color="#f7d66a" stop-opacity="0.65"/>
      <stop offset="0.55" stop-color="#40d7c7" stop-opacity="0.28"/>
      <stop offset="1" stop-color="#111827" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="scriptWaveStroke" x1="0" x2="1" y1="0" y2="0">
      <stop stop-color="#f7d66a"/>
      <stop offset="0.5" stop-color="#40d7c7"/>
      <stop offset="1" stop-color="#ff7a90"/>
    </linearGradient>
    <filter id="scriptGlow" x="-15%" y="-50%" width="130%" height="200%">
      <feGaussianBlur stdDeviation="5" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect width="${width}" height="${height}" rx="18" fill="#091016"/>
  ${Array.from({ length: 9 })
    .map((_, index) => {
      const x = (index / 8) * width;
      return `<line x1="${x}" y1="22" x2="${x}" y2="${height - 20}" stroke="#20313d" stroke-width="1"/>`;
    })
    .join("")}
  ${path ? `<path d="${path}" transform="translate(28 18) skewX(-10)" fill="none" stroke="#ffffff" stroke-opacity="0.12" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>` : ""}
  ${areaPath ? `<path d="${areaPath}" fill="url(#scriptWaveFill)"/>` : ""}
  ${emotionPath ? `<path d="${emotionPath}" fill="none" stroke="#ff7a90" stroke-opacity="0.9" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>` : ""}
  ${rhythmPath ? `<path d="${rhythmPath}" fill="none" stroke="#40d7c7" stroke-opacity="0.88" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>` : ""}
  ${densityPath ? `<path d="${densityPath}" fill="none" stroke="#b6e35f" stroke-opacity="0.72" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>` : ""}
  ${path ? `<path d="${path}" fill="none" filter="url(#scriptGlow)" stroke="url(#scriptWaveStroke)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>` : ""}
  ${points
    .map(
      (point) =>
        `<circle cx="${point.x}" cy="${point.y}" r="5" fill="#f8f1c1" opacity="0.92"><title>${escapeHtml(point.clip.text ?? "")}</title></circle>`,
    )
    .join("")}
  <text x="24" y="36" fill="#ff9bac" font-size="13">emotion</text>
  <text x="100" y="36" fill="#72f1e5" font-size="13">rhythm</text>
  <text x="166" y="36" fill="#c5ed78" font-size="13">density</text>
</svg>`;
}

export function exportEmotionMapHtml(project: ScriptProject) {
  const aRollClips = getTextClips(project, "a-roll");
  const scored = aRollClips.map((clip) => ({
    clip,
    score: getScoreForClip(project.clips, clip),
  }));
  const emotionPeak = scored
    .slice()
    .sort((a, b) => b.score.emotionScore - a.score.emotionScore)[0];
  const rhythmPeak = scored
    .slice()
    .sort((a, b) => b.score.rhythmScore - a.score.rhythmScore)[0];
  const frameworkDistribution = scored.reduce<Record<FrameworkValue, number>>(
    (acc, item) => {
      acc[item.score.framework] = (acc[item.score.framework] ?? 0) + 1;
      return acc;
    },
    {} as Record<FrameworkValue, number>,
  );

  const cards = scored
    .map(
      ({ clip, score }) => `<article>
        <strong>${formatTimeRange(clip.start, clip.end)}</strong>
        <p>${escapeHtml(clip.text ?? "")}</p>
        <dl>
          <div><dt>Emotion</dt><dd>${score.emotion}</dd></div>
          <div><dt>Rhythm</dt><dd>${score.rhythm}</dd></div>
          <div><dt>Framework</dt><dd>${score.framework}</dd></div>
          <div><dt>Intensity</dt><dd>${Math.round(score.intensity * 100)}%</dd></div>
        </dl>
      </article>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>脚本情绪图谱</title>
  <style>
    body { margin: 0; background: #070b10; color: #f6f0d8; font-family: ui-sans-serif, system-ui, sans-serif; }
    main { max-width: 1180px; margin: 0 auto; padding: 40px 24px 64px; }
    h1 { font-size: 44px; margin: 0 0 8px; letter-spacing: 0; }
    .meta { color: #99a7ad; margin-bottom: 28px; }
    #waveform { margin: 28px 0; }
    .summary { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; margin: 24px 0; }
    .summary div, article { border: 1px solid #26333b; background: linear-gradient(180deg, #111b22, #0b1117); border-radius: 14px; padding: 16px; }
    .summary span, dt { color: #87d8cc; font-size: 12px; text-transform: uppercase; }
    .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 14px; }
    article p { color: #d8e2df; line-height: 1.65; }
    dl { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin: 0; }
    dd { margin: 4px 0 0; color: #f7d66a; }
  </style>
</head>
<body>
  <main>
    <h1>脚本情绪图谱</h1>
    <div class="meta">${escapeHtml(project.title)} · 总时长 ${formatTime(project.duration)}</div>
    <section id="waveform">${buildWaveformSvg(project)}</section>
    <section class="summary">
      <div><span>情绪峰值</span><p>${escapeHtml(emotionPeak?.clip.text ?? "无")}<br/>${emotionPeak?.score.emotion ?? "-"}</p></div>
      <div><span>节奏峰值</span><p>${escapeHtml(rhythmPeak?.clip.text ?? "无")}<br/>${rhythmPeak?.score.rhythm ?? "-"}</p></div>
      <div><span>框架分布</span><p>${Object.entries(frameworkDistribution)
        .map(([key, value]) => `${key}: ${value}`)
        .join("<br/>")}</p></div>
    </section>
    <section id="analysis" class="cards">${cards}</section>
  </main>
</body>
</html>`;
}
