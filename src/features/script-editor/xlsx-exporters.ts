import { resolveAttributesForClip } from "./analysis";
import { createExportFileName } from "./exporters";
import { formatTimeRange } from "./time";
import type { ScriptClip, ScriptProject } from "./types";

type SheetRow = Array<string | number | undefined>;

const textEncoder = new TextEncoder();
const crcTable = new Uint32Array(256).map((_, index) => {
	let value = index;
	for (let bit = 0; bit < 8; bit += 1) {
		value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
	}
	return value >>> 0;
});

function escapeXml(value: string) {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}

function crc32(bytes: Uint8Array) {
	let crc = 0xffffffff;
	for (const byte of bytes) {
		crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
	}
	return (crc ^ 0xffffffff) >>> 0;
}

function uint16(value: number) {
	const bytes = new Uint8Array(2);
	new DataView(bytes.buffer).setUint16(0, value, true);
	return bytes;
}

function uint32(value: number) {
	const bytes = new Uint8Array(4);
	new DataView(bytes.buffer).setUint32(0, value, true);
	return bytes;
}

function concatBytes(parts: Uint8Array[]) {
	const total = parts.reduce((sum, part) => sum + part.length, 0);
	const result = new Uint8Array(total);
	let offset = 0;
	for (const part of parts) {
		result.set(part, offset);
		offset += part.length;
	}
	return result;
}

function stringBytes(value: string) {
	return textEncoder.encode(value);
}

function createZip(files: Array<{ name: string; contents: string }>) {
	const localParts: Uint8Array[] = [];
	const centralParts: Uint8Array[] = [];
	let offset = 0;

	for (const file of files) {
		const nameBytes = stringBytes(file.name);
		const contentBytes = stringBytes(file.contents);
		const checksum = crc32(contentBytes);
		const localHeader = concatBytes([
			uint32(0x04034b50),
			uint16(20),
			uint16(0),
			uint16(0),
			uint16(0),
			uint16(0),
			uint32(checksum),
			uint32(contentBytes.length),
			uint32(contentBytes.length),
			uint16(nameBytes.length),
			uint16(0),
			nameBytes,
		]);
		localParts.push(localHeader, contentBytes);

		const centralHeader = concatBytes([
			uint32(0x02014b50),
			uint16(20),
			uint16(20),
			uint16(0),
			uint16(0),
			uint16(0),
			uint16(0),
			uint32(checksum),
			uint32(contentBytes.length),
			uint32(contentBytes.length),
			uint16(nameBytes.length),
			uint16(0),
			uint16(0),
			uint16(0),
			uint16(0),
			uint32(0),
			uint32(offset),
			nameBytes,
		]);
		centralParts.push(centralHeader);
		offset += localHeader.length + contentBytes.length;
	}

	const centralDirectory = concatBytes(centralParts);
	const endRecord = concatBytes([
		uint32(0x06054b50),
		uint16(0),
		uint16(0),
		uint16(files.length),
		uint16(files.length),
		uint32(centralDirectory.length),
		uint32(offset),
		uint16(0),
	]);

	return new Blob([concatBytes([...localParts, centralDirectory, endRecord])], {
		type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	});
}

function columnName(index: number) {
	let name = "";
	let value = index + 1;
	while (value > 0) {
		const remainder = (value - 1) % 26;
		name = String.fromCharCode(65 + remainder) + name;
		value = Math.floor((value - 1) / 26);
	}
	return name;
}

function sheetXml(rows: SheetRow[]) {
	const sheetRows = rows
		.map((row, rowIndex) => {
			const cells = row
				.map((cell, columnIndex) => {
					const ref = `${columnName(columnIndex)}${rowIndex + 1}`;
					const value = cell ?? "";
					if (typeof value === "number") {
						return `<c r="${ref}"><v>${value}</v></c>`;
					}
					return `<c r="${ref}" t="inlineStr"><is><t>${escapeXml(String(value))}</t></is></c>`;
				})
				.join("");
			return `<row r="${rowIndex + 1}">${cells}</row>`;
		})
		.join("");

	return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>${sheetRows}</sheetData>
</worksheet>`;
}

function workbookXml(sheetName: string) {
	return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="${escapeXml(sheetName.slice(0, 31))}" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`;
}

function workbookRelsXml() {
	return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`;
}

function rootRelsXml() {
	return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;
}

function contentTypesXml() {
	return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`;
}

function createWorkbookBlob(sheetName: string, rows: SheetRow[]) {
	return createZip([
		{ name: "[Content_Types].xml", contents: contentTypesXml() },
		{ name: "_rels/.rels", contents: rootRelsXml() },
		{ name: "xl/workbook.xml", contents: workbookXml(sheetName) },
		{ name: "xl/_rels/workbook.xml.rels", contents: workbookRelsXml() },
		{ name: "xl/worksheets/sheet1.xml", contents: sheetXml(rows) },
	]);
}

function textClips(project: ScriptProject, role: ScriptClip["textRole"]) {
	return project.clips
		.filter((clip) => clip.clipType === "text" && clip.textRole === role)
		.sort((a, b) => a.start - b.start || a.orderIndex - b.orderIndex);
}

function linkedClip(
	project: ScriptProject,
	source: ScriptClip,
	role: ScriptClip["textRole"],
) {
	return textClips(project, role).find(
		(clip) =>
			clip.parentClipId === source.id ||
			(clip.start < source.end && clip.end > source.start),
	);
}

function notesForClip(project: ScriptProject, source: ScriptClip) {
	return textClips(project, "note")
		.filter((clip) => clip.start < source.end && clip.end > source.start)
		.map((clip) => clip.text)
		.filter(Boolean)
		.join("\n");
}

function downloadBlob(filename: string, blob: Blob) {
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement("a");
	anchor.href = url;
	anchor.download = filename;
	document.body.append(anchor);
	anchor.click();
	anchor.remove();
	URL.revokeObjectURL(url);
}

export function createBRollShotListWorkbook(project: ScriptProject) {
	const rows: SheetRow[] = [
		["镜号", "时间码", "对应口播", "画面内容", "情绪", "节奏", "备注"],
		...textClips(project, "b-roll").map((clip, index) => {
			const aRoll =
				project.clips.find((item) => item.id === clip.parentClipId) ??
				linkedClip(project, clip, "a-roll");
			const attrs = resolveAttributesForClip(project.clips, aRoll ?? clip);

			return [
				String(index + 1).padStart(3, "0"),
				formatTimeRange(clip.start, clip.end),
				aRoll?.text ?? "",
				clip.text ?? "",
				attrs.emotion,
				attrs.rhythm,
				notesForClip(project, clip) || clip.metadata?.note || "",
			];
		}),
	];

	return createWorkbookBlob("B Roll 分镜 List", rows);
}

export function createStoryboardWorkbook(project: ScriptProject) {
	const aRollClips = textClips(project, "a-roll");
	const rows: SheetRow[] = [
		[
			"镜号",
			"时间码",
			"A Roll 口播",
			"B Roll 画面",
			"字幕",
			"情绪",
			"节奏",
			"结构",
			"备注",
		],
		...aRollClips.map((clip, index) => {
			const bRoll = linkedClip(project, clip, "b-roll");
			const subtitle = linkedClip(project, clip, "subtitle");
			const attrs = resolveAttributesForClip(project.clips, clip);

			return [
				String(index + 1).padStart(3, "0"),
				formatTimeRange(clip.start, clip.end),
				clip.text ?? "",
				bRoll?.text ?? "",
				subtitle?.text ?? "",
				attrs.emotion,
				attrs.rhythm,
				attrs.framework,
				notesForClip(project, clip) || clip.metadata?.note || "",
			];
		}),
	];

	return createWorkbookBlob("分镜头脚本", rows);
}

export function downloadBRollShotListWorkbook(project: ScriptProject) {
	downloadBlob(
		createExportFileName(project, "b-roll-shot-list.xlsx"),
		createBRollShotListWorkbook(project),
	);
}

export function downloadStoryboardWorkbook(project: ScriptProject) {
	downloadBlob(
		createExportFileName(project, "storyboard.xlsx"),
		createStoryboardWorkbook(project),
	);
}
