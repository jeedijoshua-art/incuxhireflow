export class FlowField {
  private particles: { x: number; y: number; history: { x: number; y: number }[]; color: string; speed: number; width: number; maxHistory: number }[];
  private width: number;
  private height: number;
  private time: number = 0;
  private colors = ["#2DD4BF", "#22D3EE", "#14B8A6"];

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
    let count = 30;
    if (this.width >= 1024) count = 75;
    else if (this.width >= 768) count = 60;
    
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        history: [],
        color: this.colors[Math.floor(Math.random() * this.colors.length)],
        speed: Math.random() * 0.5 + 0.3,
        width: Math.random() * 3 + 1,
        maxHistory: Math.floor(Math.random() * 80 + 40),
      });
    }
  }

  public update(noise3D: any, mouse: { x: number; y: number; active: boolean }) {
    this.time += 0.0015;
    const noiseScale = 0.0015;
    const mouseInfluenceRadius = 350;

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];

      let angle = noise3D(p.x * noiseScale, p.y * noiseScale, this.time) * Math.PI * 2;

      if (mouse.active) {
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < mouseInfluenceRadius) {
          const influence = 1 - dist / mouseInfluenceRadius;
          const mouseAngle = Math.atan2(dy, dx);
          // Distort waves subtly around the mouse
          angle += (mouseAngle - angle) * influence * 0.4;
        }
      }

      p.x += Math.cos(angle) * p.speed;
      p.y += Math.sin(angle) * p.speed;

      p.history.push({ x: p.x, y: p.y });
      if (p.history.length > p.maxHistory) {
        p.history.shift();
      }

      // Wrap around
      if (p.x < -100 || p.x > this.width + 100 || p.y < -100 || p.y > this.height + 100) {
        p.x = Math.random() * this.width;
        p.y = Math.random() * this.height;
        p.history = [];
      }
    }
  }

  public draw(ctx: CanvasRenderingContext2D, opacityMultiplier: number) {
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (p.history.length < 2) continue;

      ctx.beginPath();
      ctx.moveTo(p.history[0].x, p.history[0].y);
      for (let j = 1; j < p.history.length; j++) {
        // Curve smoothing can be applied here, but lines are usually sufficient for dense history
        ctx.lineTo(p.history[j].x, p.history[j].y);
      }

      const gradient = ctx.createLinearGradient(
        p.history[0].x, p.history[0].y,
        p.x, p.y
      );
      gradient.addColorStop(0, `rgba(0,0,0,0)`);
      gradient.addColorStop(1, p.color);

      ctx.strokeStyle = gradient;
      ctx.lineWidth = p.width;
      ctx.globalAlpha = 0.15 * opacityMultiplier;
      
      // Soft bloom
      ctx.shadowBlur = 10;
      ctx.shadowColor = p.color;
      
      ctx.stroke();
      
      ctx.shadowBlur = 0; // reset
    }
    ctx.globalAlpha = 1.0;
  }
}
