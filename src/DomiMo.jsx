import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useMultiplayer } from "./useMultiplayer.js";

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
const F = "'Space Mono',monospace";

// ── pure game logic ────────────────────────────────────────────────────────────
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
const toRaw = g => ({
  ...g,
  progress: [...(g.progress instanceof Set ? g.progress : new Set(g.progress || []))],
  scoredIds: g.scoredIds instanceof Set ? [...g.scoredIds] : (Array.isArray(g.scoredIds) ? g.scoredIds : null),
});
const fromRaw = g => ({
  ...g,
  progress: new Set(g.progress || []),
  scoredIds: g.scoredIds ? new Set(g.scoredIds) : null,
});

// ── ChainBoard ─────────────────────────────────────────────────────────────────
function ChainBoard({ chain, compatEnds, onEndClick, screenW, scoredIds }) {
  if (!chain) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontSize: 15, color: P.tM + "88", fontStyle: "italic", fontFamily: F }}>
      Play a tile to start
    </div>
  );
  const len = chain.length;
  const isMobileBoard = (screenW || 400) < 600;
  const EDGE = isMobileBoard ? 34 : 58;
  const SYL_FONT = isMobileBoard ? 10 : 15;
  const TIB_FONT = isMobileBoard ? 14 : 22;
  const GAP = isMobileBoard ? 2 : 4, VIS = 5, DOT = isMobileBoard ? 4 : 6, MAX_DOTS = 2;
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
        <span style={{ fontSize: SYL_FONT, color: SC[si], fontFamily: F, fontWeight: 700, lineHeight: 1 }}>{nd.syllable}</span>
        <span style={{ fontSize: TIB_FONT, color: SC[si], lineHeight: 1, marginTop: 1 }}>{TIB[si]}</span>
        <div style={{ position: "absolute", bottom: 1, right: 1, width: 3, height: 3, borderRadius: "50%", background: PC[nd.placedBy] }} />
      </div>
    );
  };
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: GAP }}>
        {leftNodes.map(nd => renderCell(nd))}
        {midSample.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 1, padding: "0 2px" }}>
            {midSample.map(nd => { const si = SYL.indexOf(nd.syllable); return <div key={nd.id} style={{ width: DOT, height: DOT, borderRadius: 1, background: SC[si] + "66", flexShrink: 0 }} />; })}
          </div>
        )}
        {rightNodes.map(nd => renderCell(nd))}
      </div>
    </div>
  );
}

// ── HTile ──────────────────────────────────────────────────────────────────────
function HTile({ tile, onClick, selected, lit, tileW, isDesktop, tileH }) {
  const ci = SYL.indexOf(tile.connector), pi = SYL.indexOf(tile.payload);
  const dim = !lit && !selected;
  const w = tileW || 80;
  const sylSz = isDesktop ? 13 : (w < 80 ? 9 : 10);
  const tibSz = isDesktop ? 22 : (w < 80 ? 14 : 16);
  const divH = isDesktop ? 32 : (w < 80 ? 20 : 24);
  return (
    <div onClick={onClick} style={{
      display: "flex", alignItems: "center",
      padding: isDesktop ? "6px 5px" : (w < 80 ? "3px 2px" : "4px 3px"),
      width: w,
      height: tileH || undefined,
      background: selected ? `${P.yellow}30` : lit ? `${P.navy}DD` : `${P.navy}55`,
      border: selected ? `2px solid ${P.yellow}` : lit ? `2px solid ${SC[ci]}77` : `1px solid ${P.gold}22`,
      cursor: onClick ? "pointer" : "default",
      boxShadow: selected ? `0 0 18px ${P.yellow}66, inset 0 0 10px ${P.yellow}18` : lit ? `0 0 8px ${SC[ci]}33` : "none",
      opacity: dim ? 0.35 : 1, position: "relative", flexShrink: 0,
    }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "1px 2px" }}>
        <span style={{ fontSize: sylSz, color: SC[ci], fontFamily: F, fontWeight: 700 }}>{tile.connector}</span>
        <span style={{ fontSize: tibSz, color: SC[ci], lineHeight: 1 }}>{TIB[ci]}</span>
      </div>
      <div style={{ width: 1, height: divH, background: dim ? P.gold + "10" : P.gold + "33" }} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "1px 2px" }}>
        <span style={{ fontSize: sylSz, color: SC[pi], fontFamily: F, fontWeight: 700 }}>{tile.payload}</span>
        <span style={{ fontSize: tibSz, color: SC[pi], lineHeight: 1 }}>{TIB[pi]}</span>
      </div>
      {tile.isDouble && <div style={{ position: "absolute", top: 0, right: 2, fontSize: 6, color: P.saffron + "BB" }}>⬥</div>}
    </div>
  );
}

// ── MantraBar ──────────────────────────────────────────────────────────────────
function MantraBar({ progress, recs, compact, scoredSyls }) {
  const prog = progress instanceof Set ? progress : new Set(progress || []);
  return (
    <div style={{ display: "flex", gap: compact ? 2 : 3, justifyContent: "center" }}>
      {MANTRA.map((s, i) => {
        const lit = prog.has(s), si = SYL.indexOf(s);
        const justScored = scoredSyls && scoredSyls.has(s);
        return (
          <div key={i} style={{
            flex: compact ? 1 : undefined, width: compact ? undefined : 50,
            maxWidth: compact ? 60 : undefined,
            height: compact ? 42 : 48,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            background: lit ? `${SC[si]}30` : `${SC[si]}11`,
            borderBottom: `3px solid ${lit ? SC[si] : SC[si] + "55"}`,
            boxShadow: lit ? `0 0 18px ${SC[si]}55, inset 0 0 14px ${SC[si]}20` : "none",
            transition: "all 0.3s",
            animation: justScored ? "scorePulse 0.8s ease" : "none",
          }}>
            <span style={{ fontSize: compact ? 12 : 13, color: lit ? SC[si] : SC[si] + "99", fontFamily: F, fontWeight: 700, lineHeight: 1 }}>{s}</span>
            <span style={{ fontSize: compact ? 16 : 20, color: lit ? SC[si] : SC[si] + "66", textShadow: lit ? `0 0 10px ${SC[si]}66` : "none", lineHeight: 1, marginTop: 2 }}>{TIB[i]}</span>
          </div>
        );
      })}
      <div style={{ display: "flex", alignItems: "center", padding: "0 5px" }}>
        <span style={{ fontSize: compact ? 12 : 13, fontFamily: F, color: P.bGold, fontWeight: 700 }}>{recs}/2</span>
      </div>
    </div>
  );
}

// ── TileDemo ─────────────────────────────────────────────────────────────────────────────────
function TileDemo() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setStep(s => (s + 1) % 4), 1800);
    return () => clearInterval(iv);
  }, []);
  const S = 32, TF = "'Space Mono',monospace";
  const cellStyle = (si, glow) => ({
    width: S, height: S + 4, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    background: `${SC[si]}${glow ? "18" : "0A"}`, border: `1px solid ${SC[si]}${glow ? "88" : "33"}`,
    boxShadow: glow ? `0 0 12px ${SC[si]}44` : "none", transition: "all 0.4s",
  });
  const lbl = (si, txt) => <span style={{ fontSize: 8, color: SC[si], fontFamily: TF, fontWeight: 700, lineHeight: 1 }}>{txt}</span>;
  const tb = (si) => <span style={{ fontSize: 12, color: SC[si], lineHeight: 1 }}>{TIB[si]}</span>;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, margin: "10px 0 14px", padding: "10px 0", borderTop: `1px solid ${P.royalBlue}15`, borderBottom: `1px solid ${P.royalBlue}15` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
        <div style={cellStyle(0, false)}>{lbl(0, "AH")}{tb(0)}</div>
        <div style={cellStyle(1, step >= 2)}>{lbl(1, "RA")}{tb(1)}</div>
        {step >= 1 && step < 3 && <>
          <div style={{
            display: "flex", alignItems: "center", padding: "2px 1px",
            border: `1px solid ${step >= 2 ? P.yellow + "66" : P.gold + "22"}`,
            background: step >= 2 ? `${P.yellow}10` : "transparent",
            transition: "all 0.5s", marginLeft: step >= 2 ? -2 : 8,
            opacity: step >= 2 ? 0.6 : 1,
          }}>
            <div style={{ padding: "3px 4px", display: "flex", flexDirection: "column", alignItems: "center", background: `${SC[1]}08` }}>
              {lbl(1, "RA")}{tb(1)}
            </div>
            <div style={{ width: 1, height: 18, background: P.gold + "22" }} />
            <div style={{ padding: "3px 4px", display: "flex", flexDirection: "column", alignItems: "center" }}>
              {lbl(2, "PA")}{tb(2)}
            </div>
          </div>
        </>}
        {step >= 3 && <div style={{ ...cellStyle(2, true), animation: "scoreFlash 0.8s ease" }}>{lbl(2, "PA")}{tb(2)}</div>}
      </div>
      <div style={{ fontSize: 9, fontFamily: TF, color: P.tM + "88", textAlign: "center" }}>
        {step === 0 && "chain ends with RA..."}
        {step === 1 && "tile RA→PA: connector matches end"}
        {step === 2 && "connector merges with chain end"}
        {step === 3 && "payload PA becomes the new end ✓"}
      </div>
    </div>
  );
}

// ── MantraAnim ─────────────────────────────────────────────────────────────────
function MantraAnim() {
  const [active, setActive] = useState(0);
  useEffect(() => { const iv = setInterval(() => setActive(a => (a + 1) % 8), 600); return () => clearInterval(iv); }, []);
  return (
    <div style={{ display: "flex", justifyContent: "center", gap: 5, marginBottom: 20 }}>
      {SYL.map((s, i) => {
        const lit = i <= active && active < 6, pulse = i === active && active < 6;
        return (
          <div key={i} style={{
            textAlign: "center", padding: "8px 10px",
            borderBottom: `3px solid ${lit ? SC[i] : SC[i] + "44"}`,
            background: lit ? `${SC[i]}20` : "transparent",
            boxShadow: pulse ? `0 0 20px ${SC[i]}55` : "none",
            transition: "all 0.3s", transform: pulse ? "scale(1.1)" : "scale(1)",
          }}>
            <span style={{ fontSize: 13, color: lit ? SC[i] : SC[i] + "66", fontFamily: F, fontWeight: 700 }}>{s}</span>
            <span style={{ fontSize: 28, color: lit ? SC[i] : SC[i] + "44", display: "block", lineHeight: 1, marginTop: 3, textShadow: pulse ? `0 0 12px ${SC[i]}66` : "none" }}>{TIB[i]}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── MobileHand — measures container height to fit all tiles without scroll ──────
function MobileHand({ tiles, cols, gap, playableIds, selId, onTile, isMyTurn }) {
  const ref = React.useRef(null);
  const [tileH, setTileH] = React.useState(null);
  const [tileW, setTileW] = React.useState(80);

  React.useEffect(() => {
    if (!ref.current) return;
    const measure = () => {
      const { width, height } = ref.current.getBoundingClientRect();
      const rows = Math.ceil(tiles.length / cols);
      const availH = height - (rows - 1) * gap;
      const h = Math.floor(availH / rows);
      const w = Math.floor((width - (cols - 1) * gap) / cols);
      setTileH(Math.max(h, 28));
      setTileW(Math.min(w, 84));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, [tiles.length, cols, gap]);

  return (
    <div ref={ref} style={{ flex: 1, overflow: "hidden", minHeight: 0, pointerEvents: isMyTurn ? "auto" : "none", opacity: isMyTurn ? 1 : 0.45 }}>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, ${tileW}px)`, gridAutoRows: tileH || "auto", gap: `${gap}px`, justifyContent: "center", alignContent: "start", height: "100%" }}>
        {tiles.map(t => (
          <HTile key={t.id} tile={t} tileW={tileW} tileH={tileH} isDesktop={false}
            onClick={isMyTurn && playableIds.has(t.id) ? () => onTile(t) : undefined}
            selected={selId === t.id}
            lit={isMyTurn && playableIds.has(t.id)} />
        ))}
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function DomiMo({ onBack }) {
  const [screen, setScreen] = useState("lobby"); // lobby | game | end
  const [game, setGame] = useState(null);
  const [msg, setMsg] = useState("");
  const [myPlayerIndex, setMyPlayerIndex] = useState(null);
  const [opponentGone, setOpponentGone] = useState(false);
  const [lobbyView, setLobbyView] = useState("menu"); // menu | waiting | join
  const [codeInput, setCodeInput] = useState("");
  const [copied, setCopied] = useState(false);
  const [screenW, setScreenW] = useState(typeof window !== "undefined" ? window.innerWidth : 400);
  useEffect(() => { const h = () => setScreenW(window.innerWidth); window.addEventListener("resize", h); return () => window.removeEventListener("resize", h); }, []);

  // Clear score flash
  useEffect(() => {
    if (game?.scoredIds) {
      const t = setTimeout(() => setGame(g => g ? { ...g, scoredIds: null } : g), 1000);
      return () => clearTimeout(t);
    }
  }, [game?.scoredIds]);

  // ── multiplayer hook ──
  const handleRemoteState = useCallback((rawGs, myIdx) => {
    const gs = fromRaw(rawGs);
    setMyPlayerIndex(myIdx);
    if (gs.phase === "ended") { setScreen("end"); setMsg("Mantra complete!"); }
    else {
      setScreen("game");
      setMsg(gs.cur === myIdx ? "Your turn" : "Opponent's turn...");
    }
    setGame(gs);
  }, []);

  const { mpStatus, myPlayerIndex: _hookPlayerIdx, roomCode, error: mpError, quickMatch, createRoom, joinByCode, pushGameState, leaveMatch } = useMultiplayer({
    onGameStateUpdate: handleRemoteState,
    onOpponentDisconnect: () => setOpponentGone(true),
  });

  // Sync player index from hook (for host, set before handleRemoteState fires)
  useEffect(() => {
    if (_hookPlayerIdx !== null) setMyPlayerIndex(_hookPlayerIdx);
  }, [_hookPlayerIdx]);

  // Host: once opponent joins, push initial game state
  // Use a ref to ensure we only push once even if effect re-fires
  const hostPushedRef = useRef(false);
  useEffect(() => {
    if (mpStatus === "connected" && myPlayerIndex === 0 && !hostPushedRef.current) {
      hostPushedRef.current = true;
      const g = initG();
      setGame(g);
      setScreen("game");
      setMsg("Your turn — play any tile");
      // Small delay so P2's subscription is ready before we push
      setTimeout(() => pushGameState(toRaw(g)), 800);
    }
    // Reset flag when we leave a match
    if (mpStatus === "idle") hostPushedRef.current = false;
  }, [mpStatus, myPlayerIndex, pushGameState]);

  // ── lobby actions ──
  const handleQuickMatch = async () => {
    setLobbyView("waiting");
    await quickMatch();
  };
  const handleCreateRoom = async () => {
    setLobbyView("waiting");
    await createRoom();
  };
  const handleJoin = async () => {
    if (!codeInput.trim()) return;
    await joinByCode(codeInput.trim());
  };
  const handleCancel = async () => {
    await leaveMatch();
    setLobbyView("menu");
    setCodeInput("");
  };

  const copyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── game state ──
  const ends = useMemo(() => game?.chain ? getEnds(game.chain) : [], [game?.chain]);
  const myHand = useMemo(() => (game && myPlayerIndex !== null) ? game.players[myPlayerIndex].tiles : [], [game, myPlayerIndex]);
  const isMyTurn = useMemo(() => game?.cur === myPlayerIndex, [game, myPlayerIndex]);
  const playable = useMemo(() => game ? (game.chain ? findPlay(myHand, ends) : myHand) : [], [game, myHand, ends]);
  const compat = useMemo(() => game?.sel && game.chain ? getCompat(game.sel, ends) : [], [game?.sel, ends]);
  const playableIds = useMemo(() => new Set(playable.map(t => t.id)), [playable]);
  const sortedHand = useMemo(() => [...myHand].sort((a, b) => {
    const ca = SYL.indexOf(a.connector), cb = SYL.indexOf(b.connector);
    return ca !== cb ? ca - cb : SYL.indexOf(a.payload) - SYL.indexOf(b.payload);
  }), [myHand]);

  function placeTile(g, tile, endSide) {
    const ch = g.chain ? g.chain.map(n => ({ ...n })) : [];
    const pn = mkN(tile.payload, myPlayerIndex);
    if (!g.chain) ch.push(mkN(tile.connector, myPlayerIndex), pn);
    else if (endSide === "right") ch.push(pn);
    else ch.unshift(pn);
    const nt = g.players[myPlayerIndex].tiles.filter(t => t.id !== tile.id);
    const bp = g.players.map((p, i) => i === myPlayerIndex ? { ...p, tiles: nt } : { ...p });
    const { sc, npl, np, nr, ended, nfr } = doSc(ch, pn.id, myPlayerIndex, bp, g.progress, g.recs, g.firstRec);
    const tp = [...g.placed]; tp[myPlayerIndex]++;
    const scored = sc.pts > 0;
    const canStreak = scored && g.streak < 2;
    const nx = canStreak ? myPlayerIndex : myPlayerIndex ^ 1;
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
    if (ended) setMsg("Mantra complete!");
    else setMsg(nx === myPlayerIndex
      ? canStreak ? `+${sc.pts} (${sc.syls.join("→")}) — streak! Go again` : "Your turn"
      : "Opponent's turn...");
    const newG = { ...g, chain: ch, players: npl, sel: null, cur: nx, passes: 0, draws: 0, progress: np, recs: nr, phase: ended ? "ended" : "playing", firstRec: nfr, placed: tp, lastDraw: null, streak: newStreak, scoredIds };
    if (ended) setScreen("end");
    pushGameState(toRaw(newG));
    return newG;
  }

  const selTile = useCallback((tile) => {
    if (!game || game.phase === "ended" || !isMyTurn) return;
    setGame(g => {
      if (g.sel?.id === tile.id) return { ...g, sel: null };
      if (!g.chain) return placeTile(g, tile, "right");
      return { ...g, sel: tile };
    });
  }, [game, isMyTurn, myPlayerIndex]);

  const placeOn = useCallback((end) => {
    if (!game?.sel || !isMyTurn) return;
    setGame(g => placeTile(g, g.sel, end.side));
  }, [game, isMyTurn, myPlayerIndex]);

  const drawTile = useCallback(() => {
    if (!game || game.draws >= 1 || !game.pool.length || !isMyTurn) return;
    setGame(g => {
      const np = [...g.pool];
      const drawn = [];
      for (let i = 0; i < 3 && np.length; i++) drawn.push(np.pop());
      const nt = [...g.players[myPlayerIndex].tiles, ...drawn];
      const npl = g.players.map((p, i) => i === myPlayerIndex ? { ...p, tiles: nt } : { ...p });
      const names = drawn.map(d => `${d.connector}→${d.payload}`).join(", ");
      const anyPlayable = drawn.some(d => getEnds(g.chain).some(e => e.node.syllable === d.connector));
      setMsg(anyPlayable ? `Drew: ${names} — check hand!` : `Drew: ${names} — no match, pass.`);
      const newG = { ...g, pool: np, players: npl, draws: 1, lastDraw: drawn[drawn.length - 1] };
      pushGameState(toRaw(newG));
      return newG;
    });
  }, [game, isMyTurn, myPlayerIndex, pushGameState]);

  const pass = useCallback(() => {
    if (!game || !isMyTurn) return;
    setGame(g => {
      const np = g.passes + 1;
      if (np >= 2) {
        setScreen("end"); setMsg("Two passes — game over!");
        const newG = { ...g, passes: np, phase: "ended" };
        pushGameState(toRaw(newG));
        return newG;
      }
      const nx = myPlayerIndex ^ 1;
      setMsg("Opponent's turn...");
      const newG = { ...g, cur: nx, passes: np, draws: 0, sel: null, lastDraw: null };
      pushGameState(toRaw(newG));
      return newG;
    });
  }, [game, isMyTurn, myPlayerIndex, pushGameState]);

  const canDraw = game && isMyTurn && !playable.length && game.draws < 1 && game.pool.length > 0;

  const winner = useMemo(() => {
    if (!game || game.phase !== "ended") return null;
    const [a, b] = [game.players[0].score, game.players[1].score];
    if (a !== b) return a > b ? 0 : 1;
    if (game.firstRec !== null) return game.firstRec;
    return game.placed[0] !== game.placed[1] ? (game.placed[0] > game.placed[1] ? 0 : 1) : null;
  }, [game]);

  const exitToLobby = useCallback(async () => {
    await leaveMatch();
    setGame(null);
    setMyPlayerIndex(null);
    setOpponentGone(false);
    setLobbyView("menu");
    setScreen("lobby");
  }, [leaveMatch]);

  // ── CSS ──
  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;0,700;1,300;1,400&family=Space+Mono:wght@400;700&display=swap');
    *{box-sizing:border-box;margin:0;padding:0}
    @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
    @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
    @keyframes ep{0%,100%{border-color:${P.yellow}88;box-shadow:0 0 8px ${P.yellow}33}50%{border-color:${P.yellow};box-shadow:0 0 20px ${P.yellow}66}}
    @keyframes scoreFlash{0%{transform:scale(1)}20%{transform:scale(1.18);box-shadow:0 0 28px currentColor}100%{transform:scale(1)}}
    @keyframes scorePulse{0%{transform:scale(1)}20%{transform:scale(1.25)}100%{transform:scale(1)}}
    @keyframes pulse{0%,100%{opacity:0.3;transform:scale(0.8)}50%{opacity:1;transform:scale(1.2)}}
    .dm-b{background:${P.yellow};color:${P.navy};border:none;font-family:${F};font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;padding:14px 32px;cursor:pointer;transition:all 0.2s}
    .dm-b:hover{background:${P.orange};transform:translateY(-1px)}
    .dm-b:disabled{opacity:0.2;cursor:default;transform:none}
    .dm-s{background:transparent;color:${P.t2};border:1px solid ${P.tM}55;font-family:${F};font-size:10px;letter-spacing:2px;text-transform:uppercase;padding:8px 16px;cursor:pointer;transition:all 0.2s}
    .dm-s:hover{border-color:${P.t1};color:${P.t1}}
    ::-webkit-scrollbar{width:3px;height:3px}
    ::-webkit-scrollbar-thumb{background:${P.gold}44;border-radius:2px}
  `;

  return (
    <div style={{ minHeight: "100vh", maxWidth: "100vw", overflow: "hidden", color: P.t1, fontFamily: "'Cormorant Garamond',Georgia,serif", position: "relative" }}>
      <style>{css}</style>

      {/* bg */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        <div style={{ position: "absolute", inset: 0, background: "#1A2240" }} />
        <div style={{ position: "absolute", top: "10%", left: "50%", transform: "translateX(-50%)", width: "180%", height: "80%", background: "radial-gradient(ellipse at 50% 50%, #28336A 0%, transparent 60%)" }} />
      </div>

      {/* ══ LOBBY ══════════════════════════════════════════════════════════════ */}
      {screen === "lobby" && (
        <div style={{ position: "relative", zIndex: 3, maxWidth: 460, margin: "0 auto", padding: "32px 16px 60px", textAlign: "center", animation: "fadeIn 0.5s" }}>
          <div style={{ textAlign: "left", marginBottom: 24 }}>
            <button className="dm-s" onClick={onBack}>← Mo Oracle</button>
          </div>

          <div style={{ fontSize: 9, letterSpacing: 6, color: P.tM, fontFamily: F }}>TCCT</div>
          <h1 style={{ fontSize: 46, fontWeight: 700, color: P.bGold, lineHeight: 1, letterSpacing: -1, fontFamily: F }}>DOMI-MO</h1>
          <p style={{ fontSize: 10, letterSpacing: 5, color: P.tM, fontFamily: F, marginTop: 4, marginBottom: 24 }}>TIBETAN MANTRA DOMINOS</p>

          <MantraAnim />

          {/* ── WAITING / SEARCHING state ── */}
          {(lobbyView === "waiting") && (
            <div style={{ background: "#1E2850", border: `1px solid ${P.royalBlue}25`, padding: "28px 20px", marginBottom: 20 }}>
              <div style={{ fontSize: 9, letterSpacing: 5, color: P.tM, fontFamily: F, marginBottom: 16 }}>
                {mpStatus === "searching" ? "SEARCHING..." : "WAITING FOR OPPONENT"}
              </div>
              <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 24 }}>
                {[0, 1, 2].map(i => <div key={i} style={{ width: 9, height: 9, borderRadius: "50%", background: P.bGold, animation: `pulse 1.2s ease ${i * 0.4}s infinite` }} />)}
              </div>
              {roomCode && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 9, color: P.tM, fontFamily: F, letterSpacing: 3, marginBottom: 8 }}>ROOM CODE — share with a friend</div>
                  <div style={{ fontSize: 26, fontFamily: F, fontWeight: 700, color: P.bGold, letterSpacing: 3, marginBottom: 12 }}>{roomCode}</div>
                  <button onClick={copyCode} style={{ background: copied ? `${P.green}22` : `${P.gold}18`, color: copied ? P.green : P.t2, border: `1px solid ${copied ? P.green + "66" : P.gold + "33"}`, fontFamily: F, fontSize: 9, padding: "5px 14px", cursor: "pointer", letterSpacing: 2 }}>
                    {copied ? "COPIED ✓" : "COPY CODE"}
                  </button>
                </div>
              )}
              {mpError && <div style={{ fontSize: 10, color: P.red, fontFamily: F, marginBottom: 12 }}>{mpError}</div>}
              <button className="dm-s" onClick={handleCancel}>Cancel</button>
            </div>
          )}

          {/* ── JOIN state ── */}
          {lobbyView === "join" && (
            <div style={{ background: "#1E2850", border: `1px solid ${P.royalBlue}25`, padding: "28px 20px", marginBottom: 20 }}>
              <div style={{ fontSize: 10, color: P.tM, fontFamily: F, letterSpacing: 3, marginBottom: 16 }}>ENTER ROOM CODE</div>
              <input
                value={codeInput}
                onChange={e => setCodeInput(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === "Enter" && handleJoin()}
                placeholder="AH-RA-PA-TSA"
                style={{ background: `${P.navy}AA`, border: `1px solid ${P.gold}44`, color: P.t1, fontFamily: F, fontSize: 16, padding: "10px 16px", width: "100%", textAlign: "center", letterSpacing: 3, marginBottom: 8, outline: "none" }}
              />
              {mpError && <div style={{ fontSize: 10, color: P.red, fontFamily: F, marginBottom: 12 }}>{mpError}</div>}
              <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 8 }}>
                <button className="dm-b" onClick={handleJoin} disabled={!codeInput.trim()}>Join</button>
                <button className="dm-s" onClick={() => { setLobbyView("menu"); setCodeInput(""); }}>← Back</button>
              </div>
            </div>
          )}

          {/* ── MENU state ── */}
          {lobbyView === "menu" && (
            <>
              <div style={{ background: "#1E2850", border: `1px solid ${P.royalBlue}25`, padding: "24px 20px", marginBottom: 20 }}>
                {mpError && <div style={{ fontSize: 10, color: P.red, fontFamily: F, marginBottom: 16, padding: "8px", border: `1px solid ${P.red}33` }}>{mpError}</div>}
                <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
                  <button className="dm-b" onClick={handleQuickMatch} style={{ width: 240 }}>⚡ Quick Match</button>
                  <button className="dm-s" onClick={handleCreateRoom} style={{ width: 240 }}>Create Room</button>
                  <button className="dm-s" onClick={() => setLobbyView("join")} style={{ width: 240 }}>Join with Code</button>
                </div>
                <div style={{ fontSize: 11, color: P.tM + "88", fontFamily: F, marginTop: 16, lineHeight: 1.9, textAlign: "center" }}>
                  Quick Match pairs you instantly<br />or creates a room if no one's waiting
                </div>
              </div>

              <div style={{ background: `${P.royalBlue}12`, border: `1px solid ${P.bGold}22`, padding: "16px 14px", marginBottom: 22, textAlign: "center" }}>
                <p style={{ fontSize: 11, letterSpacing: 4, color: P.bGold, fontFamily: F, fontWeight: 700, marginBottom: 8 }}>OM AH RA PA TSA NA DHI</p>
                <p style={{ fontSize: 14, lineHeight: 1.8, color: P.t2 }}>
                  A sacred invocation of Manjushri, the Bodhisattva of Wisdom. Each syllable carries the energy of <span style={{ color: P.t1 }}>clarity, sharp intellect, and deep understanding</span>. Practitioners chant this mantra to dissolve confusion, strengthen memory, and awaken the kind of insight that sees through surface into the heart of things.
                </p>
              </div>

              <div style={{ background: "#1A2040", border: `1px solid ${P.royalBlue}15`, padding: "18px 16px", marginBottom: 24, textAlign: "left" }}>
                <h3 style={{ fontSize: 11, color: P.bGold, fontWeight: 700, marginBottom: 10, fontFamily: F, letterSpacing: 2 }}>HOW TO PLAY</h3>
                <div style={{ fontSize: 15, lineHeight: 1.9, color: P.t2 }}>
                  <p style={{ marginBottom: 12 }}>Each tile has a <span style={{ color: P.bGold }}>connector</span> and a <span style={{ color: P.teal }}>payload</span>. The connector matches an open chain end — the payload becomes the new end.</p>
                  <TileDemo />
                  <p style={{ marginBottom: 8 }}>Build mantra sequences reading left→right: <span style={{ color: P.bGold, fontFamily: F }}>AH→RA→PA→TSA→NA→DHI</span>.</p>
                  <p style={{ marginBottom: 8 }}><span style={{ color: P.bGold, fontFamily: F }}>Points:</span> 2 in a row = 1 · 3 = 3 · 4 = 7 · 5 = 15 · full mantra = 30.</p>
                  <p style={{ marginBottom: 8 }}><span style={{ color: P.saffron }}>Streaks:</span> score a segment and go again — up to 2 bonus turns. Chain your moves wisely.</p>
                  <p style={{ marginBottom: 8 }}>Can't play? Draw <span style={{ color: P.saffron }}>3 tiles</span> from the Mala Pool. Still stuck? Pass. Two consecutive passes end the game.</p>
                  <p>Fill the mantra bar twice to win. Highest score takes it.</p>
                </div>
              </div>
            </>
          )}

          <div style={{ fontSize: 10, color: P.tM + "88", fontFamily: F, letterSpacing: 2 }}>20 TILES · MALA 108</div>
        </div>
      )}

      {/* ══ GAME ═══════════════════════════════════════════════════════════════ */}
      {screen === "game" && game && (() => {
        const isMobile = screenW < 600;

        // ── tile sizing ──
        // Mobile: fit ALL tiles in hand area without scroll
        // 20 tiles max, 4 cols = 5 rows. Calculate tile width to fit.
        const mCols = 4, mGap = 3, mPad = 8;
        // We'll compute tileW after we know available height — use fixed for now,
        // height is computed via CSS flex. Width-first: fit 4 cols in screen.
        const mRawW = Math.floor((screenW - mPad * 2 - (mCols - 1) * mGap) / mCols);
        const mTileW = Math.min(mRawW, 80);

        // Desktop: 4 cols, max tile width, centered
        const dCols = 4, dGap = 12, dPad = 32;
        const dContainerW = Math.min(screenW, 900);
        const dRawW = Math.floor((dContainerW - dPad * 2 - (dCols - 1) * dGap) / dCols);
        const dTileW = Math.min(dRawW, 180);

        const cols = isMobile ? mCols : dCols;
        const hGap = isMobile ? mGap : dGap;
        const tW = isMobile ? mTileW : dTileW;

        // Mobile board: shrink to give hand more room (hand fills remaining flex)
        const boardH = isMobile ? "26vh" : "42vh";

        return (
          <div style={{ position: "fixed", inset: 0, zIndex: 3, display: "flex", flexDirection: "column", maxWidth: "100vw", overflow: "hidden" }}>
            {/* top bar */}
            <div style={{ background: "#131A2E", borderBottom: `1px solid ${P.gold}18`, padding: isMobile ? "5px 10px 6px" : "6px 16px 8px", flexShrink: 0 }}>
              <div style={{ display: "flex", height: 3, marginBottom: 4 }}>{FC.map((c, i) => <div key={i} style={{ flex: 1, background: c }} />)}</div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                <button onClick={exitToLobby} style={{ background: "none", border: "none", color: P.tM, fontSize: isMobile ? 10 : 12, fontFamily: F, cursor: "pointer" }}>← EXIT</button>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {roomCode && <span style={{ fontSize: isMobile ? 8 : 10, fontFamily: F, color: P.tM + "66", letterSpacing: 1 }}>{roomCode}</span>}
                  <span style={{ fontSize: isMobile ? 10 : 12, fontFamily: F, color: P.saffron }}>MALA {game.pool.length}</span>
                </div>
              </div>
              <MantraBar progress={game.progress} recs={game.recs} compact
                scoredSyls={game.scoredIds ? new Set((game.chain || []).filter(n => game.scoredIds.has(n.id)).map(n => n.syllable)) : null} />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: isMobile ? 16 : 32, marginTop: 4 }}>
                {game.players.map((p, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: isMobile ? 5 : 8, opacity: game.cur === i ? 1 : 0.4 }}>
                    <div style={{ width: isMobile ? 7 : 10, height: isMobile ? 7 : 10, borderRadius: "50%", background: PC[i] }} />
                    <span style={{ fontSize: isMobile ? 20 : 28, fontFamily: F, fontWeight: 700, color: PC[i] }}>{p.score}</span>
                    <span style={{ fontSize: isMobile ? 7 : 10, fontFamily: F, color: PC[i] + "88" }}>{i === myPlayerIndex ? "YOU" : "OPP"}</span>
                  </div>
                ))}
              </div>
              <div style={{ textAlign: "center", fontSize: isMobile ? 10 : 12, color: isMyTurn ? P.t1 : P.tM, fontFamily: F, padding: "3px 0 3px 10px", borderLeft: `3px solid ${isMyTurn ? PC[game.cur] : P.tM + "33"}`, marginTop: 4, background: isMyTurn ? `${PC[game.cur]}12` : "transparent" }}>{msg}</div>
            </div>

            {/* board */}
            <div style={{ height: boardH, flexShrink: 0, background: "#1C2848", overflow: "hidden", borderBottom: `1px solid ${P.gold}10` }}>
              <ChainBoard chain={game.chain} compatEnds={isMyTurn ? compat : []} onEndClick={isMyTurn ? placeOn : () => {}} screenW={screenW} scoredIds={game.scoredIds} />
            </div>

            {/* hand — always visible, dimmed + locked on opponent turn */}
            <div style={{ flex: 1, background: "#111830", padding: isMobile ? `4px ${mPad}px` : `8px ${dPad}px`, overflow: "hidden", display: "flex", flexDirection: "column", minHeight: 0 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: isMobile ? 3 : 6, flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: PC[myPlayerIndex ?? 0] }} />
                  <span style={{ fontSize: isMobile ? 10 : 12, fontFamily: F, color: PC[myPlayerIndex ?? 0], fontWeight: 700, letterSpacing: 2 }}>YOUR HAND</span>
                  {!isMyTurn && <span style={{ fontSize: isMobile ? 8 : 9, fontFamily: F, color: P.tM + "88", letterSpacing: 1, marginLeft: 4 }}>— opponent's turn</span>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: isMobile ? 8 : 10, fontFamily: F, color: P.tM }}>{isMyTurn ? `${playable.length}/${sortedHand.length}` : `${sortedHand.length} tiles`}</span>
                  {isMyTurn && playable.length === 0 && game.chain && (<>
                    {canDraw && <button onClick={drawTile} style={{ background: P.saffron + "22", color: P.saffron, border: `1px solid ${P.saffron}55`, fontFamily: F, fontSize: isMobile ? 8 : 10, fontWeight: 700, padding: "3px 7px", cursor: "pointer" }}>DRAW 3</button>}
                    <button onClick={pass} style={{ background: "none", color: P.t2, border: `1px solid ${P.tM}44`, fontFamily: F, fontSize: isMobile ? 8 : 10, padding: "3px 7px", cursor: "pointer" }}>PASS</button>
                  </>)}
                </div>
              </div>

              <div style={{ fontSize: isMobile ? 8 : 10, fontFamily: F, color: P.tM, marginBottom: isMobile ? 3 : 5, flexShrink: 0 }}>
                {!isMyTurn ? "Study your hand while opponent plays..." : !game.chain ? "TAP ANY TILE TO START" : game.sel ? "TAP AN END ON BOARD" : playable.length ? "TAP A LIT TILE" : ""}
              </div>

              {/* tiles — always shown, pointer-events disabled on opponent turn */}
              {isMobile ? (
                <MobileHand
                  tiles={sortedHand}
                  cols={mCols} gap={mGap}
                  playableIds={playableIds}
                  selId={game.sel?.id}
                  onTile={selTile}
                  isMyTurn={isMyTurn}
                />
              ) : (
                <div style={{ flex: 1, overflow: "hidden", minHeight: 0, pointerEvents: isMyTurn ? "auto" : "none", opacity: isMyTurn ? 1 : 0.45 }}>
                  <div style={{ display: "grid", gridTemplateColumns: `repeat(${dCols}, ${dTileW}px)`, gap: `${dGap}px`, justifyContent: "center", alignContent: "start" }}>
                    {sortedHand.map(t => (
                      <HTile key={t.id} tile={t} tileW={dTileW} isDesktop={true}
                        onClick={isMyTurn && playableIds.has(t.id) ? () => selTile(t) : undefined}
                        selected={game.sel?.id === t.id}
                        lit={isMyTurn && playableIds.has(t.id)} />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* disconnect overlay */}
            {opponentGone && (
              <div style={{ position: "absolute", inset: 0, background: "#0D1225CC", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10 }}>
                <div style={{ background: "#1A2240", border: `1px solid ${P.red}44`, padding: "32px 40px", textAlign: "center" }}>
                  <div style={{ fontSize: 12, fontFamily: F, color: P.red, letterSpacing: 2, marginBottom: 20 }}>OPPONENT DISCONNECTED</div>
                  <button className="dm-b" onClick={exitToLobby}>← Back to Lobby</button>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* ══ END ════════════════════════════════════════════════════════════════ */}
      {screen === "end" && game && (
        <div style={{ position: "relative", zIndex: 3, maxWidth: 480, margin: "0 auto", padding: "50px 16px 60px", textAlign: "center", animation: "fadeUp 0.5s" }}>
          <div style={{ fontSize: 9, letterSpacing: 6, color: P.tM, fontFamily: F }}>TCCT</div>
          <h1 style={{ fontSize: 36, fontWeight: 700, color: P.bGold, lineHeight: 1, fontFamily: F, marginBottom: 6 }}>GAME OVER</h1>
          <div style={{ margin: "16px 0" }}><MantraBar progress={game.progress} recs={game.recs} /></div>
          {myPlayerIndex !== null && (
            <div style={{ fontSize: 14, fontFamily: F, color: winner === myPlayerIndex ? P.bGold : P.tM, letterSpacing: 3, marginBottom: 8 }}>
              {winner === myPlayerIndex ? "🏆 YOU WIN" : winner === null ? "DRAW" : "YOU LOSE"}
            </div>
          )}
          <div style={{ display: "flex", gap: 14, justifyContent: "center", marginBottom: 28 }}>
            {game.players.map((p, i) => (
              <div key={i} style={{ padding: "16px 26px", border: `2px solid ${winner === i ? PC[i] : P.gold + "20"}`, background: winner === i ? `${PC[i]}10` : "transparent", minWidth: 120 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: PC[i], margin: "0 auto 6px" }} />
                <div style={{ fontSize: 10, fontFamily: F, color: PC[i], letterSpacing: 2 }}>{i === myPlayerIndex ? "YOU" : "OPPONENT"}</div>
                <div style={{ fontSize: 36, fontFamily: F, fontWeight: 700, color: PC[i], margin: "4px 0" }}>{p.score}</div>
                <div style={{ fontSize: 9, color: P.tM, fontFamily: F }}>{game.placed[i]} played · {p.tiles.length} left</div>
              </div>
            ))}
          </div>
          <button className="dm-s" onClick={exitToLobby}>← Lobby</button>
          <footer style={{ marginTop: 36 }}>
            <div style={{ display: "flex", height: 3 }}>{FC.map((c, i) => <div key={i} style={{ flex: 1, background: c }} />)}</div>
            <p style={{ fontSize: 8, color: P.tM, fontFamily: F, marginTop: 8 }}>Domi-Mo · TCCT</p>
          </footer>
        </div>
      )}
    </div>
  );
}
