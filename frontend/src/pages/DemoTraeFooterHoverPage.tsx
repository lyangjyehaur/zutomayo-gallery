import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import * as THREE from "three";
import "./DemoTraeFooterHoverPage.css";

const FOOTER_SECTIONS: Array<{
  title: string;
  items: Array<{ label: string; href?: string }>;
}> = [
  {
    title: "Terms",
    items: [
      { label: "Terms of Service", href: "#" },
      { label: "Privacy Policy", href: "#" },
      { label: "Cookie Policy", href: "#" },
    ],
  },
  {
    title: "Resources",
    items: [
      { label: "Docs", href: "#" },
      { label: "Blog", href: "#" },
      { label: "Changelog", href: "#" },
    ],
  },
  {
    title: "Connect",
    items: [
      { label: "Feedback", href: "#" },
      { label: "Discord", href: "#" },
      { label: "Reddit", href: "#" },
      { label: "TRAE Fellow", href: "#" },
    ],
  },
];

function TraeWordmarkCanvas() {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvasEl = canvasRef.current;
    if (!wrap || !canvasEl) return;

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasEl,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setClearAlpha(0);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const textCanvas = document.createElement("canvas");
    const textCtx = textCanvas.getContext("2d", { alpha: true });
    if (!textCtx) return;

    const tex = new THREE.CanvasTexture(textCanvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;

    const uniforms = {
      uText: { value: tex },
      uRes: { value: new THREE.Vector2(1, 1) },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      uTime: { value: 0 },
      uAmp: { value: 0 },
    };

    const material = new THREE.ShaderMaterial({
      transparent: true,
      uniforms,
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;

        uniform sampler2D uText;
        uniform vec2 uRes;
        uniform vec2 uMouse;
        uniform float uTime;
        uniform float uAmp;
        varying vec2 vUv;

        float hash12(vec2 p) {
          vec3 p3 = fract(vec3(p.xyx) * 0.1031);
          p3 += dot(p3, p3.yzx + 33.33);
          return fract((p3.x + p3.y) * p3.z);
        }

        void main() {
          vec2 uv = vUv;

          float d = distance(uv, uMouse);
          float focus = exp(-d * 7.0);
          float amp = clamp(uAmp * (0.25 + 0.85 * focus), 0.0, 1.0);

          float grid = mix(1.0, 14.0, amp);
          vec2 g = vec2(grid);
          vec2 gridUv = (floor(uv * uRes / g) * g) / uRes;

          float t = floor(uTime * mix(18.0, 42.0, amp));
          float band = floor(gridUv.y * (90.0 + 90.0 * amp));
          float rnd = hash12(vec2(band, t));
          float stripe = step(0.82, rnd);
          float dir = (hash12(vec2(band + 7.13, t + 3.7)) > 0.5) ? 1.0 : -1.0;

          float shift = (rnd * 2.0 - 1.0) * 0.06 * amp * stripe * dir;
          shift = floor(shift * uRes.x / grid) * grid / uRes.x;

          vec2 uv0 = gridUv;
          vec2 uv1 = gridUv + vec2(shift, 0.0);

          float a0 = texture2D(uText, uv0).a;
          float a1 = texture2D(uText, uv1).a;
          float a2 = texture2D(uText, uv1 + vec2(0.010 * amp, 0.0)).a;
          float a = max(mix(a0, a1, stripe), a2 * (0.25 + 0.55 * amp) * stripe);

          float scan = 0.03 * sin((uv.y * uRes.y) * 0.32 + uTime * 10.0);
          float speck = (hash12(floor(uv * uRes / 3.0) + t) - 0.5) * 0.04 * amp;

          vec3 bg = vec3(0.168, 0.996, 0.533);
          vec3 fg = vec3(0.02);
          vec3 col = mix(bg, fg, a);
          col += (scan + speck) * (1.0 - a);

          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });

    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(mesh);

    let w = 1;
    let h = 1;
    let raf = 0;
    let lastT = 0;
    let amp = 0;
    let targetAmp = 0;
    let lastX = 0;
    let lastY = 0;

    const drawText = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      textCanvas.width = Math.max(1, Math.floor(w * dpr));
      textCanvas.height = Math.max(1, Math.floor(h * dpr));

      textCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      textCtx.clearRect(0, 0, w, h);

      const padX = Math.max(18, w * 0.055);
      const fontSize = Math.max(72, h * 0.86);

      textCtx.fillStyle = "#000";
      textCtx.textBaseline = "alphabetic";
      textCtx.font = `900 ${fontSize}px system-ui, -apple-system, Segoe UI, Roboto, sans-serif`;
      textCtx.fillText("TRAE", padX, h * 0.84);

      tex.needsUpdate = true;
    };

    const resize = () => {
      const r = wrap.getBoundingClientRect();
      w = Math.max(1, Math.floor(r.width));
      h = Math.max(1, Math.floor(r.height));
      renderer.setSize(w, h, false);
      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
      uniforms.uRes.value.set(
        Math.floor(w * Math.min(2, window.devicePixelRatio || 1)),
        Math.floor(h * Math.min(2, window.devicePixelRatio || 1)),
      );
      drawText();
    };

    const onMove = (e: PointerEvent) => {
      const r = wrap.getBoundingClientRect();
      const x = (e.clientX - r.left) / Math.max(1, r.width);
      const y = (e.clientY - r.top) / Math.max(1, r.height);
      uniforms.uMouse.value.set(Math.max(0, Math.min(1, x)), 1 - Math.max(0, Math.min(1, y)));

      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      targetAmp = Math.max(targetAmp, Math.min(1, Math.hypot(dx, dy) / 28));
    };

    const onLeave = () => {
      targetAmp = 0;
    };

    resize();
    window.addEventListener("resize", resize);
    wrap.addEventListener("pointermove", onMove, { passive: true });
    wrap.addEventListener("pointerleave", onLeave, { passive: true });
    wrap.addEventListener("pointercancel", onLeave, { passive: true });

    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.05, (t - lastT) / 1000 || 0);
      lastT = t;

      uniforms.uTime.value += dt;
      amp += (targetAmp - amp) * 0.14;
      targetAmp *= 0.92;
      uniforms.uAmp.value = amp;

      renderer.render(scene, camera);
    };

    raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("resize", resize);
      wrap.removeEventListener("pointermove", onMove);
      wrap.removeEventListener("pointerleave", onLeave);
      wrap.removeEventListener("pointercancel", onLeave);
      cancelAnimationFrame(raf);
      mesh.geometry.dispose();
      material.dispose();
      tex.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div className="trae-demo__wordmark" ref={wrapRef}>
      <canvas className="trae-demo__wordmarkCanvas" ref={canvasRef} />
    </div>
  );
}

export function DemoTraeFooterHoverPage() {
  const navigate = useNavigate();
  const basePath = import.meta.env.VITE_ROUTER_BASE || "/";

  return (
    <div className="trae-demo min-h-screen w-full">
      <div className="w-full flex flex-col gap-6 pb-10 px-6 md:px-10">
        <div className="flex items-center justify-between gap-3 flex-wrap pt-6">
          <div className="flex flex-col leading-tight">
            <h2 className="text-xl md:text-2xl font-black uppercase tracking-widest">
              TRAE Footer Hover Demo
            </h2>
            <span className="text-[10px] font-mono opacity-60 normal-case">
              /demo/trae-footer-glitch
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="neutral" onClick={() => navigate(-1)}>
              <i className="hn hn-arrow-left mr-2" />
              返回
            </Button>
            <Button variant="noShadow" onClick={() => navigate(basePath)}>
              <i className="hn hn-home mr-2" />
              回首頁
            </Button>
          </div>
        </div>

        <div className="trae-demo__stage">
          <div className="trae-demo__footer">
            <div className="trae-demo__grid">
              {FOOTER_SECTIONS.map((section) => (
                <div key={section.title} className="trae-demo__col">
                  <div className="trae-demo__title">{section.title}</div>
                  <div className="trae-demo__list">
                    {section.items.map((item) => (
                      <a
                        key={item.label}
                        className="trae-demo__link"
                        href={item.href}
                      >
                        {item.label}
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="trae-demo__meta">
              <span className="opacity-70">©2026 TRAE</span>
              <span className="opacity-55">SOC 2 Certified</span>
            </div>
          </div>

          <div className="trae-demo__banner">
            <TraeWordmarkCanvas />
          </div>
        </div>
      </div>
    </div>
  );
}
