import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./style.css";
class Boundary extends React.Component<
  { children: React.ReactNode },
  { error: boolean }
> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <main className="fatal">
        <h1>Let’s get you back on the pitch.</h1>
        <p>
          The game hit an unexpected error. Your saved career is kept on this
          device.
        </p>
        <button onClick={() => location.reload()}>Reload game</button>
      </main>
    ) : (
      this.props.children
    );
  }
}
function LandscapeShell({ children }: { children: React.ReactNode }) {
  const [portrait, setPortrait] = React.useState(() =>
    window.matchMedia("(orientation: portrait)").matches,
  );
  React.useEffect(() => {
    const media = window.matchMedia("(orientation: portrait)");
    const update = () => setPortrait(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return <>
    <div id="game-surface" inert={portrait} aria-hidden={portrait || undefined}>{children}</div>
    {portrait && <section className="landscape-required" role="status">
      <div className="rotate-device" aria-hidden="true">↻</div>
      <p>WEB BALL</p>
      <h1>Rotate to play</h1>
      <p>Turn your device sideways. Web Ball plays in landscape.</p>
      <small>Your match stays paused until you resume.</small>
    </section>}
  </>;
}
createRoot(document.getElementById("root")!).render(
  <Boundary>
    <LandscapeShell><App /></LandscapeShell>
  </Boundary>,
);
