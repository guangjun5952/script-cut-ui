"use client";

import type { WheelEvent as ReactWheelEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { SCRIPT_NEW_TRACK_DROP_ID, useScriptEditorStore } from "../store";
import { formatTime, roundTime } from "../time";
import { ScriptTrack } from "./ScriptTrack";

const TRACK_HEIGHT = 68;
const RULER_HEIGHT = 34;
const LABEL_WIDTH = 168;

export function ScriptTimeline() {
	const project = useScriptEditorStore((state) => state.project);
	const zoom = useScriptEditorStore((state) => state.zoom);
	const currentTime = useScriptEditorStore((state) => state.currentTime);
	const setCurrentTime = useScriptEditorStore((state) => state.setCurrentTime);
	const setZoom = useScriptEditorStore((state) => state.setZoom);
	const addTrack = useScriptEditorStore((state) => state.addTrack);
	const addClipToNewTrack = useScriptEditorStore(
		(state) => state.addClipToNewTrack,
	);
	const [isScrubbing, setIsScrubbing] = useState(false);
	const scrollRef = useRef<HTMLDivElement>(null);
	const contentRef = useRef<HTMLDivElement>(null);
	const sortedTracks = useMemo(
		() => project.tracks.slice().sort((a, b) => a.order - b.order),
		[project.tracks],
	);
	const timelineWidth = Math.max(960, (project.duration + 4) * zoom);
	const timelineHeight =
		RULER_HEIGHT + (sortedTracks.length + 1) * TRACK_HEIGHT;
	const tickStep = zoom > 130 ? 1 : zoom > 74 ? 2 : 5;
	const ticks = Array.from(
		{ length: Math.ceil(project.duration / tickStep) + 2 },
		(_, index) => index * tickStep,
	);

	const seekFromPointer = (clientX: number) => {
		const rect = contentRef.current?.getBoundingClientRect();
		if (!rect) return;
		setCurrentTime(roundTime((clientX - rect.left) / zoom));
	};

	useEffect(() => {
		if (!isScrubbing) return;

		const handlePointerMove = (event: PointerEvent) => {
			event.preventDefault();
			seekFromPointer(event.clientX);
		};
		const stopScrubbing = () => setIsScrubbing(false);

		window.addEventListener("pointermove", handlePointerMove, {
			passive: false,
		});
		window.addEventListener("pointerup", stopScrubbing, { once: true });

		return () => {
			window.removeEventListener("pointermove", handlePointerMove);
			window.removeEventListener("pointerup", stopScrubbing);
		};
	}, [isScrubbing, zoom]);

	const handleWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
		if (!event.metaKey && !event.ctrlKey) return;
		event.preventDefault();
		setZoom(zoom + (event.deltaY < 0 ? 8 : -8));
	};

	return (
		<section className="script-timeline">
			<div className="flex h-full min-h-0">
				<div className="script-track-labels" style={{ width: LABEL_WIDTH }}>
					<div
						className="script-track-label-header"
						style={{ height: RULER_HEIGHT }}
					>
						TRACKS
					</div>
					{sortedTracks.map((track) => (
						<div
							className="script-track-label"
							key={track.id}
							style={{ height: TRACK_HEIGHT }}
						>
							<div className="truncate text-sm font-black text-[#171715]">
								{track.name}
							</div>
							<div className="font-mono text-[10px] font-black uppercase text-black/45">
								{track.type}
							</div>
						</div>
					))}
					<button
						className="flex w-full flex-col justify-center border-b border-dashed border-[#f46f24]/35 px-3 text-left text-[#f46f24] hover:bg-[#f46f24]/10"
						onClick={() => addTrack("a-roll")}
						style={{ height: TRACK_HEIGHT }}
						type="button"
					>
						<span className="text-sm font-medium">拖到这里新增轨道</span>
						<span className="font-mono text-[10px] uppercase">auto track</span>
					</button>
				</div>

				<div
					ref={scrollRef}
					className="min-w-0 flex-1 overflow-auto overscroll-contain"
					onWheel={handleWheel}
				>
					<div
						ref={contentRef}
						className="relative touch-pan-x"
						data-script-timeline="true"
						data-script-timeline-content="true"
						data-script-tracks-end-y={
							RULER_HEIGHT + sortedTracks.length * TRACK_HEIGHT
						}
						style={{ width: timelineWidth, height: timelineHeight }}
					>
						<div
							className="script-ruler"
							onClick={(event) => seekFromPointer(event.clientX)}
							onPointerDown={(event) => {
								event.preventDefault();
								seekFromPointer(event.clientX);
								setIsScrubbing(true);
							}}
							style={{ height: RULER_HEIGHT }}
						>
							{ticks.map((tick) => (
								<div
									className="script-ruler-tick"
									key={tick}
									style={{ left: tick * zoom }}
								>
									<span className="ml-1 font-mono text-[10px] font-bold text-black/45">
										{formatTime(tick)}
									</span>
								</div>
							))}
						</div>

						{sortedTracks.map((track) => (
							<ScriptTrack
								key={track.id}
								track={track}
								clips={project.clips.filter(
									(clip) => clip.trackId === track.id,
								)}
								zoom={zoom}
								height={TRACK_HEIGHT}
								onSeek={seekFromPointer}
							/>
						))}

						<div
							className="script-new-track-drop"
							data-script-new-track-drop={SCRIPT_NEW_TRACK_DROP_ID}
							onDoubleClick={() => addTrack("a-roll")}
							onDragOver={(event) => {
								if (
									event.dataTransfer.types.includes(
										"application/x-script-new-clip",
									)
								) {
									event.preventDefault();
									event.dataTransfer.dropEffect = "copy";
								}
							}}
							onDrop={(event) => {
								if (
									!event.dataTransfer.types.includes(
										"application/x-script-new-clip",
									)
								) {
									return;
								}
								event.preventDefault();
								event.stopPropagation();
								const rect = contentRef.current?.getBoundingClientRect();
								const start = rect
									? roundTime((event.clientX - rect.left) / zoom)
									: currentTime;
								addClipToNewTrack("a-roll", {
									start,
									duration: 2.4,
								});
							}}
							style={{ height: TRACK_HEIGHT }}
						>
							Drop here to create a new A Roll track
						</div>

						<div
							className="script-playhead"
							style={{ left: currentTime * zoom }}
						/>
						<div
							className="script-playhead-handle"
							onPointerDown={(event) => {
								event.preventDefault();
								event.stopPropagation();
								setIsScrubbing(true);
							}}
							style={{ left: currentTime * zoom }}
						>
							<div />
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
