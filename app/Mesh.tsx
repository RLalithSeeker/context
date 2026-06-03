"use client";
import { useEffect, useRef } from "react";

/**
 * Ambient mesh-gradient background.
 * Ported from cinematic-site-components/mesh-gradient.html (MIT — Jay / RoboLabs),
 * recolored to the Context-MCP "run green" + slate palette and made reduced-motion aware.
 */
export default function Mesh() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const colors = [
      "rgba(58,209,126,0.14)",  // accent green
      "rgba(45,140,110,0.10)",  // deep teal
      "rgba(40,70,120,0.10)",   // muted blue
    ];
    const speed = 0.28;
    const blobs = colors.map((c) => ({
      x: Math.random(), y: Math.random(),
      vx: (Math.random() - 0.5) * speed, vy: (Math.random() - 0.5) * speed,
      r: 0.32 + Math.random() * 0.2, color: c,
    }));

    function resize() {
      if (!canvas) return;
      canvas.width = canvas.offsetWidth * 2;
      canvas.height = canvas.offsetHeight * 2;
    }
    resize();
    window.addEventListener("resize", resize);

    function paint(animate: boolean) {
      if (!canvas || !ctx) return;
      const w = canvas.width, h = canvas.height;
      ctx.fillStyle = "#08090c";
      ctx.fillRect(0, 0, w, h);
      blobs.forEach((b) => {
        if (animate) {
          b.x += b.vx / w; b.y += b.vy / h;
          if (b.x < -0.2 || b.x > 1.2) b.vx *= -1;
          if (b.y < -0.2 || b.y > 1.2) b.vy *= -1;
        }
        const grd = ctx.createRadialGradient(b.x * w, b.y * h, 0, b.x * w, b.y * h, b.r * Math.max(w, h));
        grd.addColorStop(0, b.color);
        grd.addColorStop(1, "transparent");
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, w, h);
        ctx.globalCompositeOperation = "source-over";
      });
    }

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    if (reduced) {
      paint(false); // single static frame
    } else {
      const loop = () => { paint(true); raf = requestAnimationFrame(loop); };
      loop();
    }

    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);

  return <canvas ref={ref} className="mesh" aria-hidden="true" />;
}
