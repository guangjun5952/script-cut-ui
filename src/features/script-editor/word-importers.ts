type MammothModule = {
  convertToHtml: (input: { arrayBuffer: ArrayBuffer }) => Promise<{ value: string }>;
};

function htmlToStructuredText(html: string) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const blocks: string[] = [];

  doc.body.querySelectorAll("h1,h2,h3,h4,h5,h6,p,li").forEach((node) => {
    const text = node.textContent?.replace(/\s+/g, " ").trim();
    if (!text) return;

    if (/^H[1-6]$/i.test(node.nodeName)) {
      const level = Number(node.nodeName.slice(1));
      blocks.push(`${"#".repeat(Math.min(level, 6))} ${text}`);
      return;
    }

    if (node.nodeName.toLowerCase() === "li") {
      blocks.push(`- ${text}`);
      return;
    }

    blocks.push(text);
  });

  return blocks.join("\n\n");
}

export async function readWordLikeFile(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (extension === "docx") {
    const mammoth = (await import("mammoth")) as MammothModule;
    const result = await mammoth.convertToHtml({
      arrayBuffer: await file.arrayBuffer(),
    });

    return htmlToStructuredText(result.value);
  }

  const text = await file.text();
  if (/<html|<body|<h1|<p/i.test(text)) {
    return htmlToStructuredText(text);
  }

  return text;
}
