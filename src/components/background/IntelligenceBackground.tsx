import React, { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { createNoise3D } from "simplex-noise";
import { FlowField } from "./FlowField";
import { ParticleField } from "./ParticleField";
import { NeuralConstellations } from "./NeuralConstellations";

export default function IntelligenceBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isLightMode, setIsLightMode] = useState(false);

  useEffect(() => {
    const checkTheme = () => {
      setIsLightMode(document.documentElement.classList.contains("light"));
    };
    checkTheme();

    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme"],
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = window.innerWidth;
    let height = window.innerHeight;

    const flowField = new FlowField(width, height);
    const particleField = new ParticleField(width, height);
    const neuralConstellations = new NeuralConstellations(width, height);

    const resizeCanvas = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);

      flowField.resize(width, height);
      particleField.resize(width, height);
      neuralConstellations.resize(width, height);
    };

    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();

    const mouse = { x: -1000, y: -1000, active: false };
    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;
    };
    const handleMouseLeave = () => {
      mouse.active = false;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseleave", handleMouseLeave);

    const noise3D = createNoise3D();
    const opacityMultiplier = isLightMode ? 0.4 : 1.0;

    const draw = () => {
      // Clear canvas fully each frame (trails are handled by particle history in FlowField)
      ctx.clearRect(0, 0, width, height);

      // System 1: Update & Draw Flowing Silk Waves
      flowField.update(noise3D, mouse);
      flowField.draw(ctx, opacityMultiplier);

      // System 3: Update & Draw Particle Intelligence Layer (rendered behind constellations for depth)
      particleField.update(noise3D, mouse);
      particleField.draw(ctx, opacityMultiplier);

      // System 2: Update & Draw Neural Constellations (top layer)
      neuralConstellations.update(mouse);
      neuralConstellations.draw(ctx, opacityMultiplier, mouse);

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isLightMode]);

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.5 }}
      className="fixed inset-0 pointer-events-none z-0"
    >
      {/* Base Background Colors */}
      <div
        className="absolute inset-0 transition-colors duration-700"
        style={{
          background: isLightMode ? '#f8fafc' : 'radial-gradient(ellipse at center, #0B1120 0%, #050816 50%, #020617 100%)'
        }}
      />

      {/* Flowing Aurora/Plasma Background Layers (Optimized) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            x: [0, 100, -50, 0],
            y: [0, -100, 50, 0],
            scale: [1, 1.1, 0.9, 1],
            opacity: [0.15, 0.25, 0.15]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] rounded-full"
          style={{ background: 'radial-gradient(circle at center, rgba(13, 148, 136, 0.25) 0%, transparent 60%)' }}
        />
        <motion.div
          animate={{
            x: [0, -150, 100, 0],
            y: [0, 150, -100, 0],
            scale: [1, 1.2, 0.8, 1],
            opacity: [0.1, 0.2, 0.1]
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute top-[10%] -right-[20%] w-[60vw] h-[60vw] rounded-full"
          style={{ background: 'radial-gradient(circle at center, rgba(8, 145, 178, 0.25) 0%, transparent 60%)' }}
        />
        <motion.div
          animate={{
            x: [0, 200, -150, 0],
            y: [0, 50, 150, 0],
            scale: [1, 0.9, 1.1, 1],
            opacity: [0.1, 0.2, 0.1]
          }}
          transition={{ duration: 30, repeat: Infinity, ease: "easeInOut", delay: 5 }}
          className="absolute -bottom-[20%] left-[20%] w-[80vw] h-[80vw] rounded-full"
          style={{ background: 'radial-gradient(circle at center, rgba(30, 58, 138, 0.15) 0%, transparent 60%)' }}
        />
      </div>

      {/* Intelligence Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </motion.div>
  );
}
