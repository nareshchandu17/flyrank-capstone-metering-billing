import React, { useEffect, useRef } from 'react';

const DESIGN_W = 1200;

export default function HalftoneDots({
  spacing = 14,
  dotColor = '#D5DAD3',
  dotOpacity = 0.35,
  accent = '#D4FF28',
  sunSize = 380,
  reach = 60,
  swell = 0.9,
  glow = 1,
  ease = 0.14,
  height = 280,
  style = {}
}) {
  const rootRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const S = Math.max(6, spacing);
    let W = 0;
    let H = 0;
    let dots = [];
    let raf = 0;
    const pointer = { x: -9999, y: -9999, active: false };

    const build = () => {
      W = Math.max(1, root.offsetWidth || 1200);
      H = Math.max(1, root.offsetHeight || height);
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const offset = (W - DESIGN_W) / 2;
      const cx = W / 2;
      const cy = H + 150;
      const R = sunSize;
      const next = [];
      const startCol = Math.floor(-Math.max(0, offset) / S) - 1;
      const endCol = Math.ceil((W - offset) / S) + 1;

      for (let row = 0; row * S <= H; row++) {
        for (let col = startCol; col <= endCol; col++) {
          const dx = col * S + S / 2;
          const x = dx + offset;
          if (x < -S || x > W + S) continue;
          const y = row * S + S / 2;
          const t = y / H;
          const wave = 0.8 + 0.2 * Math.sin(dx * 0.012 + 0.8) * Math.cos(dx * 0.004);
          const d = Math.hypot(x - cx, y - cy);
          const sun = d < R;
          let r = S * 0.42 * Math.pow(t, 1.6) * wave;
          if (sun) r = Math.max(r, S * 0.44 * Math.min(1, (R - d) / 90 + 0.35) * (0.4 + 0.6 * t));
          if (r < 0.6) r = 0;
          next.push({ x, y, r, sun, s: 0, m: 0 });
        }
      }
      dots = next;
    };

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      const maxR = S * 0.48;
      for (let i = 0; i < dots.length; i++) {
        const p = dots[i];
        const r = Math.min(maxR, p.r * (1 + swell * p.s) + maxR * 0.55 * p.s * (p.r === 0 ? 1 : 0.3));
        if (r < 0.4) continue;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        if (p.sun) {
          ctx.globalAlpha = 1;
          ctx.fillStyle = accent;
          ctx.fill();
        } else {
          ctx.globalAlpha = Math.min(1, dotOpacity + (1 - dotOpacity) * p.s * 0.6) * (1 - p.m);
          ctx.fillStyle = dotColor;
          ctx.fill();
          if (p.m > 0.01) {
            ctx.globalAlpha = p.m;
            ctx.fillStyle = accent;
            ctx.fill();
          }
        }
      }
      ctx.globalAlpha = 1;
    };

    const kick = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };

    const tick = () => {
      const sigma = Math.max(10, reach);
      const k = Math.min(1, Math.max(0.01, ease));
      let moving = false;
      for (let i = 0; i < dots.length; i++) {
        const p = dots[i];
        let w = 0;
        if (pointer.active) {
          const dx = p.x - pointer.x;
          const dy = p.y - pointer.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < sigma * sigma * 9) {
            w = Math.exp(-d2 / (2 * sigma * sigma));
          }
        }
        const ns = p.s + (w - p.s) * k;
        const nm = p.m + (w * glow - p.m) * k;
        if (Math.abs(ns - p.s) > 0.001 || Math.abs(nm - p.m) > 0.001) {
          moving = true;
        }
        p.s = ns;
        p.m = nm;
      }
      draw();
      raf = moving || pointer.active ? requestAnimationFrame(tick) : 0;
    };

    const onMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const sx = rect.width ? W / rect.width : 1;
      const sy = rect.height ? H / rect.height : 1;
      const x = (e.clientX - rect.left) * sx;
      const y = (e.clientY - rect.top) * sy;
      const inside = x >= -reach && x <= W + reach && y >= -reach * 2 && y <= H + reach;
      pointer.x = x;
      pointer.y = y;
      if (inside || pointer.active) {
        pointer.active = inside;
        kick();
      }
    };

    const onLeave = () => {
      pointer.active = false;
      kick();
    };

    build();
    draw();

    const ro = new ResizeObserver(() => {
      build();
      draw();
    });
    ro.observe(root);

    if (!reducedMotion) {
      window.addEventListener('pointermove', onMove, { passive: true });
      document.documentElement.addEventListener('pointerleave', onLeave);
    }

    return () => {
      ro.disconnect();
      if (raf) cancelAnimationFrame(raf);
      if (!reducedMotion) {
        window.removeEventListener('pointermove', onMove);
        document.documentElement.removeEventListener('pointerleave', onLeave);
      }
    };
  }, [spacing, dotColor, dotOpacity, accent, sunSize, reach, swell, glow, ease, height]);

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      style={{
        position: 'relative',
        width: '100%',
        height: `${height}px`,
        overflow: 'hidden',
        pointerEvents: 'none',
        ...style
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'block'
        }}
      />
    </div>
  );
}
