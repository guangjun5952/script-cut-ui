"use client";

import { useEffect, useMemo, useRef, type CSSProperties } from "react";
import * as THREE from "three";
import styles from "./scriptcut-fui-demo.module.css";

type ClipKeyword = {
	label: string;
	track: string;
	tag: string;
	left: number;
	width: number;
	depth: number;
	color: "lime" | "lavender" | "orange" | "purple" | "ink";
	delay: number;
};

type ConceptNode = {
	label: string;
	detail: string;
	x: number;
	y: number;
	z: number;
	rotate: number;
	size: "large" | "medium" | "small";
};

const abstractConcepts = [
	{
		title: "脚本从阅读变成观看",
		copy: "大段文字被切成时间块，创作者用播放头感知节奏，而不是在竖排小字里硬找结构。",
	},
	{
		title: "文字 clip 成为主对象",
		copy: "每句话都能被切分、拖动、拉长、压缩，并带着情绪、节奏、框架一起移动。",
	},
	{
		title: "轨道化而不是文档化",
		copy: "A Roll、B Roll、音乐轨和属性点像剪辑工程一样并排流动，画面和口播同时被编排。",
	},
	{
		title: "情绪节奏可视化",
		copy: "钩子、转折、高潮、呼吸口被压成波形，让脚本的能量走势一眼可见。",
	},
];

const clipKeywords: ClipKeyword[] = [
	{ label: "脚本剪辑软件", track: "A ROLL", tag: "Curiosity", left: 7, width: 16, depth: 20, color: "lavender", delay: 0 },
	{ label: "脚本是用来观看的", track: "A ROLL", tag: "Reframe", left: 25, width: 18, depth: 42, color: "lime", delay: 0.25 },
	{ label: "文字 clip", track: "A ROLL", tag: "Fast Pace", left: 46, width: 12, depth: 28, color: "purple", delay: 0.5 },
	{ label: "A Roll", track: "A ROLL", tag: "Hook", left: 62, width: 10, depth: 48, color: "orange", delay: 0.75 },
	{ label: "B Roll", track: "B ROLL", tag: "Visual Cue", left: 18, width: 12, depth: 58, color: "lavender", delay: 0.2 },
	{ label: "导出分镜", track: "B ROLL", tag: "Shot List", left: 53, width: 17, depth: 34, color: "purple", delay: 0.7 },
	{ label: "音乐轨", track: "MUSIC", tag: "Pulse", left: 33, width: 16, depth: 72, color: "ink", delay: 0.1 },
	{ label: "情绪节奏波形", track: "WAVE", tag: "Climax", left: 14, width: 22, depth: 42, color: "lime", delay: 0.45 },
	{ label: "钩子", track: "STRUCTURE", tag: "Hook", left: 9, width: 9, depth: 30, color: "lime", delay: 0.1 },
	{ label: "转折", track: "STRUCTURE", tag: "Turn", left: 39, width: 11, depth: 62, color: "orange", delay: 0.55 },
	{ label: "高潮", track: "STRUCTURE", tag: "Climax", left: 65, width: 12, depth: 32, color: "purple", delay: 0.9 },
	{ label: "呼吸口", track: "STRUCTURE", tag: "Pause", left: 78, width: 11, depth: 75, color: "lavender", delay: 1.1 },
];

const conceptNodes: ConceptNode[] = [
	{ label: "观看脚本", detail: "SCRIPT AS MOTION", x: 13, y: 83, z: 118, rotate: -8, size: "small" },
	{ label: "文字 clip", detail: "CUT / MOVE / STRETCH", x: 76, y: 16, z: 92, rotate: 7, size: "medium" },
	{ label: "造物主感", detail: "MAKE YOUR OWN TOOL", x: 80, y: 82, z: 150, rotate: -5, size: "small" },
	{ label: "ADHD 友好", detail: "LESS WALL OF TEXT", x: 29, y: 89, z: 72, rotate: 6, size: "small" },
	{ label: "分镜导出", detail: "SHOT LIST READY", x: 51, y: 8, z: 44, rotate: 3, size: "small" },
];

const rawTextLines = [
	"Word / Notion / 一大坨文字 / 竖向排版",
	"脚本不是只能被读，它也可以被观看",
	"A Roll 是我要说的话，B Roll 是对应画面",
	"情绪、节奏、框架、钩子、转折、高潮、呼吸口",
	"导出口播逐字稿，导出 B Roll 分镜 list",
];

const filterChips = [
	{ label: "+ A Roll", tone: "ink" },
	{ label: "+ B Roll", tone: "lavender" },
	{ label: "+ Hook", tone: "lime" },
	{ label: "+ 情绪波形", tone: "orange" },
	{ label: "x 文档墙", tone: "warning" },
];

const mentorRows = [
	{ name: "口播主线", role: "A Roll", status: "已切 18 段", tone: "lime" },
	{ name: "画面提示", role: "B Roll", status: "生成 9 条", tone: "lavender" },
	{ name: "情绪节奏", role: "Rhythm", status: "峰值 72%", tone: "orange" },
];

const trackNames = ["A ROLL", "B ROLL", "MUSIC", "WAVE", "STRUCTURE"];

const cameraBeats = ["SCAN DOCUMENT", "ASSEMBLE CHIPS", "FLY TIMELINE", "REPAINT UI"];

function customStyle(values: Record<string, string | number>) {
	return values as CSSProperties;
}

export function ScriptcutFuiDemo() {
	const mountRef = useRef<HTMLDivElement | null>(null);
	const stageRef = useRef<HTMLElement | null>(null);
	const reducedMotion = useMemo(
		() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
		[],
	);

	useEffect(() => {
		if (!mountRef.current) return;

		const mount = mountRef.current;
		const scene = new THREE.Scene();
		const camera = new THREE.PerspectiveCamera(48, mount.clientWidth / mount.clientHeight, 0.1, 1000);
		camera.position.set(-18, 8, 54);

		const renderer = new THREE.WebGLRenderer({
			alpha: true,
			antialias: true,
			preserveDrawingBuffer: true,
		});
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
		renderer.setSize(mount.clientWidth, mount.clientHeight);
		mount.appendChild(renderer.domElement);

		const particleGeometry = new THREE.BufferGeometry();
		const positions: number[] = [];
		const colors: number[] = [];
		const palette = [
			new THREE.Color("#b9ff36"),
			new THREE.Color("#aaa8f4"),
			new THREE.Color("#f46f24"),
			new THREE.Color("#fffdf7"),
			new THREE.Color("#171715"),
		];

		for (let index = 0; index < 620; index += 1) {
			positions.push((Math.random() - 0.5) * 90, (Math.random() - 0.5) * 44, (Math.random() - 0.5) * 82);
			const color = palette[index % palette.length].clone().multiplyScalar(0.48 + Math.random() * 0.62);
			colors.push(color.r, color.g, color.b);
		}

		particleGeometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
		particleGeometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
		const particles = new THREE.Points(
			particleGeometry,
			new THREE.PointsMaterial({
				size: 0.06,
				vertexColors: true,
				transparent: true,
				opacity: 0.54,
				depthWrite: false,
			}),
		);
		scene.add(particles);

		const railGroup = new THREE.Group();
		const railMaterials = ["#171715", "#aaa8f4", "#b9ff36", "#f46f24"].map(
			(color) =>
				new THREE.LineBasicMaterial({
					color,
					transparent: true,
					opacity: color === "#171715" ? 0.18 : 0.34,
				}),
		);

		for (let row = 0; row < 16; row += 1) {
			const z = -34 + row * 4.7;
			const y = -6 + (row % 5) * 1.4;
			const geometry = new THREE.BufferGeometry().setFromPoints([
				new THREE.Vector3(-28, y, z),
				new THREE.Vector3(34, y + Math.sin(row) * 1.8, z + 5),
			]);
			const line = new THREE.Line(geometry, railMaterials[row % railMaterials.length]);
			railGroup.add(line);
		}

		for (let column = 0; column < 12; column += 1) {
			const x = -26 + column * 5.2;
			const geometry = new THREE.BufferGeometry().setFromPoints([
				new THREE.Vector3(x, -9, -38),
				new THREE.Vector3(x + Math.sin(column) * 2, 11, 36),
			]);
			const line = new THREE.Line(geometry, railMaterials[(column + 1) % railMaterials.length]);
			railGroup.add(line);
		}

		railGroup.rotation.x = -0.12;
		scene.add(railGroup);

		const tunnelGroup = new THREE.Group();
		const tunnelMaterials = ["#b9ff36", "#aaa8f4", "#f46f24", "#742cc8"].map(
			(color) =>
				new THREE.MeshBasicMaterial({
					color,
					transparent: true,
					opacity: 0.14,
					wireframe: true,
					depthWrite: false,
				}),
		);

		for (let index = 0; index < 14; index += 1) {
			const ring = new THREE.Mesh(new THREE.TorusGeometry(10 + (index % 3) * 1.8, 0.018, 8, 64), tunnelMaterials[index % tunnelMaterials.length]);
			ring.position.set(Math.sin(index * 0.72) * 4, Math.cos(index * 0.58) * 3, 34 - index * 5.2);
			ring.rotation.set(Math.PI / 2 + index * 0.04, index * 0.18, index * 0.09);
			tunnelGroup.add(ring);
		}

		const streakGeometry = new THREE.BufferGeometry();
		const streakPositions: number[] = [];
		for (let index = 0; index < 100; index += 1) {
			const x = (Math.random() - 0.5) * 72;
			const y = (Math.random() - 0.5) * 30;
			const z = (Math.random() - 0.5) * 90;
			streakPositions.push(x, y, z, x + (Math.random() - 0.5) * 0.5, y + (Math.random() - 0.5) * 0.5, z + 3 + Math.random() * 5);
		}
		streakGeometry.setAttribute("position", new THREE.Float32BufferAttribute(streakPositions, 3));
		const streaks = new THREE.LineSegments(
			streakGeometry,
			new THREE.LineBasicMaterial({
				color: "#171715",
				transparent: true,
				opacity: 0.12,
			}),
		);
		scene.add(streaks);
		scene.add(tunnelGroup);

		const planeGroup = new THREE.Group();
		const planeColors = ["#fffdf7", "#d9ff77", "#aaa8f4", "#f46f24"];
		for (let index = 0; index < 12; index += 1) {
			const geometry = new THREE.PlaneGeometry(3 + (index % 4), 0.9 + (index % 3) * 0.4);
			const material = new THREE.MeshBasicMaterial({
				color: planeColors[index % planeColors.length],
				transparent: true,
				opacity: index % 4 === 0 ? 0.22 : 0.14,
				side: THREE.DoubleSide,
				depthWrite: false,
			});
			const mesh = new THREE.Mesh(geometry, material);
			mesh.position.set(-22 + index * 4.2, -4 + Math.sin(index) * 5, -24 + (index % 6) * 9);
			mesh.rotation.set(-0.2 + index * 0.02, 0.45 + index * 0.08, -0.1);
			planeGroup.add(mesh);
		}
		scene.add(planeGroup);

		const clock = new THREE.Clock();
		let raf = 0;
		let lastElapsed = 0;
		const loopDuration = 18;
		const cameraPath = new THREE.CatmullRomCurve3(
			[
				new THREE.Vector3(-22, 9, 52),
				new THREE.Vector3(-18, 6, 24),
				new THREE.Vector3(-6, 4, 7),
				new THREE.Vector3(13, 8, -16),
				new THREE.Vector3(24, 4, -34),
				new THREE.Vector3(2, 13, -46),
				new THREE.Vector3(-21, 9, -8),
			],
			true,
			"catmullrom",
			0.42,
		);
		const lookPath = new THREE.CatmullRomCurve3(
			[
				new THREE.Vector3(-12, 1, 4),
				new THREE.Vector3(-6, 0, -4),
				new THREE.Vector3(4, 1, -12),
				new THREE.Vector3(14, 2, -18),
				new THREE.Vector3(9, -3, -28),
				new THREE.Vector3(-2, 2, -18),
			],
			true,
			"catmullrom",
			0.35,
		);

		const controls = {
			active: false,
			dragging: false,
			dragMode: "look" as "look" | "pan",
			pointerId: -1,
			lastX: 0,
			lastY: 0,
			panX: 0,
			panY: 0,
			panZ: 0,
			targetPanX: 0,
			targetPanY: 0,
			targetPanZ: 0,
			yaw: 0,
			pitch: 0,
			targetYaw: 0,
			targetPitch: 0,
			domX: 0,
			domY: 0,
			domZ: 34,
			domRx: 0,
			domRy: 0,
			domScale: 1,
			domVelocityX: 0,
			domVelocityY: 0,
			domVelocityZ: 0,
			position: new THREE.Vector3(-18, 8, 54),
			velocity: new THREE.Vector3(),
			keys: new Set<string>(),
		};
		const forwardVector = new THREE.Vector3();
		const rightVector = new THREE.Vector3();
		const upVector = new THREE.Vector3(0, 1, 0);
		const lookVector = new THREE.Vector3();
		const lookTarget = new THREE.Vector3();

		const getStageNumber = (property: string, fallback: number) => {
			const stage = stageRef.current;
			if (!stage) return fallback;
			const value = Number.parseFloat(stage.style.getPropertyValue(property));
			return Number.isFinite(value) ? value : fallback;
		};

		const activateManualCamera = () => {
			if (controls.active) return;
			const stage = stageRef.current;
			controls.active = true;
			stage?.setAttribute("data-camera", "manual");
			controls.position.copy(camera.position);
			controls.velocity.set(0, 0, 0);
			camera.getWorldDirection(lookVector);
			controls.yaw = Math.atan2(lookVector.x, -lookVector.z);
			controls.pitch = THREE.MathUtils.clamp(Math.asin(lookVector.y), -0.82, 0.82);
			controls.targetYaw = controls.yaw;
			controls.targetPitch = controls.pitch;
			controls.domX = getStageNumber("--camera-x", controls.domX);
			controls.domY = getStageNumber("--camera-y", controls.domY);
			controls.domZ = getStageNumber("--camera-z", controls.domZ);
			controls.domRx = getStageNumber("--camera-rx", controls.domRx);
			controls.domRy = getStageNumber("--camera-ry", controls.domRy);
			controls.domScale = getStageNumber("--camera-scale", controls.domScale);
			controls.panX = controls.domX;
			controls.panY = controls.domY;
			controls.panZ = controls.domZ;
			controls.targetPanX = controls.domX;
			controls.targetPanY = controls.domY;
			controls.targetPanZ = controls.domZ;
		};

		const applyManualDomCamera = () => {
			const stage = stageRef.current;
			if (!stage) return;
			stage.style.setProperty("--camera-x", `${controls.domX.toFixed(2)}vw`);
			stage.style.setProperty("--camera-y", `${controls.domY.toFixed(2)}vh`);
			stage.style.setProperty("--camera-z", `${controls.domZ.toFixed(2)}px`);
			stage.style.setProperty("--camera-rx", `${controls.domRx.toFixed(2)}deg`);
			stage.style.setProperty("--camera-ry", `${controls.domRy.toFixed(2)}deg`);
			stage.style.setProperty("--camera-scale", controls.domScale.toFixed(3));
			stage.style.setProperty("--flight-progress", `${THREE.MathUtils.clamp((controls.domZ + 120) / 5.4, 0, 100).toFixed(2)}%`);
		};

		const resetToAutoCamera = () => {
			const stage = stageRef.current;
			controls.active = false;
			controls.dragging = false;
			controls.dragMode = "look";
			controls.velocity.set(0, 0, 0);
			controls.domVelocityX = 0;
			controls.domVelocityY = 0;
			controls.domVelocityZ = 0;
			controls.keys.clear();
			stage?.setAttribute("data-camera", "auto");
			stage?.removeAttribute("data-dragging");
			stage?.removeAttribute("data-drag-mode");
		};

		const updateManualCamera = (delta: number) => {
			const boost = controls.keys.has("shift") ? 1.75 : 1;
			const acceleration = 56 * boost;
			const turnSpeed = 1.9 * delta;
			const damping = Math.exp(-5.8 * delta);
			const domDamping = Math.exp(-6.4 * delta);

			if (controls.keys.has("arrowleft")) {
				controls.targetYaw += turnSpeed;
			}
			if (controls.keys.has("arrowright")) {
				controls.targetYaw -= turnSpeed;
			}
			if (controls.keys.has("arrowup")) {
				controls.targetPitch = THREE.MathUtils.clamp(controls.targetPitch + turnSpeed * 0.72, -0.82, 0.82);
			}
			if (controls.keys.has("arrowdown")) {
				controls.targetPitch = THREE.MathUtils.clamp(controls.targetPitch - turnSpeed * 0.72, -0.82, 0.82);
			}

			forwardVector.set(Math.sin(controls.yaw), 0, -Math.cos(controls.yaw)).normalize();
			rightVector.set(Math.cos(controls.yaw), 0, Math.sin(controls.yaw)).normalize();

			if (controls.keys.has("w")) {
				controls.velocity.addScaledVector(forwardVector, acceleration * delta);
				controls.domVelocityZ += acceleration * 21 * delta;
			}
			if (controls.keys.has("s")) {
				controls.velocity.addScaledVector(forwardVector, -acceleration * delta);
				controls.domVelocityZ -= acceleration * 21 * delta;
			}
			if (controls.keys.has("a")) {
				controls.velocity.addScaledVector(rightVector, -acceleration * delta);
				controls.domVelocityX += acceleration * 0.52 * delta;
			}
			if (controls.keys.has("d")) {
				controls.velocity.addScaledVector(rightVector, acceleration * delta);
				controls.domVelocityX -= acceleration * 0.52 * delta;
			}
			if (controls.keys.has("q")) {
				controls.velocity.addScaledVector(upVector, -acceleration * delta);
				controls.domVelocityY += acceleration * 0.42 * delta;
			}
			if (controls.keys.has("e") || controls.keys.has(" ")) {
				controls.velocity.addScaledVector(upVector, acceleration * delta);
				controls.domVelocityY -= acceleration * 0.42 * delta;
			}

			controls.position.addScaledVector(controls.velocity, delta);
			controls.velocity.multiplyScalar(damping);
			controls.targetPanX = THREE.MathUtils.clamp(controls.targetPanX + controls.domVelocityX * delta, -28, 28);
			controls.targetPanY = THREE.MathUtils.clamp(controls.targetPanY + controls.domVelocityY * delta, -20, 20);
			controls.targetPanZ = THREE.MathUtils.clamp(controls.targetPanZ + controls.domVelocityZ * delta, -180, 560);
			controls.domVelocityX *= domDamping;
			controls.domVelocityY *= domDamping;
			controls.domVelocityZ *= domDamping;
			controls.panX = THREE.MathUtils.lerp(controls.panX, controls.targetPanX, 1 - Math.exp(-9 * delta));
			controls.panY = THREE.MathUtils.lerp(controls.panY, controls.targetPanY, 1 - Math.exp(-9 * delta));
			controls.panZ = THREE.MathUtils.lerp(controls.panZ, controls.targetPanZ, 1 - Math.exp(-9 * delta));
			controls.domX = controls.panX;
			controls.domY = controls.panY;
			controls.domZ = controls.panZ;
			controls.domScale = THREE.MathUtils.clamp(1 + (controls.domZ - 34) / 1850, 0.82, 1.35);

			controls.yaw = THREE.MathUtils.lerp(controls.yaw, controls.targetYaw, 1 - Math.exp(-11 * delta));
			controls.pitch = THREE.MathUtils.lerp(controls.pitch, controls.targetPitch, 1 - Math.exp(-11 * delta));
			controls.domRy = THREE.MathUtils.clamp(THREE.MathUtils.radToDeg(controls.yaw) * -0.34, -72, 72);
			controls.domRx = THREE.MathUtils.clamp(THREE.MathUtils.radToDeg(controls.pitch) * -0.48, -26, 26);

			lookVector
				.set(
					Math.sin(controls.yaw) * Math.cos(controls.pitch),
					Math.sin(controls.pitch),
					-Math.cos(controls.yaw) * Math.cos(controls.pitch),
				)
				.normalize();
			camera.position.lerp(controls.position, 1 - Math.exp(-13 * delta));
			lookTarget.copy(camera.position).add(lookVector);
			camera.lookAt(lookTarget);
			camera.fov = THREE.MathUtils.lerp(camera.fov, 48, 1 - Math.exp(-7 * delta));
			camera.updateProjectionMatrix();
			applyManualDomCamera();
		};

		const updateDomCamera = (elapsed: number) => {
			const stage = stageRef.current;
			if (!stage) return;
			const t = (elapsed % loopDuration) / loopDuration;
			const orbit = Math.PI * 2 * t;
			const push = Math.sin(Math.PI * t);
			const x = Math.sin(orbit * 1.08) * 7 - push * 3.6;
			const y = Math.cos(orbit * 0.92) * 2.8 - push * 1.6;
			const z = 34 + push * 260 + Math.sin(orbit * 2.1) * 30;
			const ry = Math.sin(orbit) * 7 - push * 8.5;
			const rx = Math.cos(orbit * 0.7) * 3.5 + push * 6.8;
			const scale = 1 + push * 0.1;
			stage.style.setProperty("--camera-x", `${x.toFixed(2)}vw`);
			stage.style.setProperty("--camera-y", `${y.toFixed(2)}vh`);
			stage.style.setProperty("--camera-z", `${z.toFixed(2)}px`);
			stage.style.setProperty("--camera-rx", `${rx.toFixed(2)}deg`);
			stage.style.setProperty("--camera-ry", `${ry.toFixed(2)}deg`);
			stage.style.setProperty("--camera-scale", scale.toFixed(3));
			stage.style.setProperty("--flight-progress", `${(t * 100).toFixed(2)}%`);
		};

		const handlePointerDown = (event: PointerEvent) => {
			if (event.button !== 0 && event.button !== 1 && event.button !== 2) return;
			const stage = stageRef.current;
			activateManualCamera();
			stage?.focus({ preventScroll: true });
			controls.dragging = true;
			controls.dragMode = event.button === 1 || event.button === 2 || event.shiftKey || event.altKey ? "pan" : "look";
			controls.pointerId = event.pointerId;
			controls.lastX = event.clientX;
			controls.lastY = event.clientY;
			stage?.setAttribute("data-dragging", "true");
			stage?.setAttribute("data-drag-mode", controls.dragMode);
			try {
				stage?.setPointerCapture(event.pointerId);
			} catch {
				// Pointer capture can fail if the pointer already ended.
			}
			event.preventDefault();
		};

		const handlePointerMove = (event: PointerEvent) => {
			if (!controls.dragging || event.pointerId !== controls.pointerId) return;
			const dx = event.clientX - controls.lastX;
			const dy = event.clientY - controls.lastY;
			controls.lastX = event.clientX;
			controls.lastY = event.clientY;
			if (controls.dragMode === "pan") {
				rightVector.set(Math.cos(controls.yaw), 0, Math.sin(controls.yaw)).normalize();
				controls.position.addScaledVector(rightVector, dx * 0.038);
				controls.position.y -= dy * 0.038;
				controls.targetPanX = THREE.MathUtils.clamp(controls.targetPanX + dx * 0.024, -28, 28);
				controls.targetPanY = THREE.MathUtils.clamp(controls.targetPanY + dy * 0.022, -20, 20);
				event.preventDefault();
				return;
			}
			controls.targetYaw += dx * 0.0064;
			controls.targetPitch = THREE.MathUtils.clamp(controls.targetPitch + dy * 0.0042, -0.82, 0.82);
			controls.targetPanX = THREE.MathUtils.clamp(controls.targetPanX + dx * 0.012, -28, 28);
			controls.targetPanY = THREE.MathUtils.clamp(controls.targetPanY + dy * 0.006, -20, 20);
			event.preventDefault();
		};

		const endPointerDrag = (event: PointerEvent) => {
			if (event.pointerId !== controls.pointerId) return;
			const stage = stageRef.current;
			controls.dragging = false;
			controls.dragMode = "look";
			controls.pointerId = -1;
			stage?.removeAttribute("data-dragging");
			stage?.removeAttribute("data-drag-mode");
			try {
				stage?.releasePointerCapture(event.pointerId);
			} catch {
				// Releasing capture is best-effort after pointer cancel.
			}
		};

		const handleWheel = (event: WheelEvent) => {
			activateManualCamera();
			const step = THREE.MathUtils.clamp(-event.deltaY * 0.045, -28, 28);
			forwardVector.set(Math.sin(controls.yaw), 0, -Math.cos(controls.yaw)).normalize();
			controls.velocity.addScaledVector(forwardVector, step * 0.75);
			controls.domVelocityZ += -event.deltaY * 0.55;
			event.preventDefault();
		};

		const handleContextMenu = (event: MouseEvent) => {
			event.preventDefault();
		};

		const controlKeys = new Set(["w", "a", "s", "d", "q", "e", " ", "arrowup", "arrowdown", "arrowleft", "arrowright", "shift"]);
		const handleKeyDown = (event: KeyboardEvent) => {
			const key = event.key.toLowerCase();
			if (key === "r" || key === "escape") {
				resetToAutoCamera();
				event.preventDefault();
				return;
			}
			if (!controlKeys.has(key)) return;
			activateManualCamera();
			const firstPress = !controls.keys.has(key);
			controls.keys.add(key);
			if (firstPress) {
				const impulse = controls.keys.has("shift") ? 1.65 : 1;
				forwardVector.set(Math.sin(controls.yaw), 0, -Math.cos(controls.yaw)).normalize();
				rightVector.set(Math.cos(controls.yaw), 0, Math.sin(controls.yaw)).normalize();
				if (key === "arrowleft") controls.targetYaw += 0.08 * impulse;
				if (key === "arrowright") controls.targetYaw -= 0.08 * impulse;
				if (key === "arrowup") controls.targetPitch = THREE.MathUtils.clamp(controls.targetPitch + 0.055 * impulse, -0.82, 0.82);
				if (key === "arrowdown") controls.targetPitch = THREE.MathUtils.clamp(controls.targetPitch - 0.055 * impulse, -0.82, 0.82);
				if (key === "w") {
					controls.velocity.addScaledVector(forwardVector, 3.2 * impulse);
					controls.domVelocityZ += 58 * impulse;
				}
				if (key === "s") {
					controls.velocity.addScaledVector(forwardVector, -3.2 * impulse);
					controls.domVelocityZ -= 58 * impulse;
				}
				if (key === "a") {
					controls.velocity.addScaledVector(rightVector, -3.2 * impulse);
					controls.domVelocityX += 1.55 * impulse;
				}
				if (key === "d") {
					controls.velocity.addScaledVector(rightVector, 3.2 * impulse);
					controls.domVelocityX -= 1.55 * impulse;
				}
				if (key === "q") {
					controls.velocity.addScaledVector(upVector, -3.2 * impulse);
					controls.domVelocityY += 1.25 * impulse;
				}
				if (key === "e" || key === " ") {
					controls.velocity.addScaledVector(upVector, 3.2 * impulse);
					controls.domVelocityY -= 1.25 * impulse;
				}
			}
			event.preventDefault();
		};

		const handleKeyUp = (event: KeyboardEvent) => {
			controls.keys.delete(event.key.toLowerCase());
		};

		const render = () => {
			const elapsed = clock.getElapsedTime();
			const delta = Math.min(Math.max(elapsed - lastElapsed, 0.016), 0.08);
			lastElapsed = elapsed;
			const phase = (elapsed % loopDuration) / loopDuration;
			particles.rotation.y = elapsed * 0.045;
			particles.rotation.x = Math.sin(elapsed * 0.18) * 0.04;
			particles.position.z = Math.sin(elapsed * 0.8) * 4;
			streaks.position.z = ((elapsed * 8) % 18) - 9;
			streaks.rotation.z = Math.sin(elapsed * 0.24) * 0.08;
			railGroup.position.x = Math.sin(elapsed * 0.42) * 2.8;
			railGroup.position.z = Math.cos(elapsed * 0.24) * 5;
			railGroup.rotation.z = Math.sin(elapsed * 0.3) * 0.05;
			tunnelGroup.rotation.z = elapsed * 0.07;
			tunnelGroup.children.forEach((child: any, index: number) => {
				child.position.z += 0.052 + index * 0.0008;
				if (child.position.z > 42) child.position.z = -56;
				child.rotation.z += 0.003 + index * 0.00012;
			});
			planeGroup.children.forEach((child: any, index: number) => {
				child.position.y += Math.sin(elapsed * 0.65 + index) * 0.0025;
				child.rotation.y += 0.0015 + index * 0.0001;
			});
			if (controls.active) {
				updateManualCamera(delta);
			} else {
				const cameraPoint = cameraPath.getPointAt(phase);
				const lookPoint = lookPath.getPointAt((phase + 0.045) % 1);
				camera.position.lerp(cameraPoint, 0.08);
				camera.lookAt(lookPoint);
				camera.fov = 47 + Math.sin(phase * Math.PI * 2) * 3;
				camera.updateProjectionMatrix();
				updateDomCamera(elapsed);
			}
			renderer.render(scene, camera);
			raf = requestAnimationFrame(render);
		};

		const stage = stageRef.current;
		stage?.setAttribute("data-camera", "auto");
		stage?.addEventListener("pointerdown", handlePointerDown);
		stage?.addEventListener("wheel", handleWheel, { passive: false });
		stage?.addEventListener("contextmenu", handleContextMenu);
		window.addEventListener("pointermove", handlePointerMove);
		window.addEventListener("pointerup", endPointerDrag);
		window.addEventListener("pointercancel", endPointerDrag);
		window.addEventListener("keydown", handleKeyDown, { capture: true });
		window.addEventListener("keyup", handleKeyUp, { capture: true });
		stage?.focus({ preventScroll: true });

		if (!reducedMotion) {
			render();
		} else {
			updateDomCamera(0);
			renderer.render(scene, camera);
		}

		const handleResize = () => {
			if (!mount.clientWidth || !mount.clientHeight) return;
			camera.aspect = mount.clientWidth / mount.clientHeight;
			camera.updateProjectionMatrix();
			renderer.setSize(mount.clientWidth, mount.clientHeight);
			renderer.render(scene, camera);
		};

		window.addEventListener("resize", handleResize);

		return () => {
			stage?.removeEventListener("pointerdown", handlePointerDown);
			stage?.removeEventListener("wheel", handleWheel);
			stage?.removeEventListener("contextmenu", handleContextMenu);
			window.removeEventListener("pointermove", handlePointerMove);
			window.removeEventListener("pointerup", endPointerDrag);
			window.removeEventListener("pointercancel", endPointerDrag);
			window.removeEventListener("keydown", handleKeyDown, { capture: true });
			window.removeEventListener("keyup", handleKeyUp, { capture: true });
			window.removeEventListener("resize", handleResize);
			cancelAnimationFrame(raf);
			particleGeometry.dispose();
			railMaterials.forEach((material) => material.dispose());
			tunnelMaterials.forEach((material) => material.dispose());
			tunnelGroup.children.forEach((child: any) => {
				if (child instanceof THREE.Mesh) {
					child.geometry.dispose();
				}
			});
			streakGeometry.dispose();
			streaks.material.dispose();
			planeGroup.children.forEach((child: any) => {
				if (child instanceof THREE.Mesh) {
					child.geometry.dispose();
					if (Array.isArray(child.material)) {
						child.material.forEach((material: any) => material.dispose());
					} else {
						child.material.dispose();
					}
				}
			});
			renderer.dispose();
			renderer.domElement.remove();
		};
	}, [reducedMotion]);

	return (
		<main className={styles.shell} data-testid="scriptcut-fui-demo">
			<div ref={mountRef} className={styles.threeLayer} aria-hidden="true" />
			<div className={styles.paperTexture} aria-hidden="true" />
			<div className={styles.vignette} aria-hidden="true" />

			<section ref={stageRef} className={styles.stage} tabIndex={0} aria-label="Scriptcut 三维概念演示，可用鼠标和键盘移动镜头">
				<div className={styles.speedLines} aria-hidden="true" />
				<div className={styles.controlHint} aria-hidden="true">
					<strong>
						<span>AUTO</span>
						<span>MANUAL</span>
					</strong>
				</div>
				<div className={styles.flightHud} aria-hidden="true">
					<div className={styles.flightRail}>
						<span />
					</div>
					<div className={styles.flightBeats}>
						{cameraBeats.map((beat) => (
							<i key={beat}>{beat}</i>
						))}
					</div>
				</div>

				<div className={styles.worldCamera}>
					<header className={styles.heroIsland}>
						<div>
							<p className={styles.kicker}>PROMPT-DRIVEN SCRIPT EDITOR</p>
							<h1>Scriptcut.</h1>
							<strong>把脚本剪成可以穿梭的时间线</strong>
						</div>
						<div className={styles.categoryTabs} aria-label="脚本分类">
							<span className={styles.activeTab}>口播重构</span>
							<span>B Roll</span>
							<span>节奏图</span>
						</div>
					</header>

					<div className={styles.avatarBadge} aria-hidden="true">
						<div className={styles.avatarRing}>
							<span>SC</span>
						</div>
						<i>72%</i>
					</div>

					<div className={styles.checkSeal} aria-hidden="true">
						<svg viewBox="0 0 96 96">
							<path d="M30 49.5 42.2 62 67 34" />
						</svg>
						<span>Ready</span>
					</div>

					<div className={styles.promptCapsule}>
						<span>Prompt</span>
						<p>把这段口播变成剪辑时间线，保留钩子、转折和画面提示</p>
						<button type="button">Go</button>
					</div>

					<div className={styles.filterCloud} aria-label="生成筛选标签">
						{filterChips.map((chip, index) => (
							<span
								key={chip.label}
								className={styles[chip.tone]}
								style={customStyle({
									"--chip-delay": `${index * 0.07}s`,
								})}
							>
								{chip.label}
							</span>
						))}
					</div>

					<div className={styles.farDataField} aria-hidden="true">
						{rawTextLines.map((line, index) => (
							<div
								key={line}
								className={styles.dataLine}
								style={customStyle({
									"--line-y": `${index * 17}%`,
									"--line-delay": `${index * 0.4}s`,
								})}
							>
								{Array.from({ length: 5 }, (_, repeatIndex) => (
									<span key={`${line}-${repeatIndex}`}>{line}</span>
								))}
							</div>
						))}
					</div>

					<div className={styles.inputDocument}>
						<div className={styles.documentHeader}>
							<span>WORD / NOTION FIELD</span>
							<i>UNSTRUCTURED TEXT</i>
						</div>
						<div className={styles.documentBody}>
							<p>视频真的只能在文字维度被呈现出来吗？</p>
							<p>一大坨文字、竖向排版、眼花缭乱。</p>
							<p>为什么不干脆用剪辑的方式来剪脚本？</p>
							<p>自动解析情绪、节奏、B Roll、分镜、呼吸口。</p>
						</div>
						<div className={styles.scannerBeam} aria-hidden="true" />
					</div>

					<div className={styles.handoffBridge} aria-hidden="true">
						{Array.from({ length: 10 }, (_, index) => (
							<span
								key={index}
								style={customStyle({
									"--bridge-delay": `${index * 0.18}s`,
									"--bridge-y": `${8 + (index % 5) * 18}%`,
								})}
							/>
						))}
					</div>

					<div className={styles.timelineRig}>
						<div className={styles.timelineHeader}>
							<div>
								<span>LIVE SCRIPT EDITOR</span>
								<strong>轨道化脚本工程</strong>
							</div>
							<div className={styles.transport}>
								<i />
								<i />
								<i />
							</div>
						</div>

						<div className={styles.timelineSpace}>
							<div className={styles.timeRuler} aria-hidden="true">
								{["00:00", "00:06", "00:12", "00:18", "00:24", "00:30"].map((tick) => (
									<span key={tick}>{tick}</span>
								))}
							</div>
							<div className={styles.playhead} aria-hidden="true">
								<span />
							</div>
							{trackNames.map((track, index) => (
								<div
									key={track}
									className={styles.trackLane}
									style={customStyle({
										"--track-index": index,
									})}
								>
									<div className={styles.trackLabel}>{track}</div>
									<div className={styles.trackRail} />
									{clipKeywords
										.filter((clip) => clip.track === track)
										.map((clip) => (
											<div
												key={`${clip.track}-${clip.label}`}
												className={`${styles.clipModule} ${styles[clip.color]}`}
												style={customStyle({
													"--clip-left": `${clip.left}%`,
													"--clip-width": `${clip.width}%`,
													"--clip-depth": `${clip.depth}px`,
													"--clip-delay": `${clip.delay}s`,
												})}
											>
												<div className={styles.clipInner}>
													<span>{clip.label}</span>
													<span>{clip.label}</span>
												</div>
												<div className={styles.clipTag}>{clip.tag}</div>
											</div>
										))}
								</div>
							))}
						</div>
					</div>

					<div className={styles.waveformDeck}>
						<div className={styles.waveTitle}>
							<span>EMOTION / RHYTHM MAP</span>
							<strong>三维情绪走向</strong>
						</div>
						<svg viewBox="0 0 620 220" role="img" aria-label="脚本情绪节奏波形三维图">
							<defs>
								<linearGradient id="fuiWaveFill" x1="0" x2="1" y1="0" y2="1">
									<stop offset="0%" stopColor="#b9ff36" stopOpacity="0.5" />
									<stop offset="48%" stopColor="#aaa8f4" stopOpacity="0.28" />
									<stop offset="100%" stopColor="#f46f24" stopOpacity="0.18" />
								</linearGradient>
								<filter id="fuiGlow">
									<feGaussianBlur stdDeviation="3" result="blur" />
									<feMerge>
										<feMergeNode in="blur" />
										<feMergeNode in="SourceGraphic" />
									</feMerge>
								</filter>
							</defs>
							<g className={styles.waveGrid}>
								{Array.from({ length: 8 }, (_, index) => (
									<line key={`v-${index}`} x1={50 + index * 72} x2={50 + index * 72} y1="24" y2="190" />
								))}
								{Array.from({ length: 5 }, (_, index) => (
									<line key={`h-${index}`} x1="42" x2="590" y1={38 + index * 36} y2={38 + index * 36} />
								))}
							</g>
							<path
								className={styles.waveFill}
								d="M46 170 C92 118 118 64 164 92 C210 120 222 48 276 64 C330 80 328 150 382 120 C440 88 462 36 512 58 C558 78 562 116 594 84 L594 190 L46 190 Z"
							/>
							<path
								className={styles.waveEmotion}
								d="M46 170 C92 118 118 64 164 92 C210 120 222 48 276 64 C330 80 328 150 382 120 C440 88 462 36 512 58 C558 78 562 116 594 84"
							/>
							<path
								className={styles.waveRhythm}
								d="M46 142 C96 126 120 156 166 110 C206 70 230 108 278 86 C324 66 342 104 382 76 C426 46 468 98 512 72 C548 50 568 96 594 64"
							/>
							<path
								className={styles.waveDensity}
								d="M46 122 C86 100 122 112 166 130 C214 150 230 92 278 110 C328 128 342 88 384 96 C432 104 458 126 512 102 C548 86 568 130 594 118"
							/>
							<g className={styles.wavePoints}>
								{[
									[80, 130, "钩子"],
									[236, 58, "转折"],
									[434, 74, "高潮"],
									[556, 104, "呼吸口"],
								].map(([x, y, label]) => (
									<g key={String(label)} transform={`translate(${x} ${y})`}>
										<circle r="6" />
										<text x="12" y="-8">
											{label}
										</text>
									</g>
								))}
							</g>
							<line className={styles.waveCursor} x1="388" x2="388" y1="24" y2="190" />
						</svg>
					</div>

					<div className={styles.metricsCard}>
						<span>RESULTS</span>
						<strong>42</strong>
						<p>clips parsed</p>
						<div>
							<i />
							<b>节奏密度 +31%</b>
						</div>
					</div>

					<div className={styles.mentorPanel}>
						<div className={styles.mentorHeader}>
							<span>Favorite Tracks</span>
							<i>+</i>
						</div>
						{mentorRows.map((row, index) => (
							<div
								key={row.name}
								className={styles.mentorRow}
								style={customStyle({
									"--row-delay": `${index * 0.08}s`,
								})}
							>
								<div className={`${styles.mentorAvatar} ${styles[row.tone]}`}>{row.role.slice(0, 1)}</div>
								<div>
									<strong>{row.name}</strong>
									<span>{row.status}</span>
								</div>
								<button type="button">+</button>
							</div>
						))}
					</div>

					<div className={styles.colorLab} aria-hidden="true">
						<div className={styles.selectionBox}>
							<span>Title</span>
							<strong>观看脚本</strong>
						</div>
						<div className={styles.colorSlider}>
							<i />
						</div>
						<div className={styles.cursorPointer} />
					</div>

					<div className={styles.conceptPanel}>
						<p>AI EXTRACTION</p>
						{abstractConcepts.map((concept, index) => (
							<div key={concept.title} className={styles.conceptRow}>
								<span>{String(index + 1).padStart(2, "0")}</span>
								<div>
									<strong>{concept.title}</strong>
									<em>{concept.copy}</em>
								</div>
							</div>
						))}
					</div>

					{conceptNodes.map((node) => (
						<div
							key={node.label}
							className={`${styles.keywordShard} ${styles[node.size]}`}
							style={customStyle({
								"--node-x": `${node.x}%`,
								"--node-y": `${node.y}%`,
								"--node-z": `${node.z}px`,
								"--node-rotate": `${node.rotate}deg`,
							})}
						>
							<span>{node.detail}</span>
							<strong>{node.label}</strong>
						</div>
					))}
				</div>
			</section>
		</main>
	);
}
