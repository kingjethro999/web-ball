import * as T from "three";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clone as cloneSkeleton } from "three/addons/utils/SkeletonUtils.js";
import { suppliedKit } from "./player-material";
import { Match, BALL_RADIUS } from "./engine";
import { type Club, type Settings, rng } from "./domain";
const skinColors = [0xf2c6a6, 0xc99168, 0x9c6246, 0x714731, 0x4c3027];
const LOOPING_ANIMATIONS = new Set([
  "idle",
  "walk",
  "jog",
  "sprint",
  "gk_stance",
  "celebrate",
  "dejected",
]);
type Avatar = {
  group: T.Group;
  mixer: T.AnimationMixer;
  actions: Map<string, T.AnimationAction>;
  active: string;
  lod: { mesh: T.Mesh; near: T.BufferGeometry; far: T.BufferGeometry }[];
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
  characterError?: HTMLElement;
  contactShadows: T.InstancedMesh;
  shadowTransform = new T.Object3D();
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
    this.renderer.toneMappingExposure = 1.0;
    container.appendChild(this.renderer.domElement);
    this.renderer.domElement.setAttribute(
      "aria-label",
      "Live 3D football pitch",
    );
    this.scene.background = new T.Color("#101c20");
    this.scene.fog = new T.Fog("#172626", 100, 235);
    this.scene.add(this.root);
    const hemi = new T.HemisphereLight(0xe7f1ff, 0x5c7050, 1.4);
    this.scene.add(hemi);
    const sun = new T.DirectionalLight(0xfff4da, 2.2);
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
    const shadowCanvas = document.createElement("canvas");
    shadowCanvas.width = shadowCanvas.height = 64;
    const shadowContext = shadowCanvas.getContext("2d")!;
    const gradient = shadowContext.createRadialGradient(32, 32, 3, 32, 32, 32);
    gradient.addColorStop(0, "rgba(0,0,0,.38)");
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    shadowContext.fillStyle = gradient;
    shadowContext.fillRect(0, 0, 64, 64);
    const shadowTexture = new T.CanvasTexture(shadowCanvas);
    this.textures.push(shadowTexture);
    this.contactShadows = new T.InstancedMesh(
      new T.PlaneGeometry(1.5, 1.05).rotateX(-Math.PI / 2),
      new T.MeshBasicMaterial({
        map: shadowTexture,
        transparent: true,
        depthWrite: false,
      }),
      match.players.length,
    );
    this.contactShadows.frustumCulled = false;
    this.root.add(this.contactShadows);
    this.pitch();
    void this.loadStadium();
    void this.loadPlayers();
    this.ball = new T.Mesh(
      new T.SphereGeometry(BALL_RADIUS, 24, 16),
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
    const white = new T.MeshBasicMaterial({
      color: 0xdfebd7,
      side: T.DoubleSide,
    });
    const line = (points: number[][]) => {
      const vertices: number[] = [];
      // Twelve-centimetre painted ribbons retain physical width in close views.
      for (let i = 1; i < points.length; i++) {
        const [ax, az] = points[i - 1],
          [bx, bz] = points[i];
        const length = Math.hypot(bx - ax, bz - az);
        if (!length) continue;
        const dx = (-(bz - az) / length) * 0.06;
        const dz = ((bx - ax) / length) * 0.06;
        vertices.push(
          ax + dx,
          0.036,
          az + dz,
          ax - dx,
          0.036,
          az - dz,
          bx + dx,
          0.036,
          bz + dz,
          bx + dx,
          0.036,
          bz + dz,
          ax - dx,
          0.036,
          az - dz,
          bx - dx,
          0.036,
          bz - dz,
        );
      }
      const geometry = new T.BufferGeometry();
      geometry.setAttribute(
        "position",
        new T.Float32BufferAttribute(vertices, 3),
      );
      this.root.add(new T.Mesh(geometry, white));
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
  async loadStadium() {
    try {
      const draco = new DRACOLoader().setDecoderPath("/assets/draco/");
      const loader = new GLTFLoader().setDRACOLoader(draco);
      const model = await loader
        .loadAsync("/assets/supplied/stadium.glb")
        .finally(() => draco.dispose());
      if (this.disposed) return;
      model.scene.name = "SuppliedStadium";
      model.scene.traverse((object) => {
        if (object.name.startsWith("StadiumRoof")) object.visible = false;
        const mesh = object as T.Mesh;
        if (!mesh.isMesh) return;
        mesh.receiveShadow = this.settings.quality === "high";
      });
      this.root.add(model.scene);
    } catch (error) {
      if (this.disposed) return;
      const message = document.createElement("div");
      message.className = "renderer-error";
      message.textContent = `Stadium could not load: ${(error as Error).message}`;
      this.container.appendChild(message);
    }
  }
  async loadPlayers() {
    try {
      const loader = new GLTFLoader();
      const [footballer, motionLibrary, distant] = await Promise.all([
        loader.loadAsync("/assets/supplied/footballer.glb"),
        loader.loadAsync("/assets/supplied/football-actions.glb"),
        loader.loadAsync("/assets/supplied/footballer-match.glb"),
      ]);
      if (this.disposed) return;
      const distantMeshes: T.BufferGeometry[] = [];
      distant.scene.traverse((o) => {
        if ((o as T.Mesh).isMesh) distantMeshes.push((o as T.Mesh).geometry);
      });
      const clips = new Map(
        motionLibrary.animations.map((clip) => [clip.name, clip]),
      );
      for (const player of this.match.players) {
        const group = cloneSkeleton(footballer.scene) as T.Group;
        const color =
          player.slot === 0
            ? player.team === 0
              ? "#87df9c"
              : "#e697f3"
            : this.clubs[player.team].color;
        const variation = appearanceVariation(player.data.id);
        group.scale.set(variation.build, variation.height, variation.build);
        group.userData.name = player.data.name;
        const lod: Avatar["lod"] = [];
        group.traverse((object) => {
          const mesh = object as T.SkinnedMesh;
          if (!mesh.isMesh) return;
          const far = distantMeshes[lod.length];
          if (!far) throw new Error("Distance mesh does not match player skin");
          lod.push({ mesh, near: mesh.geometry, far });
          mesh.castShadow = this.settings.quality === "high";
          mesh.frustumCulled = false;
          const originals = Array.isArray(mesh.material)
            ? mesh.material
            : [mesh.material];
          const customized = originals.map((source) => {
            if (source.name.startsWith("WB_SuppliedKit")) {
              if (!mesh.geometry.getAttribute("color_1"))
                throw new Error("Player fabric mask is missing");
              return suppliedKit(source, color);
            }
            const next = source.clone() as T.MeshStandardMaterial;
            if (
              next.name.startsWith("WB_Shirt") ||
              next.name.startsWith("WB_Socks")
            )
              next.color.set(color);
            else if (next.name.startsWith("WB_Shorts"))
              next.color.set(variation.shorts);
            else if (next.name.startsWith("WB_Skin"))
              next.color.set(skinColors[player.data.skin] ?? skinColors[2]);
            else if (next.name.startsWith("WB_Hair"))
              next.color.set(
                [0x17110e, 0x2c1b12, 0x4a2c17, 0x0d0c0a][player.data.hair % 4],
              );
            else if (next.name.startsWith("WB_Boots"))
              next.color.set(variation.boots);
            next.roughness = Math.max(0.5, next.roughness);
            return next;
          });
          mesh.material = Array.isArray(mesh.material)
            ? customized
            : customized[0];
        });
        this.addShirtNumber(group, player.number);
        const mixer = new T.AnimationMixer(group);
        const actions = new Map<string, T.AnimationAction>();
        for (const [name, clip] of clips) {
          const action = mixer.clipAction(clip);
          if (!LOOPING_ANIMATIONS.has(name)) {
            action.setLoop(T.LoopOnce, 1);
            action.clampWhenFinished = true;
          }
          actions.set(name, action);
        }
        const idle = actions.get("idle");
        idle?.play();
        const avatar = { group, mixer, actions, active: "idle", lod };
        this.avatars.push(avatar);
        this.root.add(group);
      }
    } catch (error) {
      if (this.disposed) return;
      const message = document.createElement("div");
      message.className = "renderer-error";
      message.textContent = `Player assets could not load: ${(error as Error).message}`;
      this.container.appendChild(message);
      this.characterError = message;
    }
  }
  addShirtNumber(group: T.Group, number: number) {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const context = canvas.getContext("2d")!;
    context.clearRect(0, 0, 128, 128);
    context.fillStyle = "#f8f0d5";
    context.strokeStyle = "#101b18";
    context.lineWidth = 8;
    context.font = "900 78px Arial";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.strokeText(String(number), 64, 68);
    context.fillText(String(number), 64, 68);
    const texture = new T.CanvasTexture(canvas);
    texture.colorSpace = T.SRGBColorSpace;
    this.textures.push(texture);
    const numberMesh = new T.Mesh(
      new T.PlaneGeometry(0.28, 0.28),
      new T.MeshBasicMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
        side: T.DoubleSide,
      }),
    );
    numberMesh.name = "ShirtNumber";
    numberMesh.position.set(0, 1.38, -0.205);
    numberMesh.rotation.y = Math.PI;
    group.updateMatrixWorld(true);
    const spine = group.getObjectByName("Spine_011");
    numberMesh.position.set(0, 1.28, -0.125);
    group.add(numberMesh);
    group.updateMatrixWorld(true);
    spine?.attach(numberMesh);
  }
  setAnimation(avatar: Avatar, name: string, actionTime = 0) {
    if (avatar.active === name) return;
    const next = avatar.actions.get(name) ?? avatar.actions.get("idle");
    const previous = avatar.actions.get(avatar.active);
    if (!next) return;
    const contact = ["pass", "shoot", "lob"].includes(name);
    const blend = contact ? 0.06 : 0.18;
    previous?.fadeOut(blend);
    next.reset().setEffectiveTimeScale(1).fadeIn(blend).play();
    if (contact && actionTime > 0) {
      // The engine emits these actions when the ball leaves the foot. Start
      // at impact and play the follow-through within its action window.
      next.time = next.getClip().duration * 0.55;
      next.timeScale = (next.getClip().duration - next.time) / actionTime;
    }
    avatar.active = name;
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
      if (!a) continue;
      a.group.visible = !p.red && !p.injured;
      this.shadowTransform.position.set(p.x, 0.025, p.z);
      this.shadowTransform.scale.setScalar(a.group.visible ? 1 : 0);
      this.shadowTransform.updateMatrix();
      this.contactShadows.setMatrixAt(i, this.shadowTransform.matrix);
      if (!a.group.visible) continue;
      a.group.position.set(p.x, 0, p.z);
      const distant =
        this.camera.position.distanceToSquared(a.group.position) > 24 * 24;
      for (const part of a.lod)
        part.mesh.geometry = distant ? part.far : part.near;
      let angle = p.facing - a.group.rotation.y;
      angle = Math.atan2(Math.sin(angle), Math.cos(angle));
      a.group.rotation.y += angle * Math.min(1, dt * 14);
      const speed = Math.hypot(p.vx, p.vz);
      const animation =
        p.action > 0
          ? p.actionKind
          : p.slot === 0 && speed < 0.8
            ? "gk_stance"
            : speed > 7.2
              ? "sprint"
              : speed > 2.5
                ? "jog"
                : speed > 0.2
                  ? "walk"
                  : "idle";
      this.setAnimation(a, animation, p.action);
      const active = a.actions.get(animation);
      if (active && ["walk", "jog", "sprint"].includes(animation))
        active.timeScale =
          animation === "walk"
            ? clamp(speed / 1.6, 0.35, 1.6)
            : animation === "jog"
              ? clamp(speed / 5.2, 0.72, 1.35)
              : clamp(speed / 8.2, 0.8, 1.35);
      a.mixer.update(dt);
    }
    this.contactShadows.instanceMatrix.needsUpdate = true;
    const b = match.ball;
    this.ball.position.set(b.x, b.y, b.z);
    this.ball.rotation.z -= b.vx * dt * 2;
    this.ball.rotation.x += b.vz * dt * 2;
    const p = match.controlled;
    this.marker.visible = !menu && !!p && !p.red;
    if (p) this.marker.position.set(p.x, 0.06, p.z);
    const mode = this.settings.camera;
    let pos: T.Vector3, target: T.Vector3, fov: number;
    if (menu) {
      pos = new T.Vector3(40 + Math.sin(this.frame * 0.025) * 8, 37, 53);
      target = new T.Vector3(2, 0, -4);
      fov = 43;
    } else if (match.phase === "goal") {
      const orbit = this.frame * 0.38;
      pos = new T.Vector3(
        b.x + Math.cos(orbit) * 13,
        7.5,
        b.z + Math.sin(orbit) * 13,
      );
      target = new T.Vector3(b.x, 1.1, b.z);
      fov = 38;
    } else if (match.phase === "restart" && match.restartLabel !== "KICK OFF") {
      const side = match.restartPos.z > 0 ? 1 : -1;
      pos = new T.Vector3(
        match.restartPos.x - match.direction(match.restartTeam) * 12,
        11,
        match.restartPos.z + side * 14,
      );
      target = new T.Vector3(
        match.restartPos.x + match.direction(match.restartTeam) * 7,
        0.6,
        match.restartPos.z - side * 2,
      );
      fov = 42;
    } else if (mode === "tactical") {
      pos = new T.Vector3(b.x * 0.12, 98, 0.1);
      target = new T.Vector3(b.x * 0.12, 0, b.z * 0.12);
      fov = 49;
    } else if (mode === "wide") {
      pos = new T.Vector3(b.x * 0.78, 34, b.z * 0.22 + 51);
      target = new T.Vector3(b.x * 0.82, 0.7, b.z * 0.68);
      fov = 43;
    } else if (mode === "dynamic") {
      const leadX = clamp(b.vx * 0.55, -8, 8);
      const leadZ = clamp(b.vz * 0.38, -5, 5);
      const pressure = Math.min(1, Math.abs(b.x) / 52.5);
      pos = new T.Vector3(
        b.x * 0.86 + leadX * 0.25,
        27 + pressure * 5,
        b.z * 0.36 + 43 - pressure * 5,
      );
      target = new T.Vector3(b.x + leadX, 1.1, b.z + leadZ);
      fov = 42 - pressure * 5;
    } else if (mode === "end-to-end") {
      const ownGoal = match.direction(0) === 1 ? -1 : 1;
      pos = new T.Vector3(ownGoal * 62, 17, b.z * 0.18);
      target = new T.Vector3(b.x * 0.72, 1.0, b.z * 0.72);
      fov = 47;
    } else if (mode === "player" && p) {
      const forwardX = Math.sin(p.facing);
      const forwardZ = Math.cos(p.facing);
      pos = new T.Vector3(p.x - forwardX * 7.2, 4.1, p.z - forwardZ * 7.2);
      target = new T.Vector3(p.x + forwardX * 5.5, 1.25, p.z + forwardZ * 5.5);
      fov = 55;
    } else {
      const mobile = this.camera.aspect < 1.1;
      pos = new T.Vector3(
        b.x * 0.65,
        mobile ? 77 : 58,
        b.z * 0.25 + (mobile ? 72 : 64),
      );
      target = new T.Vector3(b.x * 0.65, 0, b.z * 0.4);
      fov = mobile ? 48 : 43;
    }
    pos.x = clamp(pos.x, -66, 66);
    pos.y = clamp(pos.y, 3.2, 105);
    pos.z = clamp(pos.z, -78, 78);
    this.camera.position.lerp(pos, 1 - Math.exp(-dt * 3));
    this.target.lerp(target, 1 - Math.exp(-dt * 4));
    const nextFov =
      this.camera.fov + (fov - this.camera.fov) * (1 - Math.exp(-dt * 3));
    if (Math.abs(nextFov - this.camera.fov) > 0.01) {
      this.camera.fov = nextFov;
      this.camera.updateProjectionMatrix();
    }
    this.camera.lookAt(this.target);
    this.renderer.render(this.scene, this.camera);
  }
  dispose() {
    this.disposed = true;
    this.resize.disconnect();
    this.avatars.forEach((avatar) => {
      avatar.mixer.stopAllAction();
      avatar.lod.forEach(({ near, far }) => {
        near.dispose();
        far.dispose();
      });
    });
    this.scene.traverse((o) => {
      const m = o as T.Mesh;
      if (m.geometry) m.geometry.dispose();
      if (m.material) {
        for (const mat of Array.isArray(m.material) ? m.material : [m.material])
          mat.dispose();
      }
    });
    const textures = new Set<T.Texture>(this.textures);
    this.scene.traverse((object) => {
      const mesh = object as T.Mesh;
      if (!mesh.isMesh) return;
      for (const material of Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material])
        for (const value of Object.values(material))
          if (value instanceof T.Texture) textures.add(value);
    });
    textures.forEach((texture) => texture.dispose());
    this.characterError?.remove();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function appearanceVariation(id: string) {
  let hash = 2166136261;
  for (const character of id) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  const unit = (shift: number) => ((hash >>> shift) & 255) / 255;
  return {
    height: 0.94 + unit(0) * 0.12,
    build: 0.93 + unit(8) * 0.11,
    shorts: ["#111c1b", "#edf0df", "#20283a", "#281a1d"][
      Math.floor(unit(16) * 4)
    ],
    boots: ["#111312", "#eceadf", "#c68124", "#192942"][
      Math.floor(unit(20) * 4)
    ],
  };
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
