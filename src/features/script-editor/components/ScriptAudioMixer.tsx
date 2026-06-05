"use client";

import { useEffect, useRef } from "react";
import { useScriptEditorStore } from "../store";

const AUDIO_SYNC_TOLERANCE = 0.12;

type AudioEntry = {
	audio: HTMLAudioElement;
	clipId: string;
	url: string;
};

export function ScriptAudioMixer() {
	const clips = useScriptEditorStore((state) => state.project.clips);
	const tracks = useScriptEditorStore((state) => state.project.tracks);
	const currentTime = useScriptEditorStore((state) => state.currentTime);
	const isPlaying = useScriptEditorStore((state) => state.isPlaying);
	const audioMapRef = useRef(new Map<string, AudioEntry>());

	useEffect(() => {
		const activeAudioClipIds = new Set(
			clips
				.filter((clip) => clip.clipType === "audio" && clip.audioUrl)
				.map((clip) => clip.id),
		);

		for (const [clipId, entry] of audioMapRef.current) {
			if (activeAudioClipIds.has(clipId)) continue;
			entry.audio.pause();
			entry.audio.removeAttribute("src");
			entry.audio.load();
			audioMapRef.current.delete(clipId);
		}
	}, [clips]);

	useEffect(() => {
		const tracksById = new Map(tracks.map((track) => [track.id, track]));
		const entries = audioMapRef.current;

		for (const clip of clips) {
			if (clip.clipType !== "audio" || !clip.audioUrl) continue;

			const track = tracksById.get(clip.trackId);
			const shouldPlay =
				isPlaying &&
				!track?.muted &&
				track?.visible !== false &&
				currentTime >= clip.start &&
				currentTime < clip.end;
			let entry = entries.get(clip.id);

			if (!entry || entry.url !== clip.audioUrl) {
				entry?.audio.pause();
				const audio = new Audio(clip.audioUrl);
				audio.preload = "auto";
				entry = { audio, clipId: clip.id, url: clip.audioUrl };
				entries.set(clip.id, entry);
			}

			if (!shouldPlay) {
				entry.audio.pause();
				continue;
			}

			const clipOffset = Math.max(0, currentTime - clip.start);
			if (
				Math.abs(entry.audio.currentTime - clipOffset) > AUDIO_SYNC_TOLERANCE
			) {
				entry.audio.currentTime = clipOffset;
			}

			if (entry.audio.paused) {
				void entry.audio.play().catch(() => {
					useScriptEditorStore.getState().pause();
				});
			}
		}

		for (const [clipId, entry] of entries) {
			if (clips.some((clip) => clip.id === clipId)) continue;
			entry.audio.pause();
		}
	}, [clips, currentTime, isPlaying, tracks]);

	useEffect(
		() => () => {
			for (const entry of audioMapRef.current.values()) {
				entry.audio.pause();
				entry.audio.removeAttribute("src");
				entry.audio.load();
			}
			audioMapRef.current.clear();
		},
		[],
	);

	return null;
}
