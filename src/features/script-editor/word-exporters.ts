import {
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import { getScoreForClip, resolveAttributesForClip } from "./analysis";
import { formatTime, formatTimeRange } from "./time";
import type { ScriptClip, ScriptProject } from "./types";

export type WordExportMode = "full" | "a-roll" | "b-roll" | "emotion";

function textClips(project: ScriptProject, role: ScriptClip["textRole"]) {
  return project.clips
    .filter((clip) => clip.clipType === "text" && clip.textRole === role)
    .sort((a, b) => a.start - b.start || a.orderIndex - b.orderIndex);
}

function paragraph(text: string, heading?: (typeof HeadingLevel)[keyof typeof HeadingLevel]) {
  return new Paragraph({
    heading,
    children: [new TextRun(text || " ")],
  });
}

function labelValue(label: string, value: string) {
  return new Paragraph({
    children: [
      new TextRun({ text: `${label}：`, bold: true }),
      new TextRun(value || " "),
    ],
  });
}

function linkedClip(
  project: ScriptProject,
  source: ScriptClip,
  role: ScriptClip["textRole"],
) {
  return textClips(project, role).find(
    (clip) =>
      clip.parentClipId === source.id ||
      (clip.start < source.end && clip.end > source.start),
  );
}

function notesForClip(project: ScriptProject, source: ScriptClip) {
  return textClips(project, "note")
    .filter((clip) => clip.start < source.end && clip.end > source.start)
    .map((clip) => clip.text)
    .filter(Boolean)
    .join("\n");
}

function tableCell(text: string) {
  return new TableCell({
    children: [paragraph(text)],
  });
}

function buildFullChildren(project: ScriptProject) {
  const aRoll = textClips(project, "a-roll");
  const children = [
    paragraph(`脚本导出：${project.title}`, HeadingLevel.TITLE),
    labelValue("总时长", formatTime(project.duration)),
    paragraph("脚本结构概览", HeadingLevel.HEADING_1),
    paragraph(`A Roll clips：${aRoll.length}`),
    paragraph(`B Roll clips：${textClips(project, "b-roll").length}`),
    paragraph(`字幕 clips：${textClips(project, "subtitle").length}`),
  ];

  for (const clip of aRoll) {
    const attrs = resolveAttributesForClip(project.clips, clip);
    children.push(
      paragraph(formatTimeRange(clip.start, clip.end), HeadingLevel.HEADING_2),
      paragraph("A Roll", HeadingLevel.HEADING_3),
      paragraph(clip.text ?? ""),
      paragraph("B Roll", HeadingLevel.HEADING_3),
      paragraph(linkedClip(project, clip, "b-roll")?.text ?? ""),
      paragraph("字幕", HeadingLevel.HEADING_3),
      paragraph(linkedClip(project, clip, "subtitle")?.text ?? ""),
      paragraph("属性", HeadingLevel.HEADING_3),
      labelValue("情绪", attrs.emotion),
      labelValue("节奏", attrs.rhythm),
      labelValue("框架", attrs.framework),
      paragraph("备注", HeadingLevel.HEADING_3),
      paragraph(notesForClip(project, clip) || clip.metadata?.note || ""),
    );
  }

  return children;
}

function buildARollChildren(project: ScriptProject) {
  return [
    paragraph("A Roll 口播逐字稿", HeadingLevel.TITLE),
    ...textClips(project, "a-roll").flatMap((clip) => [
      paragraph(formatTimeRange(clip.start, clip.end), HeadingLevel.HEADING_2),
      paragraph(clip.text ?? ""),
    ]),
  ];
}

function buildBRollChildren(project: ScriptProject) {
  const rows = [
    new TableRow({
      children: ["镜号", "时间码", "对应口播", "画面内容", "情绪", "节奏", "备注"].map(
        tableCell,
      ),
    }),
    ...textClips(project, "b-roll").map((clip, index) => {
      const aRoll =
        project.clips.find((item) => item.id === clip.parentClipId) ??
        linkedClip(project, clip, "a-roll");
      const attrs = resolveAttributesForClip(project.clips, aRoll ?? clip);

      return new TableRow({
        children: [
          String(index + 1).padStart(3, "0"),
          formatTimeRange(clip.start, clip.end),
          aRoll?.text ?? "",
          clip.text ?? "",
          attrs.emotion,
          attrs.rhythm,
          notesForClip(project, clip) || clip.metadata?.note || "",
        ].map(tableCell),
      });
    }),
  ];

  return [
    paragraph("B Roll 分镜 List", HeadingLevel.TITLE),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows,
    }),
  ];
}

function buildEmotionChildren(project: ScriptProject) {
  const scored = textClips(project, "a-roll").map((clip) => ({
    clip,
    score: getScoreForClip(project.clips, clip),
  }));

  return [
    paragraph("脚本情绪节奏图谱", HeadingLevel.TITLE),
    labelValue("项目", project.title),
    labelValue("总时长", formatTime(project.duration)),
    paragraph("阶段分析", HeadingLevel.HEADING_1),
    ...scored.flatMap(({ clip, score }) => [
      paragraph(formatTimeRange(clip.start, clip.end), HeadingLevel.HEADING_2),
      paragraph(clip.text ?? ""),
      labelValue("情绪", `${score.emotion} / ${Math.round(score.emotionScore * 100)}%`),
      labelValue("节奏", `${score.rhythm} / ${Math.round(score.rhythmScore * 100)}%`),
      labelValue("框架", `${score.framework} / ${Math.round(score.frameworkScore * 100)}%`),
      labelValue("综合强度", `${Math.round(score.intensity * 100)}%`),
    ]),
  ];
}

export async function createWordBlob(
  project: ScriptProject,
  mode: WordExportMode,
) {
  const children =
    mode === "full"
      ? buildFullChildren(project)
      : mode === "a-roll"
        ? buildARollChildren(project)
        : mode === "b-roll"
          ? buildBRollChildren(project)
          : buildEmotionChildren(project);

  const document = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  return Packer.toBlob(document);
}
