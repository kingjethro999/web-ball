import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
  type CSSProperties,
} from "react";
import {
  ArrowUpRight,
  ArrowRight,
  ArrowLeft,
  Play,
  Shield,
  Trophy,
  Users,
  ShoppingBag,
  Settings as Gear,
  Coins,
  Gamepad2,
  ChevronRight,
  Check,
  X,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  RotateCcw,
  Activity,
  Star,
  SlidersHorizontal,
  LogIn,
  Cloud,
  CheckCircle,
  Info,
  Keyboard,
  MousePointer2,
  UserRound,
  Lock,
  Shuffle,
} from "lucide-react";
import {
  CLUBS,
  FORMATIONS,
  SHAPES,
  STAT_LABELS,
  DEFAULT_SETTINGS,
  CAMERA_MODES,
  newCareer,
  roster,
  overall,
  available,
  bestEleven,
  upgrade,
  upgradeCost,
  buy,
  price,
  sortTable,
  finishMatch,
  nextSeason,
  type Career,
  type Settings,
  type Player,
  type Stat,
  type Club,
} from "./domain";
import { Match, matchId, emptyInput, type Input } from "./engine";
import { createStadium, type StadiumView } from "./renderer";
import { Controls, Sound } from "./input";
import { loadCareer, saveCareer, loadSettings, api } from "./storage";
type Page = "play" | "career" | "squad" | "market" | "league";
const CAMERA_LABELS: Record<Settings["camera"], string> = {
  broadcast: "Broadcast / Tele",
  wide: "Wide sideline",
  dynamic: "Dynamic / Cinematic",
  "end-to-end": "End-to-end",
  tactical: "Top-down / Tactical",
  player: "Player cam",
};
type Game = {
  match: Match;
  clubs: [Club, Club];
  career: boolean;
  bench: Player[];
};
const initial = loadCareer();
function Badge({ club, size = 46 }: { club: Club; size?: number }) {
  return (
    <div
      className="crest"
      style={
        {
          "--club": club.color,
          width: size,
          height: size * 1.1,
        } as CSSProperties
      }
    >
      <Shield size={size * 0.82} strokeWidth={1.2} />
      <b style={{ fontSize: size * 0.22 }}>{club.short}</b>
    </div>
  );
}
function Button({
  children,
  onClick,
  secondary = false,
  disabled = false,
  className = "",
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  secondary?: boolean;
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={`button ${secondary ? "secondary" : ""} ${className}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
function Modal({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current!;
    d.showModal();
    return () => d.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className={`modal ${wide ? "wide" : ""}`}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div className="modal-head">
        <h2>{title}</h2>
        <button
          aria-label="Close dialog"
          className="icon-button"
          onClick={onClose}
        >
          <X />
        </button>
      </div>
      {children}
    </dialog>
  );
}
function Label({ children }: { children: ReactNode }) {
  return <div className="eyebrow">{children}</div>;
}
function ClubSelect({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (n: number) => void;
  label: string;
}) {
  return (
    <label className="field">
      {label}
      <select value={value} onChange={(e) => onChange(Number(e.target.value))}>
        {CLUBS.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </label>
  );
}
export default function App() {
  const [career, setCareer] = useState<Career>(initial.career),
    [settings, setSettings] = useState<Settings>(loadSettings),
    [page, setPage] = useState<Page>("play"),
    [game, setGame] = useState<Game | null>(null),
    [modal, setModal] = useState<
      "settings" | "controls" | "exhibition" | "profile" | "auth" | null
    >(null),
    [toast, setToast] = useState(initial.warning ?? ""),
    [auth, setAuth] = useState<{ name: string; email: string } | null>(null),
    [cloudRevision, setCloudRevision] = useState(0),
    [cloudBusy, setCloudBusy] = useState(false);
  const club = CLUBS[career.club],
    fixture = career.fixtures[career.round]?.find(
      (f) => f.home === career.club || f.away === career.club,
    ),
    opponent = fixture
      ? CLUBS[fixture.home === career.club ? fixture.away : fixture.home]
      : CLUBS[1],
    table = sortTable(career.table),
    rank = table.findIndex((t) => t.club === career.club) + 1;
  const notify = useCallback((message: string) => setToast(message), []);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(""), 5500);
      return () => clearTimeout(t);
    }
  }, [toast]);
  useEffect(() => {
    try {
      saveCareer(career);
    } catch {
      setToast(
        "Device storage is full or unavailable. Your current progress could not be saved.",
      );
    }
  }, [career]);
  useEffect(() => {
    try {
      localStorage.setItem("web-ball:settings", JSON.stringify(settings));
    } catch {}
  }, [settings]);
  useEffect(() => {
    api("/me")
      .then((r) => {
        setAuth(r.user);
        setCloudRevision(r.revision ?? 0);
      })
      .catch(() => {});
  }, []);
  function change(fn: (c: Career) => Career) {
    try {
      setCareer(fn(career));
    } catch (e) {
      notify((e as Error).message);
    }
  }
  function startCareer() {
    if (!fixture) {
      setPage("career");
      return;
    }
    if (
      career.lineup.some(
        (id) => !available(career.players.find((p) => p.id === id)!),
      )
    ) {
      notify(
        "Your XI includes an unavailable player. Choose Best XI in Squad.",
      );
      setPage("squad");
      return;
    }
    if (
      career.players.find((p) => p.id === career.lineup[0])?.position !== "GK"
    ) {
      notify("Choose a goalkeeper in the GK slot.");
      setPage("squad");
      return;
    }
    const away = roster(opponent),
      awayIds = bestEleven(away, "4-3-3");
    setGame({
      match: new Match(
        career.lineup.map((id) => career.players.find((p) => p.id === id)!),
        awayIds.map((id) => away.find((p) => p.id === id)!),
        settings,
        career.formation,
        `s${career.season}-r${career.round}-${matchId()}`,
      ),
      clubs: [club, opponent],
      career: true,
      bench: career.bench.map((id) => career.players.find((p) => p.id === id)!),
    });
  }
  function startExhibition(home: number, away: number) {
    const h = roster(CLUBS[home]),
      a = roster(CLUBS[away]),
      hi = bestEleven(h, "4-3-3"),
      ai = bestEleven(a, "4-3-3");
    setGame({
      match: new Match(
        hi.map((id) => h.find((p) => p.id === id)!),
        ai.map((id) => a.find((p) => p.id === id)!),
        settings,
      ),
      clubs: [CLUBS[home], CLUBS[away]],
      career: false,
      bench: h.filter((p) => !hi.includes(p.id)).slice(0, 7),
    });
    setModal(null);
  }
  async function cloudSave() {
    setCloudBusy(true);
    try {
      const result = await api(
        "/save",
        { career, revision: cloudRevision },
        "PUT",
      );
      setCloudRevision(result.revision);
      notify("Career saved to your account.");
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setCloudBusy(false);
    }
  }
  async function cloudLoad() {
    setCloudBusy(true);
    try {
      const r = await api("/save");
      if (r.career) {
        setCareer(r.career);
        setCloudRevision(r.revision);
        notify("Account career loaded. A device backup was retained.");
      } else notify("There is no account save yet. Save this career first.");
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setCloudBusy(false);
    }
  }
  if (game)
    return (
      <>
        <MatchScreen
          game={game}
          settings={settings}
          updateSettings={setSettings}
          notify={notify}
          onExit={(completed) => {
            if (completed && game.career)
              change((c) => finishMatch(c, game.match.result()));
            setGame(null);
            setPage(game.career ? "career" : "play");
          }}
        />
        {toast && (
          <div className="toast" role="status">
            <Info size={18} />
            {toast}
          </div>
        )}
      </>
    );
  return (
    <div className="app-shell">
      <header className="topbar">
        <button
          className="brand"
          onClick={() => setPage("play")}
          aria-label="Web Ball home"
        >
          <span className="brand-mark">
            W<span>•</span>
          </span>
          WEB<span className="brand-light">BALL</span>
        </button>
        <div className="top-season">
          THE AURORA LEAGUE{" "}
          <span>SEASON {String(career.season).padStart(2, "0")}</span>
        </div>
        <div className="top-right">
          <div className="wallet">
            <Coins size={18} />
            <b>{career.coins.toLocaleString()}</b>
            <span>COINS</span>
          </div>
          <button
            className="profile-button"
            onClick={() => setModal(auth ? "profile" : "auth")}
          >
            <UserRound size={19} />
            <span>{auth?.name ?? "Guest manager"}</span>
          </button>
          <button
            className="icon-button"
            aria-label="Game settings"
            onClick={() => setModal("settings")}
          >
            <Gear size={21} />
          </button>
        </div>
      </header>
      <nav className="main-nav" aria-label="Main navigation">
        {(
          [
            ["play", "Play", Play],
            ["career", "My career", Trophy],
            ["squad", "Squad", Users],
            ["market", "Transfer market", ShoppingBag],
            ["league", "League", Shield],
          ] as const
        ).map(([id, title, Icon]) => (
          <button
            key={id}
            className={page === id ? "active" : ""}
            onClick={() => setPage(id)}
          >
            <Icon size={17} />
            {title}
          </button>
        ))}
        <button className="help-nav" onClick={() => setModal("controls")}>
          <Gamepad2 size={18} />
          <span>How to play</span>
        </button>
      </nav>
      <main className="main-content">
        {page === "play" && (
          <>
            <div className="page-kicker">
              <span>THE BEAUTIFUL GAME. YOUR WAY.</span>
              <span className="subtle">01 / MATCHDAY</span>
            </div>
            <section className="home-hero">
              <MenuStadium settings={settings} />
              <div className="hero-shade" />
              <div className="hero-copy">
                <Label>
                  <span className="small-line" /> WELCOME TO WEB BALL
                </Label>
                <h1>
                  YOUR CLUB.
                  <br />
                  YOUR <em>LEGACY.</em>
                </h1>
                <p>
                  From the first whistle to the title race.
                  <br />
                  Make every match count.
                </p>
                <Button onClick={startCareer}>
                  Continue career <ArrowUpRight size={20} />
                </Button>
                <button
                  className="hero-link"
                  onClick={() => setModal("exhibition")}
                >
                  Just here for a match?{" "}
                  <span>
                    Play exhibition <ArrowRight size={16} />
                  </span>
                </button>
              </div>
              <div className="stadium-label">
                <span className="live-dot" /> AURORA PARK{" "}
                <span>18:30 · CLEAR SKIES</span>
              </div>
              <div className="hero-edition">
                11 v 11
                <br />
                <span>ALL TO PLAY FOR</span>
              </div>
            </section>
            <section className="mode-grid">
              <button
                className="mode-card career-card"
                onClick={() => setPage("career")}
              >
                <div className="mode-icon">
                  <Trophy size={25} />
                </div>
                <div>
                  <Label>BUILD SOMETHING GREAT</Label>
                  <h3>Career mode</h3>
                  <p>Your squad. Your season. Your story.</p>
                </div>
                <ArrowUpRight className="mode-arrow" />
              </button>
              <button
                className="mode-card"
                onClick={() => setModal("exhibition")}
              >
                <div className="mode-icon">
                  <Play size={25} />
                </div>
                <div>
                  <Label>STRAIGHT TO THE ACTION</Label>
                  <h3>Exhibition</h3>
                  <p>Choose your clubs. Take the pitch.</p>
                </div>
                <ArrowUpRight className="mode-arrow" />
              </button>
              <div className="mode-card locked">
                <div className="mode-icon">
                  <Gamepad2 size={25} />
                </div>
                <div>
                  <Label>BETTER WITH RIVALS</Label>
                  <h3>
                    Multiplayer <span className="pill">Coming soon</span>
                  </h3>
                  <p>A new kind of rivalry is on its way.</p>
                </div>
                <Lock size={18} className="mode-arrow" />
              </div>
            </section>
            <section className="home-bottom">
              <div className="next-fixture">
                <div>
                  <Label>YOUR NEXT FIXTURE</Label>
                  <span>Matchday {Math.min(30, career.round + 1)} / 30</span>
                </div>
                <div className="mini-versus">
                  <Badge club={club} size={29} />
                  <b>{club.short}</b>
                  <span>VS</span>
                  <b>{opponent.short}</b>
                  <Badge club={opponent} size={29} />
                </div>
                <button
                  className="text-button"
                  onClick={() => setPage("career")}
                >
                  Match centre <ChevronRight size={17} />
                </button>
              </div>
              <div className="input-ready">
                <Keyboard size={21} />
                <Gamepad2 size={23} />
                <MousePointer2 size={20} />
                <div>
                  <strong>Play your way</strong>
                  <span>Keyboard, controller or touch</span>
                </div>
              </div>
            </section>
          </>
        )}
        {page === "career" && (
          <>
            <PageTitle
              eyebrow={`SEASON ${String(career.season).padStart(2, "0")} / CAREER`}
              title="The season is yours."
              text={`Welcome back, ${career.manager}.`}
            />
            <div className="career-layout">
              <section className="panel fixture-panel">
                <div className="panel-heading">
                  <Label>{fixture ? "NEXT MATCH" : "SEASON COMPLETE"}</Label>
                  <span className="pill">
                    {fixture ? `MATCHDAY ${career.round + 1}` : "FULL TIME"}
                  </span>
                </div>
                <div className="big-versus">
                  <div>
                    <Badge club={club} size={90} />
                    <h3>{club.name}</h3>
                    <span>{fixture?.home === club.id ? "HOME" : "AWAY"}</span>
                  </div>
                  <span className="vs">VS</span>
                  <div>
                    <Badge club={opponent} size={90} />
                    <h3>{opponent.name}</h3>
                    <span>AI · {settings.difficulty.toUpperCase()}</span>
                  </div>
                </div>
                <p className="fixture-note">
                  {fixture
                    ? `${fixture.home === club.id ? club.city : opponent.city} Stadium · ${settings.duration / 60} minute match`
                    : `Finished ${rank}${rank === 1 ? "st" : rank === 2 ? "nd" : rank === 3 ? "rd" : "th"} · season bonus: ${(16 - rank + 1) * 200} coins`}
                </p>
                <Button
                  onClick={fixture ? startCareer : () => change(nextSeason)}
                >
                  {fixture ? "Play next match" : "Begin next season"}{" "}
                  <ArrowRight size={18} />
                </Button>
                <button
                  className="text-button"
                  onClick={() => setPage("squad")}
                >
                  Review game plan <SlidersHorizontal size={16} />
                </button>
              </section>
              <div className="career-side">
                <div className="stat-grid">
                  <Metric value={`#${rank}`} label="LEAGUE POSITION" />
                  <Metric
                    value={String(
                      career.table.find((t) => t.club === club.id)!.points,
                    )}
                    label="POINTS"
                  />
                  <Metric
                    value={String(
                      Math.round(
                        career.lineup.reduce(
                          (n, id) =>
                            n +
                            overall(career.players.find((p) => p.id === id)!),
                          0,
                        ) / 11,
                      ),
                    )}
                    label="SQUAD RATING"
                  />
                  <Metric value={career.formation} label="FORMATION" />
                </div>
                <section className="panel">
                  <div className="panel-heading">
                    <h3>Club room</h3>
                    <Badge club={club} size={30} />
                  </div>
                  <p className="muted">
                    {career.players.filter((p) => !available(p)).length
                      ? `${career.players.filter((p) => !available(p)).length} players unavailable. Check your squad before kick-off.`
                      : "Your squad is fit and ready for the next challenge."}
                  </p>
                  <div className="rule-line">
                    <Coins size={17} />
                    <span>250 appearance + 450 win + 50 per goal</span>
                  </div>
                  <Button secondary onClick={() => setPage("market")}>
                    Scout the market <ArrowUpRight size={17} />
                  </Button>
                </section>
              </div>
            </div>
            <div className="section-heading">
              <h2>Recent form</h2>
              <span className="muted">Every match builds your story</span>
            </div>
            <div className="results-list">
              {career.history.length ? (
                career.history.slice(0, 5).map((h) => (
                  <div className="result-row" key={h.id}>
                    <span
                      className={`result-letter ${h.score[0] > h.score[1] ? "win" : h.score[0] === h.score[1] ? "draw" : "loss"}`}
                    >
                      {h.score[0] > h.score[1]
                        ? "W"
                        : h.score[0] === h.score[1]
                          ? "D"
                          : "L"}
                    </span>
                    <b>{club.short}</b>
                    <strong>{h.score.join(" – ")}</strong>
                    <Badge club={CLUBS[h.opponent]} size={24} />
                    <span>{CLUBS[h.opponent].name}</span>
                    <span className="reward">+{h.coins} coins</span>
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  <Trophy />
                  <h3>A fresh start.</h3>
                  <p>
                    Your results will appear here after your first career match.
                  </p>
                </div>
              )}
            </div>
          </>
        )}
        {page === "squad" && (
          <Squad career={career} change={change} notify={notify} />
        )}
        {page === "market" && (
          <Market career={career} change={change} notify={notify} />
        )}
        {page === "league" && <League career={career} />}
      </main>
      <footer className="footer">
        <span>
          <span className="status-dot" />
          {auth ? "ACCOUNT CONNECTED" : "GUEST CAREER · SAVED ON THIS DEVICE"}
        </span>
        <span>ORIGINAL CLUBS. UNLIMITED AMBITION.</span>
        <button onClick={() => setModal("profile")}>
          Manager profile <ArrowUpRight size={13} />
        </button>
      </footer>
      {modal === "settings" && (
        <Modal title="Game settings" onClose={() => setModal(null)}>
          <SettingsPanel settings={settings} onChange={setSettings} />
        </Modal>
      )}
      {modal === "controls" && (
        <Modal title="Make the pitch yours" onClose={() => setModal(null)} wide>
          <ControlsGuide />
        </Modal>
      )}
      {modal === "exhibition" && (
        <Exhibition onClose={() => setModal(null)} onPlay={startExhibition} />
      )}
      {modal === "profile" && (
        <Modal title="Manager profile" onClose={() => setModal(null)}>
          <label className="field">
            Manager name
            <input
              maxLength={40}
              value={career.manager}
              onChange={(e) =>
                setCareer({ ...career, manager: e.target.value || "Manager" })
              }
            />
          </label>
          <p className="muted">
            Guest careers stay in this browser. Clearing browser data removes
            local saves.
          </p>
          {auth ? (
            <>
              <p>
                Signed in as <strong>{auth.email}</strong>
              </p>
              <div className="button-row">
                <Button disabled={cloudBusy} onClick={cloudSave}>
                  <Cloud size={18} />
                  Save to account
                </Button>
                <Button secondary disabled={cloudBusy} onClick={cloudLoad}>
                  Load account save
                </Button>
              </div>
              <button
                className="text-button"
                onClick={async () => {
                  try {
                    await api("/logout", {});
                    setAuth(null);
                    notify(
                      "Signed out. Your device career is still available.",
                    );
                  } catch (e) {
                    notify((e as Error).message);
                  }
                }}
              >
                Sign out
              </button>
            </>
          ) : (
            <Button onClick={() => setModal("auth")}>
              <LogIn size={18} />
              Connect an account
            </Button>
          )}
          <p className="fine-print">
            Cloud saves are manual so a guest career never silently replaces an
            existing account career.
          </p>
        </Modal>
      )}
      {modal === "auth" && (
        <AuthModal
          onClose={() => setModal(null)}
          onDone={(user, revision) => {
            setAuth(user);
            setCloudRevision(revision);
            setModal("profile");
            notify("Account connected. Choose Save or Load in your profile.");
          }}
        />
      )}
      {toast && (
        <div className="toast" role="status">
          <Info size={18} />
          {toast}
        </div>
      )}
    </div>
  );
}
function MenuStadium({ settings }: { settings: Settings }) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let stadium: StadiumView, frame: number;
    try {
      const h = roster(CLUBS[0]),
        a = roster(CLUBS[1]);
      const m = new Match(h.slice(0, 11), a.slice(0, 11), settings);
      stadium = createStadium(ref.current!, m, [CLUBS[0], CLUBS[1]], settings);
      let prev = performance.now();
      const run = (now: number) => {
        stadium.render(Math.min((now - prev) / 1000, 0.05), true);
        prev = now;
        frame = requestAnimationFrame(run);
      };
      frame = requestAnimationFrame(run);
    } catch {
      setError("3D preview unavailable. Enable hardware acceleration to play.");
    }
    return () => {
      cancelAnimationFrame(frame);
      stadium?.dispose();
    };
  }, [settings.quality]);
  return (
    <div ref={ref} className="menu-stadium">
      {error && <p className="renderer-error">{error}</p>}
    </div>
  );
}
function PageTitle({
  eyebrow,
  title,
  text,
}: {
  eyebrow: string;
  title: string;
  text?: string;
}) {
  return (
    <div className="page-title">
      <Label>{eyebrow}</Label>
      <h1>{title}</h1>
      {text && <p>{text}</p>}
    </div>
  );
}
function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="metric">
      <strong>{value}</strong>
      <Label>{label}</Label>
    </div>
  );
}
function PlayerName({ player }: { player: Player }) {
  return (
    <>
      <strong>{player.name}</strong>
      <span>
        {player.position} · {player.age} years
        {player.injury
          ? ` · Injured (${player.injury})`
          : player.suspension
            ? ` · Suspended (${player.suspension})`
            : ""}
      </span>
    </>
  );
}
function Squad({
  career,
  change,
  notify,
}: {
  career: Career;
  change: (fn: (c: Career) => Career) => void;
  notify: (s: string) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null),
    [detail, setDetail] = useState<string | null>(null),
    [section, setSection] = useState<"bench" | "reserves">("bench");
  const p = career.players.find((x) => x.id === detail),
    club = CLUBS[career.club];
  function select(id: string) {
    if (!selected) {
      setSelected(id);
      return;
    }
    if (selected === id) {
      setSelected(null);
      setDetail(id);
      return;
    }
    const a = career.players.find((p) => p.id === selected)!,
      b = career.players.find((p) => p.id === id)!;
    if (!available(a) || !available(b)) {
      notify("Unavailable players cannot be put into the match squad.");
      setSelected(null);
      return;
    }
    const gkSwap = career.lineup[0] === selected || career.lineup[0] === id;
    if (gkSwap && (a.position !== "GK" || b.position !== "GK")) {
      notify("The goalkeeper slot needs a goalkeeper.");
      setSelected(null);
      return;
    }
    change((c) => ({
      ...c,
      lineup: c.lineup.map((x) =>
        x === selected ? id : x === id ? selected : x,
      ),
      bench: c.bench.map((x) =>
        x === selected ? id : x === id ? selected : x,
      ),
    }));
    setSelected(null);
  }
  function auto(formation = career.formation) {
    change((c) => {
      const lineup = bestEleven(c.players, formation);
      return {
        ...c,
        formation,
        lineup,
        bench: c.players
          .filter((p) => available(p) && !lineup.includes(p.id))
          .slice(0, 7)
          .map((p) => p.id),
      };
    });
  }
  const remaining = career.players.filter(
    (p) =>
      !career.lineup.includes(p.id) &&
      (section === "bench"
        ? career.bench.includes(p.id)
        : !career.bench.includes(p.id)),
  );
  return (
    <>
      <PageTitle
        eyebrow="THE DRESSING ROOM"
        title="Built to play your way."
        text="Choose a player, then another to swap. Choose the same player twice to inspect and upgrade."
      />
      <div className="squad-toolbar">
        <label className="inline-field">
          Formation
          <select
            value={career.formation}
            onChange={(e) => auto(e.target.value)}
          >
            {Object.keys(FORMATIONS).map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
        </label>
        <Button secondary onClick={() => auto()}>
          <Star size={17} />
          Pick best XI
        </Button>
        <span className="muted">
          {selected
            ? "Choose another player to swap"
            : "11 starters · 7 substitutes · reserves"}
        </span>
      </div>
      <div className="squad-layout">
        <div className="formation-pitch">
          <div className="pitch-half" />
          <div className="pitch-circle" />
          <div className="pitch-box top" />
          <div className="pitch-box bottom" />
          {career.lineup.map((id, i) => {
            const p = career.players.find((p) => p.id === id)!;
            const [y, x] = SHAPES[career.formation][i];
            return (
              <button
                className={`pitch-player ${selected === id ? "selected" : ""} ${!available(p) ? "unavailable" : ""}`}
                style={
                  {
                    left: `${8 + x * 84}%`,
                    top: `${91 - y * 99}%`,
                    "--club": club.color,
                  } as CSSProperties
                }
                key={id}
                onClick={() => select(id)}
                aria-label={`${p.name}, ${FORMATIONS[career.formation][i]}, rating ${overall(p)}`}
              >
                <span className="player-shirt">
                  <span>{i + 1}</span>
                </span>
                <b>{p.name.split(" ").slice(1).join(" ")}</b>
                <span className="position-rating">
                  {FORMATIONS[career.formation][i]}{" "}
                  <strong>{overall(p)}</strong>
                </span>
                {!available(p) && (
                  <span className="unavailable-label">UNAVAILABLE</span>
                )}
              </button>
            );
          })}
        </div>
        <div className="squad-list panel">
          <div className="segment">
            <button
              className={section === "bench" ? "active" : ""}
              onClick={() => setSection("bench")}
            >
              Substitutes <span>{career.bench.length}</span>
            </button>
            <button
              className={section === "reserves" ? "active" : ""}
              onClick={() => setSection("reserves")}
            >
              Reserves{" "}
              <span>{career.players.length - 11 - career.bench.length}</span>
            </button>
          </div>
          {remaining.map((p) => (
            <div
              key={p.id}
              className={`squad-row ${selected === p.id ? "selected" : ""}`}
            >
              <button
                className="squad-player-select"
                onClick={() => select(p.id)}
              >
                <span className="rating-box">{overall(p)}</span>
                <span className="player-name">
                  <PlayerName player={p} />
                </span>
              </button>
              <div className="condition">
                <span>{Math.round(p.fitness)}%</span>
                <div>
                  <i style={{ width: `${p.fitness}%` }} />
                </div>
              </div>
              <button
                className="icon-button"
                aria-label={`Inspect ${p.name}`}
                onClick={() => setDetail(p.id)}
              >
                <ChevronRight size={17} />
              </button>
            </div>
          ))}
          {!remaining.length && <p className="muted">No players here.</p>}
          <p className="fine-print">
            Five substitutions per match. Red cards mean a suspension; five
            accumulated yellows mean one match out.
          </p>
        </div>
      </div>
      <div className="section-heading">
        <h2>First-team development</h2>
        <span className="muted">
          A maximum of 10 attribute points per player
        </span>
      </div>
      <div className="development-grid">
        {career.lineup.map((id) => {
          const p = career.players.find((p) => p.id === id)!;
          return (
            <button
              className="development-card"
              key={id}
              onClick={() => setDetail(id)}
            >
              <span className="rating-box">{overall(p)}</span>
              <span className="player-name">
                <PlayerName player={p} />
              </span>
              <span className="muted">
                {p.upgrades}/10 <ChevronRight size={16} />
              </span>
            </button>
          );
        })}
      </div>
      {p && (
        <Modal title={p.name} onClose={() => setDetail(null)}>
          <div className="player-modal-summary">
            <span className="overall-big">
              {overall(p)}
              <small>OVERALL</small>
            </span>
            <div>
              <Label>
                {p.position} · {p.age} YEARS
              </Label>
              <p>{p.upgrades} of 10 upgrade points used</p>
              <span className="muted">
                Fitness {Math.round(p.fitness)}% · Yellow cards {p.yellows}/5
              </span>
            </div>
          </div>
          {(Object.keys(STAT_LABELS) as Stat[]).map((stat) => (
            <div className="upgrade-row" key={stat}>
              <span>{STAT_LABELS[stat]}</span>
              <div className="attribute-track">
                <i style={{ width: p.stats[stat] + "%" }} />
              </div>
              <strong>{p.stats[stat]}</strong>
              <button
                disabled={
                  p.upgrades >= 10 ||
                  p.stats[stat] >= 99 ||
                  career.coins < upgradeCost(p)
                }
                onClick={() => change((c) => upgrade(c, p.id, stat))}
                aria-label={`Upgrade ${STAT_LABELS[stat]} for ${upgradeCost(p)} coins`}
              >
                +1 <span>{upgradeCost(p)} ◉</span>
              </button>
            </div>
          ))}
          <p className="fine-print">
            Each purchase raises one attribute by one point. The ten-point cap
            stays with the player.
          </p>
        </Modal>
      )}
    </>
  );
}
function Market({
  career,
  change,
  notify,
}: {
  career: Career;
  change: (fn: (c: Career) => Career) => void;
  notify: (s: string) => void;
}) {
  const [filter, setFilter] = useState("All"),
    [buying, setBuying] = useState<Player | null>(null);
  const players = career.market.filter(
    (p) => filter === "All" || p.position === filter,
  );
  return (
    <>
      <PageTitle
        eyebrow="TRANSFER MARKET"
        title="Find your difference-maker."
        text="Original talent. Permanent signings. New prospects after every league match."
      />
      <div className="market-toolbar">
        <div className="filter-row">
          {[
            "All",
            "GK",
            "CB",
            "LB",
            "RB",
            "DM",
            "CM",
            "AM",
            "LW",
            "RW",
            "ST",
          ].map((pos) => (
            <button
              key={pos}
              className={filter === pos ? "active" : ""}
              onClick={() => setFilter(pos)}
            >
              {pos}
            </button>
          ))}
        </div>
        <span className="muted">{career.players.length} / 35 squad places</span>
      </div>
      <div className="market-grid">
        {players.map((p) => (
          <article className="transfer-card" key={p.id}>
            <div className="transfer-top">
              <div>
                <span className="transfer-rating">{overall(p)}</span>
                <Label>{p.position}</Label>
              </div>
              <UserRound size={70} strokeWidth={0.7} />
              <span className="pill">{p.age} YEARS</span>
            </div>
            <h3>{p.name}</h3>
            <Label>
              {p.position === "GK"
                ? "SAFE HANDS"
                : p.stats.pace > 80
                  ? "QUICK ON THE BREAK"
                  : p.stats.defending > 78
                    ? "BUILT TO DEFEND"
                    : "READY FOR YOUR XI"}
            </Label>
            <div className="transfer-stats">
              {(
                [
                  "pace",
                  "shooting",
                  "passing",
                  "defending",
                  "stamina",
                  "keeping",
                ] as Stat[]
              ).map((s) => (
                <span key={s}>
                  <b>{p.stats[s]}</b>
                  {s.slice(0, 3).toUpperCase()}
                </span>
              ))}
            </div>
            <Button
              disabled={career.coins < price(p) || career.players.length >= 35}
              onClick={() => setBuying(p)}
            >
              <Coins size={16} />
              {price(p).toLocaleString()}
              <span>
                Sign player <ArrowUpRight size={16} />
              </span>
            </Button>
          </article>
        ))}
      </div>
      {!players.length && (
        <div className="empty-state">
          <ShoppingBag />
          <h3>No players in this position today.</h3>
          <p>Play your next league match to refresh the market.</p>
        </div>
      )}
      {buying && (
        <Modal title="Confirm signing" onClose={() => setBuying(null)}>
          <p>
            Sign <strong>{buying.name}</strong> for{" "}
            <strong>{price(buying).toLocaleString()} coins</strong>?
          </p>
          <p className="muted">
            Your new signing joins the reserves. Move them into the XI or
            substitutes in Squad.
          </p>
          <div className="button-row">
            <Button
              onClick={() => {
                change((c) => buy(c, buying.id));
                notify(`${buying.name} has joined your reserves.`);
                setBuying(null);
              }}
            >
              Confirm transfer <Check size={18} />
            </Button>
            <Button secondary onClick={() => setBuying(null)}>
              Cancel
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
function League({ career }: { career: Career }) {
  const [tab, setTab] = useState<"table" | "goals" | "assists" | "fixtures">(
    "table",
  );
  const leaders = [...career.players, ...career.leaguePlayers].sort((a, b) =>
    tab === "assists" ? b.assists - a.assists : b.goals - a.goals,
  );
  return (
    <>
      <PageTitle
        eyebrow={`AURORA LEAGUE / SEASON ${career.season}`}
        title="The race for the crown."
        text="16 clubs. 30 matchdays. One champion."
      />
      <div className="segment league-tabs">
        {(["table", "goals", "assists", "fixtures"] as const).map((t) => (
          <button
            className={tab === t ? "active" : ""}
            key={t}
            onClick={() => setTab(t)}
          >
            {t === "table"
              ? "League table"
              : t === "goals"
                ? "Top scorers"
                : t === "assists"
                  ? "Top assists"
                  : "Fixtures"}
          </button>
        ))}
      </div>
      {tab === "table" ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>CLUB</th>
                <th>P</th>
                <th>W</th>
                <th>D</th>
                <th>L</th>
                <th>GF</th>
                <th>GA</th>
                <th>GD</th>
                <th>PTS</th>
              </tr>
            </thead>
            <tbody>
              {sortTable(career.table).map((t, i) => (
                <tr
                  key={t.club}
                  className={t.club === career.club ? "your-club" : ""}
                >
                  <td>{i + 1}</td>
                  <td>
                    <div className="table-club">
                      <Badge club={CLUBS[t.club]} size={26} />
                      <b>{CLUBS[t.club].name}</b>
                      {t.club === career.club && (
                        <span className="pill">YOU</span>
                      )}
                    </div>
                  </td>
                  <td>{t.played}</td>
                  <td>{t.won}</td>
                  <td>{t.drawn}</td>
                  <td>{t.lost}</td>
                  <td>{t.gf}</td>
                  <td>{t.ga}</td>
                  <td>{t.gf - t.ga}</td>
                  <td>
                    <strong>{t.points}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : tab === "fixtures" ? (
        <div className="fixtures-grid">
          {career.fixtures.map((round, i) => (
            <section className="panel" key={i}>
              <Label>MATCHDAY {i + 1}</Label>
              {round.map((f) => (
                <div
                  className={`fixture-list-row ${[f.home, f.away].includes(career.club) ? "your-fixture" : ""}`}
                  key={f.home}
                >
                  <span>{CLUBS[f.home].short}</span>
                  <strong>{f.score ? f.score.join(" – ") : "vs"}</strong>
                  <span>{CLUBS[f.away].short}</span>
                </div>
              ))}
            </section>
          ))}
        </div>
      ) : (
        <div className="panel leaders">
          {leaders.slice(0, 20).map((p, i) => (
            <div key={p.id} className="leader-row">
              <span className="muted">{String(i + 1).padStart(2, "0")}</span>
              <span className="rating-box">{overall(p)}</span>
              <span className="player-name">
                <PlayerName player={p} />
              </span>
              <strong>{tab === "goals" ? p.goals : p.assists}</strong>
            </div>
          ))}
        </div>
      )}
      <p className="fine-print">
        League rules: a win earns 3 points, a draw 1. Ties use goal difference,
        then goals scored. Five accumulated yellows = 1-match ban; second-yellow
        dismissal = 1 match; a straight red = 3 matches.
      </p>
    </>
  );
}
function Exhibition({
  onClose,
  onPlay,
}: {
  onClose: () => void;
  onPlay: (h: number, a: number) => void;
}) {
  const [home, setHome] = useState(0),
    [away, setAway] = useState(1);
  return (
    <Modal title="Exhibition match" onClose={onClose}>
      <div className="exhibition-crests">
        <Badge club={CLUBS[home]} size={75} />
        <span>VS</span>
        <Badge club={CLUBS[away]} size={75} />
      </div>
      <ClubSelect label="Your club" value={home} onChange={setHome} />
      <ClubSelect label="Opponent" value={away} onChange={setAway} />
      {home === away && (
        <p className="error-text">Choose two different clubs.</p>
      )}
      <p className="muted">
        A one-off match. Career coins, fitness and standings stay unchanged.
      </p>
      <div className="button-row">
        <Button disabled={home === away} onClick={() => onPlay(home, away)}>
          Take the pitch <Play size={18} />
        </Button>
        <Button
          secondary
          onClick={() => {
            const h = Math.floor(Math.random() * 16);
            setHome(h);
            setAway((h + 1 + Math.floor(Math.random() * 15)) % 16);
          }}
        >
          <Shuffle size={17} />
          Random clubs
        </Button>
      </div>
    </Modal>
  );
}
function SettingsPanel({
  settings,
  onChange,
  inMatch = false,
}: {
  settings: Settings;
  onChange: (s: Settings) => void;
  inMatch?: boolean;
}) {
  const update = (key: keyof Settings, v: unknown) =>
    onChange({ ...settings, [key]: v });
  return (
    <div className="settings-panel">
      <label className="field">
        Camera
        <select
          value={settings.camera}
          onChange={(e) => update("camera", e.target.value)}
        >
          <option value="broadcast">Broadcast / Tele</option>
          <option value="wide">Wide sideline</option>
          <option value="dynamic">Dynamic / Cinematic</option>
          <option value="end-to-end">End-to-end</option>
          <option value="tactical">Top-down / Tactical</option>
          <option value="player">Player cam</option>
        </select>
      </label>
      <label className="field">
        Difficulty
        <select
          disabled={inMatch}
          value={settings.difficulty}
          onChange={(e) => update("difficulty", e.target.value)}
        >
          <option value="casual">Casual</option>
          <option value="club">Club</option>
          <option value="elite">Elite</option>
        </select>
      </label>
      <label className="field">
        Match length
        <select
          disabled={inMatch}
          value={settings.duration}
          onChange={(e) => update("duration", Number(e.target.value))}
        >
          {[360, 480, 600].map((d) => (
            <option key={d} value={d}>
              {d / 60} minutes · {d / 120} per half
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        Graphics
        <select
          disabled={inMatch}
          value={settings.quality}
          onChange={(e) => update("quality", e.target.value)}
        >
          <option value="high">High — shadows and smooth edges</option>
          <option value="low">Low — lighter on your device</option>
        </select>
      </label>
      <label className="toggle-row">
        <span>Match sounds</span>
        <input
          type="checkbox"
          checked={settings.sound}
          onChange={(e) => update("sound", e.target.checked)}
        />
      </label>
      <label className="toggle-row">
        <span>Always show touch controls</span>
        <input
          type="checkbox"
          checked={settings.touch}
          onChange={(e) => update("touch", e.target.checked)}
        />
      </label>
      {inMatch && (
        <p className="fine-print">
          Difficulty, duration and graphics apply from your next match.
        </p>
      )}
    </div>
  );
}
function ControlsGuide() {
  return (
    <>
      <p className="muted">
        Control the highlighted player. Aim with movement while passing or
        shooting. Teammates move, defend and make runs automatically.
      </p>
      <div className="table-wrap">
        <table className="controls-table">
          <thead>
            <tr>
              <th>ACTION</th>
              <th>KEYBOARD</th>
              <th>CONTROLLER</th>
              <th>TOUCH</th>
            </tr>
          </thead>
          <tbody>
            {[
              [
                "Move",
                "W A S D / arrows",
                "Left stick / D-pad",
                "Left joystick",
              ],
              ["Sprint", "Shift", "RB / R1", "Sprint button"],
              ["Pass / pressure", "J", "A / ✕", "Pass"],
              ["Shoot", "K", "B / ○", "Shoot"],
              ["Lob / cross", "L", "X / □", "Lob"],
              ["Switch player", "Space", "Y / △", "Switch"],
              ["Tackle", "E", "LT / L2", "Tackle"],
              ["Camera view", "C", "Pause menu", "Pause menu"],
              ["Pause / game plan", "Esc", "Start / Options", "Pause"],
            ].map((row) => (
              <tr key={row[0]}>
                {row.map((x, i) =>
                  i === 0 ? <th key={i}>{x}</th> : <td key={i}>{x}</td>,
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="fine-print">
        For controllers, connect the pad and press any button. Standard browser
        gamepad mapping is used; button symbols vary by controller. On mobile,
        landscape gives you more room.
      </p>
    </>
  );
}
function AuthModal({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: (user: { name: string; email: string }, revision: number) => void;
}) {
  const [register, setRegister] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [configured, setConfigured] = useState<boolean | null>(null);
  useEffect(() => {
    api("/health")
      .then((r) => setConfigured(r.database))
      .catch(() => setConfigured(false));
  }, []);
  return (
    <Modal
      title={
        register
          ? "Create your manager account"
          : "Your club, wherever you play"
      }
      onClose={onClose}
    >
      {configured === false ? (
        <>
          <div className="notice">
            <Cloud />
            <div>
              <h3>Account saves aren’t connected yet.</h3>
              <p>
                This installation is running in guest mode. Your career saves on
                this device.
              </p>
            </div>
          </div>
          <Button onClick={onClose}>
            Continue as guest <ArrowRight size={18} />
          </Button>
        </>
      ) : (
        <>
          <p className="muted">
            Keep a cloud copy of your career and load it on another device.
          </p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              const f = new FormData(e.currentTarget);
              try {
                const r = await api(register ? "/register" : "/login", {
                  email: f.get("email"),
                  password: f.get("password"),
                  name: f.get("name"),
                });
                onDone(r.user, r.revision ?? 0);
              } catch (err) {
                setError((err as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {register && (
              <label className="field">
                Manager name
                <input
                  name="name"
                  maxLength={40}
                  required
                  autoComplete="nickname"
                />
              </label>
            )}
            <label className="field">
              Email
              <input
                type="email"
                name="email"
                required
                autoComplete="email"
                maxLength={254}
              />
            </label>
            <label className="field">
              Password
              <input
                type="password"
                name="password"
                minLength={10}
                maxLength={128}
                required
                autoComplete={register ? "new-password" : "current-password"}
              />
              <small>At least 10 characters</small>
            </label>
            {error && (
              <p role="alert" className="error-text">
                {error}
              </p>
            )}
            <Button type="submit" disabled={busy || configured === null}>
              {busy ? "Connecting…" : register ? "Create account" : "Sign in"}{" "}
              <ArrowRight size={17} />
            </Button>
          </form>
          <button
            className="text-button"
            onClick={() => {
              setRegister(!register);
              setError("");
            }}
          >
            {register
              ? "Already have an account? Sign in"
              : "New manager? Create an account"}
          </button>
          <button className="text-button" onClick={onClose}>
            Continue playing as guest
          </button>
        </>
      )}
    </Modal>
  );
}
function MatchScreen({
  game,
  settings,
  updateSettings,
  onExit,
  notify,
}: {
  game: Game;
  settings: Settings;
  updateSettings: (s: Settings) => void;
  onExit: (completed: boolean) => void;
  notify: (s: string) => void;
}) {
  const stage = useRef<HTMLDivElement>(null),
    stadiumRef = useRef<StadiumView | null>(null),
    controlsRef = useRef<Controls | null>(null),
    pausedRef = useRef(false),
    soundRef = useRef<Sound | null>(null);
  const [paused, setPaused] = useState(false),
    [tab, setTab] = useState<"overview" | "plan" | "settings" | "controls">(
      "overview",
    ),
    [version, setVersion] = useState(0),
    [error, setError] = useState(""),
    [leave, setLeave] = useState(false),
    [out, setOut] = useState("");
  const match = game.match;
  const pause = useCallback((force?: boolean) => {
    setPaused((value) => {
      const next = force ?? !value;
      pausedRef.current = next;
      controlsRef.current?.blur();
      return next;
    });
  }, []);
  useEffect(() => {
    let id: number, stadium: StadiumView;
    const sound = new Sound();
    sound.enabled = settings.sound;
    soundRef.current = sound;
    const controls = new Controls(pause);
    controlsRef.current = controls;
    try {
      stadium = createStadium(stage.current!, match, game.clubs, settings);
      stadiumRef.current = stadium;
      let prev = performance.now(),
        acc = 0,
        lastUI = 0,
        lastPhase = match.phase,
        lastGoals = 0;
      let pending = emptyInput();
      const frame = (now: number) => {
        const dt = Math.min((now - prev) / 1000, 0.08);
        prev = now;
        if (window.innerHeight > window.innerWidth && !pausedRef.current)
          pause(true);
        const input = controls.read();
        for (const key of ["pass", "shoot", "lob", "switch", "tackle"] as const)
          pending[key] ||= input[key];
        if (!pausedRef.current && !document.hidden) {
          acc += dt;
          let first = true;
          while (acc >= 1 / 60) {
            match.update(
              1 / 60,
              first
                ? {
                    ...input,
                    pass: pending.pass,
                    shoot: pending.shoot,
                    lob: pending.lob,
                    switch: pending.switch,
                    tackle: pending.tackle,
                  }
                : {
                    ...input,
                    pass: false,
                    shoot: false,
                    lob: false,
                    switch: false,
                    tackle: false,
                  },
            );
            first = false;
            pending = emptyInput();
            acc -= 1 / 60;
          }
        } else {
          acc = 0;
          pending = emptyInput();
        }
        stadium.render(dt);
        if (match.goals.length > lastGoals) {
          sound.goal();
          lastGoals = match.goals.length;
        }
        if (lastPhase !== match.phase) {
          if (match.phase === "halftime" || match.phase === "finished")
            sound.whistle();
          lastPhase = match.phase;
        }
        if (now - lastUI > 100) {
          setVersion((v) => v + 1);
          lastUI = now;
        }
        id = requestAnimationFrame(frame);
      };
      id = requestAnimationFrame(frame);
    } catch (e) {
      setError(
        `The 3D engine could not start. Try enabling hardware acceleration or switching to low graphics. ${(e as Error).message}`,
      );
    }
    return () => {
      cancelAnimationFrame(id);
      stadium?.dispose();
      controls.dispose();
      sound.dispose();
    };
  }, [game, pause]);
  useEffect(() => {
    if (stadiumRef.current)
      stadiumRef.current.settings.camera = settings.camera;
    if (soundRef.current) soundRef.current.enabled = settings.sound;
  }, [settings]);
  useEffect(() => {
    const cycleCamera = (event: KeyboardEvent) => {
      if (event.code !== "KeyC" || event.repeat) return;
      if (
        event.target instanceof Element &&
        event.target.matches("input, select, textarea")
      )
        return;
      const current = CAMERA_MODES.indexOf(settings.camera);
      const camera = CAMERA_MODES[(current + 1) % CAMERA_MODES.length];
      updateSettings({ ...settings, camera });
      notify(`Camera · ${CAMERA_LABELS[camera]}`);
    };
    window.addEventListener("keydown", cycleCamera);
    return () => window.removeEventListener("keydown", cycleCamera);
  }, [notify, settings, updateSettings]);
  const fulltime = match.phase === "finished",
    halftime = match.phase === "halftime",
    overlay = paused || fulltime || halftime,
    controlled = match.controlled,
    poss = match.possession[0] + match.possession[1],
    homePoss = poss ? Math.round((match.possession[0] / poss) * 100) : 50;
  const eligible = game.bench.filter(
    (p) =>
      !match.used.has(p.id) &&
      !match.players.some((q) => q.data.id === p.id) &&
      available(p),
  );
  function resume() {
    soundRef.current?.unlock();
    if (halftime) match.resumeHalf();
    pausedRef.current = false;
    setPaused(false);
    setTab("overview");
  }
  return (
    <div
      className="match-screen"
      onPointerDown={() => soundRef.current?.unlock()}
    >
      <div className="match-stage" ref={stage} />
      {error && (
        <div className="match-error">
          <h2>The pitch couldn’t load</h2>
          <p>{error}</p>
          <Button onClick={() => onExit(false)}>Back to menu</Button>
        </div>
      )}
      <div className="match-top">
        <div className="scoreboard">
          <div className="scoreboard-brand">
            W<span>•</span>
          </div>
          <span
            className="score-team"
            style={{ borderBottomColor: game.clubs[0].color }}
          >
            {game.clubs[0].short}
          </span>
          <b className="score-number">
            {match.score[0]} <span>–</span> {match.score[1]}
          </b>
          <span
            className="score-team"
            style={{ borderBottomColor: game.clubs[1].color }}
          >
            {game.clubs[1].short}
          </span>
          <span className="match-clock">
            {String(match.minute).padStart(2, "0")}:
            {String(
              Math.floor((match.clock / settings.duration) * 90 * 60) % 60,
            ).padStart(2, "0")}
            <small>{match.half === 1 ? "1ST" : "2ND"}</small>
          </span>
        </div>
        <div className="match-actions">
          <span className="input-indicator">
            <Gamepad2 size={17} />
            {controlsRef.current?.connected ? "Connected" : "WASD"}
          </span>
          <button
            className="icon-button"
            aria-label="Toggle fullscreen"
            onClick={() => {
              if (document.fullscreenElement)
                void document.exitFullscreen().catch(() => {});
              else
                void document.documentElement
                  .requestFullscreen?.()
                  .catch(() =>
                    notify("Fullscreen is not available in this browser."),
                  );
            }}
          >
            <Maximize size={18} />
          </button>
          <button
            className="icon-button"
            aria-label="Pause match"
            onClick={() => pause()}
          >
            <Pause size={20} />
          </button>
        </div>
      </div>
      {!overlay && match.phase !== "playing" && (
        <div
          className={`match-announcement ${match.phase === "goal" ? "goal-announcement" : ""}`}
        >
          <Label>
            {match.phase === "goal"
              ? `${game.clubs[1 - match.restartTeam].name} · ${match.minute}′`
              : game.clubs[match.restartTeam]?.name}
          </Label>
          <h1>{match.restartLabel}</h1>
          {match.phase === "goal" && (
            <p>{match.events.find((e) => e.kind === "goal")?.text}</p>
          )}
        </div>
      )}
      {!overlay && (
        <>
          <div className="match-bottom">
            <div className="controlled-player">
              <span className="player-number">{controlled?.number}</span>
              <div>
                <Label>
                  {controlled?.data.position} · {game.clubs[0].short}
                </Label>
                <strong>{controlled?.data.name}</strong>
                <div className="energy-bar">
                  <i style={{ width: `${controlled?.energy ?? 100}%` }} />
                </div>
              </div>
            </div>
            <div className="minimap" aria-label="Match radar">
              <span className="mini-center" />
              {match.active.map((p) => (
                <i
                  key={p.data.id}
                  className={p === controlled ? "controlled" : ""}
                  style={{
                    left: `${(p.x / 105 + 0.5) * 100}%`,
                    top: `${(p.z / 68 + 0.5) * 100}%`,
                    background: game.clubs[p.team].color,
                  }}
                />
              ))}
              <b
                style={{
                  left: `${(match.ball.x / 105 + 0.5) * 100}%`,
                  top: `${(match.ball.z / 68 + 0.5) * 100}%`,
                }}
              />
            </div>
            <div className="keyboard-hint">
              <span>
                <kbd>J</kbd> Pass
              </span>
              <span>
                <kbd>K</kbd> Shoot
              </span>
              <span>
                <kbd>L</kbd> Lob
              </span>
              <span>
                <kbd>SPACE</kbd> Switch
              </span>
            </div>
          </div>
          <div className="attack-direction">
            ATTACK {match.direction(0) === 1 ? "→" : "←"}
          </div>
          <TouchControls controls={controlsRef} force={settings.touch} />
        </>
      )}
      {overlay && (
        <div className="pause-backdrop">
          <section className="pause-panel">
            <div className="pause-title">
              <Label>
                {fulltime
                  ? "MATCH COMPLETE"
                  : halftime
                    ? "45 MINUTES PLAYED"
                    : "TAKE A BREATHER"}
              </Label>
              <h1>
                {fulltime
                  ? "Full-time."
                  : halftime
                    ? "Half-time."
                    : "Game paused."}
              </h1>
            </div>
            <div className="pause-score">
              <Badge club={game.clubs[0]} size={45} />
              <strong>{game.clubs[0].short}</strong>
              <b>
                {match.score[0]} <span>–</span> {match.score[1]}
              </b>
              <strong>{game.clubs[1].short}</strong>
              <Badge club={game.clubs[1]} size={45} />
            </div>
            <div className="segment pause-tabs">
              {(
                [
                  "overview",
                  ...(!fulltime ? ["plan", "settings", "controls"] : []),
                ] as ("overview" | "plan" | "settings" | "controls")[]
              ).map((t) => (
                <button
                  key={t}
                  className={tab === t ? "active" : ""}
                  onClick={() => setTab(t)}
                >
                  {t === "overview"
                    ? "Match stats"
                    : t === "plan"
                      ? "Game plan"
                      : t === "settings"
                        ? "Settings"
                        : "Controls"}
                </button>
              ))}
            </div>
            <div className="pause-content">
              {tab === "overview" && (
                <>
                  <div className="match-stat-list">
                    {[
                      [match.shots[0], "Shots", match.shots[1]],
                      [homePoss + "%", "Possession", 100 - homePoss + "%"],
                      [match.passes[0], "Passes", match.passes[1]],
                      [match.tackles[0], "Tackles won", match.tackles[1]],
                      [match.saves[0], "Saves", match.saves[1]],
                      [
                        match.players.filter((p) => !p.team && p.yellow).length,
                        "Yellow cards",
                        match.players.filter((p) => p.team && p.yellow).length,
                      ],
                      [
                        match.players.filter((p) => !p.team && p.red).length,
                        "Red cards",
                        match.players.filter((p) => p.team && p.red).length,
                      ],
                    ].map(([a, label, b]) => (
                      <div key={label}>
                        <strong>{a}</strong>
                        <span>{label}</span>
                        <strong>{b}</strong>
                      </div>
                    ))}
                  </div>
                  <div className="match-events">
                    {match.events
                      .filter((e) => e.kind === "goal" || e.kind === "card")
                      .map((e, i) => (
                        <div key={i}>
                          <span>{e.minute}′</span>
                          {e.kind === "goal" ? (
                            <span>⚽</span>
                          ) : (
                            <span className="yellow-card" />
                          )}
                          <b>{e.text}</b>
                          {e.team !== undefined && (
                            <small>{game.clubs[e.team].short}</small>
                          )}
                        </div>
                      ))}
                    {!match.events.some(
                      (e) => e.kind === "goal" || e.kind === "card",
                    ) && <p className="muted">No goals or bookings yet.</p>}
                  </div>
                  {fulltime && game.career && (
                    <div className="reward-banner">
                      <Coins />
                      <div>
                        <b>
                          +
                          {250 +
                            (match.score[0] > match.score[1]
                              ? 450
                              : match.score[0] === match.score[1]
                                ? 200
                                : 50) +
                            match.score[0] * 50}{" "}
                          coins
                        </b>
                        <span>Collected when you return to your career</span>
                      </div>
                    </div>
                  )}
                </>
              )}
              {tab === "plan" && (
                <>
                  <div className="plan-fields">
                    <label className="field">
                      Formation
                      <select
                        value={match.formations[0]}
                        onChange={(e) => {
                          match.changeFormation(e.target.value);
                          setVersion((v) => v + 1);
                        }}
                      >
                        {Object.keys(FORMATIONS).map((f) => (
                          <option key={f}>{f}</option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      Playing style
                      <select
                        value={match.tactics[0]}
                        onChange={(e) => {
                          match.tactics[0] = e.target.value;
                          setVersion((v) => v + 1);
                        }}
                      >
                        <option value="balanced">Balanced</option>
                        <option value="attacking">Attacking</option>
                        <option value="defensive">Defensive</option>
                        <option value="pressing">High press</option>
                      </select>
                    </label>
                  </div>
                  <div className="section-heading">
                    <h3>Substitutions</h3>
                    <span>{match.subs[0]} / 5 used</span>
                  </div>
                  <label className="field">
                    Player coming off
                    <select
                      value={out}
                      onChange={(e) => setOut(e.target.value)}
                    >
                      <option value="">Choose an on-pitch player</option>
                      {match.players
                        .filter((p) => !p.team && !p.red)
                        .map((p) => (
                          <option value={p.data.id} key={p.data.id}>
                            {p.data.name} · {p.data.position} ·{" "}
                            {Math.round(p.energy)}%
                            {p.injured ? " · INJURED" : ""}
                          </option>
                        ))}
                    </select>
                  </label>
                  {eligible.map((p) => (
                    <div className="sub-row" key={p.id}>
                      <span className="rating-box">{overall(p)}</span>
                      <span className="player-name">
                        <PlayerName player={p} />
                      </span>
                      <button
                        disabled={!out || match.subs[0] >= 5}
                        className="text-button"
                        onClick={() => {
                          try {
                            match.substitute(out, p);
                            setOut("");
                            setVersion((v) => v + 1);
                          } catch (e) {
                            notify((e as Error).message);
                          }
                        }}
                      >
                        Bring on <ArrowRight size={16} />
                      </button>
                    </div>
                  ))}
                  <p className="fine-print">
                    Substituted players cannot return. A sent-off player cannot
                    be replaced. Match formation changes don’t alter your saved
                    default.
                  </p>
                </>
              )}
              {tab === "settings" && (
                <SettingsPanel
                  settings={settings}
                  onChange={updateSettings}
                  inMatch
                />
              )}
              {tab === "controls" && <ControlsGuide />}
            </div>
            <div className="pause-footer">
              <Button onClick={fulltime ? () => onExit(true) : resume}>
                {fulltime
                  ? "Return to " + (game.career ? "career" : "menu")
                  : halftime
                    ? "Start second half"
                    : "Back to the pitch"}{" "}
                <ArrowRight size={18} />
              </Button>
              {!fulltime && (
                <button className="text-button" onClick={() => setLeave(true)}>
                  Leave match
                </button>
              )}
            </div>
          </section>
        </div>
      )}
      {leave && (
        <Modal title="Leave this match?" onClose={() => setLeave(false)}>
          <p>
            {game.career
              ? "Leaving abandons this fixture. It will be recorded as a 0–3 defeat, with no coins earned."
              : "Your exhibition match will end without saving a result."}
          </p>
          <div className="button-row">
            <Button secondary onClick={() => setLeave(false)}>
              Keep playing
            </Button>
            <Button
              onClick={() => {
                if (game.career) {
                  match.score = [0, 3];
                  match.goals = [];
                  match.forfeited = true;
                }
                onExit(game.career);
              }}
            >
              Leave match
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
function TouchControls({
  controls,
  force,
}: {
  controls: React.RefObject<Controls | null>;
  force: boolean;
}) {
  const [stick, setStick] = useState({ x: 0, y: 0 });
  const pointer = useRef<number | null>(null);
  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pointer.current !== e.pointerId) return;
    const r = e.currentTarget.getBoundingClientRect(),
      x = (e.clientX - r.left - r.width / 2) / (r.width * 0.35),
      z = (e.clientY - r.top - r.height / 2) / (r.height * 0.35),
      mag = Math.max(1, Math.hypot(x, z));
    if (controls.current) {
      controls.current.touch.x = x / mag;
      controls.current.touch.z = z / mag;
    }
    setStick({ x: (x / mag) * 34, y: (z / mag) * 34 });
  };
  const reset = () => {
    pointer.current = null;
    setStick({ x: 0, y: 0 });
    if (controls.current) {
      controls.current.touch.x = 0;
      controls.current.touch.z = 0;
    }
  };
  return (
    <div className={`touch-controls ${force ? "force" : ""}`}>
      <div
        role="application"
        aria-label="Movement joystick"
        className="joystick"
        onPointerDown={(e) => {
          pointer.current = e.pointerId;
          e.currentTarget.setPointerCapture(e.pointerId);
          move(e);
        }}
        onPointerMove={move}
        onPointerUp={reset}
        onPointerCancel={reset}
        onLostPointerCapture={reset}
      >
        <span style={{ transform: `translate(${stick.x}px,${stick.y}px)` }} />
      </div>
      <button
        className="touch-sprint"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          if (controls.current) controls.current.touch.sprint = true;
        }}
        onPointerUp={() => {
          if (controls.current) controls.current.touch.sprint = false;
        }}
        onPointerCancel={() => {
          if (controls.current) controls.current.touch.sprint = false;
        }}
        onLostPointerCapture={() => {
          if (controls.current) controls.current.touch.sprint = false;
        }}
      >
        Sprint
      </button>
      <div className="touch-actions">
        {["switch", "lob", "shoot", "tackle", "pass"].map((a) => (
          <button
            key={a}
            className={"touch-" + a}
            onPointerDown={(e) => {
              e.preventDefault();
              controls.current?.action(a);
            }}
          >
            {a}
          </button>
        ))}
      </div>
    </div>
  );
}
