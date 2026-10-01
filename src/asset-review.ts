import * as T from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { BALL_RADIUS } from "./engine";
import { suppliedKit } from "./player-material";
const renderer = new T.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(1);
renderer.outputColorSpace = T.SRGBColorSpace;
renderer.toneMapping = T.ACESFilmicToneMapping;
document.body.append(renderer.domElement);
const scene = new T.Scene();
scene.background = new T.Color("#536267");
scene.add(new T.HemisphereLight(0xf0f6ff, 0x556145, 2));
const sun = new T.DirectionalLight(0xfff4df, 2.5);
sun.position.set(-3, 5, 4);
scene.add(sun);
const camera = new T.PerspectiveCamera(32, innerWidth / innerHeight, 0.01, 100);
camera.position.set(2, 1.3, 4);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0.85, 0);
controls.update();
const ground = new T.Mesh(
  new T.PlaneGeometry(30, 30),
  new T.MeshStandardMaterial({ color: 0x304b37, roughness: 1 }),
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.012;
ground.receiveShadow = true;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = T.PCFSoftShadowMap;
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, {
  left: -2,
  right: 2,
  top: 3,
  bottom: -1,
  near: 0.1,
  far: 15,
});
sun.shadow.normalBias = 0.015;
scene.add(ground);
const ball = new T.Mesh(
  new T.SphereGeometry(BALL_RADIUS, 24, 16),
  new T.MeshStandardMaterial({ color: 0xf1eddf, roughness: 0.75 }),
);
ball.position.set(0.6, BALL_RADIUS, 0.15);
ball.castShadow = true;
scene.add(ball);
const grid = new T.GridHelper(6, 12, 0x7e8c77, 0x526450);
grid.position.y = -0.01;
scene.add(grid);
const loader = new GLTFLoader();
const ready = Promise.all([
  loader.loadAsync("/assets/supplied/footballer.glb"),
  loader.loadAsync("/assets/supplied/football-actions.glb"),
]);
const [model, library] = await ready;
scene.add(model.scene);
model.scene.traverse((o) => {
  const m = o as T.Mesh;
  if (m.isMesh) {
    m.material = suppliedKit(m.material as T.Material, "#ffffff");
    m.frustumCulled = false;
    m.castShadow = true;
  }
});
const mixer = new T.AnimationMixer(model.scene);
const select = document.querySelector<HTMLSelectElement>("#clip")!;
for (const clip of [{ name: "rest" }, ...library.animations]) {
  const o = document.createElement("option");
  o.value = o.textContent = clip.name;
  select.append(o);
}
const time = document.querySelector<HTMLInputElement>("#time")!;
function render() {
  renderer.render(scene, camera);
}
function pose(name: string, fraction: number, view?: string) {
  mixer.stopAllAction();
  const clip = library.animations.find((a) => a.name === name);
  if (clip) {
    const action = mixer.clipAction(clip);
    action.play();
    mixer.setTime(clip.duration * fraction);
  } else if (name !== "rest") throw new Error(`Missing animation ${name}`);
  select.value = name;
  time.value = String(fraction);
  model.scene.updateMatrixWorld(true);
  const bounds = new T.Box3().setFromObject(model.scene, true);
  const center = bounds.getCenter(new T.Vector3());
  controls.target.copy(center);
  if (name.startsWith("gk_dive")) {
    camera.position.set(center.x, center.y + 0.3, 4.8);
  }
  if (view) {
    camera.position.set(
      ...((view === "side"
        ? [4, 1.1, 0]
        : view === "back"
          ? [0, 1.1, -4]
          : [0, 1.1, 4]) as [number, number, number]),
    );
    controls.update();
  }
  controls.update();
  render();
  document.querySelector("#status")!.textContent =
    `${name} · ${Math.round(fraction * 100)}% · ${renderer.info.render.triangles.toLocaleString()} triangles`;
  return {
    clip: name,
    time: (clip?.duration ?? 0) * fraction,
    bounds: { min: bounds.min.toArray(), max: bounds.max.toArray() },
    joints: Object.fromEntries(
      [
        "Hips_00",
        "Spine_011",
        "Head_021",
        "LeftArm_013",
        "RightArm_017",
        "LeftForeArm_014",
        "RightForeArm_018",
        "LeftHand_015",
        "RightHand_019",
        "LeftFoot_03",
        "RightFoot_07",
      ].map((n) => [
        n,
        model.scene
          .getObjectByName(n)!
          .getWorldPosition(new T.Vector3())
          .toArray(),
      ]),
    ),
    triangles: renderer.info.render.triangles,
  };
}
select.value = "idle";
select.onchange = () => pose(select.value, Number(time.value));
time.oninput = () => pose(select.value, Number(time.value));
for (const view of ["front", "side", "back"])
  document.querySelector<HTMLButtonElement>("#" + view)!.onclick = () =>
    pose(select.value, Number(time.value), view);
let colored = false;
document.querySelector<HTMLButtonElement>("#kit")!.onclick = () => {
  colored = !colored;
  model.scene.traverse((o) => {
    const m = o as T.Mesh;
    if (m.isMesh)
      m.material = suppliedKit(
        m.material as T.Material,
        colored ? "#248de0" : "#ffffff",
      );
  });
  render();
};
let playing = false,
  last = 0;
function animate(t: number) {
  if (!playing) return;
  if (last) mixer.update(Math.min(0.05, (t - last) / 1000));
  last = t;
  render();
  requestAnimationFrame(animate);
}
document.querySelector<HTMLButtonElement>("#play")!.onclick = () => {
  playing = !playing;
  last = 0;
  if (playing) requestAnimationFrame(animate);
};
controls.addEventListener("change", render);
Object.assign(window, {
  reviewPose: pose,
  reviewRecord: async (name: string, view: string, seconds = 4) => {
    playing = false;
    pose(name, 0, view);
    const stream = renderer.domElement.captureStream(30);
    const recorder = new MediaRecorder(stream, {
      mimeType: "video/webm",
      videoBitsPerSecond: 1400000,
    });
    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data);
    };
    const finished = new Promise<Blob>((resolve) => {
      recorder.onstop = () => resolve(new Blob(chunks, { type: "video/webm" }));
    });
    recorder.start();
    const start = performance.now();
    let previous = start;
    await new Promise<void>((resolve) => {
      const frame = (now: number) => {
        mixer.update(Math.min(0.06, (now - previous) / 1000));
        previous = now;
        render();
        if (now - start < seconds * 1000) requestAnimationFrame(frame);
        else resolve();
      };
      requestAnimationFrame(frame);
    });
    recorder.stop();
    const blob = await finished;
    stream.getTracks().forEach((track) => track.stop());
    const data = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",")[1]);
      reader.readAsDataURL(blob);
    });
    return { videoBase64: data, clip: name, view, seconds, bytes: blob.size };
  },
  reviewReady: true,
  reviewModel: model.scene,
  reviewBall: ball,
  reviewFocus: (part: string) => {
    const p = model.scene
      .getObjectByName(part)!
      .getWorldPosition(new T.Vector3());
    controls.target.copy(p);
    camera.position.copy(p).add(new T.Vector3(0.5, 0.15, 0.7));
    controls.update();
    render();
  },
});
pose("idle", 0);
