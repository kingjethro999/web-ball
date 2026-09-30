/** Small dependency-free Chrome DevTools smoke-check for Web Ball. */
import { mkdir, writeFile } from "node:fs/promises";

const steps = process.argv.slice(2);
const pages = await fetch("http://127.0.0.1:9222/json").then((response) =>
  response.json(),
);
const page = pages.find((entry) => entry.type === "page");
if (!page) throw new Error("No Chrome page is available on port 9222.");

const socket = new WebSocket(page.webSocketDebuggerUrl);
const pending = new Map();
const messages = [];
let nextId = 1;

socket.addEventListener("message", ({ data }) => {
  const message = JSON.parse(data);
  if (message.id && pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message));
    else resolve(message.result);
  }
  if (message.method === "Runtime.exceptionThrown") {
    const details = message.params.exceptionDetails;
    messages.push(
      `EXCEPTION ${details.exception?.description ?? details.text}`,
    );
  }
  if (message.method === "Log.entryAdded")
    messages.push(
      `${message.params.entry.level.toUpperCase()} ${message.params.entry.text}`,
    );
});

await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

function command(method, params = {}) {
  const id = nextId++;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

async function evaluate(expression) {
  const result = await command("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}

const wait = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

await command("Runtime.enable");
await command("Log.enable");
await command("Page.enable");
await mkdir("artifacts/runtime", { recursive: true });

for (let index = 0; index < steps.length; index++) {
  if (steps[index].startsWith("keys:")) {
    const [key, countText] = steps[index].slice(5).split(",");
    const code = JSON.stringify(key);
    const count = Math.max(1, Number(countText) || 1);
    for (let press = 0; press < count; press++) {
      await evaluate(
        `document.body.dispatchEvent(new KeyboardEvent('keydown', {code: ${code}, bubbles: true}))`,
      );
      await wait(150);
    }
    await wait(1600);
    const capture = await command("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: false,
    });
    await writeFile(
      `artifacts/runtime/step-${index + 1}.png`,
      Buffer.from(capture.data, "base64"),
    );
    continue;
  }
  if (steps[index].startsWith("key:")) {
    const code = JSON.stringify(steps[index].slice(4));
    await evaluate(
      `document.body.dispatchEvent(new KeyboardEvent('keydown', {code: ${code}, bubbles: true}))`,
    );
    await wait(1200);
    const capture = await command("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: false,
    });
    await writeFile(
      `artifacts/runtime/step-${index + 1}.png`,
      Buffer.from(capture.data, "base64"),
    );
    continue;
  }
  const text = JSON.stringify(steps[index]);
  const clicked = await evaluate(`(() => {
    const wanted = ${text}.toLowerCase();
    const controls = [...document.querySelectorAll('button, a')];
    const target = controls.find(
      (element) => element.textContent.trim().toLowerCase() === wanted,
    ) ?? controls.find(
      (element) => element.textContent.trim().toLowerCase().includes(wanted),
    );
    if (!target) return false;
    target.click();
    return true;
  })()`);
  if (!clicked)
    throw new Error(`Could not find control containing ${steps[index]}`);
  await wait(1200);
  const capture = await command("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
  });
  await writeFile(
    `artifacts/runtime/step-${index + 1}.png`,
    Buffer.from(capture.data, "base64"),
  );
}

await wait(2500);
const finalCapture = await command("Page.captureScreenshot", {
  format: "png",
  captureBeyondViewport: false,
});
await writeFile(
  "artifacts/runtime/final.png",
  Buffer.from(finalCapture.data, "base64"),
);
const state = await evaluate(`({
  buttons: [...document.querySelectorAll('button')].map((button) => button.textContent.trim()),
  text: document.body.innerText.slice(0, 3000),
  canvas: [...document.querySelectorAll('canvas')].map((canvas) => ({width: canvas.width, height: canvas.height})),
  rendererErrors: [...document.querySelectorAll('.renderer-error')].map((node) => node.textContent),
  savedSettings: localStorage.getItem('web-ball:settings'),
})`);
console.log(JSON.stringify({ messages, state }, null, 2));
socket.close();
