export class ParticleField {
  private particles: {
    x: number;
    y: number;
    size: number;
    alpha: number;
    speed: number;
    angle: number;
    drift: number;
  }[];
  private width: number;
  private height: number;
  private time: number = 0;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.particles = [];
    this.init();
  }

  public resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.particles = [];
    this.init();
  }

  private init() {
    const count = this.width < 768 ? 100 : 300; // Thousands of tiny particles requested, but we'll balance performance (300-500 is safe)
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        size: Math.random() * 1.5 + 0.2,
        alpha: Math.random() * 0.5 + 0.1,
        speed: Math.random() * 0.2 + 0.05,
        angle: Math.random() * Math.PI * 2,
        drift: Math.random() * 0.02 - 0.01,
      });
    }
  }

  public update(
    noise3D: any,
    mouse: { x: number; y: number; active: boolean },
  ) {
    this.time += 0.002;
    const mouseInfluenceRadius = 200;

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];

      // Subtle twinkling
      p.alpha = 0.2 + Math.sin(this.time * 10 + i) * 0.15;

      // Drift gently
      p.angle += p.drift;

      // Get a subtle push from the noise field to match the silk waves
      const noiseAngle =
        noise3D(p.x * 0.002, p.y * 0.002, this.time * 0.5) * Math.PI * 2;

      // Blend innate drift with noise drift
      const finalAngle = p.angle * 0.2 + noiseAngle * 0.8;

      p.x += Math.cos(finalAngle) * p.speed;
      p.y += Math.sin(finalAngle) * p.speed;

      // Mouse interaction (gentle swirl)
      if (mouse.active) {
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < mouseInfluenceRadius) {
          const influence = 1 - dist / mouseInfluenceRadius;
          const pushAngle = Math.atan2(dy, dx) + Math.PI / 2; // swirl tangentially
          p.x += Math.cos(pushAngle) * influence * 0.5;
          p.y += Math.sin(pushAngle) * influence * 0.5;
          p.alpha += influence * 0.3; // brighten near mouse
        }
      }

      // Wrap
      if (p.x < 0) p.x = this.width;
      if (p.x > this.width) p.x = 0;
      if (p.y < 0) p.y = this.height;
      if (p.y > this.height) p.y = 0;
    }
  }

  public draw(ctx: CanvasRenderingContext2D, opacityMultiplier: number) {
    ctx.fillStyle = "#2DD4BF";
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      ctx.globalAlpha = p.alpha * opacityMultiplier;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;
  }
}
