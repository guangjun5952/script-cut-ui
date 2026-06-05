"use client";

import { GripVertical } from "lucide-react";
import type {
	KeyboardEvent as ReactKeyboardEvent,
	PointerEvent as ReactPointerEvent,
} from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
	SCRIPT_NEW_TRACK_DROP_ID,
	snapClipBoundary,
	snapClipStart,
	useScriptEditorStore,
} from "../store";
import { roundTime } from "../time";
import type { ScriptClip, ScriptTrack } from "../types";

type Props = {
	clip: ScriptClip;
	selected: boolean;
	track: ScriptTrack;
	zoom: number;
};

type DragState = {
	mode: "move" | "trim-start" | "trim-end";
	initialClientX: number;
	initialStart: number;
	initialDuration: number;
	initialEnd: number;
	nextStart: number;
	nextDuration: number;
	moved: boolean;
};

type DragPreview = Pick<DragState, "nextStart" | "nextDuration" | "moved">;

const textRoleColors = {
	"a-roll": "#b9ff36",
	"b-roll": "#aaa8f4",
	music: "#742cc8",
	subtitle: "#d9ff77",
	note: "#f46f24",
};

function getClipLabel(clip: ScriptClip) {
	if (clip.clipType === "audio") {
		return `音频：${clip.audioName ?? clip.text ?? "音乐 / 音效"}`;
	}

	if (clip.clipType === "attribute") {
		if (clip.attributeType === "emotion") return clip.emotion ?? "neutral";
		if (clip.attributeType === "rhythm") return clip.rhythm ?? "steady";
		return clip.framework ?? "explanation";
	}

	const text = clip.text ?? "";
	if (clip.textRole === "b-roll") return `画面：${text.slice(0, 30)}`;
	if (clip.textRole === "subtitle") return `字幕：${text.slice(0, 30)}`;
	if (clip.textRole === "note") return `备注：${text.slice(0, 30)}`;
	return text.slice(0, 40);
}

export function ScriptClipView({ clip, selected, track, zoom }: Props) {
	const [dragState, setDragState] = useState<DragState | null>(null);
	const dragStateRef = useRef<DragState | null>(null);
	const dragPreviewRef = useRef<DragPreview | null>(null);
	const animationFrameRef = useRef<number | null>(null);
	const [isEditingText, setIsEditingText] = useState(false);
	const [draftText, setDraftText] = useState(clip.text ?? "");
	const textEditorRef = useRef<HTMLTextAreaElement>(null);
	const selectClip = useScriptEditorStore((state) => state.selectClip);
	const updateClip = useScriptEditorStore((state) => state.updateClip);
	const moveClip = useScriptEditorStore((state) => state.moveClip);
	const resizeClip = useScriptEditorStore((state) => state.resizeClip);
	const trimClipStart = useScriptEditorStore((state) => state.trimClipStart);
	const project = useScriptEditorStore((state) => state.project);
	const minDuration = useScriptEditorStore(
		(state) => state.project.settings.minClipDuration,
	);
	const dragSessionKey = dragState
		? `${dragState.mode}:${dragState.initialClientX}:${dragState.initialStart}:${dragState.initialEnd}`
		: null;

	const color = useMemo(() => {
		if (clip.color) return clip.color;
		if (clip.clipType === "audio") return textRoleColors.music;
		if (clip.clipType === "attribute") {
			if (clip.attributeType === "emotion") return "#f59e0b";
			if (clip.attributeType === "rhythm") return "#22c55e";
			return "#38bdf8";
		}
		return textRoleColors[clip.textRole ?? "a-roll"];
	}, [clip.attributeType, clip.clipType, clip.color, clip.textRole]);

	useEffect(() => {
		if (!isEditingText) setDraftText(clip.text ?? "");
	}, [clip.text, isEditingText]);

	useEffect(() => {
		if (!isEditingText) return;

		const frame = requestAnimationFrame(() => {
			textEditorRef.current?.focus();
			textEditorRef.current?.select();
		});

		return () => cancelAnimationFrame(frame);
	}, [clip.id, isEditingText]);

	useEffect(() => {
		dragStateRef.current = dragState;
	}, [dragState]);

	useEffect(() => {
		if (!dragState) return;

		const flushPreview = () => {
			animationFrameRef.current = null;
			const preview = dragPreviewRef.current;
			if (!preview) return;

			setDragState((state) =>
				state
					? {
							...state,
							nextStart: preview.nextStart,
							nextDuration: preview.nextDuration,
							moved: state.moved || preview.moved,
						}
					: state,
			);
		};

		const schedulePreview = (preview: DragPreview) => {
			dragPreviewRef.current = preview;
			if (animationFrameRef.current !== null) return;
			animationFrameRef.current = requestAnimationFrame(flushPreview);
		};

		const handlePointerMove = (event: PointerEvent) => {
			event.preventDefault();
			const state = dragStateRef.current;
			if (!state) return;

			const delta = (event.clientX - state.initialClientX) / zoom;
			const moved = Math.abs(event.clientX - state.initialClientX) > 3;

			if (state.mode === "move") {
				const nextStart = Math.max(
					0,
					snapClipStart(
						project,
						clip.id,
						state.initialStart + delta,
						state.initialDuration,
					),
				);
				schedulePreview({
					nextStart,
					nextDuration: state.initialDuration,
					moved,
				});
				return;
			}

			if (state.mode === "trim-start") {
				const maxStart = state.initialEnd - minDuration;
				const nextStart = Math.min(
					maxStart,
					Math.max(
						0,
						snapClipBoundary(project, clip.id, state.initialStart + delta),
					),
				);
				schedulePreview({
					nextStart,
					nextDuration: Math.max(minDuration, state.initialEnd - nextStart),
					moved,
				});
				return;
			}

			const nextEnd = Math.max(
				state.initialStart + minDuration,
				snapClipBoundary(project, clip.id, state.initialEnd + delta),
			);
			schedulePreview({
				nextStart: state.initialStart,
				nextDuration: Math.max(minDuration, nextEnd - state.initialStart),
				moved,
			});
		};

		const handlePointerUp = (event: PointerEvent) => {
			if (animationFrameRef.current !== null) {
				cancelAnimationFrame(animationFrameRef.current);
				animationFrameRef.current = null;
				flushPreview();
			}

			const state = dragStateRef.current ?? dragState;
			const preview = dragPreviewRef.current;
			const moved =
				state.moved ||
				preview?.moved ||
				Math.abs(event.clientX - state.initialClientX) > 3;

			if (!moved) {
				dragStateRef.current = null;
				dragPreviewRef.current = null;
				setDragState(null);
				return;
			}

			const releaseStart = preview?.nextStart ?? state.nextStart;
			const releaseDuration = preview?.nextDuration ?? state.nextDuration;

			if (state.mode === "move") {
				const elements = document.elementsFromPoint(
					event.clientX,
					event.clientY,
				);
				const targetTrack = elements
					.map((element) =>
						element instanceof HTMLElement
							? element.closest<HTMLElement>("[data-script-track-id]")
							: null,
					)
					.find(Boolean);
				const newTrackDrop = elements
					.map((element) =>
						element instanceof HTMLElement
							? element.closest<HTMLElement>("[data-script-new-track-drop]")
							: null,
					)
					.find(Boolean);
				const timelineContent = document.querySelector<HTMLElement>(
					"[data-script-timeline-content]",
				);
				const timelineRect = timelineContent?.getBoundingClientRect();
				const tracksEndY = Number(
					timelineContent?.dataset.scriptTracksEndY ?? 0,
				);
				const droppedBelowTracks =
					timelineRect &&
					event.clientX >= timelineRect.left &&
					event.clientX <= timelineRect.right &&
					event.clientY >= timelineRect.top + tracksEndY - 8 &&
					event.clientY <= timelineRect.bottom;
				const targetTrackId = newTrackDrop
					? SCRIPT_NEW_TRACK_DROP_ID
					: targetTrack instanceof HTMLElement
						? targetTrack.dataset.scriptTrackId
						: droppedBelowTracks
							? SCRIPT_NEW_TRACK_DROP_ID
							: undefined;
				moveClip(clip.id, releaseStart, targetTrackId);
			} else if (state.mode === "trim-start") {
				trimClipStart(clip.id, releaseStart);
			} else {
				resizeClip(clip.id, releaseDuration);
			}

			dragStateRef.current = null;
			dragPreviewRef.current = null;
			setDragState(null);
		};

		window.addEventListener("pointermove", handlePointerMove, {
			passive: false,
		});
		window.addEventListener("pointerup", handlePointerUp, { once: true });

		return () => {
			window.removeEventListener("pointermove", handlePointerMove);
			window.removeEventListener("pointerup", handlePointerUp);
			if (animationFrameRef.current !== null) {
				cancelAnimationFrame(animationFrameRef.current);
				animationFrameRef.current = null;
			}
		};
	}, [
		clip.id,
		dragSessionKey,
		minDuration,
		moveClip,
		project,
		resizeClip,
		trimClipStart,
		zoom,
	]);

	const startDrag = (
		event: ReactPointerEvent<HTMLDivElement>,
		mode: DragState["mode"],
	) => {
		if (isEditingText) return;
		if (event.button !== 0) return;
		event.preventDefault();
		event.stopPropagation();
		event.currentTarget.setPointerCapture?.(event.pointerId);
		selectClip(clip.id, event.metaKey || event.ctrlKey);
		if (clip.locked || track.locked) return;

		setDragState({
			mode,
			initialClientX: event.clientX,
			initialStart: clip.start,
			initialDuration: clip.duration,
			initialEnd: clip.end,
			nextStart: clip.start,
			nextDuration: clip.duration,
			moved: false,
		});
	};

	const isAttribute = clip.clipType === "attribute";
	const isAudio = clip.clipType === "audio";
	const isEditableTextClip =
		clip.clipType === "text" && !clip.locked && !track.locked;
	const previewStart =
		dragState?.mode === "move" || dragState?.mode === "trim-start"
			? dragState.nextStart
			: clip.start;
	const previewDuration =
		dragState?.mode === "trim-start" || dragState?.mode === "trim-end"
			? dragState.nextDuration
			: clip.duration;
	const clipLabel = getClipLabel(clip);

	const commitInlineText = () => {
		if (!isEditingText) return;
		updateClip(clip.id, { text: draftText });
		setIsEditingText(false);
	};

	const cancelInlineText = () => {
		setDraftText(clip.text ?? "");
		setIsEditingText(false);
	};

	const handleTextEditorKeyDown = (
		event: ReactKeyboardEvent<HTMLTextAreaElement>,
	) => {
		if (event.key === "Escape") {
			event.preventDefault();
			cancelInlineText();
			return;
		}

		if (event.key === "Enter" && !event.shiftKey) {
			event.preventDefault();
			commitInlineText();
		}
	};

	return (
		<div
			className={`script-clip group ${
				isEditingText ? "cursor-text" : "cursor-grab active:cursor-grabbing"
			} ${dragState ? "" : "transition"} ${
				selected ? "script-clip-selected" : ""
			}`}
			data-script-clip="true"
			data-script-clip-id={clip.id}
			onClick={(event) => {
				event.stopPropagation();
				if (dragState?.moved) return;
				selectClip(clip.id, event.metaKey || event.ctrlKey);
			}}
			onDoubleClick={(event) => {
				event.preventDefault();
				event.stopPropagation();
				if (!isEditableTextClip) return;
				selectClip(clip.id, event.metaKey || event.ctrlKey);
				setDraftText(clip.text ?? "");
				setIsEditingText(true);
			}}
			onPointerDown={(event) => startDrag(event, "move")}
			style={{
				left: previewStart * zoom,
				top: isAttribute ? 4 : 26,
				height: isAttribute ? 22 : 36,
				width: Math.max(46, previewDuration * zoom),
				opacity: dragState ? 0.86 : 1,
				background: isAttribute
					? `linear-gradient(135deg, ${color}dd, ${color}66)`
					: isAudio
						? `linear-gradient(135deg, ${color}e6, #11100f)`
						: `linear-gradient(135deg, ${color}, ${color}b8)`,
				color: isAttribute || isAudio ? "#fffdf7" : "#171715",
				boxShadow: selected
					? `0 0 0 3px ${color}44, 0 12px 28px rgba(22,22,16,0.2)`
					: "0 9px 18px rgba(22,22,16,0.16)",
			}}
			title={clipLabel}
		>
			{isEditingText ? (
				<textarea
					ref={textEditorRef}
					aria-label="编辑 Clip 文字"
					className="absolute inset-[3px] resize-none rounded-[4px] border border-[#742cc8]/35 bg-[#fffdf7] px-2 py-1 text-[11px] font-semibold leading-4 text-[#171715] outline-none shadow-inner placeholder:text-black/35"
					value={draftText}
					onBlur={commitInlineText}
					onChange={(event) => setDraftText(event.target.value)}
					onClick={(event) => event.stopPropagation()}
					onDoubleClick={(event) => event.stopPropagation()}
					onKeyDown={handleTextEditorKeyDown}
					onPointerDown={(event) => event.stopPropagation()}
					placeholder="输入 clip 文字"
					spellCheck={false}
				/>
			) : (
				<>
					<GripVertical className="mr-1 size-3 shrink-0 opacity-70" />
					<span className="truncate font-medium">{clipLabel}</span>
					{isAttribute ? (
						<span className="ml-2 rounded bg-black/25 px-1.5 py-0.5 font-mono text-[10px] uppercase text-white/90">
							{clip.attributeType}
						</span>
					) : null}
					{isAudio ? (
						<span className="ml-2 rounded bg-white/15 px-1.5 py-0.5 font-mono text-[10px] uppercase text-white/90">
							{clip.audioKind ?? "music"}
						</span>
					) : null}
				</>
			)}
			<div
				className={`script-clip-handle script-clip-handle-left ${
					isEditingText ? "pointer-events-none opacity-0" : ""
				}`}
				aria-hidden="true"
				onPointerDown={(event) => startDrag(event, "trim-start")}
			/>
			<div
				className={`script-clip-handle script-clip-handle-right ${
					isEditingText ? "pointer-events-none opacity-0" : "opacity-0"
				}`}
				aria-hidden="true"
				onPointerDown={(event) => startDrag(event, "trim-end")}
			/>
		</div>
	);
}
