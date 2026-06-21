export class NeuralConstellations {
  private nodes: { x: number; y: number; vx: number; vy: number; radius: number; baseRadius: number }[];
  private width: number;
  private height: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.nodes = [];
    this.init();
  }

  public resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.nodes = [];
    this.init();
  }

  private init() {
    const count = this.width < 768 ? 20 : 40; // Very sparse as requested (10-20% visual weight)
    for (let i = 0; i < count; i++) {
      this.nodes.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        baseRadius: Math.random() * 1.5 + 0.5,
        radius: 0,
      });
      this.nodes[i].radius = this.nodes[i].baseRadius;
    }
  }

  public update(mouse: { x: number; y: number; active: boolean }) {
    const mouseInfluenceRadius = 250;

    for (let i = 0; i < this.nodes.length; i++) {
      const node = this.nodes[i];
      node.x += node.vx;
      node.y += node.vy;

      // Bounce
      if (node.x < 0 || node.x > this.width) node.vx *= -1;
      if (node.y < 0 || node.y > this.height) node.vy *= -1;

      // Gravitate toward mouse slightly
      if (mouse.active) {
        const dx = mouse.x - node.x;
        const dy = mouse.y - node.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < mouseInfluenceRadius) {
          const force = (mouseInfluenceRadius - dist) / mouseInfluenceRadius;
          node.x += dx * force * 0.005;
          node.y += dy * force * 0.005;
          node.radius = node.baseRadius + force * 1.0;
        } else {
          node.radius = node.baseRadius;
        }
      } else {
        node.radius = node.baseRadius;
      }
    }
  }

  public draw(ctx: CanvasRenderingContext2D, opacityMultiplier: number, mouse: { x: number; y: number; active: boolean }) {
    const maxDistance = 150;
    const mouseInfluenceRadius = 250;

    // Draw Nodes
    ctx.fillStyle = `rgba(45, 212, 191, ${0.7 * opacityMultiplier})`;
    for (let i = 0; i < this.nodes.length; i++) {
      const node = this.nodes[i];
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw Connections
    for (let i = 0; i < this.nodes.length; i++) {
      for (let j = i + 1; j < this.nodes.length; j++) {
        const dx = this.nodes[i].x - this.nodes[j].x;
        const dy = this.nodes[i].y - this.nodes[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < maxDistance) {
          let lineOpacity = (1 - dist / maxDistance) * 0.15;
          
          if (mouse.active) {
            const mouseDistI = Math.sqrt(Math.pow(mouse.x - this.nodes[i].x, 2) + Math.pow(mouse.y - this.nodes[i].y, 2));
            if (mouseDistI < mouseInfluenceRadius) {
               // Hover state connections
               lineOpacity = Math.min(0.45, lineOpacity * 2);
            }
          }

          ctx.beginPath();
          ctx.moveTo(this.nodes[i].x, this.nodes[i].y);
          ctx.lineTo(this.nodes[j].x, this.nodes[j].y);
          ctx.strokeStyle = `rgba(45, 212, 191, ${lineOpacity * opacityMultiplier})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }
    }
  }
}
