"use client";

import { useMemo } from "react";
import { getScoreForClip } from "../analysis";
import { useScriptEditorStore } from "../store";
import { formatTime } from "../time";

const WIDTH = 1200;
const HEIGHT = 132;

export function EmotionRhythmWaveform() {
	const project = useScriptEditorStore((state) => state.project);
	const currentTime = useScriptEditorStore((state) => state.currentTime);
	const selectedClipIds = useScriptEditorStore(
		(state) => state.selectedClipIds,
	);
	const aRollClips = useMemo(
		() =>
			project.clips
				.filter(
					(clip) => clip.clipType === "text" && clip.textRole === "a-roll",
				)
				.sort((a, b) => a.start - b.start),
		[project.clips],
	);
	const duration = Math.max(1, project.duration);
	const samples = aRollClips.map((clip) => {
		const score = getScoreForClip(project.clips, clip);
		const x = (clip.start / duration) * WIDTH;
		const centerX = ((clip.start + clip.duration / 2) / duration) * WIDTH;
		const y = HEIGHT - 20 - score.intensity * (HEIGHT - 38);
		return { clip, score, x, centerX, y };
	});
	const buildMetricPath = (
		getValue: (sample: (typeof samples)[number]) => number,
		offset = 0,
	) =>
		samples
			.map((sample, index) => {
				const y = HEIGHT - 20 - getValue(sample) * (HEIGHT - 42) + offset;
				return `${index === 0 ? "M" : "L"} ${sample.centerX} ${y}`;
			})
			.join(" ");
	const compositePath = buildMetricPath((sample) => sample.score.intensity);
	const emotionPath = buildMetricPath(
		(sample) => sample.score.emotionScore,
		10,
	);
	const rhythmPath = buildMetricPath((sample) => sample.score.rhythmScore, -8);
	const infoPath = buildMetricPath(
		(sample) => sample.score.informationDensity,
		20,
	);
	const fillPath = samples.length
		? `${compositePath} L ${((aRollClips.at(-1)?.end ?? duration) / duration) * WIDTH} ${HEIGHT - 18} L 0 ${HEIGHT - 18} Z`
		: "";
	const playheadX = (currentTime / duration) * WIDTH;

	return (
		<section className="script-waveform">
			<div className="mb-2 flex items-center justify-between">
				<div className="script-kicker">Script Emotion Rhythm Waveform</div>
				<div className="script-time-chip min-h-7">
					{formatTime(currentTime)}
				</div>
			</div>
			<svg
				className="h-[calc(100%-24px)] min-h-[72px] w-full overflow-visible"
				preserveAspectRatio="none"
				viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
			>
				<defs>
					<linearGradient id="wave-fill" x1="0" x2="0" y1="0" y2="1">
						<stop stopColor="#b9ff36" stopOpacity="0.56" />
						<stop offset="0.55" stopColor="#aaa8f4" stopOpacity="0.28" />
						<stop offset="1" stopColor="#e7e8dc" stopOpacity="0" />
					</linearGradient>
					<linearGradient id="wave-stroke" x1="0" x2="1" y1="0" y2="0">
						<stop stopColor="#742cc8" />
						<stop offset="0.48" stopColor="#24b85f" />
						<stop offset="1" stopColor="#f46f24" />
					</linearGradient>
					<linearGradient id="emotion-line" x1="0" x2="1" y1="0" y2="0">
						<stop stopColor="#f46f24" />
						<stop offset="1" stopColor="#742cc8" />
					</linearGradient>
					<linearGradient id="rhythm-line" x1="0" x2="1" y1="0" y2="0">
						<stop stopColor="#24b85f" />
						<stop offset="1" stopColor="#b9ff36" />
					</linearGradient>
					<linearGradient id="info-line" x1="0" x2="1" y1="0" y2="0">
						<stop stopColor="#aaa8f4" />
						<stop offset="1" stopColor="#f46f24" />
					</linearGradient>
					<filter id="wave-glow" x="-10%" y="-40%" width="120%" height="180%">
						<feGaussianBlur stdDeviation="4" result="blur" />
						<feMerge>
							<feMergeNode in="blur" />
							<feMergeNode in="SourceGraphic" />
						</feMerge>
					</filter>
				</defs>

				{Array.from({ length: 9 }).map((_, index) => {
					const x = (index / 8) * WIDTH;
					return (
						<g key={x}>
							<line
								stroke="rgba(23,23,21,0.12)"
								strokeWidth="1"
								x1={x}
								x2={x}
								y1="4"
								y2={HEIGHT - 14}
							/>
							<text
								fill="rgba(23,23,21,0.48)"
								fontSize="10"
								x={x + 5}
								y={HEIGHT - 2}
							>
								{formatTime((index / 8) * duration)}
							</text>
						</g>
					);
				})}

				{samples.map(({ clip }) => {
					const x = (clip.start / duration) * WIDTH;
					const width = (clip.duration / duration) * WIDTH;
					const selected = selectedClipIds.includes(clip.id);
					return (
						<rect
							fill={
								selected ? "rgba(170,168,244,0.34)" : "rgba(23,23,21,0.045)"
							}
							height={HEIGHT - 22}
							key={clip.id}
							rx="6"
							width={Math.max(2, width)}
							x={x}
							y="4"
						/>
					);
				})}

				<g opacity="0.38" transform="translate(22 16) skewX(-12)">
					{compositePath ? (
						<path
							d={compositePath}
							fill="none"
							stroke="rgba(23,23,21,0.18)"
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth="10"
						/>
					) : null}
				</g>
				{fillPath ? <path d={fillPath} fill="url(#wave-fill)" /> : null}
				{compositePath ? (
					<>
						<path
							d={emotionPath}
							fill="none"
							stroke="url(#emotion-line)"
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeOpacity="0.86"
							strokeWidth="2.4"
						/>
						<path
							d={rhythmPath}
							fill="none"
							stroke="url(#rhythm-line)"
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeOpacity="0.82"
							strokeWidth="2.4"
						/>
						<path
							d={infoPath}
							fill="none"
							stroke="url(#info-line)"
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeOpacity="0.64"
							strokeWidth="2"
						/>
						<path
							d={compositePath}
							fill="none"
							filter="url(#wave-glow)"
							stroke="url(#wave-stroke)"
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth="4"
						/>
						{samples.map(({ clip, centerX, y, score }) => (
							<circle
								cx={centerX}
								cy={y}
								fill={selectedClipIds.includes(clip.id) ? "#742cc8" : "#f46f24"}
								key={clip.id}
								r={selectedClipIds.includes(clip.id) ? 6 : 4}
							>
								<title>{`${score.emotion} / ${score.rhythm} / ${score.framework}`}</title>
							</circle>
						))}
					</>
				) : null}

				<line
					stroke="#171715"
					strokeOpacity="0.92"
					strokeWidth="2"
					x1={playheadX}
					x2={playheadX}
					y1="0"
					y2={HEIGHT - 12}
				/>
				<g fontSize="10" fontFamily="monospace">
					<text fill="#f46f24" x="14" y="18">
						emotion
					</text>
					<text fill="#24b85f" x="76" y="18">
						rhythm
					</text>
					<text fill="#742cc8" x="132" y="18">
						density
					</text>
				</g>
			</svg>
		</section>
	);
}
