export class NeuralConstellations {
  private nodes: {
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number;
    baseRadius: number;
  }[];
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
    let count = 30; // Mobile: 20-40
    if (this.width >= 1024) {
      count = 75; // Desktop: 60-80
    } else if (this.width >= 768) {
      count = 60; // Laptop: 50-70
    }

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

        // Fast distance check (AABB) before expensive Math.sqrt
        if (
          Math.abs(dx) < mouseInfluenceRadius &&
          Math.abs(dy) < mouseInfluenceRadius
        ) {
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < mouseInfluenceRadius) {
            const force = (mouseInfluenceRadius - dist) / mouseInfluenceRadius;
            node.x += dx * force * 0.005;
            node.y += dy * force * 0.005;
            node.radius = node.baseRadius + force * 1.0;
            continue;
          }
        }
      }

      node.radius = node.baseRadius;
    }

    // Sort nodes by X coordinate for spatial optimization during draw
    this.nodes.sort((a, b) => a.x - b.x);
  }

  public draw(
    ctx: CanvasRenderingContext2D,
    opacityMultiplier: number,
    mouse: { x: number; y: number; active: boolean },
  ) {
    const maxDistance = 150;
    const maxDistSq = maxDistance * maxDistance;
    const mouseInfluenceRadius = 250;
    const mouseInfluenceSq = mouseInfluenceRadius * mouseInfluenceRadius;

    ctx.fillStyle = `rgba(45, 212, 191, ${0.7 * opacityMultiplier})`;

    // Draw Nodes
    for (let i = 0; i < this.nodes.length; i++) {
      const node = this.nodes[i];
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw Connections (Optimized with spatial sorting and squared distances)
    ctx.lineWidth = 0.8;
    for (let i = 0; i < this.nodes.length; i++) {
      for (let j = i + 1; j < this.nodes.length; j++) {
        const dx = this.nodes[j].x - this.nodes[i].x;

        // Spatial optimization: Since nodes are sorted by X, if dx > maxDistance,
        // no further nodes in the array can possibly be close enough.
        if (dx > maxDistance) break;

        const dy = this.nodes[j].y - this.nodes[i].y;

        // Fast y-check (AABB)
        if (Math.abs(dy) > maxDistance) continue;

        const distSq = dx * dx + dy * dy;

        if (distSq < maxDistSq) {
          const dist = Math.sqrt(distSq);
          let lineOpacity = (1 - dist / maxDistance) * 0.15;

          if (mouse.active) {
            const mouseDx = mouse.x - this.nodes[i].x;
            const mouseDy = mouse.y - this.nodes[i].y;
            const mouseDistSq = mouseDx * mouseDx + mouseDy * mouseDy;

            if (mouseDistSq < mouseInfluenceSq) {
              lineOpacity = Math.min(0.45, lineOpacity * 2);
            }
          }

          ctx.beginPath();
          ctx.moveTo(this.nodes[i].x, this.nodes[i].y);
          ctx.lineTo(this.nodes[j].x, this.nodes[j].y);
          ctx.strokeStyle = `rgba(45, 212, 191, ${lineOpacity * opacityMultiplier})`;
          ctx.stroke();
        }
      }
    }
  }
}
