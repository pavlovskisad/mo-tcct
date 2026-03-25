import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useMultiplayer, supabase } from "./useMultiplayer.js";

const SYL = ["AH", "RA", "PA", "TSA", "NA", "DHI"];
const TIB = ["ཨ", "ར", "པ", "ཙ", "ན", "དྷཱི"];
const MANTRA = ["AH", "RA", "PA", "TSA", "NA", "DHI"];
const POINTS = { 2: 1, 3: 3, 4: 7, 5: 15, 6: 30 };
const P = {
  bGold: "#F0C040", red: "#E8302A", saffron: "#E67E22", green: "#00875A",
  teal: "#008B8B", orange: "#ED6C1B", navy: "#0D1B3E", yellow: "#F5B800",
  royalBlue: "#2744A0", gold: "#D4A017",
  t1: "#FAF0DC", t2: "#E8D9BE", tM: "#C4A87A",
};
const SC = [P.bGold, P.red, P.green, P.saffron, P.royalBlue, P.teal];
const FC = [P.royalBlue, "#FBF5E6", P.red, P.green, P.yellow];
const PC = [P.bGold, P.red];
const PN = ["Player 1", "Player 2"];

// ── game logic (pure, unchanged) ──────────────────────────────────────────────
const gen = () => { const t = []; let id = 0; for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) t.push({ id: id++, connector: SYL[i], payload: SYL[j], isDouble: i === j }); return t; };
const shuf = a => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = 0 | Math.random() * (i + 1); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const mkPool = () => { const b = gen(); let p = []; for (let c = 0; c < 3; c++) p = p.concat(b.map(t => ({ ...t, id: t.id + c * 36 + 1000 }))); return shuf(p); };
const deal = () => {
  const a = shuf([...gen().map(t => ({ ...t, id: t.id })), ...gen().map(t => ({ ...t, id: t.id + 100 }))]);
  return { p1: a.slice(0, 20), p2: a.slice(20, 40), pool: mkPool() };
};
let _n = 0;
const mkN = (syl, by) => ({ id: "n" + (_n++), syllable: syl, placedBy: by });
const getEnds = ch => ch ? [{ node: ch[0], side: "left" }, { node: ch[ch.length - 1], side: "right" }] : [];
const findPlay = (tiles, ends) => { const s = new Set(ends.map(e => e.node.syllable)); return tiles.filter(t => s.has(t.connector)); };
const getCompat = (tile, ends) => ends.filter(e => e.node.syllable === tile.connector);
const isMS = s => {
  if (s.length < 2 || s.length > 6) return false;
  const start = MANTRA.indexOf(s[0]);
  if (start < 0) return false;
  for (let j = 1; j < s.length; j++) {
    if (start + j >= 6) return false;
    if (MANTRA[start + j] !== s[j]) return false;
  }
  return true;
};
function scorePlace(ch, nid) {
  const syls = ch.map(n => n.syllable);
  const pi = ch.findIndex(n => n.id === nid);
  if (pi < 0) return { len: 0, syls: [], pts: 0 };
  let best = 0, bestS = [];
  for (let s = 0; s <= pi; s++) for (let e = pi; e < syls.length; e++) {
    const sub = syls.slice(s, e + 1);
    if (sub.length >= 2 && sub.length > best && isMS(sub)) { best = sub.length; bestS = sub; }
  }
  return { len: best, syls: bestS, pts: POINTS[best] || 0 };
}
function initG() {
  _n = 0;
  const { p1, p2, pool } = deal();
  return { players: [{ tiles: p1, score: 0 }, { tiles: p2, score: 0 }], chain: null, pool, progress: [], recs: 0, cur: 0, passes: 0, phase: "playing", sel: null, draws: 0, firstRec: null, placed: [0, 0], lastDraw: null, streak: 0, scoredIds: null };
}
function doSc(ch, nid, cp, pls, prog, recs, fr) {
  const sc = scorePlace(ch, nid);
  let np = new Set(prog), nr = recs, nfr = fr;
  const npl = pls.map(p => ({ ...p }));
  if (sc.pts > 0) { npl[cp].score += sc.pts; sc.syls.forEach(s => np.add(s)); if (np.size >= 6) { nr++; if (nfr === null) nfr = cp; np = new Set(); } }
  return { sc, npl, np: [...np], nr, ended: nr >= 2, nfr };
}
// Serialize/deserialize Set-based progress for JSON storage
const toRaw = g => ({ ...g, progress: [...(g.progress instanceof Set ? g.progress : new Set(g.progress || []))] });
const fromRaw = g => ({ ...g, progress: new Set(g.progress || []) });

// ── UI components ──────────────────────────────────────────────────────────────
function ChainBoard({ chain, compatEnds, onEndClick, screenW, scoredIds }) {
  if (!chain) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontSize: 15, color: P.tM + "88", fontStyle: "italic", fontFamily: "'Space Mono',monospace" }}>Play a tile to start</div>;
  const len = chain.length;
  const GAP = 2, EDGE = 34, VIS = 5, DOT = 4, MAX_DOTS = 2;
  const midCount = Math.max(0, len - Math.min(VIS * 2, len));
  const dotsToShow = Math.min(midCount, MAX_DOTS);
  const cSet = new Set(compatEnds.map(e => `${e.node.id}:${e.side}`));
  const leftNodes = chain.slice(0, Math.min(VIS, len));
  const rightNodes = len > VIS ? chain.slice(Math.max(VIS, len - VIS)) : [];
  const midNodes = len > VIS * 2 ? chain.slice(VIS, len - VIS) : [];
  const midSample = [];
  if (midNodes.length > 0 && dotsToShow > 0) {
    const step = Math.max(1, Math.floor(midNodes.length / dotsToShow));
    for (let i = 0; i < dotsToShow && i * step < midNodes.length; i++) midSample.push(midNodes[i * step]);
  }
  const renderCell = (nd) => {
    const si = SYL.indexOf(nd.syllable);
    const isFirst = nd.id === chain[0].id, isLast = nd.id === chain[len - 1].id;
    const isEnd = isFirst || isLast;
    const leftE = isFirst ? compatEnds.find(e => e.side === "left") : null;
    const rightE = isLast ? compatEnds.find(e => e.side === "right") : null;
    const endE = leftE || rightE;
    const click = !!endE && cSet.has(`${endE.node.id}:${endE.side}`);
    const isScored = scoredIds && scoredIds.has(nd.id);
    return (
      <div key={nd.id} onClick={click ? () => onEndClick(endE) : undefined} style={{
        width: EDGE, height: EDGE + 8, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        background: isScored ? `${SC[si]}35` : `${SC[si]}${isEnd ? "18" : "0D"}`,
        border: click ? `2px solid ${P.yellow}` : isScored ? `2px solid ${SC[si]}99` : `1px solid ${SC[si]}${isEnd ? "66" : "33"}`,
        cursor: click ? "pointer" : "default", flexShrink: 0, position: "relative",
        boxShadow: click ? `0 0 16px ${P.yellow}55` : isScored ? `0 0 20px ${SC[si]}55` : isEnd ? `0 0 6px ${SC[si]}22` : "none",
        animation: click ? "ep 1.4s ease infinite" : isScored ? "scoreFlash 1s ease" : "none",
      }}>
        <span style={{ fontSize: 10, color: SC[si], fontFamily: "'Space Mono',monospace", fontWeight: 700, lineHeight: 1 }}>{nd.syllable}</span>
        <span style={{ fontSize: 14, color: SC[si], lineHeight: 1, marginTop: 1 }}>{TIB[si]}</span>
        <div style={{ position: "absolute", bottom: 1, right: 1, width: 3, height: 3, borderRadius: "50%", background: PC[nd.placedBy] }} />
      </div>
    );
  };
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: GAP }}>
        {leftNodes.map(nd => renderCell(nd))}
        {midSample.length > 0 && <div style={{ display: "flex", alignItems: "center", gap: 1, padding: "0 2px" }}>{midSample.map(nd => { const si = SYL.indexOf(nd.syllable); return <div key={nd.id} style={{ width: DOT, height: DOT, borderRadius: 1, background: SC[si] + "66", flexShrink: 0 }} />; })}</div>}
        {rightNodes.map(nd => renderCell(nd))}
      </div>
    </div>
  );
}

function HTile({ tile, onClick, selected, lit, tileW, isDesktop }) {
  const ci = SYL.indexOf(tile.connector), pi = SYL.indexOf(tile.payload);
  const dim = !lit && !selected;
  const w = tileW || 80;
  const sylFontSize = isDesktop ? 13 : (w < 80 ? 9 : 10);
  const tibFontSize = isDesktop ? 22 : (w < 80 ? 14 : 16);
  const divH = isDesktop ? 32 : (w < 80 ? 20 : 24);
  return (
    <div onClick={onClick} style={{
      display: "flex", alignItems: "center", padding: isDesktop ? "6px 5px" : (w < 80 ? "3px 2px" : "4px 3px"),
      width: w,
      background: selected ? `${P.yellow}30` : lit ? `${P.navy}DD` : `${P.navy}55`,
      border: selected ? `2px solid ${P.yellow}` : lit ? `2px solid ${SC[ci]}77` : `1px solid ${P.gold}22`,
      cursor: onClick ? "pointer" : "default",
      boxShadow: selected ? `0 0 18px ${P.yellow}66, inset 0 0 10px ${P.yellow}18` : lit ? `0 0 8px ${SC[ci]}33` : "none",
      opacity: dim ? 0.35 : 1, position: "relative", flexShrink: 0,
    }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "1px 2px" }}>
        <span style={{ fontSize: sylFontSize, color: SC[ci], fontFamily: "'Space Mono',monospace", fontWeight: 700 }}>{tile.connector}</span>
        <span style={{ fontSize: tibFontSize, color: SC[ci], lineHeight: 1 }}>{TIB[ci]}</span>
      </div>
      <div style={{ width: 1, height: divH, background: dim ? P.gold + "10" : P.gold + "33" }} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "1px 2px" }}>
        <span style={{ fontSize: sylFontSize, color: SC[pi], fontFamily: "'Space Mono',monospace", fontWeight: 700 }}>{tile.payload}</span>
        <span style={{ fontSize: tibFontSize, color: SC[pi], lineHeight: 1 }}>{TIB[pi]}</span>
      </div>
      {tile.isDouble && <div style={{ position: "absolute", top: 0, right: 2, fontSize: 6, color: P.saffron + "BB" }}>⬥</div>}
    </div>
  );
}

function MantraAnim() {
  const [active, setActive] = useState(0);
  useEffect(() => { const iv = setInterval(() => setActive(a => (a + 1) % 8), 600); return () => clearInterval(iv); }, []);
  return (
    <div style={{ display: "flex", justifyContent: "center", gap: 5, marginBottom: 16 }}>
      {SYL.map((s, i) => {
        const lit = i <= active && active < 6, pulse = i === active && active < 6;
        return <div key={i} style={{ textAlign: "center", padding: "8px 10px", borderBottom: `3px solid ${lit ? SC[i] : SC[i] + "44"}`, background: lit ? `${SC[i]}20` : "transparent", boxShadow: pulse ? `0 0 20px ${SC[i]}55` : "none", transition: "all 0.3s", transform: pulse ? "scale(1.1)" : "scale(1)" }}>
          <span style={{ fontSize: 13, color: lit ? SC[i] : SC[i] + "66", fontFamily: "'Space Mono',monospace", fontWeight: 700 }}>{s}</span>
          <span style={{ fontSize: 28, color: lit ? SC[i] : SC[i] + "44", display: "block", lineHeight: 1, marginTop: 3, textShadow: pulse ? `0 0 12px ${SC[i]}66` : "none" }}>{TIB[i]}</span>
        </div>;
      })}
    </div>
  );
}

// ── Online Lobby Screen ────────────────────────────────────────────────────────
function OnlineLobby({ onStartOnline, onBack }) {
  const [view, setView] = useState("menu"); // menu | join
  const [codeInput, setCodeInput] = useState("");
  const [copied, setCopied] = useState(false);

  const { mpStatus, roomCode, error, quickMatch, createRoom, joinByCode, leaveMatch } = useMultiplayer({
    onGameStateUpdate: (gs, myIdx) => onStartOnline(gs, myIdx, pushRef.current),
    onOpponentDisconnect: () => {},
  });
  const pushRef = useRef(null);

  // When opponent joins our waiting room, start the game
  useEffect(() => {
    if (mpStatus === "connected" && myIdx === 0) {
      // will be triggered via onGameStateUpdate when host pushes initial state
    }
  }, [mpStatus]);

  // When we join as player 2, request the game state
  // (host will push it when they see player2 joined)

  const handleQuickMatch = async () => {
    const result = await quickMatch();
    if (result?.joined) {
      // We're player 2, wait for host to push initial game state
    }
  };

  const handleCreateRoom = async () => {
    await createRoom();
  };

  const handleJoin = async () => {
    if (!codeInput.trim()) return;
    await joinByCode(codeInput.trim());
  };

  const copyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCancel = async () => {
    await leaveMatch();
    setView("menu");
    setCodeInput("");
  };

  // waiting for opponent UI
  if (mpStatus === "waiting" || mpStatus === "searching") {
    return (
      <div style={{ textAlign: "center", padding: "32px 16px" }}>
        <div style={{ fontSize: 9, letterSpacing: 5, color: P.tM, fontFamily: "'Space Mono',monospace", marginBottom: 20 }}>
          {mpStatus === "searching" ? "SEARCHING..." : "WAITING FOR OPPONENT"}
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 28 }}>
          {[0, 1, 2].map(i => <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: P.bGold, animation: `pulse 1.2s ease ${i * 0.4}s infinite`, opacity: 0.6 }} />)}
        </div>
        {roomCode && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 10, color: P.tM, fontFamily: "'Space Mono',monospace", letterSpacing: 3, marginBottom: 10 }}>ROOM CODE</div>
            <div style={{ fontSize: 28, fontFamily: "'Space Mono',monospace", fontWeight: 700, color: P.bGold, letterSpacing: 4, marginBottom: 12 }}>{roomCode}</div>
            <button onClick={copyCode} style={{ background: copied ? `${P.green}22` : `${P.gold}18`, color: copied ? P.green : P.t2, border: `1px solid ${copied ? P.green : P.gold}44`, fontFamily: "'Space Mono',monospace", fontSize: 9, padding: "5px 14px", cursor: "pointer", letterSpacing: 2 }}>
              {copied ? "COPIED ✓" : "COPY CODE"}
            </button>
            <div style={{ fontSize: 11, color: P.tM, marginTop: 10 }}>Share this code with your opponent</div>
          </div>
        )}
        <button className="dm-s" onClick={handleCancel}>← Cancel</button>
      </div>
    );
  }

  if (view === "join") {
    return (
      <div style={{ textAlign: "center", padding: "16px" }}>
        <div style={{ fontSize: 11, color: P.tM, fontFamily: "'Space Mono',monospace", letterSpacing: 3, marginBottom: 16 }}>ENTER ROOM CODE</div>
        <input
          value={codeInput}
          onChange={e => setCodeInput(e.target.value.toUpperCase())}
          onKeyDown={e => e.key === "Enter" && handleJoin()}
          placeholder="AH-RA-PA-TSA"
          style={{ background: `${P.navy}AA`, border: `1px solid ${P.gold}44`, color: P.t1, fontFamily: "'Space Mono',monospace", fontSize: 16, padding: "10px 16px", width: "100%", textAlign: "center", letterSpacing: 3, marginBottom: 16, outline: "none" }}
        />
        {error && <div style={{ fontSize: 10, color: P.red, fontFamily: "'Space Mono',monospace", marginBottom: 12 }}>{error}</div>}
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button className="dm-b" onClick={handleJoin} disabled={!codeInput.trim()}>Join</button>
          <button className="dm-s" onClick={() => { setView("menu"); setCodeInput(""); }}>← Back</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ textAlign: "center", padding: "16px" }}>
      {error && <div style={{ fontSize: 10, color: P.red, fontFamily: "'Space Mono',monospace", marginBottom: 16, padding: "8px", background: `${P.red}11`, border: `1px solid ${P.red}33` }}>{error}</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
        <button className="dm-b" onClick={handleQuickMatch} style={{ width: 220 }}>⚡ Quick Match</button>
        <button className="dm-s" onClick={handleCreateRoom} style={{ width: 220 }}>Create Room</button>
        <button className="dm-s" onClick={() => setView("join")} style={{ width: 220 }}>Join with Code</button>
      </div>
      <div style={{ fontSize: 10, color: P.tM + "88", fontFamily: "'Space Mono',monospace", marginTop: 20, lineHeight: 1.8 }}>
        Quick Match: auto-pair with a waiting player<br />or create a room if none found
      </div>
    </div>
  );
}

// ── Main DomiMo component ──────────────────────────────────────────────────────
export default function DomiMo({ onBack }) {
  const [screen, setScreen] = useState("setup"); // setup | game | end | online
  const [game, setGame] = useState(null);
  const [msg, setMsg] = useState("");
  const [screenW, setScreenW] = useState(typeof window !== "undefined" ? window.innerWidth : 400);
  const [isOnline, setIsOnline] = useState(false);
  const [myPlayerIndex, setMyPlayerIndex] = useState(null);
  const [opponentGone, setOpponentGone] = useState(false);
  const [turnTimer, setTurnTimer] = useState(null);
  const timerRef = useRef(null);
  const hostPushedRef = useRef(false);
  useEffect(() => { const h = () => setScreenW(window.innerWidth); window.addEventListener("resize", h); return () => window.removeEventListener("resize", h); }, []);

  useEffect(() => {
    if (game?.scoredIds) {
      const t = setTimeout(() => setGame(g => g ? { ...g, scoredIds: null } : g), 1000);
      return () => clearTimeout(t);
    }
  }, [game?.scoredIds]);

  // ── Multiplayer hook ──
  const handleRemoteState = useCallback((rawGs, myIdx) => {
    const gs = fromRaw(rawGs);
    setMyPlayerIndex(myIdx);
    setIsOnline(true);
    if (gs.phase === "ended") setScreen("end");
    else setScreen("game");
    setGame(gs);
    if (gs.cur === myIdx) setMsg("Your turn");
    else setMsg("Opponent's turn...");
  }, []);

  const { mpStatus, myPlayerIndex: mpMyIdx, roomCode, error: mpError, quickMatch, createRoom, joinByCode, pushGameState, leaveMatch } = useMultiplayer({
    onGameStateUpdate: handleRemoteState,
    onOpponentDisconnect: () => setOpponentGone(true),
  });

  // Host: push initial game state once opponent joins (once-only guard)
  useEffect(() => {
    if (mpStatus === "connected" && myPlayerIndex === 0 && !hostPushedRef.current) {
      hostPushedRef.current = true;
      const g = initG();
      setGame(g);
      setScreen("game");
      setMsg("Your turn — play any tile");
      setTimeout(() => pushGameState(toRaw(g)), 600);
    }
    if (mpStatus === "idle") hostPushedRef.current = false;
  }, [mpStatus, myPlayerIndex, pushGameState]);

  // Sync myPlayerIndex from hook
  useEffect(() => { if (mpMyIdx !== null) setMyPlayerIndex(mpMyIdx); }, [mpMyIdx]);

  // Reconnect after screen lock / tab switch
  useEffect(() => {
    const onVisible = async () => {
      if (document.visibilityState === "visible" && screen === "game" && roomCode) {
        try {
          const { data } = await supabase.from("matches").select("game_state").eq("code", roomCode).eq("status", "active").single();
          if (data?.game_state) {
            const gs = fromRaw(data.game_state);
            setGame(gs);
          }
        } catch(e) {}
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [screen, roomCode]);

  // Turn timer — 20s, auto-pass on expire
  useEffect(() => {
    if (screen !== "game" || !game || game.phase === "ended") {
      clearInterval(timerRef.current);
      setTurnTimer(null);
      return;
    }
    if (isMyTurn) {
      setTurnTimer(20);
      clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setTurnTimer(t => {
          if (t <= 1) {
            clearInterval(timerRef.current);
            pass();
            return null;
          }
          return t - 1;
        });
      }, 1000);
    } else {
      clearInterval(timerRef.current);
      setTurnTimer(null);
    }
    return () => clearInterval(timerRef.current);
  }, [isMyTurn, screen, game?.phase]);

  // ── Local game start ──
  const start = useCallback(() => {
    setIsOnline(false);
    setMyPlayerIndex(null);
    setGame(initG());
    setScreen("game");
    setMsg("Player 1 — play any tile");
  }, []);

  const ends = useMemo(() => game?.chain ? getEnds(game.chain) : [], [game?.chain]);
  const curT = useMemo(() => game ? game.players[game.cur].tiles : [], [game]);

  // In online mode, show opponent hand as empty (hidden)
  const myHand = useMemo(() => {
    if (!isOnline || myPlayerIndex === null) return curT;
    return game ? game.players[myPlayerIndex].tiles : [];
  }, [game, isOnline, myPlayerIndex, curT]);

  const isMyTurn = useMemo(() => {
    if (!isOnline || myPlayerIndex === null) return true;
    return game?.cur === myPlayerIndex;
  }, [game, isOnline, myPlayerIndex]);

  const playable = useMemo(() => {
    if (!game) return [];
    const hand = isOnline ? myHand : curT;
    return game.chain ? findPlay(hand, ends) : hand;
  }, [game, myHand, curT, ends, isOnline]);

  const compat = useMemo(() => game?.sel && game.chain ? getCompat(game.sel, ends) : [], [game?.sel, ends]);
  const playableIds = useMemo(() => new Set(playable.map(t => t.id)), [playable]);

  const sortedHand = useMemo(() => {
    const hand = isOnline ? myHand : curT;
    return [...hand].sort((a, b) => {
      const ca = SYL.indexOf(a.connector), cb = SYL.indexOf(b.connector);
      if (ca !== cb) return ca - cb;
      return SYL.indexOf(a.payload) - SYL.indexOf(b.payload);
    });
  }, [curT, myHand, isOnline]);

  function placeTile(g, tile, endSide, preConn, prePay) {
    const activePl = isOnline ? myPlayerIndex : g.cur;
    const ch = g.chain ? g.chain.map(n => ({ ...n })) : [];
    const pn = prePay || mkN(tile.payload, activePl);
    if (!g.chain) ch.push(preConn || mkN(tile.connector, activePl), pn);
    else if (endSide === "right") ch.push(pn);
    else ch.unshift(pn);
    const nt = g.players[activePl].tiles.filter(t => t.id !== tile.id);
    const bp = g.players.map((p, i) => i === activePl ? { ...p, tiles: nt } : { ...p });
    const { sc, npl, np, nr, ended, nfr } = doSc(ch, pn.id, activePl, bp, g.progress, g.recs, g.firstRec);
    const tp = [...g.placed]; tp[activePl]++;
    const scored = sc.pts > 0;
    const canStreak = scored && g.streak < 2;
    const nx = canStreak ? activePl : activePl ^ 1;
    const newStreak = canStreak ? g.streak + 1 : 0;
    let scoredIds = null;
    if (scored) {
      const pi = ch.findIndex(n => n.id === pn.id);
      const syls = ch.map(n => n.syllable);
      for (let s = 0; s <= pi; s++) for (let e = pi; e < syls.length; e++) {
        const sub = syls.slice(s, e + 1);
        if (sub.length === sc.len && isMS(sub)) { scoredIds = new Set(ch.slice(s, e + 1).map(n => n.id)); break; }
      }
    }
    let nextMsg;
    if (ended) nextMsg = "Mantra complete! 🏆";
    else if (canStreak) nextMsg = isOnline ? `+${sc.pts} (${sc.syls.join("→")}) — streak! Go again` : `${PN[activePl]} +${sc.pts} (${sc.syls.join("→")}) — streak!`;
    else if (scored) nextMsg = isOnline ? `+${sc.pts} (${sc.syls.join("→")})! Opponent's turn` : `${PN[activePl]} +${sc.pts} (${sc.syls.join("→")})! ${PN[nx]}'s turn`;
    else nextMsg = isOnline ? (nx === myPlayerIndex ? "Your turn" : "Opponent's turn...") : `${PN[nx]}'s turn`;
    if (ended) { setScreen("end"); setMsg("Mantra complete! 🏆"); }
    else setMsg(nextMsg);
    const newG = { ...g, chain: ch, players: npl, sel: null, cur: nx, passes: 0, draws: 0, progress: np, recs: nr, phase: ended ? "ended" : "playing", firstRec: nfr, placed: tp, lastDraw: null, streak: newStreak, scoredIds };
    if (isOnline) pushGameState(toRaw(newG));
    return newG;
  }

  const selTile = useCallback((tile) => {
    if (!game || game.phase === "ended") return;
    if (isOnline && !isMyTurn) return;
    if (game.sel?.id === tile.id) { setGame(g => ({ ...g, sel: null })); return; }
    if (!game.chain) {
      const activePl = isOnline ? myPlayerIndex : game.cur;
      const cn = mkN(tile.connector, activePl);
      const pn = mkN(tile.payload, activePl);
      setGame(g => placeTile(g, tile, "right", cn, pn));
      return;
    }
    setGame(g => ({ ...g, sel: tile }));
  }, [game, isOnline, isMyTurn, myPlayerIndex]);

  const placeOn = useCallback((end) => {
    if (!game?.sel) return;
    const activePl = isOnline ? myPlayerIndex : game.cur;
    const pn = mkN(game.sel.payload, activePl);
    setGame(g => placeTile(g, g.sel, end.side, null, pn));
  }, [game, isOnline, myPlayerIndex]);

  const drawTile = useCallback(() => {
    if (!game || game.draws >= 1 || !game.pool.length) return;
    if (isOnline && !isMyTurn) return;
    setGame(g => {
      const activePl = isOnline ? myPlayerIndex : g.cur;
      const np = [...g.pool];
      const drawn = [];
      for (let i = 0; i < 3 && np.length; i++) drawn.push(np.pop());
      const nt = [...g.players[activePl].tiles, ...drawn];
      const npl = g.players.map((p, i) => i === activePl ? { ...p, tiles: nt } : { ...p });
      const es = getEnds(g.chain);
      const anyPlayable = drawn.some(d => es.some(e => e.node.syllable === d.connector));
      const names = drawn.map(d => `${d.connector}→${d.payload}`).join(", ");
      setMsg(anyPlayable ? `Drew 3: ${names} — check your hand!` : `Drew 3: ${names}. No match — pass.`);
      const newG = { ...g, pool: np, players: npl, draws: 1, lastDraw: drawn[drawn.length - 1] };
      if (isOnline) pushGameState(toRaw(newG));
      return newG;
    });
  }, [game, isOnline, isMyTurn, myPlayerIndex, pushGameState]);

  const pass = useCallback(() => {
    if (!game) return;
    if (isOnline && !isMyTurn) return;
    setGame(g => {
      const activePl = isOnline ? myPlayerIndex : g.cur;
      const np = g.passes + 1;
      if (np >= 2) {
        setScreen("end"); setMsg("Two passes — Game Over!");
        const newG = { ...g, passes: np, phase: "ended" };
        if (isOnline) pushGameState(toRaw(newG));
        return newG;
      }
      const nx = activePl ^ 1;
      const nextMsg = isOnline ? "Opponent's turn..." : `${PN[activePl]} passes. ${PN[nx]}'s turn.`;
      setMsg(nextMsg);
      const newG = { ...g, cur: nx, passes: np, draws: 0, sel: null, lastDraw: null };
      if (isOnline) pushGameState(toRaw(newG));
      return newG;
    });
  }, [game, isOnline, isMyTurn, myPlayerIndex, pushGameState]);

  const canDraw = game && !playable.length && game.draws < 1 && game.pool.length > 0 && isMyTurn;
  const winner = useMemo(() => {
    if (!game || game.phase !== "ended") return null;
    const [a, b] = [game.players[0].score, game.players[1].score];
    if (a !== b) return a > b ? 0 : 1;
    if (game.firstRec !== null) return game.firstRec;
    return game.placed[0] !== game.placed[1] ? (game.placed[0] > game.placed[1] ? 0 : 1) : null;
  }, [game]);

  const MantraBar = ({ progress, recs, compact, scoredSyls }) => {
    const prog = progress instanceof Set ? progress : new Set(progress || []);
    return (
      <div style={{ display: "flex", gap: compact ? 2 : 3, justifyContent: "center" }}>
        {MANTRA.map((s, i) => {
          const lit = prog.has(s), si = SYL.indexOf(s);
          const justScored = scoredSyls && scoredSyls.has(s);
          return <div key={i} style={{ flex: compact ? 1 : undefined, width: compact ? undefined : 50, maxWidth: compact ? 60 : undefined, height: compact ? 42 : 48, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: lit ? `${SC[si]}30` : `${SC[si]}11`, borderBottom: `3px solid ${lit ? SC[si] : SC[si] + "88"}`, boxShadow: lit ? `0 0 18px ${SC[si]}55, inset 0 0 14px ${SC[si]}20` : "none", transition: "all 0.3s", animation: justScored ? "scorePulse 0.8s ease" : "none" }}>
            <span style={{ fontSize: compact ? 12 : 13, color: lit ? SC[si] : SC[si] + "CC", fontFamily: "'Space Mono',monospace", fontWeight: 700, lineHeight: 1 }}>{s}</span>
            <span style={{ fontSize: compact ? 16 : 20, color: lit ? SC[si] : SC[si] + "99", textShadow: lit ? `0 0 10px ${SC[si]}66` : "none", lineHeight: 1, marginTop: 2 }}>{TIB[si]}</span>
          </div>;
        })}
        <div style={{ display: "flex", alignItems: "center", padding: "0 5px" }}><span style={{ fontSize: compact ? 12 : 13, fontFamily: "'Space Mono',monospace", color: P.bGold, fontWeight: 700 }}>{recs}/2</span></div>
      </div>
    );
  };

  const handleOnlineStart = useCallback((gs, myIdx, push) => {
    setIsOnline(true);
    setMyPlayerIndex(myIdx);
    const g = fromRaw(gs);
    setGame(g);
    setScreen("game");
    setMsg(myIdx === g.cur ? "Your turn — play any tile" : "Opponent's turn...");
  }, []);

  const F = "'Space Mono',monospace";

  return (
    <div style={{ minHeight: "100vh", maxWidth: "100vw", overflow: "hidden", color: P.t1, fontFamily: "'Cormorant Garamond',Georgia,serif", position: "relative" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400&family=Space+Mono:wght@400;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes ep{0%,100%{border-color:${P.yellow}88;box-shadow:0 0 8px ${P.yellow}33}50%{border-color:${P.yellow};box-shadow:0 0 20px ${P.yellow}66}}
        @keyframes scoreFlash{0%{transform:scale(1);box-shadow:none}20%{transform:scale(1.18);box-shadow:0 0 28px currentColor}100%{transform:scale(1);box-shadow:none}}
        @keyframes scorePulse{0%{transform:scale(1)}20%{transform:scale(1.25)}100%{transform:scale(1)}}
        @keyframes pulse{0%,100%{opacity:0.3;transform:scale(0.8)}50%{opacity:1;transform:scale(1.2)}}
        .dm-b{background:${P.yellow};color:${P.navy};border:none;font-family:'Space Mono',monospace;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;padding:14px 32px;cursor:pointer;transition:all 0.2s}
        .dm-b:hover{background:${P.orange};transform:translateY(-1px)}
        .dm-b:disabled{opacity:0.2;cursor:default;transform:none}
        .dm-s{background:transparent;color:${P.t2};border:1px solid ${P.tM}55;font-family:'Space Mono',monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;padding:8px 16px;cursor:pointer;transition:all 0.2s}
        .dm-s:hover{border-color:${P.t1};color:${P.t1}}
        ::-webkit-scrollbar{width:3px;height:3px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:${P.gold}44;border-radius:2px}
      `}</style>

      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        <div style={{ position: "absolute", inset: 0, background: "#1A2240" }} />
        <div style={{ position: "absolute", top: "10%", left: "50%", transform: "translateX(-50%)", width: "180%", height: "80%", background: "radial-gradient(ellipse at 50% 50%, #28336A 0%, transparent 60%)" }} />
      </div>

      {/* ── SETUP ── */}
      {screen === "setup" && (
        <div style={{ position: "relative", zIndex: 3, maxWidth: 520, margin: "0 auto", padding: "32px 16px 60px", textAlign: "center", animation: "fadeIn 0.5s" }}>
          <div style={{ textAlign: "left", marginBottom: 20 }}><button className="dm-s" onClick={onBack}>← Mo Oracle</button></div>
          <div style={{ fontSize: 9, letterSpacing: 6, color: P.tM, fontFamily: F }}>TCCT</div>
          <h1 style={{ fontSize: 46, fontWeight: 700, color: P.bGold, lineHeight: 1, letterSpacing: -1, fontFamily: F }}>DOMI-MO</h1>
          <p style={{ fontSize: 10, letterSpacing: 5, color: P.tM, fontFamily: F, marginTop: 4, marginBottom: 22 }}>TIBETAN MANTRA DOMINOS</p>
          <MantraAnim />

          {/* MODE SELECTOR */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
            {/* LOCAL */}
            <div style={{ background: "#1E2850", border: `1px solid ${P.royalBlue}25`, padding: "20px 16px", textAlign: "center" }}>
              <div style={{ fontSize: 22, marginBottom: 8 }}>🎲</div>
              <div style={{ fontSize: 11, fontFamily: F, color: P.bGold, fontWeight: 700, letterSpacing: 2, marginBottom: 8 }}>LOCAL</div>
              <div style={{ fontSize: 12, color: P.t2, lineHeight: 1.6, marginBottom: 16 }}>Play on the same device — pass and play</div>
              <button className="dm-b" onClick={start} style={{ fontSize: 11, padding: "10px 20px" }}>Start</button>
            </div>
            {/* ONLINE */}
            <div style={{ background: "#1E2850", border: `1px solid ${P.royalBlue}25`, padding: "20px 16px", textAlign: "center" }}>
              <div style={{ fontSize: 22, marginBottom: 8 }}>🌐</div>
              <div style={{ fontSize: 11, fontFamily: F, color: P.bGold, fontWeight: 700, letterSpacing: 2, marginBottom: 8 }}>ONLINE</div>
              <div style={{ fontSize: 12, color: P.t2, lineHeight: 1.6, marginBottom: 16 }}>Play with anyone, anywhere</div>
              <button className="dm-b" onClick={() => setScreen("online")} style={{ fontSize: 11, padding: "10px 20px" }}>Play</button>
            </div>
          </div>

          {/* Rules summary */}
          <div style={{ background: `${P.royalBlue}12`, border: `1px solid ${P.gold}22`, padding: "14px", marginBottom: 24, textAlign: "left" }}>
            <div style={{ fontSize: 11, fontFamily: F, color: P.bGold, fontWeight: 700, letterSpacing: 2, marginBottom: 8 }}>HOW TO PLAY</div>
            <div style={{ fontSize: 13, lineHeight: 1.8, color: P.t2 }}>
              Match tile connectors to chain ends. Build mantra sequences <span style={{ color: P.bGold, fontFamily: F }}>AH→RA→PA→TSA→NA→DHI</span> for points. Fill the mantra bar twice to win.
            </div>
          </div>
          <div style={{ fontSize: 10, color: P.tM, fontFamily: F, letterSpacing: 2 }}>20 TILES · MALA 108</div>
        </div>
      )}

      {/* ── ONLINE LOBBY ── */}
      {screen === "online" && (
        <div style={{ position: "relative", zIndex: 3, maxWidth: 480, margin: "0 auto", padding: "32px 16px 60px", animation: "fadeIn 0.5s" }}>
          <div style={{ marginBottom: 20 }}><button className="dm-s" onClick={() => setScreen("setup")}>← Back</button></div>
          <div style={{ fontSize: 9, letterSpacing: 6, color: P.tM, fontFamily: F, textAlign: "center" }}>ONLINE</div>
          <h2 style={{ fontSize: 28, fontWeight: 700, color: P.bGold, lineHeight: 1, fontFamily: F, textAlign: "center", marginBottom: 28 }}>DOMI-MO</h2>
          <div style={{ background: "#1E2850", border: `1px solid ${P.royalBlue}25`, padding: "24px" }}>
            <OnlineLobby
              onStartOnline={handleOnlineStart}
              onBack={() => setScreen("setup")}
            />
          </div>
        </div>
      )}

      {/* ── GAME ── */}
      {screen === "game" && game && (() => {
        const isMobile = screenW < 600;
        const cols = 4;
        const hGap = isMobile ? 3 : 10;
        const hPad = isMobile ? 12 : 24;
        const containerW = Math.min(screenW, isMobile ? 500 : 820);
        const rawTW = Math.floor((containerW - hPad * 2 - (cols - 1) * hGap) / cols);
        const tW = isMobile ? Math.min(rawTW, 84) : Math.min(rawTW, 168);
        const activePl = isOnline ? myPlayerIndex : game.cur;
        const displayPl = isOnline ? myPlayerIndex : game.cur;

        return (
          <div style={{ position: "fixed", inset: 0, zIndex: 3, display: "flex", flexDirection: "column", maxWidth: "100vw", overflow: "hidden" }}>
            {/* TOP */}
            <div style={{ background: "#131A2E", borderBottom: `1px solid ${P.gold}18`, padding: "5px 10px 6px", flexShrink: 0 }}>
              <div style={{ display: "flex", height: 3, marginBottom: 4 }}>{FC.map((c, i) => <div key={i} style={{ flex: 1, background: c }} />)}</div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                <button onClick={async () => { if (isOnline) await leaveMatch(); setScreen("setup"); setGame(null); setIsOnline(false); }} style={{ background: "none", border: "none", color: P.tM, fontSize: 10, fontFamily: F, cursor: "pointer" }}>← EXIT</button>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {isOnline && roomCode && <span style={{ fontSize: 9, fontFamily: F, color: P.tM + "88", letterSpacing: 1 }}>{roomCode}</span>}
                  <span style={{ fontSize: 10, fontFamily: F, color: P.saffron }}>MALA {game.pool.length}</span>
                </div>
              </div>
              <MantraBar progress={game.progress} recs={game.recs} compact scoredSyls={game.scoredIds ? new Set(game.chain?.filter(n => game.scoredIds.has(n.id)).map(n => n.syllable) || []) : null} />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginTop: 4 }}>
                {game.players.map((p, i) => {
                  const isMe = isOnline ? i === myPlayerIndex : i === game.cur;
                  const isActive = isOnline ? i === game.cur : i === game.cur;
                  return <div key={i} style={{ display: "flex", alignItems: "center", gap: 5, opacity: isActive ? 1 : 0.4 }}>
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: PC[i] }} />
                    <span style={{ fontSize: 20, fontFamily: F, fontWeight: 700, color: PC[i] }}>{p.score}</span>
                    {isOnline && <span style={{ fontSize: 7, fontFamily: F, color: PC[i] + "88" }}>{isMe ? "YOU" : "OPP"}</span>}
                    {!isOnline && <span style={{ fontSize: 8, fontFamily: F, color: P.tM + "88" }}>{p.tiles.length}</span>}
                  </div>;
                })}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, borderLeft: `3px solid ${isMyTurn ? PC[game.cur] : P.tM + "44"}`, background: isMyTurn ? `${PC[game.cur]}12` : "transparent", padding: "3px 6px 3px 10px" }}>
                <span style={{ flex: 1, fontSize: 10, color: isMyTurn ? P.t1 : P.tM, fontFamily: F }}>{msg}</span>
                {isMyTurn && turnTimer !== null && <span style={{ fontSize: 11, fontFamily: F, fontWeight: 700, color: turnTimer <= 5 ? P.red : turnTimer <= 10 ? P.saffron : P.tM }}>{turnTimer}s</span>}
              </div>
            </div>

            {/* BOARD */}
            <div style={{ height: isMobile ? "32vh" : "40vh", flexShrink: 0, background: "#1C2848", overflow: "hidden", borderBottom: `1px solid ${P.gold}10` }}>
              <ChainBoard chain={game.chain} compatEnds={isMyTurn ? compat : []} onEndClick={isMyTurn ? placeOn : () => {}} screenW={screenW} scoredIds={game.scoredIds} />
            </div>

            {/* HAND */}
            <div style={{ flex: 1, background: "#111830", borderTop: `1px solid ${P.gold}10`, padding: isMobile ? "4px 6px" : "8px 20px", overflow: "hidden", display: "flex", flexDirection: "column", minHeight: 0 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: isMobile ? 3 : 6, flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: isOnline ? PC[myPlayerIndex ?? 0] : PC[game.cur] }} />
                  <span style={{ fontSize: 10, fontFamily: F, color: isOnline ? PC[myPlayerIndex ?? 0] : PC[game.cur], fontWeight: 700, letterSpacing: 2 }}>
                    {isOnline ? "YOUR HAND" : PN[game.cur]}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 8, fontFamily: F, color: P.tM }}>{isMyTurn ? `${playable.length}/${sortedHand.length}` : `${sortedHand.length} tiles`}</span>
                  {isMyTurn && playable.length === 0 && game.chain && (<>
                    {canDraw && <button onClick={drawTile} style={{ background: P.saffron + "22", color: P.saffron, border: `1px solid ${P.saffron}55`, fontFamily: F, fontSize: 8, fontWeight: 700, padding: "3px 7px", cursor: "pointer" }}>DRAW 3</button>}
                    <button onClick={pass} style={{ background: "none", color: P.t2, border: `1px solid ${P.tM}44`, fontFamily: F, fontSize: 8, padding: "3px 7px", cursor: "pointer" }}>PASS</button>
                  </>)}
                </div>
              </div>

              <div style={{ fontSize: 8, fontFamily: F, color: P.tM, marginBottom: isMobile ? 3 : 5, flexShrink: 0 }}>
                {!isMyTurn ? "Waiting for opponent..." : !game.chain ? "TAP ANY TILE" : game.sel ? "TAP END ON BOARD" : playable.length ? "TAP A LIT TILE" : game.lastDraw ? `Drew: ${game.lastDraw.connector}→${game.lastDraw.payload}` : ""}
              </div>

              {/* Hand always visible — dimmed + locked on opponent turn */}
              <div style={{ flex: 1, overflowY: "auto", minHeight: 0, opacity: isMyTurn ? 1 : 0.45, pointerEvents: isMyTurn ? "auto" : "none" }}>
                <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, ${tW}px)`, gap: `${hGap}px ${hGap}px`, justifyContent: "center", alignContent: "start" }}>
                  {sortedHand.map(t => {
                    const isPlayable = isMyTurn && playableIds.has(t.id);
                    return <HTile key={t.id} tile={t} tileW={tW} isDesktop={!isMobile}
                      onClick={isPlayable ? () => selTile(t) : undefined}
                      selected={game.sel?.id === t.id}
                      lit={isPlayable} />;
                  })}
                </div>
              </div>
            </div>

            {/* Disconnect banner */}
            {opponentGone && (
              <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", background: "#0D1225EE", border: `1px solid ${P.red}44`, padding: "24px 32px", textAlign: "center", zIndex: 10 }}>
                <div style={{ fontSize: 12, fontFamily: F, color: P.red, letterSpacing: 2, marginBottom: 12 }}>OPPONENT DISCONNECTED</div>
                <button className="dm-b" onClick={() => { leaveMatch(); setScreen("setup"); setGame(null); setIsOnline(false); setOpponentGone(false); }}>← Back to Menu</button>
              </div>
            )}
          </div>
        );
      })()}

      {/* ── END ── */}
      {screen === "end" && game && (
        <div style={{ position: "relative", zIndex: 3, maxWidth: 480, margin: "0 auto", padding: "50px 16px 60px", textAlign: "center", animation: "fadeUp 0.5s" }}>
          <div style={{ fontSize: 9, letterSpacing: 6, color: P.tM, fontFamily: F }}>TCCT</div>
          <h1 style={{ fontSize: 36, fontWeight: 700, color: P.bGold, lineHeight: 1, fontFamily: F, marginBottom: 6 }}>GAME OVER</h1>
          <div style={{ margin: "16px 0" }}><MantraBar progress={game.progress} recs={game.recs} /></div>
          {isOnline && myPlayerIndex !== null && (
            <div style={{ fontSize: 13, fontFamily: F, color: winner === myPlayerIndex ? P.bGold : P.tM, letterSpacing: 2, marginBottom: 8 }}>
              {winner === myPlayerIndex ? "🏆 YOU WIN" : winner === null ? "DRAW" : "YOU LOSE"}
            </div>
          )}
          {winner !== null ? <div style={{ fontSize: 22, color: PC[winner], fontFamily: F, fontWeight: 700, marginBottom: 22 }}>{isOnline ? `Player ${winner + 1} wins` : `${PN[winner]} Wins!`}</div>
            : <div style={{ fontSize: 22, color: P.teal, fontFamily: F, fontWeight: 700, marginBottom: 22 }}>Tie!</div>}
          <div style={{ display: "flex", gap: 14, justifyContent: "center", marginBottom: 28 }}>
            {game.players.map((p, i) => (
              <div key={i} style={{ padding: "16px 26px", border: `2px solid ${winner === i ? PC[i] : P.gold + "20"}`, background: winner === i ? `${PC[i]}10` : "transparent", minWidth: 120 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: PC[i], margin: "0 auto 6px" }} />
                <div style={{ fontSize: 10, fontFamily: F, color: PC[i], letterSpacing: 2 }}>{isOnline ? (i === myPlayerIndex ? "YOU" : "OPPONENT") : PN[i]}</div>
                <div style={{ fontSize: 36, fontFamily: F, fontWeight: 700, color: PC[i], margin: "4px 0" }}>{p.score}</div>
                <div style={{ fontSize: 9, color: P.tM, fontFamily: F }}>{game.placed[i]} played · {p.tiles.length} left</div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexDirection: "column", alignItems: "center" }}>
            {!isOnline && <button className="dm-b" onClick={() => { setGame(initG()); setScreen("game"); setMsg("Player 1 — play any tile"); }}>Play Again</button>}
            <button className="dm-s" onClick={async () => { if (isOnline) await leaveMatch(); setScreen("setup"); setGame(null); setIsOnline(false); }}>← Menu</button>
          </div>
          <footer style={{ marginTop: 36 }}><div style={{ display: "flex", height: 3 }}>{FC.map((c, i) => <div key={i} style={{ flex: 1, background: c }} />)}</div><p style={{ fontSize: 8, color: P.tM, fontFamily: F, marginTop: 8 }}>Domi-Mo · TCCT</p></footer>
        </div>
      )}
    </div>
  );
}
