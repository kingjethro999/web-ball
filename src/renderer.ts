import * as T from "three";
import { Match } from "./engine";
import { type Club, type Settings, rng } from "./domain";
const skinColors = [0xf2c6a6, 0xc99168, 0x9c6246, 0x714731, 0x4c3027];
type Avatar = {
  group: T.Group;
  legs: T.Group[];
  arms: T.Group[];
  body: T.Group;
  number: string;
};
export class Stadium {
  renderer: T.WebGLRenderer;
  scene = new T.Scene();
  camera = new T.PerspectiveCamera(43, 1, 0.1, 400);
  root: T.Group = new T.Group();
  avatars: Avatar[] = [];
  ball: T.Mesh;
  marker: T.Mesh;
  target = new T.Vector3();
  resize: ResizeObserver;
  disposed = false;
  frame = 0;
  lastBall = new T.Vector3();
  settings: Settings;
  materials: T.Material[] = [];
  textures: T.Texture[] = [];
  constructor(
    public container: HTMLElement,
    public match: Match,
    public clubs: [Club, Club],
    settings: Settings,
  ) {
    this.settings = { ...settings };
    this.renderer = new T.WebGLRenderer({
      antialias: settings.quality === "high",
      alpha: false,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(
      Math.min(devicePixelRatio, settings.quality === "high" ? 1.75 : 1),
    );
    this.renderer.shadowMap.enabled = settings.quality === "high";
    this.renderer.shadowMap.type = T.PCFSoftShadowMap;
    this.renderer.outputColorSpace = T.SRGBColorSpace;
    this.renderer.toneMapping = T.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.13;
    container.appendChild(this.renderer.domElement);
    this.renderer.domElement.setAttribute(
      "aria-label",
      "Live 3D football pitch",
    );
    this.scene.background = new T.Color("#101c20");
    this.scene.fog = new T.Fog("#172626", 100, 235);
    this.scene.add(this.root);
    const hemi = new T.HemisphereLight(0xe7f1ff, 0x5c7050, 2.2);
    this.scene.add(hemi);
    const sun = new T.DirectionalLight(0xfff4da, 3.1);
    sun.position.set(-28, 70, 25);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, {
      left: -70,
      right: 70,
      top: 55,
      bottom: -55,
      near: 1,
      far: 150,
    });
    sun.shadow.bias = -0.0003;
    this.scene.add(sun);
    this.pitch();
    this.stands();
    for (const p of match.players) {
      const color =
        p.slot === 0
          ? p.team === 0
            ? "#87df9c"
            : "#e697f3"
          : clubs[p.team].color;
      const avatar = this.player(
        color,
        p.data.skin,
        p.data.hair,
        p.number,
        p.data.name,
      );
      this.avatars.push(avatar);
      this.root.add(avatar.group);
    }
    this.ball = new T.Mesh(
      new T.SphereGeometry(0.23, 16, 12),
      new T.MeshStandardMaterial({ map: this.ballTexture(), roughness: 0.6 }),
    );
    this.ball.castShadow = true;
    this.root.add(this.ball);
    this.marker = new T.Mesh(
      new T.RingGeometry(0.78, 0.91, 32),
      new T.MeshBasicMaterial({
        color: 0xffd467,
        side: T.DoubleSide,
        transparent: true,
        opacity: 0.95,
      }),
    );
    this.marker.rotation.x = -Math.PI / 2;
    this.root.add(this.marker);
    this.resize = new ResizeObserver(() => this.onResize());
    this.resize.observe(container);
    this.onResize();
    this.camera.position.set(0, 66, 83);
    this.camera.lookAt(0, 0, 0);
  }
  material(color: T.ColorRepresentation, roughness = 0.8) {
    return new T.MeshStandardMaterial({ color, roughness });
  }
  mesh(geometry: T.BufferGeometry, material: T.Material, x = 0, y = 0, z = 0) {
    const o = new T.Mesh(geometry, material);
    o.position.set(x, y, z);
    o.castShadow = true;
    return o;
  }
  pitch() {
    const grassCanvas = document.createElement("canvas");
    grassCanvas.width = 1024;
    grassCanvas.height = 768;
    const ctx = grassCanvas.getContext("2d")!;
    ctx.fillStyle = "#3b783f";
    ctx.fillRect(0, 0, 1024, 768);
    const r = rng(103);
    for (let i = 0; i < 12; i++) {
      ctx.fillStyle = i % 2 ? "#417e44" : "#37733c";
      ctx.fillRect((i * 1024) / 12, 0, 1024 / 12, 768);
    }
    for (let i = 0; i < 100000; i++) {
      ctx.fillStyle =
        r() > 0.5 ? "rgba(200,225,127,.07)" : "rgba(12,35,10,.06)";
      ctx.fillRect(r() * 1024, r() * 768, 1, 2);
    }
    const tex = new T.CanvasTexture(grassCanvas);
    tex.colorSpace = T.SRGBColorSpace;
    tex.anisotropy = 8;
    this.textures.push(tex);
    const ground = this.mesh(
      new T.PlaneGeometry(136, 96),
      this.material("#214c35"),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    ground.castShadow = false;
    this.root.add(ground);
    const pitch = this.mesh(
      new T.PlaneGeometry(105, 68),
      new T.MeshStandardMaterial({ map: tex, roughness: 1 }),
      0,
      0.015,
      0,
    );
    pitch.rotation.x = -Math.PI / 2;
    pitch.receiveShadow = true;
    pitch.castShadow = false;
    this.root.add(pitch);
    const white = new T.LineBasicMaterial({
      color: 0xdfebd7,
      transparent: true,
      opacity: 0.85,
    });
    const line = (points: number[][]) => {
      const geo = new T.BufferGeometry().setFromPoints(
        points.map(([x, z]) => new T.Vector3(x, 0.035, z)),
      );
      const obj = new T.Line(geo, white);
      this.root.add(obj);
    };
    const rect = (x: number, z: number, w: number, h: number) =>
      line([
        [x, z],
        [x + w, z],
        [x + w, z + h],
        [x, z + h],
        [x, z],
      ]);
    rect(-52.5, -34, 105, 68);
    line([
      [0, -34],
      [0, 34],
    ]);
    line(
      Array.from({ length: 97 }, (_, i) => [
        Math.cos((i / 96) * Math.PI * 2) * 9.15,
        Math.sin((i / 96) * Math.PI * 2) * 9.15,
      ]),
    );
    for (const dir of [-1, 1]) {
      rect(dir === 1 ? 36 : -52.5, -20.16, 16.5, 40.32);
      rect(dir === 1 ? 47 : -52.5, -9.16, 5.5, 18.32);
      const dot = this.mesh(
        new T.CircleGeometry(0.13, 12),
        new T.MeshBasicMaterial({ color: 0xeeeeee }),
        dir * 41.5,
        0.041,
        0,
      );
      dot.rotation.x = -Math.PI / 2;
      this.root.add(dot);
      const arc: number[][] = [];
      for (let i = 0; i <= 40; i++) {
        const a = -0.91 + (i / 40) * 1.82;
        arc.push([dir * (41.5 - Math.cos(a) * 9.15), Math.sin(a) * 9.15]);
      }
      line(arc);
      this.goal(dir);
      for (const side of [-1, 1]) {
        const pole = this.mesh(
          new T.CylinderGeometry(0.055, 0.055, 1.6, 6),
          this.material("#fff4ce"),
          dir * 52.5,
          0.8,
          side * 34,
        );
        this.root.add(pole);
        const flag = this.mesh(
          new T.PlaneGeometry(0.75, 0.5),
          new T.MeshBasicMaterial({ color: 0xf5c451, side: T.DoubleSide }),
          dir * 52.5 + 0.35,
          1.4,
          side * 34,
        );
        this.root.add(flag);
      }
    }
    const dot = this.mesh(
      new T.CircleGeometry(0.14, 12),
      new T.MeshBasicMaterial({ color: 0xeeeeee }),
      0,
      0.042,
      0,
    );
    dot.rotation.x = -Math.PI / 2;
    this.root.add(dot);
  }
  goal(dir: number) {
    const white = this.material("#f4f4ea");
    const x = dir * 52.55;
    for (const z of [-3.66, 3.66])
      this.root.add(
        this.mesh(
          new T.CylinderGeometry(0.065, 0.065, 2.44, 8),
          white,
          x,
          1.22,
          z,
        ),
      );
    const bar = this.mesh(
      new T.CylinderGeometry(0.065, 0.065, 7.45, 8),
      white,
      x,
      2.44,
      0,
    );
    bar.rotation.x = Math.PI / 2;
    this.root.add(bar);
    const lines: T.Vector3[] = [];
    for (let z = -3.66; z <= 3.67; z += 0.3) {
      lines.push(
        new T.Vector3(x, 2.44, z),
        new T.Vector3(x + dir * 2.3, 2.44, z),
        new T.Vector3(x + dir * 2.3, 2.44, z),
        new T.Vector3(x + dir * 2.3, 0, z),
      );
    }
    for (let y = 0; y <= 2.45; y += 0.3) {
      lines.push(
        new T.Vector3(x + dir * 2.3, y, -3.66),
        new T.Vector3(x + dir * 2.3, y, 3.66),
      );
      for (const z of [-3.66, 3.66])
        lines.push(new T.Vector3(x, y, z), new T.Vector3(x + dir * 2.3, y, z));
    }
    this.root.add(
      new T.LineSegments(
        new T.BufferGeometry().setFromPoints(lines),
        new T.LineBasicMaterial({
          color: 0xd0ddd6,
          transparent: true,
          opacity: 0.4,
        }),
      ),
    );
  }
  stands() {
    const concrete = this.material("#23322e");
    for (const side of [-1, 1])
      for (let row = 0; row < 7; row++) {
        const platform = this.mesh(
          new T.BoxGeometry(143, 1.1, 2.5),
          concrete,
          0,
          row * 1.2 + 0.6,
          side * (45 + row * 2.5),
        );
        platform.receiveShadow = true;
        this.root.add(platform);
      }
    const r = rng(401),
      crowd = new T.InstancedMesh(
        new T.SphereGeometry(0.27, 5, 4),
        this.material("#8eaaa2"),
        7 * 140 * 2,
      );
    const m = new T.Matrix4(),
      q = new T.Quaternion();
    let i = 0;
    for (const side of [-1, 1])
      for (let row = 0; row < 7; row++)
        for (let col = 0; col < 140; col++) {
          m.compose(
            new T.Vector3(
              col - 69.5,
              1.65 + row * 1.2,
              side * (45 + row * 2.5),
            ),
            q,
            new T.Vector3(1, 1.9, 1),
          );
          crowd.setMatrixAt(i, m);
          crowd.setColorAt(
            i,
            new T.Color(
              [
                0x667568, 0x83948b, 0x3b5247, 0xb99853, 0x233e42, 0xa5b0ab,
                0x566582,
              ][Math.floor(r() * 7)],
            ),
          );
          i++;
        }
    this.root.add(crowd);
    for (const side of [-1, 1])
      for (let i = 0; i < 10; i++) {
        const canvas = document.createElement("canvas");
        canvas.width = 512;
        canvas.height = 64;
        const c = canvas.getContext("2d")!;
        c.fillStyle = i % 2 ? "#f2c652" : "#142823";
        c.fillRect(0, 0, 512, 64);
        c.fillStyle = i % 2 ? "#19251f" : "#dbe9d9";
        c.font = "bold 28px Arial";
        c.textAlign = "center";
        c.fillText(
          i % 3 === 0
            ? "WEB BALL"
            : i % 3 === 1
              ? "OWN THE PITCH"
              : "THE AURORA LEAGUE",
          256,
          43,
        );
        const tex = new T.CanvasTexture(canvas);
        tex.colorSpace = T.SRGBColorSpace;
        this.textures.push(tex);
        const ad = this.mesh(
          new T.PlaneGeometry(12.5, 1.6),
          new T.MeshBasicMaterial({ map: tex, side: T.DoubleSide }),
          -57 + i * 12.7,
          1,
          side * 39,
        );
        ad.rotation.y = side === -1 ? 0 : Math.PI;
        this.root.add(ad);
      }
    for (const x of [-59, 59])
      for (const z of [-42, 42]) {
        this.root.add(
          this.mesh(
            new T.CylinderGeometry(0.18, 0.3, 25, 8),
            this.material("#657b77"),
            x,
            12.5,
            z,
          ),
        );
        const light = this.mesh(
          new T.BoxGeometry(5, 1.5, 0.4),
          new T.MeshBasicMaterial({ color: 0xf6f8ec }),
          x,
          25,
          z,
        );
        light.rotation.x = 0.3;
        this.root.add(light);
      }
  }
  player(
    color: string,
    skin: number,
    hair: number,
    number: number,
    name: string,
  ): Avatar {
    const g = new T.Group(),
      body = new T.Group();
    g.add(body);
    const jersey = this.material(color, 0.75),
      skinMat = this.material(skinColors[skin], 0.85),
      shorts = this.material("#1b2927"),
      sock = this.material(color),
      boot = this.material("#e3e7cb"),
      hairMat = this.material([0x1b1512, 0x241a14, 0x382618, 0x131310][hair]);
    const profile = [
      [0.22, 0.85],
      [0.27, 0.95],
      [0.29, 1.16],
      [0.34, 1.35],
      [0.25, 1.44],
    ].map(([x, y]) => new T.Vector2(x, y));
    const torso = this.mesh(new T.LatheGeometry(profile, 12), jersey);
    torso.scale.z = 0.64;
    body.add(torso);
    const hips = this.mesh(
      new T.SphereGeometry(0.28, 12, 8),
      shorts,
      0,
      0.88,
      0,
    );
    hips.scale.set(1, 0.65, 0.72);
    body.add(hips);
    body.add(
      this.mesh(
        new T.CylinderGeometry(0.085, 0.1, 0.16, 8),
        skinMat,
        0,
        1.47,
        0,
      ),
    );
    const head = this.mesh(
      new T.SphereGeometry(0.18, 16, 12),
      skinMat,
      0,
      1.66,
      0,
    );
    head.scale.set(0.88, 1.17, 0.97);
    body.add(head);
    const hairMesh = this.mesh(
      new T.SphereGeometry(
        0.184,
        12,
        10,
        0,
        Math.PI * 2,
        0,
        Math.PI * (hair === 2 ? 0.35 : 0.47),
      ),
      hairMat,
      0,
      1.71,
      -0.012,
    );
    hairMesh.scale.set(0.91, hair === 3 ? 1.24 : 1, 0.96);
    body.add(hairMesh);
    const nose = this.mesh(
      new T.SphereGeometry(0.043, 8, 6),
      skinMat,
      0,
      1.65,
      0.166,
    );
    nose.scale.set(0.7, 1, 1);
    body.add(nose);
    const eyes = this.material("#29211c");
    for (const x of [-0.067, 0.067])
      body.add(
        this.mesh(new T.SphereGeometry(0.014, 6, 4), eyes, x, 1.705, 0.149),
      );
    const legs: T.Group[] = [],
      arms: T.Group[] = [];
    for (const sign of [-1, 1]) {
      const leg = new T.Group();
      leg.position.set(sign * 0.14, 0.85, 0);
      leg.add(
        this.mesh(
          new T.CylinderGeometry(0.115, 0.085, 0.34, 8),
          shorts,
          0,
          -0.13,
          0,
        ),
      );
      leg.add(
        this.mesh(
          new T.CylinderGeometry(0.083, 0.067, 0.3, 8),
          skinMat,
          0,
          -0.39,
          0,
        ),
      );
      leg.add(
        this.mesh(
          new T.CylinderGeometry(0.07, 0.052, 0.27, 8),
          sock,
          0,
          -0.6,
          0,
        ),
      );
      const foot = this.mesh(
        new T.SphereGeometry(0.1, 8, 6),
        boot,
        0,
        -0.75,
        0.045,
      );
      foot.scale.set(0.77, 0.55, 1.65);
      leg.add(foot);
      body.add(leg);
      legs.push(leg);
      const arm = new T.Group();
      arm.position.set(sign * 0.27, 1.32, 0);
      arm.rotation.z = sign * 0.12;
      arm.add(
        this.mesh(
          new T.CylinderGeometry(0.105, 0.085, 0.24, 8),
          jersey,
          sign * 0.025,
          -0.08,
          0,
        ),
      );
      arm.add(
        this.mesh(
          new T.CylinderGeometry(0.07, 0.05, 0.35, 8),
          skinMat,
          sign * 0.04,
          -0.35,
          0.025,
        ),
      );
      arm.add(
        this.mesh(
          new T.SphereGeometry(0.06, 8, 6),
          skinMat,
          sign * 0.04,
          -0.54,
          0.025,
        ),
      );
      body.add(arm);
      arms.push(arm);
    }
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#101e19";
    ctx.font = "bold 72px Arial";
    ctx.textAlign = "center";
    ctx.fillText(String(number), 64, 86);
    const texture = new T.CanvasTexture(canvas);
    texture.colorSpace = T.SRGBColorSpace;
    this.textures.push(texture);
    const num = this.mesh(
      new T.PlaneGeometry(0.28, 0.28),
      new T.MeshBasicMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
      }),
      0,
      1.2,
      -0.199,
    );
    num.rotation.y = Math.PI;
    body.add(num);
    const badge = this.mesh(
      new T.CircleGeometry(0.037, 8),
      this.material("#fff3d8"),
      -0.12,
      1.31,
      0.19,
    );
    body.add(badge);
    // A single shared organic silhouette, with articulated joints; no cube avatars.
    g.scale.setScalar(1.3);
    g.userData.name = name;
    return { group: g, body, legs, arms, number: String(number) };
  }
  ballTexture() {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 128;
    const g = c.getContext("2d")!;
    g.fillStyle = "#f5f4df";
    g.fillRect(0, 0, 256, 128);
    for (let row = 0; row < 3; row++)
      for (let col = 0; col < 5; col++) {
        const x = col * 56 + (row % 2) * 26,
          y = row * 51;
        g.beginPath();
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2;
          g.lineTo(x + Math.cos(a) * 12, y + Math.sin(a) * 12);
        }
        g.closePath();
        g.fillStyle = "#21332d";
        g.fill();
      }
    const tex = new T.CanvasTexture(c);
    tex.colorSpace = T.SRGBColorSpace;
    this.textures.push(tex);
    return tex;
  }
  onResize() {
    const w = this.container.clientWidth,
      h = this.container.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }
  render(dt: number, menu = false) {
    if (this.disposed) return;
    this.frame += dt;
    const match = this.match;
    for (let i = 0; i < match.players.length; i++) {
      const p = match.players[i],
        a = this.avatars[i];
      a.group.visible = !p.red && !p.injured;
      if (!a.group.visible) continue;
      a.group.position.set(p.x, 0, p.z);
      let angle = p.facing - a.group.rotation.y;
      angle = Math.atan2(Math.sin(angle), Math.cos(angle));
      a.group.rotation.y += angle * Math.min(1, dt * 14);
      const speed = Math.hypot(p.vx, p.vz);
      const swing =
        Math.sin(this.frame * (speed > 7 ? 15 : 11) + i) *
        Math.min(0.72, speed * 0.1);
      a.legs[0].rotation.x = p.action > 0 ? -1.0 : swing;
      a.legs[1].rotation.x = -swing;
      a.arms[0].rotation.x = -swing * 0.75;
      a.arms[1].rotation.x = swing * 0.75;
      a.body.position.y =
        speed > 0.5
          ? Math.abs(Math.sin(this.frame * 12 + i)) * 0.045
          : Math.sin(this.frame * 2 + i) * 0.008;
    }
    const b = match.ball;
    this.ball.position.set(b.x, b.y, b.z);
    this.ball.rotation.z -= b.vx * dt * 2;
    this.ball.rotation.x += b.vz * dt * 2;
    const p = match.controlled;
    this.marker.visible = !menu && !!p && !p.red;
    if (p) this.marker.position.set(p.x, 0.06, p.z);
    const mode = this.settings.camera;
    let pos: T.Vector3, target: T.Vector3;
    if (menu) {
      pos = new T.Vector3(40 + Math.sin(this.frame * 0.025) * 8, 37, 53);
      target = new T.Vector3(2, 0, -4);
    } else if (mode === "tactical") {
      pos = new T.Vector3(b.x * 0.18, 95, 58);
      target = new T.Vector3(b.x * 0.18, 0, 0);
    } else if (mode === "close") {
      pos = new T.Vector3(b.x * 0.85, 29, clamp(b.z * 0.4 + 35, 25, 52));
      target = new T.Vector3(b.x * 0.85, 0, b.z * 0.6);
    } else {
      const mobile = this.camera.aspect < 1.1;
      pos = new T.Vector3(
        b.x * 0.65,
        mobile ? 77 : 58,
        b.z * 0.25 + (mobile ? 72 : 64),
      );
      target = new T.Vector3(b.x * 0.65, 0, b.z * 0.4);
    }
    this.camera.position.lerp(pos, 1 - Math.exp(-dt * 3));
    this.target.lerp(target, 1 - Math.exp(-dt * 4));
    this.camera.lookAt(this.target);
    this.renderer.render(this.scene, this.camera);
  }
  dispose() {
    this.disposed = true;
    this.resize.disconnect();
    this.scene.traverse((o) => {
      const m = o as T.Mesh;
      if (m.geometry) m.geometry.dispose();
      if (m.material) {
        for (const mat of Array.isArray(m.material) ? m.material : [m.material])
          mat.dispose();
      }
    });
    this.textures.forEach((t) => t.dispose());
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export type StadiumView = Stadium;
export function createStadium(
  container: HTMLElement,
  match: Match,
  clubs: [Club, Club],
  settings: Settings,
): StadiumView {
  // A missing WebGL renderer is an explicit error, never a different game.
  return new Stadium(container, match, clubs, settings);
}
