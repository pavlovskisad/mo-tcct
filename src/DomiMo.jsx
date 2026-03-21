import { useState, useEffect, useCallback, useMemo } from "react";

const SYL = ["AH", "RA", "PA", "TSA", "NA", "DHI"];
const TIB = ["ཨ", "ར", "པ", "ཙ", "ན", "དྷཱི"];
const MANTRA = ["AH", "RA", "PA", "TSA", "NA", "DHI"];
const POINTS = { 2: 1, 3: 3, 4: 7, 5: 15, 6: 30 };
const P = {
  bGold: "#F0C040", red: "#E8302A", saffron: "#E67E22", green: "#00875A",
  teal: "#008B8B", orange: "#ED6C1B", navy: "#0D1B3E", yellow: "#F5B800",
  royalBlue: "#2744A0", gold: "#D4A017",
  t1: "#F2E8D0", t2: "#D6C9AB", tM: "#A89878",
};
const SC = [P.bGold, P.red, P.green, P.saffron, P.royalBlue, P.teal];
const FC = [P.royalBlue, "#FBF5E6", P.red, P.green, P.yellow];
const PC = [P.bGold, P.red];
const PN = ["Player 1", "Player 2"];

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
  // Strict L→R only: find starting position in MANTRA, check consecutive
  const start = MANTRA.indexOf(s[0]);
  if (start < 0) return false;
  for (let j = 1; j < s.length; j++) {
    if (start + j >= 6) return false; // no wraparound
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
  return { players: [{ tiles: p1, score: 0 }, { tiles: p2, score: 0 }], chain: null, pool, progress: new Set(), recs: 0, cur: 0, passes: 0, phase: "playing", sel: null, draws: 0, firstRec: null, placed: [0, 0], lastDraw: null, streak: 0, scoredIds: null };
}
function doSc(ch, nid, cp, pls, prog, recs, fr) {
  const sc = scorePlace(ch, nid);
  let np = new Set(prog), nr = recs, nfr = fr;
  const npl = pls.map(p => ({ ...p }));
  if (sc.pts > 0) { npl[cp].score += sc.pts; sc.syls.forEach(s => np.add(s)); if (np.size >= 6) { nr++; if (nfr === null) nfr = cp; np = new Set(); } }
  return { sc, npl, np, nr, ended: nr >= 2, nfr };
}

/* ===== BOARD ===== */
function ChainBoard({ chain, compatEnds, onEndClick, screenW, scoredIds }) {
  if (!chain) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontSize: 15, color: P.tM + "55", fontStyle: "italic", fontFamily: "'Space Mono',monospace" }}>Play a tile to start</div>;

  const aW = Math.min(screenW || 380, 800) - 16;
  const len = chain.length;
  const GAP = 2;
  const EDGE = 34; // LOCKED — never changes
  const VIS = 5;
  const DOT = 4; // mid dot size — LOCKED
  const MAX_DOTS = 2; // max visible mid dots

  const edgeCount = Math.min(VIS * 2, len);
  const midCount = Math.max(0, len - edgeCount);
  const dotsToShow = Math.min(midCount, MAX_DOTS);

  // Total width: left 5 edges + gaps + dots + gaps + right 5 edges
  // This is FIXED once chain > 10, doesn't grow
  const cSet = new Set(compatEnds.map(e => `${e.node.id}:${e.side}`));

  // Build render list: left 5 nodes, mid dots, right 5 nodes
  const leftNodes = chain.slice(0, Math.min(VIS, len));
  const rightNodes = len > VIS ? chain.slice(Math.max(VIS, len - VIS)) : [];
  const midNodes = len > VIS * 2 ? chain.slice(VIS, len - VIS) : [];

  // Pick which mid nodes to show as dots (evenly spaced sample)
  const midSample = [];
  if (midNodes.length > 0 && dotsToShow > 0) {
    const step = Math.max(1, Math.floor(midNodes.length / dotsToShow));
    for (let i = 0; i < dotsToShow && i * step < midNodes.length; i++) {
      midSample.push(midNodes[i * step]);
    }
  }

  const renderCell = (nd, isLeftEdge, isRightEdge) => {
    const si = SYL.indexOf(nd.syllable);
    const isFirst = nd.id === chain[0].id;
    const isLast = nd.id === chain[len - 1].id;
    const isEnd = isFirst || isLast;
    const leftE = isFirst ? compatEnds.find(e => e.side === "left") : null;
    const rightE = isLast ? compatEnds.find(e => e.side === "right") : null;
    const endE = leftE || rightE;
    const click = !!endE && cSet.has(`${endE.node.id}:${endE.side}`);
    const isScored = scoredIds && scoredIds.has(nd.id);

    return (
      <div key={nd.id} onClick={click ? () => onEndClick(endE) : undefined} style={{
        width: EDGE, height: EDGE + 8,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        background: isScored ? `${SC[si]}30` : `${SC[si]}${isEnd ? "14" : "0A"}`,
        border: click ? `2px solid ${P.yellow}` : isScored ? `2px solid ${SC[si]}88` : `1px solid ${SC[si]}${isEnd ? "55" : "25"}`,
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

  const renderDot = (nd) => {
    const si = SYL.indexOf(nd.syllable);
    return <div key={nd.id} style={{ width: DOT, height: DOT, borderRadius: 1, background: SC[si] + "55", flexShrink: 0 }} />;
  };

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: GAP }}>
        {leftNodes.map(nd => renderCell(nd, true, false))}
        {midSample.length > 0 && <div style={{ display: "flex", alignItems: "center", gap: 1, padding: "0 2px" }}>
          {midSample.map(nd => renderDot(nd))}
        </div>}
        {rightNodes.map(nd => renderCell(nd, false, true))}
      </div>
    </div>
  );
}

/* ===== MANTRA ANIMATION — syllables light up sequentially, looping ===== */
function MantraAnim() {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setActive(a => (a + 1) % 8), 600); // 0-5 = syllables, 6-7 = pause
    return () => clearInterval(iv);
  }, []);
  return (
    <div style={{ display: "flex", justifyContent: "center", gap: 5, marginBottom: 16 }}>
      {SYL.map((s, i) => {
        const lit = i <= active && active < 6;
        const pulse = i === active && active < 6;
        return <div key={i} style={{
          textAlign: "center", padding: "8px 10px",
          borderBottom: `3px solid ${lit ? SC[i] : SC[i] + "33"}`,
          background: lit ? `${SC[i]}15` : "transparent",
          boxShadow: pulse ? `0 0 20px ${SC[i]}44` : "none",
          transition: "all 0.3s",
          transform: pulse ? "scale(1.1)" : "scale(1)",
        }}>
          <span style={{ fontSize: 13, color: lit ? SC[i] : SC[i] + "55", fontFamily: "'Space Mono',monospace", fontWeight: 700, transition: "color 0.3s" }}>{s}</span>
          <span style={{ fontSize: 28, color: lit ? SC[i] : SC[i] + "33", display: "block", lineHeight: 1, marginTop: 3, transition: "color 0.3s", textShadow: pulse ? `0 0 12px ${SC[i]}55` : "none" }}>{TIB[i]}</span>
        </div>;
      })}
    </div>
  );
}

/* ===== TILE CONNECTION DEMO — shows how connector matches chain end ===== */
function TileDemo() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setStep(s => (s + 1) % 4), 1800);
    return () => clearInterval(iv);
  }, []);
  // Steps: 0=chain [AH][RA], 1=tile RA→PA appears, 2=tile slides in & connector merges, 3=chain is [AH][RA][PA]
  const S = 32, F = "'Space Mono',monospace";
  const cellStyle = (si, glow) => ({
    width: S, height: S + 4, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    background: `${SC[si]}${glow ? "18" : "0A"}`, border: `1px solid ${SC[si]}${glow ? "88" : "33"}`,
    boxShadow: glow ? `0 0 12px ${SC[si]}44` : "none", transition: "all 0.4s",
  });
  const lbl = (si, txt) => <span style={{ fontSize: 8, color: SC[si], fontFamily: F, fontWeight: 700, lineHeight: 1 }}>{txt}</span>;
  const tb = (si) => <span style={{ fontSize: 12, color: SC[si], lineHeight: 1 }}>{TIB[si]}</span>;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, margin: "10px 0 14px", padding: "10px 0", borderTop: `1px solid ${P.royalBlue}15`, borderBottom: `1px solid ${P.royalBlue}15` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
        {/* Chain: AH */}
        <div style={cellStyle(0, false)}>{lbl(0, "AH")}{tb(0)}</div>
        {/* RA — chain end, glows on connect */}
        <div style={cellStyle(1, step >= 2)}>{lbl(1, "RA")}{tb(1)}</div>

        {step >= 1 && step < 3 && <>
          {/* The tile: RA→PA sliding in */}
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

        {/* Step 3: PA appears as new chain cell, tile gone */}
        {step >= 3 && <div style={{ ...cellStyle(2, true), animation: "scoreFlash 0.8s ease" }}>{lbl(2, "PA")}{tb(2)}</div>}
      </div>

      <div style={{ fontSize: 9, fontFamily: F, color: P.tM + "88", textAlign: "center" }}>
        {step === 0 && "chain ends with RA..."}
        {step === 1 && "tile RA→PA: connector matches end"}
        {step === 2 && "connector merges with chain end"}
        {step === 3 && "payload PA becomes the new end ✓"}
      </div>
    </div>
  );
}

/* ===== HAND TILE ===== */
function HTile({ tile, onClick, selected, lit, tileW }) {
  const ci = SYL.indexOf(tile.connector), pi = SYL.indexOf(tile.payload);
  const dim = !lit && !selected;
  const w = tileW || 80;
  const compact = w < 80;
  return (
    <div onClick={onClick} style={{
      display: "flex", alignItems: "center", padding: compact ? "3px 2px" : "4px 3px",
      width: w,
      background: selected ? `${P.yellow}25` : lit ? `${P.navy}` : `${P.navy}44`,
      border: selected ? `2px solid ${P.yellow}` : lit ? `2px solid ${SC[ci]}55` : `1px solid ${P.gold}10`,
      cursor: onClick ? "pointer" : "default",
      boxShadow: selected ? `0 0 14px ${P.yellow}55, inset 0 0 8px ${P.yellow}15` : lit ? `0 0 5px ${SC[ci]}22` : "none",
      opacity: dim ? 0.3 : 1, position: "relative", flexShrink: 0,
    }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "1px 2px" }}>
        <span style={{ fontSize: compact ? 9 : 10, color: SC[ci], fontFamily: "'Space Mono',monospace", fontWeight: 700 }}>{tile.connector}</span>
        <span style={{ fontSize: compact ? 14 : 16, color: SC[ci], lineHeight: 1 }}>{TIB[ci]}</span>
      </div>
      <div style={{ width: 1, height: compact ? 20 : 24, background: dim ? P.gold + "08" : P.gold + "22" }} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "1px 2px" }}>
        <span style={{ fontSize: compact ? 9 : 10, color: SC[pi], fontFamily: "'Space Mono',monospace", fontWeight: 700 }}>{tile.payload}</span>
        <span style={{ fontSize: compact ? 14 : 16, color: SC[pi], lineHeight: 1 }}>{TIB[pi]}</span>
      </div>
      {tile.isDouble && <div style={{ position: "absolute", top: 0, right: 2, fontSize: 6, color: P.saffron + "99" }}>⬥</div>}
    </div>
  );
}

/* ===== MAIN ===== */
export default function DomiMo({ onBack }) {
  const [screen, setScreen] = useState("setup");
  const [game, setGame] = useState(null);
  const [msg, setMsg] = useState("");
  const [screenW, setScreenW] = useState(typeof window !== "undefined" ? window.innerWidth : 400);
  useEffect(() => { const h = () => setScreenW(window.innerWidth); window.addEventListener("resize", h); return () => window.removeEventListener("resize", h); }, []);

  // Clear scored highlight after 1s
  useEffect(() => {
    if (game?.scoredIds) {
      const t = setTimeout(() => setGame(g => g ? { ...g, scoredIds: null } : g), 1000);
      return () => clearTimeout(t);
    }
  }, [game?.scoredIds]);

  const start = useCallback(() => { setGame(initG()); setScreen("game"); setMsg("Player 1 — play any tile"); }, []);
  const ends = useMemo(() => game?.chain ? getEnds(game.chain) : [], [game?.chain]);
  const curT = useMemo(() => game ? game.players[game.cur].tiles : [], [game]);
  const playable = useMemo(() => game ? (game.chain ? findPlay(curT, ends) : curT) : [], [game, curT, ends]);
  const compat = useMemo(() => game?.sel && game.chain ? getCompat(game.sel, ends) : [], [game?.sel, ends]);
  const playableIds = useMemo(() => new Set(playable.map(t => t.id)), [playable]);

  // Sort hand by connector syllable index, then payload
  const sortedHand = useMemo(() => {
    return [...curT].sort((a, b) => {
      const ca = SYL.indexOf(a.connector), cb = SYL.indexOf(b.connector);
      if (ca !== cb) return ca - cb;
      return SYL.indexOf(a.payload) - SYL.indexOf(b.payload);
    });
  }, [curT]);

  function placeTile(g, tile, endSide) {
    const ch = g.chain ? g.chain.map(n => ({ ...n })) : [];
    const pn = mkN(tile.payload, g.cur);
    if (!g.chain) ch.push(mkN(tile.connector, g.cur), pn);
    else if (endSide === "right") ch.push(pn);
    else ch.unshift(pn);
    const nt = g.players[g.cur].tiles.filter(t => t.id !== tile.id);
    const bp = g.players.map((p, i) => i === g.cur ? { ...p, tiles: nt } : { ...p });
    const { sc, npl, np, nr, ended, nfr } = doSc(ch, pn.id, g.cur, bp, g.progress, g.recs, g.firstRec);
    const tp = [...g.placed]; tp[g.cur]++;
    const scored = sc.pts > 0;
    const canStreak = scored && g.streak < 2; // max 2 extra turns
    const nx = canStreak ? g.cur : g.cur ^ 1;
    const newStreak = canStreak ? g.streak + 1 : 0;
    // Find IDs of scored nodes on chain for animation
    let scoredIds = null;
    if (scored) {
      const pi = ch.findIndex(n => n.id === pn.id);
      // Find the actual scored segment position
      const syls = ch.map(n => n.syllable);
      for (let s = 0; s <= pi; s++) for (let e = pi; e < syls.length; e++) {
        const sub = syls.slice(s, e + 1);
        if (sub.length === sc.len && isMS(sub)) { scoredIds = new Set(ch.slice(s, e + 1).map(n => n.id)); break; }
      }
    }
    if (ended) { setScreen("end"); setMsg("Mantra complete!"); }
    else if (canStreak) setMsg(`${PN[g.cur]} +${sc.pts} (${sc.syls.join("→")}) — streak! (${newStreak}/2)`);
    else if (scored) setMsg(`${PN[g.cur]} +${sc.pts} (${sc.syls.join("→")})! ${PN[nx]}'s turn`);
    else setMsg(`${PN[nx]}'s turn`);
    return { ...g, chain: ch, players: npl, sel: null, cur: nx, passes: 0, draws: 0, progress: np, recs: nr, phase: ended ? "ended" : "playing", firstRec: nfr, placed: tp, lastDraw: null, streak: newStreak, scoredIds };
  }

  const selTile = useCallback((tile) => {
    if (!game || game.phase === "ended") return;
    setGame(g => {
      if (g.sel?.id === tile.id) return { ...g, sel: null };
      if (!g.chain) return placeTile(g, tile, "right");
      return { ...g, sel: tile };
    });
  }, [game]);

  const placeOn = useCallback((end) => {
    if (!game?.sel) return;
    setGame(g => placeTile(g, g.sel, end.side));
  }, [game]);

  const drawTile = useCallback(() => {
    if (!game || game.draws >= 1 || !game.pool.length) return;
    setGame(g => {
      const np = [...g.pool];
      const drawn = [];
      for (let i = 0; i < 3 && np.length; i++) drawn.push(np.pop());
      const nt = [...g.players[g.cur].tiles, ...drawn];
      const npl = g.players.map((p, i) => i === g.cur ? { ...p, tiles: nt } : { ...p });
      const es = getEnds(g.chain);
      const anyPlayable = drawn.some(d => es.some(e => e.node.syllable === d.connector));
      const names = drawn.map(d => `${d.connector}→${d.payload}`).join(", ");
      setMsg(anyPlayable ? `Drew 3: ${names} — check your hand!` : `Drew 3: ${names}. No match — pass.`);
      return { ...g, pool: np, players: npl, draws: 1, lastDraw: drawn[drawn.length - 1] };
    });
  }, [game]);

  const pass = useCallback(() => {
    if (!game) return;
    setGame(g => {
      const np = g.passes + 1;
      if (np >= 2) { setScreen("end"); setMsg("Two passes — Game Over!"); return { ...g, passes: np, phase: "ended" }; }
      const nx = g.cur ^ 1;
      setMsg(`${PN[g.cur]} passes. ${PN[nx]}'s turn.`);
      return { ...g, cur: nx, passes: np, draws: 0, sel: null, lastDraw: null };
    });
  }, [game]);

  const canDraw = game && !playable.length && game.draws < 1 && game.pool.length > 0;
  const winner = useMemo(() => {
    if (!game || game.phase !== "ended") return null;
    const [a, b] = [game.players[0].score, game.players[1].score];
    if (a !== b) return a > b ? 0 : 1;
    if (game.firstRec !== null) return game.firstRec;
    return game.placed[0] !== game.placed[1] ? (game.placed[0] > game.placed[1] ? 0 : 1) : null;
  }, [game]);

  const MantraBar = ({ progress, recs, compact, scoredSyls }) => (
    <div style={{ display: "flex", gap: compact ? 2 : 3, justifyContent: "center" }}>
      {MANTRA.map((s, i) => {
        const lit = progress.has(s), si = SYL.indexOf(s);
        const justScored = scoredSyls && scoredSyls.has(s);
        return <div key={i} style={{ flex: compact ? 1 : undefined, width: compact ? undefined : 50, maxWidth: compact ? 60 : undefined, height: compact ? 42 : 48, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: lit ? `${SC[si]}28` : `${SC[si]}0C`, borderBottom: `3px solid ${lit ? SC[si] : SC[si] + "44"}`, boxShadow: lit ? `0 0 18px ${SC[si]}44, inset 0 0 14px ${SC[si]}18` : "none", transition: "all 0.3s", animation: justScored ? "scorePulse 0.8s ease" : "none" }}>
          <span style={{ fontSize: compact ? 12 : 13, color: lit ? SC[si] : SC[si] + "88", fontFamily: "'Space Mono',monospace", fontWeight: 700, lineHeight: 1 }}>{s}</span>
          <span style={{ fontSize: compact ? 16 : 20, color: lit ? SC[si] : SC[si] + "55", textShadow: lit ? `0 0 10px ${SC[si]}55` : "none", lineHeight: 1, marginTop: 2 }}>{TIB[si]}</span>
        </div>;
      })}
      <div style={{ display: "flex", alignItems: "center", padding: "0 5px" }}><span style={{ fontSize: compact ? 12 : 13, fontFamily: "'Space Mono',monospace", color: P.bGold, fontWeight: 700 }}>{recs}/2</span></div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", maxWidth: "100vw", overflow: "hidden", color: P.t1, fontFamily: "'Cormorant Garamond',Georgia,serif", position: "relative" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400&family=Space+Mono:wght@400;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes ep{0%,100%{border-color:${P.yellow}77;box-shadow:0 0 6px ${P.yellow}22}50%{border-color:${P.yellow};box-shadow:0 0 16px ${P.yellow}55}}
        @keyframes scoreFlash{0%{transform:scale(1);box-shadow:none}20%{transform:scale(1.18);box-shadow:0 0 28px currentColor}100%{transform:scale(1);box-shadow:none}}
        @keyframes scorePulse{0%{transform:scale(1)}20%{transform:scale(1.25)}100%{transform:scale(1)}}
        .dm-b{background:${P.yellow};color:${P.navy};border:none;font-family:'Space Mono',monospace;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;padding:14px 32px;cursor:pointer;transition:all 0.2s}
        .dm-b:hover{background:${P.orange};transform:translateY(-1px)}
        .dm-b:disabled{opacity:0.2;cursor:default;transform:none}
        .dm-s{background:transparent;color:${P.t2};border:1px solid ${P.tM}44;font-family:'Space Mono',monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;padding:8px 16px;cursor:pointer;transition:all 0.2s}
        .dm-s:hover{border-color:${P.t2};color:${P.t1}}
      `}</style>
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        <div style={{ position: "absolute", inset: 0, background: "#151B34" }} />
        <div style={{ position: "absolute", top: "10%", left: "50%", transform: "translateX(-50%)", width: "180%", height: "80%", background: "radial-gradient(ellipse at 50% 50%, #222A4A 0%, transparent 60%)" }} />
      </div>

      {/* SETUP */}
      {screen === "setup" && (
        <div style={{ position: "relative", zIndex: 3, maxWidth: 520, margin: "0 auto", padding: "32px 16px 60px", textAlign: "center", animation: "fadeIn 0.5s" }}>
          <div style={{ textAlign: "left", marginBottom: 20 }}><button className="dm-s" onClick={onBack}>← Mo Oracle</button></div>
          <div style={{ fontSize: 9, letterSpacing: 6, color: P.tM + "66", fontFamily: "'Space Mono',monospace" }}>TCCT</div>
          <h1 style={{ fontSize: 46, fontWeight: 700, color: P.bGold, lineHeight: 1, letterSpacing: -1, fontFamily: "'Space Mono',monospace" }}>DOMI-MO</h1>
          <p style={{ fontSize: 10, letterSpacing: 5, color: P.tM + "88", fontFamily: "'Space Mono',monospace", marginTop: 4, marginBottom: 22 }}>TIBETAN MANTRA DOMINOS</p>
          {/* ANIMATED MANTRA — syllables light up one by one, looping */}
          <MantraAnim />

          {/* MANTRA MEANING */}
          <div style={{ background: `${P.royalBlue}12`, border: `1px solid ${P.bGold}22`, padding: "16px 14px", marginBottom: 22, textAlign: "center" }}>
            <p style={{ fontSize: 11, letterSpacing: 4, color: P.bGold, fontFamily: "'Space Mono',monospace", fontWeight: 700, marginBottom: 8 }}>OM AH RA PA TSA NA DHI</p>
            <p style={{ fontSize: 14, lineHeight: 1.8, color: P.t2 }}>
              A sacred invocation of Manjushri, the Bodhisattva of Wisdom. Each syllable carries the energy of <span style={{ color: P.t1 }}>clarity, sharp intellect, and deep understanding</span>. Practitioners chant this mantra to dissolve confusion, strengthen memory, and awaken the kind of insight that sees through surface into the heart of things.
            </p>
          </div>

          <div style={{ background: "#1A2040", border: `1px solid ${P.royalBlue}15`, padding: "18px 16px", marginBottom: 24, textAlign: "left" }}>
            <h3 style={{ fontSize: 11, color: P.bGold, fontWeight: 700, marginBottom: 10, fontFamily: "'Space Mono',monospace", letterSpacing: 2 }}>HOW TO PLAY</h3>
            <div style={{ fontSize: 15, lineHeight: 1.9, color: P.t2 }}>
              <p style={{ marginBottom: 12 }}>Each tile has a <span style={{ color: P.bGold }}>connector</span> and a <span style={{ color: P.teal }}>payload</span>. The connector matches an open chain end — the payload becomes the new end.</p>

              {/* TILE CONNECTION DEMO */}
              <TileDemo />

              <p style={{ marginBottom: 8 }}>Build mantra sequences reading left→right: <span style={{ color: P.bGold, fontFamily: "'Space Mono',monospace" }}>AH→RA→PA→TSA→NA→DHI</span>.</p>
              <p style={{ marginBottom: 8 }}><span style={{ color: P.bGold, fontFamily: "'Space Mono',monospace" }}>Points:</span> 2 in a row = 1 · 3 = 3 · 4 = 7 · 5 = 15 · full mantra = 30.</p>
              <p style={{ marginBottom: 8 }}><span style={{ color: P.saffron }}>Streaks:</span> score a segment and go again — up to 2 bonus turns. Chain your moves wisely.</p>
              <p style={{ marginBottom: 8 }}>Can't play? Draw <span style={{ color: P.saffron }}>3 tiles</span> from the Mala Pool. Still stuck? Pass. Two consecutive passes end the game.</p>
              <p>Fill the mantra bar twice to win. Highest score takes it.</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", marginBottom: 20 }}>
            {[0, 1].map(i => <div key={i} style={{ padding: "8px 18px", border: `1px solid ${PC[i]}33`, display: "flex", alignItems: "center", gap: 8 }}><div style={{ width: 8, height: 8, borderRadius: "50%", background: PC[i] }} /><span style={{ fontSize: 12, fontFamily: "'Space Mono',monospace", color: PC[i], letterSpacing: 2 }}>{PN[i]}</span></div>)}
          </div>
          <div style={{ fontSize: 10, color: P.tM + "66", fontFamily: "'Space Mono',monospace", letterSpacing: 2, marginBottom: 26 }}>20 TILES · MALA 108</div>
          <button className="dm-b" onClick={start} style={{ fontSize: 14, padding: "16px 48px" }}>Start Game</button>
        </div>
      )}

      {/* GAME */}
      {screen === "game" && game && (() => {
        const isMobile = screenW < 600;
        const cols = isMobile ? 4 : 5;
        const hGap = isMobile ? 3 : 8;
        const hPad = 16;
        const rawTW = Math.floor((Math.min(screenW, 700) - hPad - (cols - 1) * hGap) / cols);
        const tW = isMobile ? Math.min(rawTW, 84) : Math.min(rawTW, 96);

        return (
        <div style={{ position: "fixed", inset: 0, zIndex: 3, display: "flex", flexDirection: "column", maxWidth: "100vw", overflow: "hidden" }}>
          {/* TOP */}
          <div style={{ background: "#111728", borderBottom: `1px solid ${P.gold}0C`, padding: "5px 10px 6px", flexShrink: 0 }}>
            <div style={{ display: "flex", height: 3, marginBottom: 4 }}>{FC.map((c, i) => <div key={i} style={{ flex: 1, background: c }} />)}</div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <button onClick={onBack} style={{ background: "none", border: "none", color: P.tM + "88", fontSize: 10, fontFamily: "'Space Mono',monospace", cursor: "pointer" }}>← EXIT</button>
              <span style={{ fontSize: 10, fontFamily: "'Space Mono',monospace", color: P.saffron + "aa" }}>MALA {game.pool.length}</span>
            </div>
            <MantraBar progress={game.progress} recs={game.recs} compact scoredSyls={game.scoredIds ? new Set(game.chain.filter(n => game.scoredIds.has(n.id)).map(n => n.syllable)) : null} />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginTop: 4 }}>
              {game.players.map((p, i) => <div key={i} style={{ display: "flex", alignItems: "center", gap: 5, opacity: game.cur === i ? 1 : 0.35 }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: PC[i] }} />
                <span style={{ fontSize: 20, fontFamily: "'Space Mono',monospace", fontWeight: 700, color: PC[i] }}>{p.score}</span>
                <span style={{ fontSize: 8, fontFamily: "'Space Mono',monospace", color: P.tM + "55" }}>{p.tiles.length}</span>
              </div>)}
            </div>
            <div style={{ textAlign: "center", fontSize: 10, color: P.t1, fontFamily: "'Space Mono',monospace", padding: "3px 0", borderLeft: `3px solid ${PC[game.cur]}`, marginTop: 4, paddingLeft: 10, background: `${PC[game.cur]}0C` }}>{msg}</div>
          </div>

          {/* BOARD */}
          <div style={{ height: isMobile ? "34vh" : "45vh", flexShrink: 0, background: "#1C2444", overflow: "hidden" }}>
            <ChainBoard chain={game.chain} compatEnds={compat} onEndClick={placeOn} screenW={screenW} scoredIds={game.scoredIds} />
          </div>

          {/* HAND */}
          <div style={{ flex: 1, background: "#0E1322", borderTop: `1px solid ${P.gold}0C`, padding: "4px 6px 4px", overflow: "hidden", display: "flex", flexDirection: "column", minHeight: 0 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3, flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: PC[game.cur] }} />
                <span style={{ fontSize: 10, fontFamily: "'Space Mono',monospace", color: PC[game.cur], fontWeight: 700, letterSpacing: 2 }}>{PN[game.cur]}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 8, fontFamily: "'Space Mono',monospace", color: P.tM + "66" }}>{playable.length}/{curT.length}</span>
                {playable.length === 0 && game.chain && (<>
                  {canDraw && <button onClick={drawTile} style={{ background: P.saffron + "18", color: P.saffron, border: `1px solid ${P.saffron}44`, fontFamily: "'Space Mono',monospace", fontSize: 8, fontWeight: 700, padding: "3px 7px", cursor: "pointer" }}>DRAW 3</button>}
                  <button onClick={pass} style={{ background: "none", color: P.t2, border: `1px solid ${P.tM}33`, fontFamily: "'Space Mono',monospace", fontSize: 8, padding: "3px 7px", cursor: "pointer" }}>PASS</button>
                </>)}
              </div>
            </div>

            <div style={{ fontSize: 8, fontFamily: "'Space Mono',monospace", color: P.tM + "77", marginBottom: 3, flexShrink: 0 }}>
              {!game.chain ? "TAP ANY TILE" : game.sel ? "TAP END ON BOARD" : playable.length ? "TAP A LIT TILE" : game.lastDraw ? `Drew: ${game.lastDraw.connector}→${game.lastDraw.payload}` : ""}
            </div>

            <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
              <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, ${tW}px)`, gap: `${hGap}px ${hGap}px`, justifyContent: "space-evenly", alignContent: "start" }}>
                {sortedHand.map(t => {
                  const isPlayable = playableIds.has(t.id);
                  return <HTile key={t.id} tile={t} tileW={tW}
                    onClick={isPlayable ? () => selTile(t) : undefined}
                    selected={game.sel?.id === t.id}
                    lit={isPlayable} />;
                })}
              </div>
            </div>
          </div>
        </div>
        );
      })()}

      {/* END */}
      {screen === "end" && game && (
        <div style={{ position: "relative", zIndex: 3, maxWidth: 480, margin: "0 auto", padding: "50px 16px 60px", textAlign: "center", animation: "fadeUp 0.5s" }}>
          <div style={{ fontSize: 9, letterSpacing: 6, color: P.tM + "55", fontFamily: "'Space Mono',monospace" }}>TCCT</div>
          <h1 style={{ fontSize: 36, fontWeight: 700, color: P.bGold, lineHeight: 1, fontFamily: "'Space Mono',monospace", marginBottom: 6 }}>GAME OVER</h1>
          <div style={{ margin: "16px 0" }}><MantraBar progress={game.progress} recs={game.recs} /></div>
          {winner !== null ? <div style={{ fontSize: 22, color: PC[winner], fontFamily: "'Space Mono',monospace", fontWeight: 700, marginBottom: 22 }}>{PN[winner]} Wins!</div>
            : <div style={{ fontSize: 22, color: P.teal, fontFamily: "'Space Mono',monospace", fontWeight: 700, marginBottom: 22 }}>Tie!</div>}
          <div style={{ display: "flex", gap: 14, justifyContent: "center", marginBottom: 28 }}>
            {game.players.map((p, i) => (
              <div key={i} style={{ padding: "16px 26px", border: `2px solid ${winner === i ? PC[i] : P.gold + "12"}`, background: winner === i ? `${PC[i]}0A` : "transparent", minWidth: 120 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: PC[i], margin: "0 auto 6px" }} />
                <div style={{ fontSize: 10, fontFamily: "'Space Mono',monospace", color: PC[i], letterSpacing: 2 }}>{PN[i]}</div>
                <div style={{ fontSize: 36, fontFamily: "'Space Mono',monospace", fontWeight: 700, color: PC[i], margin: "4px 0" }}>{p.score}</div>
                <div style={{ fontSize: 9, color: P.tM, fontFamily: "'Space Mono',monospace" }}>{game.placed[i]} played · {p.tiles.length} left</div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexDirection: "column", alignItems: "center" }}>
            <button className="dm-b" onClick={() => { setGame(initG()); setScreen("game"); setMsg("Player 1 — play any tile"); }}>Play Again</button>
            <button className="dm-s" onClick={onBack}>← Mo Oracle</button>
          </div>
          <footer style={{ marginTop: 36 }}><div style={{ display: "flex", height: 3 }}>{FC.map((c, i) => <div key={i} style={{ flex: 1, background: c }} />)}</div><p style={{ fontSize: 8, color: P.tM + "55", fontFamily: "'Space Mono',monospace", marginTop: 8 }}>Domi-Mo · TCCT</p></footer>
        </div>
      )}
    </div>
  );
}
