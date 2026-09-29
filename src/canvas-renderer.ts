import { Match } from "./engine";
import { type Club, type Settings } from "./domain";
// Software fallback for browsers without WebGL. The simulation and controls are identical.
export class CanvasStadium {
  canvas = document.createElement("canvas");
  ctx: CanvasRenderingContext2D;
  resize: ResizeObserver;
  settings: Settings;
  disposed = false;
  time = 0;
  w = 1;
  h = 1;
  scale = 1;
  cx = 0;
  cz = 0;
  menu = false;
  compatibility = true;
  constructor(
    public container: HTMLElement,
    public match: Match,
    public clubs: [Club, Club],
    settings: Settings,
  ) {
    this.settings = { ...settings };
    this.ctx = this.canvas.getContext("2d")!;
    if (!this.ctx) throw new Error("Canvas is not supported by this browser.");
    this.canvas.setAttribute(
      "aria-label",
      "Live football pitch in compatibility view",
    );
    this.canvas.style.cssText = "width:100%;height:100%;display:block";
    container.appendChild(this.canvas);
    this.resize = new ResizeObserver(() => this.onResize());
    this.resize.observe(container);
    this.onResize();
  }
  onResize() {
    this.w = this.container.clientWidth;
    this.h = this.container.clientHeight;
    const ratio = Math.min(devicePixelRatio, 1.5);
    this.canvas.width = this.w * ratio;
    this.canvas.height = this.h * ratio;
    this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }
  project(x: number, z: number, y = 0) {
    return {
      x: this.w / 2 + (x - this.cx) * this.scale,
      y: this.h / 2 + (z - this.cz) * this.scale * 0.69 - y * this.scale,
    };
  }
  poly(points: number[][], fill: string, stroke?: string, width = 1) {
    const c = this.ctx;
    c.beginPath();
    points.forEach(([x, z, y = 0], i) => {
      const p = this.project(x, z, y);
      if (i) c.lineTo(p.x, p.y);
      else c.moveTo(p.x, p.y);
    });
    c.closePath();
    c.fillStyle = fill;
    c.fill();
    if (stroke) {
      c.strokeStyle = stroke;
      c.lineWidth = width;
      c.stroke();
    }
  }
  line(points: number[][], color = "#d9e4c8aa", width = 1) {
    const c = this.ctx;
    c.beginPath();
    points.forEach(([x, z, y = 0], i) => {
      const p = this.project(x, z, y);
      if (i) c.lineTo(p.x, p.y);
      else c.moveTo(p.x, p.y);
    });
    c.strokeStyle = color;
    c.lineWidth = width;
    c.stroke();
  }
  render(dt: number, menu = false) {
    if (this.disposed) return;
    this.time += dt;
    this.menu = menu;
    const c = this.ctx,
      b = this.match.ball;
    const camera = this.settings.camera;
    this.scale = menu
      ? Math.max(this.w / 132, this.h / 74)
      : camera === "tactical"
        ? Math.min(this.w / 125, this.h / 66)
        : camera === "close"
          ? Math.min(this.w / 63, this.h / 41)
          : Math.min(this.w / 96, this.h / 54);
    this.cx +=
      ((menu ? 9 : camera === "tactical" ? 0 : b.x * 0.64) - this.cx) *
      Math.min(1, dt * 3);
    this.cz +=
      ((menu ? -1 : camera === "tactical" ? 0 : b.z * 0.42) - this.cz) *
      Math.min(1, dt * 3);
    const backdrop = c.createLinearGradient(0, 0, 0, this.h);
    backdrop.addColorStop(0, "#112c28");
    backdrop.addColorStop(1, "#15231b");
    c.fillStyle = backdrop;
    c.fillRect(0, 0, this.w, this.h);
    for (const side of [-1, 1])
      for (let row = 6; row >= 0; row--) {
        this.poly(
          [
            [-72, side * (40 + row * 2.6), row * 1.1],
            [72, side * (40 + row * 2.6), row * 1.1],
            [72, side * (42.6 + row * 2.6), row * 1.1],
            [-72, side * (42.6 + row * 2.6), row * 1.1],
          ],
          row % 2 ? "#253c33" : "#2d4438",
        );
        for (let col = 0; col < 126; col++) {
          const p = this.project(
            col * 1.12 - 70,
            side * (41 + row * 2.6),
            row * 1.1 + 0.7,
          );
          c.fillStyle = ["#899b88", "#697e71", "#ad9f65", "#566b5b", "#5d8180"][
            (col * 7 + row * 3) % 5
          ];
          c.beginPath();
          c.ellipse(
            p.x,
            p.y,
            this.scale * 0.18,
            this.scale * 0.34,
            0,
            0,
            Math.PI * 2,
          );
          c.fill();
        }
      }
    this.poly(
      [
        [-66, -40],
        [66, -40],
        [66, 40],
        [-66, 40],
      ],
      "#294e33",
    );
    for (let i = 0; i < 12; i++) {
      const x = -52.5 + i * 8.75;
      this.poly(
        [
          [x, -34],
          [x + 8.75, -34],
          [x + 8.75, 34],
          [x, 34],
        ],
        i % 2 ? "#41814b" : "#397642",
      );
    }
    this.line([
      [-52.5, -34],
      [52.5, -34],
      [52.5, 34],
      [-52.5, 34],
      [-52.5, -34],
    ]);
    this.line([
      [0, -34],
      [0, 34],
    ]);
    this.line(
      Array.from({ length: 65 }, (_, i) => [
        Math.cos((i / 64) * Math.PI * 2) * 9.15,
        Math.sin((i / 64) * Math.PI * 2) * 9.15,
      ]),
    );
    for (const d of [-1, 1]) {
      this.line([
        [d * 52.5, -20.16],
        [d * 36, -20.16],
        [d * 36, 20.16],
        [d * 52.5, 20.16],
      ]);
      this.line([
        [d * 52.5, -9.16],
        [d * 47, -9.16],
        [d * 47, 9.16],
        [d * 52.5, 9.16],
      ]);
      this.line(
        Array.from({ length: 33 }, (_, i) => {
          const a = -0.91 + (i / 32) * 1.82;
          return [d * (41.5 - Math.cos(a) * 9.15), Math.sin(a) * 9.15];
        }),
      );
      for (const z of [-34, 34]) {
        this.line(
          [
            [d * 52.5, z],
            [d * 52.5, z, 1.65],
          ],
          "#e5edce",
          2,
        );
        this.poly(
          [
            [d * 52.5, z, 1.65],
            [d * 52.5 + 0.75, z, 1.65],
            [d * 52.5 + 0.75, z, 1.15],
            [d * 52.5, z, 1.15],
          ],
          "#efc657",
        );
      }
      this.poly(
        [
          [d * 52.5, -3.66, 2.44],
          [d * 55, -3.66, 0.2],
          [d * 55, 3.66, 0.2],
          [d * 52.5, 3.66, 2.44],
        ],
        "#dce7d312",
      );
      for (let z = -3.66; z <= 3.66; z += 0.4)
        this.line(
          [
            [d * 52.5, z, 2.44],
            [d * 55, z, 0.2],
          ],
          "#e1ebdd55",
          0.5,
        );
      for (let t = 0; t < 1; t += 0.17)
        this.line(
          [
            [d * (52.5 + 2.5 * t), -3.66, 2.44 * (1 - t)],
            [d * (52.5 + 2.5 * t), 3.66, 2.44 * (1 - t)],
          ],
          "#e1ebdd55",
          0.5,
        );
      this.line(
        [
          [d * 52.5, -3.66, 0],
          [d * 52.5, -3.66, 2.44],
          [d * 52.5, 3.66, 2.44],
          [d * 52.5, 3.66, 0],
        ],
        "#f0f0dc",
        Math.max(2, this.scale * 0.09),
      );
    }
    const cp = this.match.controlled;
    if (!menu && cp) {
      const p = this.project(cp.x, cp.z);
      c.strokeStyle = "#ffe17a";
      c.lineWidth = 2;
      c.beginPath();
      c.ellipse(
        p.x,
        p.y,
        0.85 * this.scale,
        0.45 * this.scale,
        0,
        0,
        Math.PI * 2,
      );
      c.stroke();
    }
    const people = this.match.active.slice().sort((a, b) => a.z - b.z);
    for (const p of people) {
      const point = this.project(p.x, p.z),
        s = this.scale * 1.2;
      const speed = Math.hypot(p.vx, p.vz),
        stride =
          Math.sin(this.time * (speed > 7 ? 15 : 11) + p.slot) *
          Math.min(0.38, speed * 0.06);
      const skin = ["#e9bd9c", "#c99168", "#9c6246", "#714731", "#4c3027"][
          p.data.skin
        ],
        kit =
          p.slot === 0
            ? p.team
              ? "#dca4e8"
              : "#95d6a0"
            : this.clubs[p.team].color;
      c.save();
      c.translate(point.x, point.y);
      c.scale(s, s);
      c.fillStyle = "#0e24133d";
      c.beginPath();
      c.ellipse(0.15, 0.03, 0.42, 0.18, 0, 0, Math.PI * 2);
      c.fill();
      c.lineCap = "round";
      const limb = (a: number[], b: number[], color: string, width: number) => {
        c.strokeStyle = color;
        c.lineWidth = width;
        c.beginPath();
        c.moveTo(a[0], a[1]);
        c.lineTo(b[0], b[1]);
        c.stroke();
      };
      limb([-0.13, -0.69], [-0.13 - stride, -0.35], "#192c24", 0.19);
      limb([0.13, -0.69], [0.13 + stride, -0.35], "#192c24", 0.19);
      limb([-0.13 - stride, -0.35], [-0.13 - stride * 1.4, -0.11], skin, 0.13);
      limb([0.13 + stride, -0.35], [0.13 + stride * 1.4, -0.11], skin, 0.13);
      limb(
        [-0.13 - stride * 1.4, -0.2],
        [-0.13 - stride * 1.4, -0.03],
        kit,
        0.13,
      );
      limb(
        [0.13 + stride * 1.4, -0.2],
        [0.13 + stride * 1.4, -0.03],
        kit,
        0.13,
      );
      limb(
        [-0.13 - stride * 1.4, -0.02],
        [-0.02 - stride * 1.4, -0.02],
        "#e5e8d3",
        0.1,
      );
      limb(
        [0.13 + stride * 1.4, -0.02],
        [0.24 + stride * 1.4, -0.02],
        "#e5e8d3",
        0.1,
      );
      limb([-0.22, -1.19], [-0.32 - stride * 0.6, -0.87], kit, 0.2);
      limb(
        [-0.32 - stride * 0.6, -0.87],
        [-0.31 - stride * 0.7, -0.69],
        skin,
        0.12,
      );
      limb([0.22, -1.19], [0.32 + stride * 0.6, -0.87], kit, 0.2);
      limb(
        [0.32 + stride * 0.6, -0.87],
        [0.31 + stride * 0.7, -0.69],
        skin,
        0.12,
      );
      c.fillStyle = kit;
      c.beginPath();
      c.moveTo(-0.24, -1.29);
      c.quadraticCurveTo(0, -1.36, 0.24, -1.29);
      c.lineTo(0.22, -0.77);
      c.quadraticCurveTo(0, -0.7, -0.22, -0.77);
      c.closePath();
      c.fill();
      c.fillStyle = "#152a23";
      c.font = "bold .3px Arial";
      c.textAlign = "center";
      c.fillText(String(p.number), 0, -0.94);
      limb([0, -1.25], [0, -1.43], skin, 0.14);
      c.fillStyle = skin;
      c.beginPath();
      c.ellipse(0, -1.54, 0.155, 0.2, 0, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "#291e16";
      c.beginPath();
      c.ellipse(-0.015, -1.64, 0.155, 0.1, -0.14, Math.PI, Math.PI * 2);
      c.fill();
      c.restore();
    }
    const shadow = this.project(b.x, b.z);
    c.fillStyle = "#142b1766";
    c.beginPath();
    c.ellipse(
      shadow.x,
      shadow.y,
      this.scale * 0.3,
      this.scale * 0.17,
      0,
      0,
      Math.PI * 2,
    );
    c.fill();
    const ball = this.project(b.x, b.z, b.y);
    c.fillStyle = "#fffbe9";
    c.beginPath();
    c.arc(ball.x, ball.y, Math.max(2.7, this.scale * 0.23), 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "#29392b";
    c.beginPath();
    c.arc(
      ball.x - 0.5,
      ball.y - 0.4,
      Math.max(1, this.scale * 0.085),
      0,
      Math.PI * 2,
    );
    c.fill();
    if (!menu) {
      c.fillStyle = "#e4ecd8a6";
      c.font = "10px Arial";
      c.textAlign = "right";
      c.fillText("COMPATIBILITY VIEW", this.w - 20, this.h - 135);
    }
  }
  dispose() {
    this.disposed = true;
    this.resize.disconnect();
    this.canvas.remove();
  }
}
