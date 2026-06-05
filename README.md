# Script Cut UI

Script Cut UI 是一个面向短视频口播创作者的脚本分析、A Roll / B Roll 分镜规划和导出工具。

本项目基于 [DesignCombo React Video Editor](https://github.com/designcombo/react-video-editor) 改造而来。原项目提供了 React / Next.js 视频编辑器基础工程、Remotion 播放和多轨编辑能力；本仓库在此基础上新增了口播稿导入、自动情绪分析、脚本时间线、分镜规划和文档导出能力。

## 功能

- 导入口播稿：支持纯文本、Markdown、Word / HTML 文档。
- 自动分析口播稿：导入后按句切分 A Roll Clip，并自动标注情绪、节奏和结构阶段。
- 大模型 API 预留：`src/features/script-editor/ai-script-analysis.ts` 中保留了模型分析入口，目前默认使用本地规则兜底。
- 时间线编辑：支持 Clip 拖动、左右拉伸、跨轨道移动、磁吸对齐和音频轨道播放。
- A Roll 导出：自动生成口播逐字稿 DOCX。
- B Roll 导出：自动生成分镜头 list XLSX。
- 分镜导出：自动生成完整分镜头脚本 XLSX。
- 情绪图导出：生成脚本情绪 / 节奏 HTML 图谱。

## 运行

```bash
pnpm install
pnpm dev -- --webpack -H 127.0.0.1 -p 3001
```

然后打开：

```text
http://127.0.0.1:3001/script-editor
```

如果本机没有 `pnpm`，也可以使用项目已有的本地 Next 可执行文件：

```bash
./node_modules/.bin/next dev --webpack -H 127.0.0.1 -p 3001
```

## 大模型分析入口

当前自动情绪分析默认走本地规则，不依赖 API key。后续可以在这里接入任意大模型：

```text
src/features/script-editor/ai-script-analysis.ts
```

实现 `analyzeWithModelApi()`，返回与输入 segments 等长的 JSON 数组即可：

```ts
[
  {
    emotion: "curious",
    rhythm: "steady",
    framework: "hook",
    emotionalIntensity: 0.62,
    note: "模型分析说明",
    tags: ["auto-analysis"]
  }
]
```

## 导出格式

- A Roll：`*.a-roll-transcript.docx`
- B Roll：`*.b-roll-shot-list.xlsx`
- 分镜脚本：`*.storyboard.xlsx`
- 全量脚本：`*.full-script.docx`
- 情绪图：`*.emotion-rhythm-map.html`

## 开源来源说明

本项目是对 [DesignCombo React Video Editor](https://github.com/designcombo/react-video-editor) 的二次改造版本。请在发布、演示或再分发时保留原项目来源说明，并遵守原项目的许可证和版权声明。

原项目版权信息：

```text
Copyright © 2025 DesignCombo.
```

## License

请根据原项目许可证和你的再分发需求补充正式 LICENSE 文件。当前仓库保留原项目来源和版权声明。
