"use client";

import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useEffect } from "react";
import { useScriptEditorStore } from "../store";
import { EmotionRhythmWaveform } from "./EmotionRhythmWaveform";
import { ScriptAudioMixer } from "./ScriptAudioMixer";
import { ScriptInspector } from "./ScriptInspector";
import { ScriptMonitor } from "./ScriptMonitor";
import { ScriptPanel } from "./ScriptPanel";
import { ScriptTimeline } from "./ScriptTimeline";
import { ScriptToolbar } from "./ScriptToolbar";
import "../script-editor-theme.css";

function isTypingTarget(target: EventTarget | null) {
	if (!(target instanceof HTMLElement)) return false;
	return Boolean(
		target.closest("input, textarea, select, [contenteditable='true']"),
	);
}

export default function ScriptEditorPage() {
	const isPlaying = useScriptEditorStore((state) => state.isPlaying);
	const duration = useScriptEditorStore((state) => state.project.duration);
	const loadFromLocalStorage = useScriptEditorStore(
		(state) => state.loadFromLocalStorage,
	);
	const selectedClipIds = useScriptEditorStore(
		(state) => state.selectedClipIds,
	);
	const currentTime = useScriptEditorStore((state) => state.currentTime);
	const setCurrentTime = useScriptEditorStore((state) => state.setCurrentTime);
	const play = useScriptEditorStore((state) => state.play);
	const pause = useScriptEditorStore((state) => state.pause);
	const deleteClip = useScriptEditorStore((state) => state.deleteClip);
	const duplicateClip = useScriptEditorStore((state) => state.duplicateClip);
	const splitClip = useScriptEditorStore((state) => state.splitClip);
	const saveToLocalStorage = useScriptEditorStore(
		(state) => state.saveToLocalStorage,
	);

	useEffect(() => {
		loadFromLocalStorage();
	}, [loadFromLocalStorage]);

	useEffect(() => {
		if (!isPlaying) return;

		let frame = 0;
		let last = performance.now();

		const tick = (now: number) => {
			const delta = (now - last) / 1000;
			last = now;
			const store = useScriptEditorStore.getState();
			const nextTime = Math.min(
				store.project.duration,
				store.currentTime + delta,
			);
			store.setCurrentTime(nextTime);

			if (nextTime >= store.project.duration || nextTime >= duration) {
				store.pause();
				return;
			}

			frame = requestAnimationFrame(tick);
		};

		frame = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(frame);
	}, [duration, isPlaying]);

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (isTypingTarget(event.target)) return;

			if (event.code === "Space") {
				event.preventDefault();
				if (useScriptEditorStore.getState().isPlaying) pause();
				else play();
			}

			if (event.key === "Delete" || event.key === "Backspace") {
				event.preventDefault();
				for (const clipId of selectedClipIds) {
					deleteClip(clipId);
				}
			}

			if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
				event.preventDefault();
				const step = event.shiftKey ? 1 : 0.1;
				setCurrentTime(
					currentTime + (event.key === "ArrowRight" ? step : -step),
				);
			}

			if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
				event.preventDefault();
				saveToLocalStorage();
				return;
			}

			if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "d") {
				event.preventDefault();
				for (const clipId of selectedClipIds) {
					duplicateClip(clipId);
				}
				return;
			}

			if (event.key.toLowerCase() === "s" && selectedClipIds[0]) {
				event.preventDefault();
				splitClip(selectedClipIds[0], currentTime);
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [
		currentTime,
		deleteClip,
		duplicateClip,
		pause,
		play,
		saveToLocalStorage,
		selectedClipIds,
		setCurrentTime,
		splitClip,
	]);

	return (
		<div className="script-editor-shell">
			<ScriptAudioMixer />
			<div className="script-editor-workspace">
				<ScriptToolbar />

				<ResizablePanelGroup
					direction="horizontal"
					className="script-editor-board min-h-0 flex-1"
				>
					<ResizablePanel defaultSize={24} minSize={15} maxSize={34}>
						<ScriptPanel />
					</ResizablePanel>
					<ResizableHandle className="bg-black/10" withHandle />
					<ResizablePanel defaultSize={52} minSize={34}>
						<main className="h-full min-h-0 min-w-0 overflow-hidden">
							<ResizablePanelGroup direction="vertical">
								<ResizablePanel defaultSize={38} minSize={24}>
									<ScriptMonitor />
								</ResizablePanel>
								<ResizableHandle className="bg-black/10" withHandle />
								<ResizablePanel defaultSize={18} minSize={12} maxSize={28}>
									<EmotionRhythmWaveform />
								</ResizablePanel>
								<ResizableHandle className="bg-black/10" withHandle />
								<ResizablePanel defaultSize={44} minSize={28}>
									<ScriptTimeline />
								</ResizablePanel>
							</ResizablePanelGroup>
						</main>
					</ResizablePanel>
					<ResizableHandle className="bg-black/10" withHandle />
					<ResizablePanel defaultSize={24} minSize={17} maxSize={34}>
						<ScriptInspector />
					</ResizablePanel>
				</ResizablePanelGroup>
			</div>
		</div>
	);
}
