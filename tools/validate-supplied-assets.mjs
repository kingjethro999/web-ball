import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
async function glb(name) {
  const b = await readFile(`public/assets/supplied/${name}.glb`);
  assert.equal(b.readUInt32LE(0), 0x46546c67);
  assert.equal(b.readUInt32LE(4), 2);
  assert.equal(b.readUInt32LE(8), b.length);
  return JSON.parse(b.toString("utf8", 20, 20 + b.readUInt32LE(12)));
}
const [player, actions, stadium, distant] = await Promise.all(
  ["footballer", "football-actions", "stadium", "footballer-match"].map(glb),
);
assert.deepEqual(
  distant.skins[0].joints.map((i) => distant.nodes[i].name),
  player.skins[0].joints.map((i) => player.nodes[i].name),
  "Distance geometry must use identical joint indices",
);
assert.equal(distant.meshes.length, player.meshes.length);
assert.equal(player.skins.length, 1);
assert.equal(player.skins[0].joints.length, 25);
const bones = new Set(player.skins[0].joints.map((i) => player.nodes[i].name));
let triangles = 0;
for (const mesh of player.meshes)
  for (const p of mesh.primitives) {
    for (const name of [
      "POSITION",
      "NORMAL",
      "TEXCOORD_0",
      "COLOR_1",
      "JOINTS_0",
      "WEIGHTS_0",
    ])
      assert(name in p.attributes, `Missing ${name}`);
    triangles += player.accessors[p.indices].count / 3;
  }
assert(triangles < 40000);
const required = [
  "idle",
  "walk",
  "jog",
  "sprint",
  "turn",
  "pass",
  "shoot",
  "lob",
  "tackle",
  "slide",
  "header",
  "celebrate",
  "dejected",
  "gk_stance",
  "gk_dive_left",
  "gk_dive_right",
  "gk_catch",
  "gk_punt",
  "referee_signal",
];
assert.deepEqual(actions.animations.map((a) => a.name).sort(), required.sort());
for (const a of actions.animations) {
  assert(a.channels.length > 0);
  for (const c of a.channels) {
    assert(
      bones.has(actions.nodes[c.target.node].name),
      `Unbound ${a.name}: ${actions.nodes[c.target.node].name}`,
    );
    assert(actions.accessors[a.samplers[c.sampler].input].count > 1);
  }
}
assert(stadium.extensionsRequired.includes("KHR_draco_mesh_compression"));
assert(
  stadium.materials.every((m) => m.pbrMetallicRoughness),
  "Legacy materials must be converted to PBR",
);
console.log(
  JSON.stringify(
    {
      playerTriangles: triangles,
      skinJoints: bones.size,
      animations: required.length,
      stadiumMeshes: stadium.meshes.length,
    },
    null,
    2,
  ),
);
