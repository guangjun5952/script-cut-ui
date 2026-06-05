"use client";

import type { DragEvent, MouseEvent } from "react";
import { useScriptEditorStore } from "../store";
import { roundTime } from "../time";
import type { ScriptClip, ScriptTrack as ScriptTrackModel } from "../types";
import { ScriptClipView } from "./ScriptClipView";

type Props = {
	track: ScriptTrackModel;
	clips: ScriptClip[];
	zoom: number;
	height: number;
	onSeek: (clientX: number) => void;
};

export function ScriptTrack({ track, clips, zoom, height, onSeek }: Props) {
	const selectedClipIds = useScriptEditorStore(
		(state) => state.selectedClipIds,
	);
	const addClip = useScriptEditorStore((state) => state.addClip);
	const addAudioClipFromFile = useScriptEditorStore(
		(state) => state.addAudioClipFromFile,
	);

	const getTimeFromClientX = (
		clientX: number,
		currentTarget: HTMLDivElement,
	) => {
		const rect = currentTarget.getBoundingClientRect();
		return roundTime((clientX - rect.left) / zoom);
	};

	const handleDoubleClick = (event: MouseEvent<HTMLDivElement>) => {
		const target = event.target as HTMLElement;
		if (target.closest("[data-script-clip='true']")) return;

		addClip({
			trackId: track.id,
			start: getTimeFromClientX(event.clientX, event.currentTarget),
			duration:
				track.type === "emotion" ||
				track.type === "rhythm" ||
				track.type === "framework"
					? 3
					: 2.4,
		});
	};
	const getAudioFiles = (event: DragEvent<HTMLDivElement>) =>
		Array.from(event.dataTransfer.files).filter((file) =>
			file.type.startsWith("audio/"),
		);

	return (
		<div
			className="script-track-row"
			data-script-track-id={track.id}
			onClick={(event) => onSeek(event.clientX)}
			onDoubleClick={handleDoubleClick}
			onDragOver={(event) => {
				if (
					track.type === "music" &&
					(event.dataTransfer.types.includes("Files") ||
						getAudioFiles(event).length)
				) {
					event.preventDefault();
					event.dataTransfer.dropEffect = "copy";
					return;
				}

				if (
					event.dataTransfer.types.includes("application/x-script-new-clip")
				) {
					event.preventDefault();
					event.dataTransfer.dropEffect = "copy";
				}
			}}
			onDrop={(event) => {
				const audioFiles = getAudioFiles(event);
				if (track.type === "music" && audioFiles.length) {
					event.preventDefault();
					event.stopPropagation();
					const start = getTimeFromClientX(event.clientX, event.currentTarget);
					audioFiles.forEach((file, index) => {
						void addAudioClipFromFile(file, {
							trackId: track.id,
							start: roundTime(start + index * 0.25),
						});
					});
					return;
				}

				if (
					!event.dataTransfer.types.includes("application/x-script-new-clip")
				) {
					return;
				}
				event.preventDefault();
				event.stopPropagation();
				addClip({
					trackId: track.id,
					start: getTimeFromClientX(event.clientX, event.currentTarget),
					duration: track.type === "b-roll" ? 3 : 2.4,
				});
			}}
			style={{ height }}
		>
			{track.type === "music" && clips.length === 0 ? (
				<div className="pointer-events-none absolute inset-x-4 top-1/2 -translate-y-1/2 rounded-md border border-dashed border-[#742cc8]/35 bg-[#aaa8f4]/20 px-3 py-2 text-xs font-semibold text-[#742cc8]">
					拖入外部音频文件，自动生成音乐 / 音效 Clip
				</div>
			) : null}
			{clips
				.slice()
				.sort((a, b) => a.start - b.start)
				.map((clip) => (
					<ScriptClipView
						clip={clip}
						key={clip.id}
						selected={selectedClipIds.includes(clip.id)}
						track={track}
						zoom={zoom}
					/>
				))}
		</div>
	);
}
