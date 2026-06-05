"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Download,
	FileJson,
	FileType,
	FolderPlus,
	ImageDown,
	Magnet,
	Pause,
	Play,
	Plus,
	Save,
	Upload,
	WandSparkles,
} from "lucide-react";
import { useRef, useState } from "react";
import { useScriptEditorStore } from "../store";
import { formatTime } from "../time";
import { readWordLikeFile } from "../word-importers";
import { ExportDialog } from "./ExportDialog";

export function ScriptToolbar() {
	const [isAnalyzing, setIsAnalyzing] = useState(false);
	const project = useScriptEditorStore((state) => state.project);
	const currentTime = useScriptEditorStore((state) => state.currentTime);
	const isPlaying = useScriptEditorStore((state) => state.isPlaying);
	const zoom = useScriptEditorStore((state) => state.zoom);
	const snapEnabled = useScriptEditorStore(
		(state) => state.project.settings.snapEnabled,
	);
	const setZoom = useScriptEditorStore((state) => state.setZoom);
	const setSnapEnabled = useScriptEditorStore((state) => state.setSnapEnabled);
	const setProject = useScriptEditorStore((state) => state.setProject);
	const importPlainText = useScriptEditorStore(
		(state) => state.importPlainText,
	);
	const importDocumentText = useScriptEditorStore(
		(state) => state.importDocumentText,
	);
	const importJSON = useScriptEditorStore((state) => state.importJSON);
	const saveToLocalStorage = useScriptEditorStore(
		(state) => state.saveToLocalStorage,
	);
	const play = useScriptEditorStore((state) => state.play);
	const pause = useScriptEditorStore((state) => state.pause);
	const addTrack = useScriptEditorStore((state) => state.addTrack);
	const generateBRollPlaceholdersFromARoll = useScriptEditorStore(
		(state) => state.generateBRollPlaceholdersFromARoll,
	);
	const textInputRef = useRef<HTMLInputElement>(null);
	const jsonInputRef = useRef<HTMLInputElement>(null);
	const docInputRef = useRef<HTMLInputElement>(null);

	const updateTitle = (title: string) => {
		setProject({ ...project, title });
	};

	const readTextFile = async (file?: File) => {
		if (!file) return;
		setIsAnalyzing(true);
		try {
			await importPlainText(await file.text());
		} finally {
			setIsAnalyzing(false);
		}
	};

	const readJSONFile = async (file?: File) => {
		if (!file) return;
		const parsed = JSON.parse(await file.text());
		importJSON(parsed);
	};

	const readDocFile = async (file?: File) => {
		if (!file) return;
		setIsAnalyzing(true);
		try {
			const text = await readWordLikeFile(file);
			await importDocumentText(
				text,
				file.name.replace(/\.(docx?|html?)$/i, ""),
			);
		} finally {
			setIsAnalyzing(false);
		}
	};

	return (
		<header className="script-toolbar script-floating-enter">
			<div className="script-project-title">
				<div className="script-brand-badge">Sc</div>
				<div className="min-w-0">
					<div className="script-kicker">prompt-driven script UI</div>
					<Input
						aria-label="项目名称"
						className="script-title-input"
						value={project.title}
						onChange={(event) => updateTitle(event.target.value)}
					/>
				</div>
			</div>

			<input
				ref={textInputRef}
				className="hidden"
				type="file"
				accept=".txt,.md,text/plain,text/markdown"
				onChange={(event) => readTextFile(event.target.files?.[0])}
			/>
			<input
				ref={docInputRef}
				className="hidden"
				type="file"
				accept=".doc,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword,text/html"
				onChange={(event) => readDocFile(event.target.files?.[0])}
			/>
			<input
				ref={jsonInputRef}
				className="hidden"
				type="file"
				accept="application/json,.json"
				onChange={(event) => readJSONFile(event.target.files?.[0])}
			/>

			<div className="script-toolbar-island">
				<Button
					variant="outline"
					size="sm"
					className="script-button"
					onClick={() => textInputRef.current?.click()}
					disabled={isAnalyzing}
				>
					<Upload className="size-4" />
					{isAnalyzing ? "分析中" : "纯文本"}
				</Button>
				<Button
					variant="outline"
					size="sm"
					className="script-button"
					onClick={() => jsonInputRef.current?.click()}
				>
					<FileJson className="size-4" />
					JSON
				</Button>
				<Button
					variant="outline"
					size="sm"
					className="script-button"
					onClick={() => docInputRef.current?.click()}
					disabled={isAnalyzing}
				>
					<FileType className="size-4" />
					{isAnalyzing ? "分析中" : "DOC"}
				</Button>
				<Button
					variant="outline"
					size="sm"
					className="script-button script-button-lavender"
					onClick={saveToLocalStorage}
				>
					<Save className="size-4" />
					保存
				</Button>

				<ExportDialog triggerIcon={<Download className="size-4" />} />
				<ExportDialog
					mode="storyboard"
					triggerIcon={<Download className="size-4" />}
					triggerLabel="分镜 XLSX"
				/>

				<Button
					draggable
					variant="outline"
					size="sm"
					className="script-button script-button-orange cursor-grab active:cursor-grabbing"
					onDragStart={(event) => {
						event.dataTransfer.effectAllowed = "copy";
						event.dataTransfer.setData("application/x-script-new-clip", "text");
					}}
				>
					<Plus className="size-4" />
					新增 Clip
				</Button>
			</div>

			<div className="script-toolbar-island justify-end">
				<Button
					variant="secondary"
					size="icon"
					className="script-button script-button-primary size-9"
					onClick={isPlaying ? pause : play}
					aria-label={isPlaying ? "暂停" : "播放"}
				>
					{isPlaying ? (
						<Pause className="size-4" />
					) : (
						<Play className="size-4" />
					)}
				</Button>

				<div className="script-time-chip">
					{formatTime(currentTime)} / {formatTime(project.duration)}
				</div>

				<Button
					variant="outline"
					size="icon"
					className={`script-button script-snap-button size-9 ${
						snapEnabled ? "script-snap-button-active" : ""
					}`}
					onClick={() => setSnapEnabled(!snapEnabled)}
					aria-label={snapEnabled ? "关闭磁吸" : "打开磁吸"}
					title={snapEnabled ? "关闭磁吸" : "打开磁吸"}
				>
					<Magnet className="size-4" />
				</Button>

				<label className="script-chip">
					缩放
					<input
						className="script-slider w-24"
						type="range"
						min={44}
						max={220}
						value={zoom}
						onChange={(event) => setZoom(Number(event.target.value))}
					/>
				</label>
				<Button
					variant="outline"
					size="sm"
					className="script-button"
					onClick={() => addTrack("a-roll")}
				>
					<FolderPlus className="size-4" />A Roll
				</Button>
				<Button
					variant="outline"
					size="sm"
					className="script-button script-button-dark"
					onClick={generateBRollPlaceholdersFromARoll}
				>
					<WandSparkles className="size-4" />B Roll
				</Button>
				<ExportDialog
					mode="emotion"
					triggerIcon={<ImageDown className="size-4" />}
					triggerLabel="生成情绪图"
				/>
			</div>
		</header>
	);
}
