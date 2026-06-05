"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Search, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { useScriptEditorStore } from "../store";
import { formatTimeRange } from "../time";
import type { ScriptClip } from "../types";

type FilterValue =
	| "all"
	| "a-roll"
	| "b-roll"
	| "emotion"
	| "rhythm"
	| "framework";

const filters: { label: string; value: FilterValue }[] = [
	{ label: "全部", value: "all" },
	{ label: "A Roll", value: "a-roll" },
	{ label: "B Roll", value: "b-roll" },
	{ label: "情绪", value: "emotion" },
	{ label: "节奏", value: "rhythm" },
	{ label: "框架", value: "framework" },
];

function clipMatchesFilter(clip: ScriptClip, filter: FilterValue) {
	if (filter === "all") return true;
	if (filter === "emotion" || filter === "rhythm" || filter === "framework") {
		return clip.attributeType === filter;
	}
	return clip.textRole === filter;
}

function getClipTitle(clip: ScriptClip) {
	if (clip.clipType === "attribute") {
		return (
			clip.emotion ?? clip.rhythm ?? clip.framework ?? clip.attributeType ?? ""
		);
	}

	return clip.text ?? "";
}

export function ScriptPanel() {
	const [draftText, setDraftText] = useState(
		"很多人以为 AI 视频最难的是画面。其实不是。真正难的是连续性和可控性。",
	);
	const [isAnalyzing, setIsAnalyzing] = useState(false);
	const [filter, setFilter] = useState<FilterValue>("all");
	const [query, setQuery] = useState("");
	const project = useScriptEditorStore((state) => state.project);
	const selectedClipIds = useScriptEditorStore(
		(state) => state.selectedClipIds,
	);
	const importPlainText = useScriptEditorStore(
		(state) => state.importPlainText,
	);
	const selectClip = useScriptEditorStore((state) => state.selectClip);

	const clips = useMemo(() => {
		const normalizedQuery = query.trim().toLowerCase();
		return project.clips
			.filter((clip) => clipMatchesFilter(clip, filter))
			.filter((clip) =>
				normalizedQuery
					? getClipTitle(clip).toLowerCase().includes(normalizedQuery)
					: true,
			)
			.sort((a, b) => a.orderIndex - b.orderIndex || a.start - b.start);
	}, [filter, project.clips, query]);

	const generateClips = async () => {
		setIsAnalyzing(true);
		try {
			await importPlainText(draftText);
		} finally {
			setIsAnalyzing(false);
		}
	};

	return (
		<aside className="script-left-panel flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
			<div className="script-prompt-card script-floating-enter">
				<div className="mb-3 flex items-center justify-between gap-3">
					<div>
						<div className="script-kicker">prompt capsule</div>
						<h2 className="script-heading-serif text-2xl leading-none">
							Script.
						</h2>
					</div>
					<div className="script-status-seal px-2 py-1 text-[10px]">
						AI READY
					</div>
				</div>
				<Textarea
					className="script-prompt-textarea"
					value={draftText}
					onChange={(event) => setDraftText(event.target.value)}
					placeholder="粘贴完整脚本文字"
				/>
				<Button
					className="script-button script-button-primary mt-3 w-full"
					disabled={isAnalyzing}
					onClick={generateClips}
				>
					<Sparkles className="size-4" />
					{isAnalyzing ? "分析口播情绪中" : "生成文字 Clips"}
				</Button>
			</div>

			<div className="script-filter-card">
				<div className="mb-2 script-kicker">filters</div>
				<div className="script-filter-grid">
					{filters.map((item) => (
						<button
							className={`script-filter-chip ${
								filter === item.value ? "script-filter-chip-active" : ""
							}`}
							key={item.value}
							onClick={() => setFilter(item.value)}
							type="button"
						>
							{item.label}
						</button>
					))}
				</div>
				<div className="script-search-box">
					<Search className="size-4 text-[#742cc8]" />
					<Input
						className="script-search-input"
						value={query}
						onChange={(event) => setQuery(event.target.value)}
						placeholder="搜索脚本块"
					/>
				</div>
			</div>

			<div className="script-clip-list">
				{clips.map((clip) => {
					const selected = selectedClipIds.includes(clip.id);

					return (
						<button
							className={`script-list-clip mb-2 ${
								selected ? "script-list-clip-selected" : ""
							}`}
							key={clip.id}
							onClick={(event) =>
								selectClip(clip.id, event.metaKey || event.ctrlKey)
							}
							type="button"
						>
							<div className="mb-2 flex items-center justify-between gap-2 font-mono text-[10px] font-black uppercase text-black/50">
								<span>
									{clip.clipType === "attribute"
										? clip.attributeType
										: clip.textRole}
								</span>
								<span>{formatTimeRange(clip.start, clip.end)}</span>
							</div>
							<p className="line-clamp-3 text-sm font-semibold leading-5 text-[#171715]">
								{getClipTitle(clip)}
							</p>
						</button>
					);
				})}
			</div>
		</aside>
	);
}
