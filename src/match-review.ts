import { Stadium } from "./renderer";
import { Match } from "./engine";
import {
  CLUBS,
  DEFAULT_SETTINGS,
  roster,
  bestEleven,
  type Settings,
} from "./domain";
const teams = [CLUBS[0], CLUBS[1]] as const;
const players = teams.map((c) => {
  const all = roster(c);
  return bestEleven(all, "4-3-3").map((id) => all.find((p) => p.id === id)!);
});
const match = new Match(players[0], players[1], {
  ...DEFAULT_SETTINGS,
  quality: "low",
});
const stadium = new Stadium(
  document.querySelector("#match")!,
  match,
  [...teams],
  { ...DEFAULT_SETTINGS, quality: "low" },
);
function camera(mode: Settings["camera"]) {
  stadium.settings.camera = mode;
  const draw = stadium.renderer.render;
  stadium.renderer.render = () => {};
  for (let i = 0; i < 120; i++) stadium.render(1 / 30);
  stadium.renderer.render = draw;
  stadium.render(0);
  const info = stadium.renderer.info;
  return {
    mode,
    players: stadium.avatars.length,
    triangles: info.render.triangles,
    calls: info.render.calls,
    error: document.querySelector(".renderer-error")?.textContent,
  };
}
for (const mode of [
  "broadcast",
  "wide",
  "dynamic",
  "end-to-end",
  "tactical",
  "player",
] as const) {
  const b = document.createElement("button");
  b.textContent = mode;
  b.onclick = () => {
    camera(mode);
  };
  document.querySelector("#buttons")!.append(b);
}
const check = setInterval(() => {
  if (
    stadium.avatars.length === 22 &&
    stadium.scene.getObjectByName("SuppliedStadium")
  ) {
    clearInterval(check);
    const r = camera("broadcast");
    document.querySelector("#status")!.textContent =
      `${r.players} skinned players · ${r.triangles.toLocaleString()} triangles · ${r.calls} draws`;
    Object.assign(window, { matchReviewReady: true });
  }
}, 500);
Object.assign(window, {
  reviewCamera: camera,
  reviewStadium: stadium,
  reviewMatch: match,
});
