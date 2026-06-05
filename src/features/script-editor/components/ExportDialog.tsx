"use client";

import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import { ReactNode, useState } from "react";
import {
	createExportFileName,
	downloadTextFile,
	exportEmotionMapHtml,
} from "../exporters";
import { useScriptEditorStore } from "../store";
import { type WordExportMode, createWordBlob } from "../word-exporters";
import {
	downloadBRollShotListWorkbook,
	downloadStoryboardWorkbook,
} from "../xlsx-exporters";

type ExportMode = WordExportMode | "storyboard";

type Props = {
	mode?: ExportMode;
	triggerIcon?: ReactNode;
	triggerLabel?: string;
};

const exportOptions: { mode: ExportMode; label: string }[] = [
	{ mode: "a-roll", label: "导出 A Roll DOCX" },
	{ mode: "b-roll", label: "导出 B Roll 分镜 List XLSX" },
	{ mode: "storyboard", label: "导出分镜头脚本 XLSX" },
	{ mode: "full", label: "导出全部脚本 DOCX" },
	{ mode: "emotion", label: "导出情绪图" },
];

export function ExportDialog({
	mode,
	triggerIcon = <FileDown className="size-4" />,
	triggerLabel = "导出",
}: Props) {
	const [open, setOpen] = useState(false);
	const project = useScriptEditorStore((state) => state.project);

	const runExport = async (exportMode: ExportMode) => {
		if (exportMode === "b-roll") {
			downloadBRollShotListWorkbook(project);
			setOpen(false);
			return;
		}

		if (exportMode === "storyboard") {
			downloadStoryboardWorkbook(project);
			setOpen(false);
			return;
		}

		if (exportMode === "emotion") {
			downloadTextFile(
				createExportFileName(project, "emotion-rhythm-map.html"),
				exportEmotionMapHtml(project),
				"text/html;charset=utf-8",
			);
			setOpen(false);
			return;
		}

		const blob = await createWordBlob(project, exportMode);
		const url = URL.createObjectURL(blob);
		const anchor = document.createElement("a");
		anchor.href = url;
		anchor.download = createExportFileName(
			project,
			exportMode === "full" ? "full-script.docx" : "a-roll-transcript.docx",
		);
		document.body.append(anchor);
		anchor.click();
		anchor.remove();
		URL.revokeObjectURL(url);
		setOpen(false);
	};

	if (mode) {
		return (
			<Button
				variant="outline"
				size="sm"
				className="script-button"
				onClick={() => runExport(mode)}
			>
				{triggerIcon}
				{triggerLabel}
			</Button>
		);
	}

	return (
		<div className="relative">
			<Button
				variant="outline"
				size="sm"
				className="script-button"
				onClick={() => setOpen((value) => !value)}
			>
				{triggerIcon}
				{triggerLabel}
			</Button>

			{open ? (
				<div className="absolute left-0 top-11 z-50 w-56 overflow-hidden rounded-md border border-black/10 bg-[#fffdf7] shadow-2xl">
					{exportOptions.map((option) => (
						<button
							className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-[#171715] hover:bg-[#edece3]"
							key={option.mode}
							onClick={() => runExport(option.mode)}
							type="button"
						>
							<FileDown className="size-4 text-[#742cc8]" />
							{option.label}
						</button>
					))}
				</div>
			) : null}
		</div>
	);
}
