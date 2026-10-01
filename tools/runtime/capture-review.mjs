/** On-demand capture. No simulated wait loops or continuously running match. */
import { mkdir, writeFile } from "node:fs/promises";
const [label = "player", expression = "({ready:window.reviewReady})"] =
  process.argv.slice(2);
const pages = await fetch("http://127.0.0.1:9222/json").then((r) => r.json());
const page = pages.find(
  (p) =>
    p.type === "page" &&
    (!process.env.REVIEW_PAGE || p.url.includes(process.env.REVIEW_PAGE)),
);
if (!page) throw Error("No review page");
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => {
  ws.onopen = res;
  ws.onerror = rej;
});
let next = 1;
const pending = new Map();
const errors = [];
ws.onmessage = ({ data }) => {
  const m = JSON.parse(data);
  if (m.id) {
    const p = pending.get(m.id);
    if (p) {
      clearTimeout(p.timer);
      pending.delete(m.id);
      m.error ? p.reject(Error(m.error.message)) : p.resolve(m.result);
    }
  } else if (m.method === "Runtime.exceptionThrown") errors.push(m.params);
  else if (m.method === "Log.entryAdded" && m.params.entry.level === "error")
    errors.push(m.params.entry);
  else if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error")
    errors.push(m.params);
};
function cmd(method, params = {}) {
  const id = next++;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(Error("Timed out: " + method));
    }, 45000);
    pending.set(id, { resolve, reject, timer });
    ws.send(JSON.stringify({ id, method, params }));
  });
}
try {
  await cmd("Runtime.enable");
  await cmd("Log.enable");
  await cmd("Page.enable");
  await cmd("Page.bringToFront");
  if (expression === "reload") {
    await cmd("Page.reload");
    // Wait for the new document's assets, so the next capture cannot select
    // a stale duplicate tab while this page is still navigating.
    await new Promise((r) => setTimeout(r, 250));
    let ready = false;
    for (let attempt = 0; attempt < 60; attempt++) {
      try {
        const check = await cmd("Runtime.evaluate", {
          expression: page.url.includes("match-review")
            ? "!!window.matchReviewReady"
            : "!!window.reviewReady",
          returnByValue: true,
        });
        if (check.result.value) {
          ready = true;
          break;
        }
      } catch {
        // The execution context may be replaced during navigation.
      }
      await new Promise((r) => setTimeout(r, 250));
    }
    if (!ready) throw Error("Reloaded review assets did not become ready");
    console.log("Reloaded review assets are ready");
  } else {
    if (
      page.url.includes("asset-review") ||
      page.url.includes("match-review")
    ) {
      let ready = false;
      for (let attempt = 0; attempt < 60; attempt++) {
        const check = await cmd("Runtime.evaluate", {
          expression: page.url.includes("asset-review")
            ? "!!window.reviewReady"
            : "!!window.matchReviewReady",
          returnByValue: true,
        });
        if (check.result.value) {
          ready = true;
          break;
        }
        await new Promise((r) => setTimeout(r, 250));
      }
      if (!ready)
        throw Error("Review assets did not become ready within 15 seconds");
    }
    const result = await cmd("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (result.exceptionDetails)
      throw Error(JSON.stringify(result.exceptionDetails));
    await cmd("Runtime.evaluate", {
      expression:
        "new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))",
      awaitPromise: true,
    });
    const screenshot = await cmd("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: false,
    });
    await mkdir("artifacts/supplied-review/browser", { recursive: true });
    await writeFile(
      `artifacts/supplied-review/browser/${label}.png`,
      Buffer.from(screenshot.data, "base64"),
    );
    if (result.result.value?.videoBase64) {
      await writeFile(
        `artifacts/supplied-review/browser/${label}.webm`,
        Buffer.from(result.result.value.videoBase64, "base64"),
      );
      delete result.result.value.videoBase64;
    }
    await writeFile(
      `artifacts/supplied-review/browser/${label}.json`,
      JSON.stringify({ result: result.result.value, errors }, null, 2),
    );
    console.log(
      process.env.REVIEW_QUIET
        ? `${label}: captured; ${errors.length} exceptions`
        : JSON.stringify({ result: result.result.value, errors }, null, 2),
    );
  }
} finally {
  ws.close();
}
