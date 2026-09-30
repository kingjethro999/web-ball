import { emptyInput, type Input } from "./engine";
export class Controls {
  keys = new Set<string>();
  edges = new Set<string>();
  touch = { x: 0, z: 0, sprint: false };
  touchEdges = new Set<string>();
  padPrevious: boolean[] = [];
  connected = false;
  constructor(public pause: (force?: boolean) => void) {
    window.addEventListener("keydown", this.down);
    window.addEventListener("keyup", this.up);
    window.addEventListener("blur", this.blur);
    document.addEventListener("visibilitychange", this.visibility);
  }
  down = (e: KeyboardEvent) => {
    if (
      e.target instanceof Element &&
      e.target.matches("input,textarea,select")
    )
      return;
    const keys = [
      "KeyW",
      "KeyA",
      "KeyS",
      "KeyD",
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
      "KeyJ",
      "KeyK",
      "KeyL",
      "KeyE",
      "Space",
      "Escape",
      "ShiftLeft",
      "ShiftRight",
    ];
    if (!keys.includes(e.code)) return;
    e.preventDefault();
    if (!this.keys.has(e.code)) {
      this.edges.add(e.code);
      if (e.code === "Escape") this.pause();
    }
    this.keys.add(e.code);
  };
  up = (e: KeyboardEvent) => this.keys.delete(e.code);
  blur = () => {
    this.keys.clear();
    this.edges.clear();
    this.touchEdges.clear();
    this.touch = { x: 0, z: 0, sprint: false };
  };
  visibility = () => {
    if (document.hidden) {
      this.blur();
      this.pause(true);
    }
  };
  action(name: string) {
    this.touchEdges.add(name);
  }
  read(): Input {
    const input = emptyInput(),
      k = this.keys,
      e = this.edges;
    input.x =
      +(k.has("KeyD") || k.has("ArrowRight")) -
      +(k.has("KeyA") || k.has("ArrowLeft"));
    input.z =
      +(k.has("KeyS") || k.has("ArrowDown")) -
      +(k.has("KeyW") || k.has("ArrowUp"));
    input.sprint =
      k.has("ShiftLeft") || k.has("ShiftRight") || this.touch.sprint;
    input.pass = e.has("KeyJ") || this.touchEdges.has("pass");
    input.shoot = e.has("KeyK") || this.touchEdges.has("shoot");
    input.lob = e.has("KeyL") || this.touchEdges.has("lob");
    input.switch = e.has("Space") || this.touchEdges.has("switch");
    input.tackle = e.has("KeyE") || this.touchEdges.has("tackle");
    if (Math.hypot(this.touch.x, this.touch.z) > 0.1) {
      input.x = this.touch.x;
      input.z = this.touch.z;
    }
    const pad = Array.from(navigator.getGamepads?.() ?? []).find(Boolean);
    this.connected = !!pad;
    if (pad) {
      const x = pad.axes[0] ?? 0,
        z = pad.axes[1] ?? 0;
      if (Math.hypot(x, z) > 0.18) {
        input.x = x;
        input.z = z;
      }
      if (pad.buttons[12]?.pressed) input.z = -1;
      if (pad.buttons[13]?.pressed) input.z = 1;
      if (pad.buttons[14]?.pressed) input.x = -1;
      if (pad.buttons[15]?.pressed) input.x = 1;
      const pressed = pad.buttons.map((b) => b.pressed);
      const edge = (i: number) => pressed[i] && !this.padPrevious[i];
      input.pass ||= edge(0);
      input.shoot ||= edge(1);
      input.lob ||= edge(2);
      input.switch ||= edge(3);
      input.tackle ||= edge(6);
      input.sprint ||= pressed[5];
      if (edge(9)) this.pause();
      this.padPrevious = pressed;
    }
    const magnitude = Math.hypot(input.x, input.z);
    if (magnitude > 1) {
      input.x /= magnitude;
      input.z /= magnitude;
    }
    this.edges.clear();
    this.touchEdges.clear();
    return input;
  }
  dispose() {
    window.removeEventListener("keydown", this.down);
    window.removeEventListener("keyup", this.up);
    window.removeEventListener("blur", this.blur);
    document.removeEventListener("visibilitychange", this.visibility);
  }
}
export class Sound {
  context: AudioContext | null = null;
  enabled = true;
  unlock() {
    if (!this.context) this.context = new AudioContext();
    void this.context.resume();
  }
  tone(hz: number, length = 0.08, volume = 0.035) {
    if (!this.enabled || !this.context) return;
    const c = this.context,
      o = c.createOscillator(),
      g = c.createGain();
    o.frequency.value = hz;
    o.type = "sine";
    g.gain.setValueAtTime(volume, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + length);
    o.connect(g);
    g.connect(c.destination);
    o.start();
    o.stop(c.currentTime + length);
  }
  whistle() {
    this.tone(1800, 0.3, 0.025);
  }
  goal() {
    this.tone(440, 0.35);
    setTimeout(() => this.tone(554, 0.35), 120);
    setTimeout(() => this.tone(659, 0.7), 240);
  }
  dispose() {
    void this.context?.close();
  }
}
