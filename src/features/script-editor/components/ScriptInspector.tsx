"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Copy, GitMerge, Scissors, Trash2, WandSparkles } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { useScriptEditorStore } from "../store";
import { formatTime } from "../time";
import {
	type AttributeType,
	CLIP_STATUS_VALUES,
	EMOTION_VALUES,
	type EmotionValue,
	FRAMEWORK_VALUES,
	type FrameworkValue,
	RHYTHM_VALUES,
	type RhythmValue,
	type ScriptClip,
	type TextRole,
} from "../types";

function Field({
	label,
	children,
}: {
	label: string;
	children: ReactNode;
}) {
	return (
		<div className="block">
			<div className="script-field-label">{label}</div>
			{children}
		</div>
	);
}

function InspectorInput(props: ComponentProps<typeof Input>) {
	return (
		<Input
			{...props}
			className={`script-form-input text-sm ${props.className ?? ""}`}
		/>
	);
}

function InspectorSelect({
	value,
	onChange,
	children,
}: {
	value: string;
	onChange: (value: string) => void;
	children: ReactNode;
}) {
	return (
		<select
			className="script-form-select text-sm"
			value={value}
			onChange={(event) => onChange(event.target.value)}
		>
			{children}
		</select>
	);
}

function Stat({ label, value }: { label: string; value: string | number }) {
	return (
		<div className="script-stat-card">
			<div className="script-kicker">{label}</div>
			<strong>{value}</strong>
		</div>
	);
}

function getAttributeValue(clip: ScriptClip) {
	if (clip.attributeType === "emotion") return clip.emotion ?? "neutral";
	if (clip.attributeType === "rhythm") return clip.rhythm ?? "steady";
	return clip.framework ?? "explanation";
}

export function ScriptInspector() {
	const project = useScriptEditorStore((state) => state.project);
	const selectedClipIds = useScriptEditorStore(
		(state) => state.selectedClipIds,
	);
	const currentTime = useScriptEditorStore((state) => state.currentTime);
	const updateClip = useScriptEditorStore((state) => state.updateClip);
	const deleteClip = useScriptEditorStore((state) => state.deleteClip);
	const duplicateClip = useScriptEditorStore((state) => state.duplicateClip);
	const splitClip = useScriptEditorStore((state) => state.splitClip);
	const mergeClips = useScriptEditorStore((state) => state.mergeClips);
	const addAttributeClip = useScriptEditorStore(
		(state) => state.addAttributeClip,
	);
	const applyDirectAttributeToClip = useScriptEditorStore(
		(state) => state.applyDirectAttributeToClip,
	);
	const clip = project.clips.find((item) => item.id === selectedClipIds[0]);

	const addOverlay = (attributeType: AttributeType) => {
		const selectedTextClip =
			clip?.clipType === "text" && clip.textRole === "a-roll"
				? clip
				: undefined;
		const start = selectedTextClip?.start ?? currentTime;
		const duration = selectedTextClip?.duration ?? 3;

		addAttributeClip({
			attributeType,
			value:
				attributeType === "emotion"
					? "dramatic"
					: attributeType === "rhythm"
						? "punchy"
						: "hook",
			start,
			duration,
			trackId: selectedTextClip?.trackId ?? clip?.trackId,
			targetClipIds: selectedTextClip ? [selectedTextClip.id] : undefined,
		});
	};

	if (!clip) {
		return (
			<aside className="script-inspector-panel flex h-full min-h-0 flex-col p-4">
				<div className="mb-4">
					<div className="script-kicker">Inspector</div>
					<h2 className="script-heading-serif text-2xl text-[#171715]">
						未选中 Clip
					</h2>
				</div>
				<div className="grid gap-2">
					<Button
						className="script-button script-button-primary justify-start"
						onClick={() => addOverlay("emotion")}
					>
						<WandSparkles className="size-4" />
						新增情绪覆盖 Clip
					</Button>
					<Button
						variant="outline"
						className="script-button script-button-lavender justify-start"
						onClick={() => addOverlay("rhythm")}
					>
						新增节奏覆盖 Clip
					</Button>
					<Button
						variant="outline"
						className="script-button script-button-orange justify-start"
						onClick={() => addOverlay("framework")}
					>
						新增框架覆盖 Clip
					</Button>
				</div>
			</aside>
		);
	}

	return (
		<aside className="script-inspector-panel">
			<div className="script-inspector-scroll">
				<div className="mb-4 flex items-start justify-between gap-3">
					<div>
						<div className="script-kicker">Inspector</div>
						<h2 className="script-heading-serif text-2xl leading-none text-[#171715]">
							{clip.clipType === "attribute"
								? "属性 Clip"
								: clip.clipType === "audio"
									? "音频 Clip"
									: "文字 Clip"}
						</h2>
					</div>
					<div className="script-status-seal px-2 py-1 text-[10px]">
						{clip.clipType}
					</div>
				</div>

				<div className="grid grid-cols-3 gap-2">
					<Stat label="Start" value={formatTime(clip.start)} />
					<Stat label="Duration" value={`${clip.duration.toFixed(2)}s`} />
					<Stat label="End" value={formatTime(clip.end)} />
				</div>

				<div className="mt-4 grid gap-3">
					<div className="grid grid-cols-2 gap-2">
						<Field label="开始时间">
							<InspectorInput
								min={0}
								step={0.1}
								type="number"
								value={clip.start}
								onChange={(event) =>
									updateClip(clip.id, { start: Number(event.target.value) })
								}
							/>
						</Field>
						<Field label="持续时长">
							<InspectorInput
								min={0.2}
								step={0.1}
								type="number"
								value={clip.duration}
								onChange={(event) =>
									updateClip(clip.id, { duration: Number(event.target.value) })
								}
							/>
						</Field>
					</div>

					<Field label="状态">
						<InspectorSelect
							value={clip.status}
							onChange={(value) =>
								updateClip(clip.id, {
									status: value as ScriptClip["status"],
								})
							}
						>
							{CLIP_STATUS_VALUES.map((status) => (
								<option key={status} value={status}>
									{status}
								</option>
							))}
						</InspectorSelect>
					</Field>

					{clip.clipType === "text" ? (
						<TextClipFields
							clip={clip}
							onDirectAttribute={applyDirectAttributeToClip}
							onUpdate={updateClip}
						/>
					) : clip.clipType === "audio" ? (
						<AudioClipFields clip={clip} onUpdate={updateClip} />
					) : (
						<AttributeClipFields clip={clip} onUpdate={updateClip} />
					)}

					<Field label="颜色">
						<InspectorInput
							type="color"
							value={
								clip.color ??
								(clip.clipType === "attribute"
									? "#f46f24"
									: clip.clipType === "audio"
										? "#742cc8"
										: "#b9ff36")
							}
							onChange={(event) =>
								updateClip(clip.id, { color: event.target.value })
							}
						/>
					</Field>

					<label className="flex items-center justify-between rounded-md border border-black/10 bg-white/70 px-3 py-2 text-sm font-semibold text-[#171715]">
						锁定
						<input
							checked={clip.locked ?? false}
							className="size-4 accent-[#f46f24]"
							type="checkbox"
							onChange={(event) =>
								updateClip(clip.id, { locked: event.target.checked })
							}
						/>
					</label>

					<div className="grid grid-cols-2 gap-2">
						<Button
							variant="outline"
							className="script-button"
							onClick={() => duplicateClip(clip.id)}
						>
							<Copy className="size-4" />
							复制
						</Button>
						<Button
							variant="outline"
							className="script-button"
							onClick={() => splitClip(clip.id, currentTime)}
						>
							<Scissors className="size-4" />
							拆分
						</Button>
						<Button
							variant="outline"
							className="script-button"
							disabled={selectedClipIds.length < 2}
							onClick={() => mergeClips(selectedClipIds)}
						>
							<GitMerge className="size-4" />
							合并
						</Button>
						<Button
							variant="destructive"
							className="border border-black/10 bg-[#f46f24] text-white hover:bg-[#d85d1c]"
							onClick={() => deleteClip(clip.id)}
						>
							<Trash2 className="size-4" />
							删除
						</Button>
					</div>

					<div className="grid grid-cols-3 gap-2 border-t border-black/10 pt-3">
						<Button
							variant="outline"
							size="sm"
							className="script-button script-button-orange"
							onClick={() => addOverlay("emotion")}
						>
							情绪覆盖
						</Button>
						<Button
							variant="outline"
							size="sm"
							className="script-button script-button-lavender"
							onClick={() => addOverlay("rhythm")}
						>
							节奏覆盖
						</Button>
						<Button
							variant="outline"
							size="sm"
							className="script-button script-button-primary"
							onClick={() => addOverlay("framework")}
						>
							框架覆盖
						</Button>
					</div>
				</div>
			</div>
		</aside>
	);
}

function TextClipFields({
	clip,
	onUpdate,
	onDirectAttribute,
}: {
	clip: ScriptClip;
	onUpdate: (clipId: string, patch: Partial<ScriptClip>) => void;
	onDirectAttribute: (
		clipId: string,
		attributeType: AttributeType,
		value: EmotionValue | RhythmValue | FrameworkValue,
	) => void;
}) {
	const setTextRole = (textRole: TextRole) => {
		const trackId = textRole === "b-roll" ? "track-b-roll" : "track-a-roll";
		onUpdate(clip.id, { textRole, trackId });
	};
	const setSpeechRate = (charsPerSecond: number) => {
		const safeRate = Math.max(0.8, charsPerSecond);
		const charsCount =
			clip.metadata?.charsCount ?? (clip.text ?? "").replace(/\s/g, "").length;
		const duration = Number(Math.max(0.4, charsCount / safeRate).toFixed(2));

		onUpdate(clip.id, { duration });
	};

	return (
		<>
			<Field label="文本内容">
				<Textarea
					className="script-form-textarea text-sm"
					value={clip.text ?? ""}
					onChange={(event) => onUpdate(clip.id, { text: event.target.value })}
				/>
			</Field>

			<div className="grid grid-cols-3 gap-2">
				<Stat label="字数" value={clip.metadata?.charsCount ?? 0} />
				<Stat label="语速" value={clip.metadata?.charsPerSecond ?? 0} />
				<Stat label="节奏" value={clip.metadata?.rhythmWarning ?? "normal"} />
			</div>

			<Field label="语速（字/秒）">
				<div className="grid grid-cols-[1fr_82px] items-center gap-2">
					<input
						className="script-slider w-full"
						max={10}
						min={0.8}
						step={0.1}
						type="range"
						value={clip.metadata?.charsPerSecond ?? 4.5}
						onChange={(event) => setSpeechRate(Number(event.target.value))}
					/>
					<InspectorInput
						min={0.8}
						step={0.1}
						type="number"
						value={clip.metadata?.charsPerSecond ?? 4.5}
						onChange={(event) => setSpeechRate(Number(event.target.value))}
					/>
				</div>
			</Field>

			<Field label="Clip 类型">
				<InspectorSelect
					value={clip.textRole ?? "a-roll"}
					onChange={(value) => setTextRole(value as TextRole)}
				>
					<option value="a-roll">A Roll</option>
					<option value="b-roll">B Roll</option>
				</InspectorSelect>
			</Field>

			<div className="grid grid-cols-2 gap-2">
				<Button
					variant={clip.textRole === "a-roll" ? "secondary" : "outline"}
					className="script-button script-button-lavender"
					onClick={() => setTextRole("a-roll")}
				>
					属于 A Roll
				</Button>
				<Button
					variant={clip.textRole === "b-roll" ? "secondary" : "outline"}
					className="script-button script-button-primary"
					onClick={() => setTextRole("b-roll")}
				>
					属于 B Roll
				</Button>
			</div>

			<div className="grid grid-cols-3 gap-2">
				<Field label="情绪属性">
					<InspectorSelect
						value={clip.directAttributes?.emotion ?? "neutral"}
						onChange={(value) =>
							onDirectAttribute(clip.id, "emotion", value as EmotionValue)
						}
					>
						{EMOTION_VALUES.map((value) => (
							<option key={value} value={value}>
								{value}
							</option>
						))}
					</InspectorSelect>
				</Field>
				<Field label="节奏属性">
					<InspectorSelect
						value={clip.directAttributes?.rhythm ?? "steady"}
						onChange={(value) =>
							onDirectAttribute(clip.id, "rhythm", value as RhythmValue)
						}
					>
						{RHYTHM_VALUES.map((value) => (
							<option key={value} value={value}>
								{value}
							</option>
						))}
					</InspectorSelect>
				</Field>
				<Field label="框架属性">
					<InspectorSelect
						value={clip.directAttributes?.framework ?? "explanation"}
						onChange={(value) =>
							onDirectAttribute(clip.id, "framework", value as FrameworkValue)
						}
					>
						{FRAMEWORK_VALUES.map((value) => (
							<option key={value} value={value}>
								{value}
							</option>
						))}
					</InspectorSelect>
				</Field>
			</div>

			<Field label="备注">
				<Textarea
					className="script-form-textarea min-h-20 text-sm"
					value={clip.metadata?.note ?? ""}
					onChange={(event) =>
						onUpdate(clip.id, {
							metadata: { ...clip.metadata, note: event.target.value },
						})
					}
				/>
			</Field>
		</>
	);
}

function AudioClipFields({
	clip,
	onUpdate,
}: {
	clip: ScriptClip;
	onUpdate: (clipId: string, patch: Partial<ScriptClip>) => void;
}) {
	return (
		<>
			<Field label="音频名称">
				<InspectorInput
					value={clip.audioName ?? clip.text ?? ""}
					onChange={(event) =>
						onUpdate(clip.id, {
							audioName: event.target.value,
							text: event.target.value,
						})
					}
				/>
			</Field>

			<div className="grid grid-cols-2 gap-2">
				<Stat label="类型" value={clip.audioKind ?? "music"} />
				<Stat
					label="大小"
					value={
						clip.audioSize
							? `${(clip.audioSize / 1024 / 1024).toFixed(2)} MB`
							: "-"
					}
				/>
			</div>

			<Field label="音频用途">
				<InspectorSelect
					value={clip.audioKind ?? "music"}
					onChange={(value) =>
						onUpdate(clip.id, {
							audioKind: value as ScriptClip["audioKind"],
						})
					}
				>
					<option value="music">音乐</option>
					<option value="sound-effect">音效</option>
				</InspectorSelect>
			</Field>

			<Field label="文件类型">
				<InspectorInput value={clip.audioMimeType ?? "audio/*"} readOnly />
			</Field>

			<Field label="备注">
				<Textarea
					className="script-form-textarea min-h-20 text-sm"
					value={clip.metadata?.note ?? ""}
					onChange={(event) =>
						onUpdate(clip.id, {
							metadata: { ...clip.metadata, note: event.target.value },
						})
					}
				/>
			</Field>
		</>
	);
}

function AttributeClipFields({
	clip,
	onUpdate,
}: {
	clip: ScriptClip;
	onUpdate: (clipId: string, patch: Partial<ScriptClip>) => void;
}) {
	const changeType = (attributeType: AttributeType) => {
		onUpdate(clip.id, {
			attributeType,
			emotion: attributeType === "emotion" ? "neutral" : clip.emotion,
			rhythm: attributeType === "rhythm" ? "steady" : clip.rhythm,
			framework: attributeType === "framework" ? "explanation" : clip.framework,
		});
	};
	const changeValue = (value: string) => {
		if (clip.attributeType === "emotion") {
			onUpdate(clip.id, { emotion: value as EmotionValue });
		}
		if (clip.attributeType === "rhythm") {
			onUpdate(clip.id, { rhythm: value as RhythmValue });
		}
		if (clip.attributeType === "framework") {
			onUpdate(clip.id, { framework: value as FrameworkValue });
		}
	};

	return (
		<>
			<div className="grid grid-cols-2 gap-2">
				<Field label="属性类型">
					<InspectorSelect
						value={clip.attributeType ?? "emotion"}
						onChange={(value) => changeType(value as AttributeType)}
					>
						<option value="emotion">emotion</option>
						<option value="rhythm">rhythm</option>
						<option value="framework">framework</option>
					</InspectorSelect>
				</Field>
				<Field label="属性值">
					<InspectorSelect
						value={getAttributeValue(clip) ?? ""}
						onChange={changeValue}
					>
						{(clip.attributeType === "emotion"
							? EMOTION_VALUES
							: clip.attributeType === "rhythm"
								? RHYTHM_VALUES
								: FRAMEWORK_VALUES
						).map((value) => (
							<option key={value} value={value}>
								{value}
							</option>
						))}
					</InspectorSelect>
				</Field>
			</div>

			<Field label="强度值">
				<input
					className="script-slider w-full"
					max={1}
					min={0}
					step={0.05}
					type="range"
					value={clip.intensity ?? 0.65}
					onChange={(event) =>
						onUpdate(clip.id, { intensity: Number(event.target.value) })
					}
				/>
			</Field>

			<Field label="作用目标">
				<InspectorInput
					value={clip.targetClipIds?.join(",") ?? "全部"}
					onChange={(event) =>
						onUpdate(clip.id, {
							targetClipIds:
								event.target.value.trim() && event.target.value !== "全部"
									? event.target.value.split(",").map((item) => item.trim())
									: undefined,
						})
					}
				/>
			</Field>

			<Field label="备注">
				<Textarea
					className="script-form-textarea min-h-20 text-sm"
					value={clip.metadata?.note ?? ""}
					onChange={(event) =>
						onUpdate(clip.id, {
							metadata: { ...clip.metadata, note: event.target.value },
						})
					}
				/>
			</Field>
		</>
	);
}
