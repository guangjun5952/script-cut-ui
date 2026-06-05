"use client";

import type { CSSProperties } from "react";
import { useMemo } from "react";
import {
	getActiveClipsAtTime,
	getDisplayTextClipAtTime,
	getPrimaryClipAtTime,
	resolveAttributesAtTime,
} from "../analysis";
import { useScriptEditorStore } from "../store";
import { formatTimeRange } from "../time";
import type { ScriptClip, TextRole } from "../types";

function AttributePill({ label, value }: { label: string; value: string }) {
	return (
		<div className="script-attribute-pill">
			<div>
				<div className="script-kicker">{label}</div>
				<strong>{value}</strong>
			</div>
			<span className="rounded bg-[#b9ff36] px-1.5 py-0.5 text-[10px] font-black text-[#0b2d18]">
				+
			</span>
		</div>
	);
}

const textRoleLabels: Record<TextRole, string> = {
	"a-roll": "A ROLL",
	"b-roll": "B ROLL",
	subtitle: "SUBTITLE",
	note: "NOTE",
};

function getDisplayRoleLabel(clip?: ScriptClip) {
	if (!clip?.textRole) return "CURRENT CLIP";
	return textRoleLabels[clip.textRole];
}

export function ScriptMonitor() {
	const project = useScriptEditorStore((state) => state.project);
	const currentTime = useScriptEditorStore((state) => state.currentTime);
	const isPlaying = useScriptEditorStore((state) => state.isPlaying);
	const selectedClipIds = useScriptEditorStore(
		(state) => state.selectedClipIds,
	);

	const context = useMemo(() => {
		const displayClip = getDisplayTextClipAtTime(
			project.clips,
			currentTime,
			selectedClipIds,
		);
		const aRoll = getPrimaryClipAtTime(project.clips, currentTime, "a-roll");
		const activeTextClips = getActiveClipsAtTime(project.clips, currentTime)
			.filter((clip) => clip.clipType === "text")
			.sort((a, b) => a.start - b.start);

		return {
			displayClip,
			activeTextClips,
			aRoll,
			bRoll: getPrimaryClipAtTime(project.clips, currentTime, "b-roll"),
			note: getPrimaryClipAtTime(project.clips, currentTime, "note"),
			attributes: resolveAttributesAtTime(
				project.clips,
				currentTime,
				displayClip,
			),
		};
	}, [currentTime, project.clips, selectedClipIds]);

	const text = context.displayClip?.text ?? "等待播放头命中文字 clip";
	const longText = text.length > 92;
	const scrollDuration = Math.max(7, context.displayClip?.duration ?? 7);
	const displayRoleLabel = getDisplayRoleLabel(context.displayClip);

	return (
		<section className="script-monitor">
			<div className="script-monitor-stage script-floating-enter">
				<div className="script-monitor-topline">
					<div>
						<div className="font-mono text-[11px] font-black uppercase text-[#aaa8f4]">
							{displayRoleLabel}
						</div>
						<div className="font-mono text-xs text-[#fffdf7]/55">
							{context.displayClip
								? formatTimeRange(
										context.displayClip.start,
										context.displayClip.end,
									)
								: "00:00-00:00"}
						</div>
					</div>
					<div className="script-status-seal">
						{isPlaying ? "PLAYING" : "PAUSED"}
					</div>
				</div>

				<div className="script-monitor-copy-frame">
					<div
						className={`script-monitor-copy ${
							isPlaying && longText ? "script-monitor-copy--scrolling" : ""
						}`}
						key={context.displayClip?.id ?? "empty"}
						style={
							{
								"--script-scroll-duration": `${scrollDuration}s`,
							} as CSSProperties
						}
					>
						{text}
					</div>
				</div>
			</div>

			<aside className="script-side-stack script-floating-enter">
				<AttributePill label="Emotion" value={context.attributes.emotion} />
				<AttributePill label="Rhythm" value={context.attributes.rhythm} />
				<AttributePill label="Framework" value={context.attributes.framework} />
				<div className="script-side-card min-h-0 flex-1">
					<div className="script-kicker mb-1">B ROLL</div>
					<p className="line-clamp-5 text-sm font-semibold leading-5 text-[#171715]">
						{context.bRoll?.text ?? "画面待补充"}
					</p>
				</div>
				<div className="script-side-card">
					<div className="script-kicker mb-1">NOTE</div>
					<p className="line-clamp-3 text-sm leading-5 text-[#2a2a26]">
						{context.note?.text ?? context.aRoll?.metadata?.note ?? "无"}
					</p>
				</div>
				<div className="script-side-card">
					<div className="script-kicker mb-2">Active Clips</div>
					<div className="grid gap-1.5">
						{context.activeTextClips.length ? (
							context.activeTextClips.slice(0, 4).map((clip) => (
								<div
									className={`min-w-0 rounded border px-2 py-1.5 ${
										clip.id === context.displayClip?.id
											? "border-[#742cc8]/35 bg-[#aaa8f4]/25"
											: "border-black/10 bg-white/55"
									}`}
									key={clip.id}
								>
									<div className="font-mono text-[9px] font-black uppercase text-[#742cc8]">
										{getDisplayRoleLabel(clip)}
									</div>
									<div className="truncate text-xs font-semibold text-[#171715]">
										{clip.text}
									</div>
								</div>
							))
						) : (
							<div className="text-xs text-black/55">当前没有命中文字 clip</div>
						)}
					</div>
				</div>
			</aside>
		</section>
	);
}
