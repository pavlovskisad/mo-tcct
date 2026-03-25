import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? "https://pvwonkyafhiyovuxnghv.supabase.co";
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2d29ua3lhZmhpeW92dXhuZ2h2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwODQwMTksImV4cCI6MjA4OTY2MDAxOX0.vleE_LnsFm2x7HqFTJOvJaUSmhs_IYuMCJhZDzHmXyc";

let supabaseInstance = null;
const getSupabase = () => {
  if (!supabaseInstance) {
    supabaseInstance = createClient(SUPABASE_URL, SUPABASE_KEY);
  }
  return supabaseInstance;
};
export const supabase = { from: (...a) => getSupabase().from(...a), channel: (...a) => getSupabase().channel(...a), removeChannel: (...a) => getSupabase().removeChannel(...a) };

const getSessionId = () => {
  if (!window._moSessionId) window._moSessionId = Math.random().toString(36).slice(2, 10);
  return window._moSessionId;
};

const SYLS = ["AH", "RA", "PA", "TSA", "NA", "DHI"];
const genCode = () => Array.from({ length: 4 }, () => SYLS[Math.floor(Math.random() * 6)]).join("-");
const sleep = ms => new Promise(r => setTimeout(r, ms));

export function useMultiplayer({ onGameStateUpdate, onOpponentDisconnect }) {
  const [mpStatus, setMpStatus] = useState("idle");
  const [myPlayerIndex, setMyPlayerIndex] = useState(null);
  const [roomCode, setRoomCode] = useState(null);
  const [error, setError] = useState(null);

  const matchIdRef = useRef(null);
  const playerIdxRef = useRef(null);
  const subRef = useRef(null);
  const heartbeatRef = useRef(null);
  const hostPollRef = useRef(null);
  const onStateRef = useRef(onGameStateUpdate);
  const onDiscRef = useRef(onOpponentDisconnect);

  useEffect(() => { onStateRef.current = onGameStateUpdate; }, [onGameStateUpdate]);
  useEffect(() => { onDiscRef.current = onOpponentDisconnect; }, [onOpponentDisconnect]);

  const sessionId = getSessionId();

  const cleanup = useCallback(() => {
    if (subRef.current) { supabase.removeChannel(subRef.current); subRef.current = null; }
    if (heartbeatRef.current) { clearInterval(heartbeatRef.current); heartbeatRef.current = null; }
    if (hostPollRef.current) { clearInterval(hostPollRef.current); hostPollRef.current = null; }
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  const subscribeGameState = useCallback((id, playerIdx) => {
    if (subRef.current) supabase.removeChannel(subRef.current);
    const ch = supabase
      .channel(`game-${id}-${playerIdx}-${Date.now()}`)
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "matches", filter: `id=eq.${id}`,
      }, (payload) => {
        if (payload.new?.game_state) {
          onStateRef.current(payload.new.game_state, playerIdx);
        }
      })
      .subscribe();
    subRef.current = ch;

    heartbeatRef.current = setInterval(async () => {
      await supabase.from("presence")
        .upsert({ match_id: id, player_id: sessionId, last_seen: new Date().toISOString() });
      const { data } = await supabase.from("presence")
        .select("last_seen").eq("match_id", id).neq("player_id", sessionId).single();
      if (data && Date.now() - new Date(data.last_seen).getTime() > 30000) {
        onDiscRef.current?.();
      }
    }, 8000);
  }, [sessionId]);

  const pushGameState = useCallback(async (gameState) => {
    if (!matchIdRef.current) return;
    await supabase.from("matches")
      .update({ game_state: gameState, updated_at: new Date().toISOString() })
      .eq("id", matchIdRef.current);
  }, []);

  const joinMatch = useCallback(async (match) => {
    const { error: err } = await supabase.from("matches")
      .update({ player2_id: sessionId, status: "active" })
      .eq("id", match.id)
      .eq("status", "waiting");
    if (err) throw err;

    const { data: confirmed } = await supabase.from("matches")
      .select("player2_id, status").eq("id", match.id).single();
    if (confirmed?.player2_id !== sessionId) {
      throw new Error("Room was taken — try again.");
    }

    matchIdRef.current = match.id;
    playerIdxRef.current = 1;
    setMyPlayerIndex(1);
    setRoomCode(match.code);
    setMpStatus("connected");

    await supabase.from("presence")
      .upsert({ match_id: match.id, player_id: sessionId, last_seen: new Date().toISOString() });

    subscribeGameState(match.id, 1);

    let attempts = 0;
    const poll = setInterval(async () => {
      attempts++;
      const { data: m } = await supabase.from("matches")
        .select("game_state").eq("id", match.id).single();
      if (m?.game_state) {
        clearInterval(poll);
        onStateRef.current(m.game_state, 1);
      } else if (attempts >= 40) {
        clearInterval(poll);
        setError("Host didn't start — go back and try again.");
        setMpStatus("idle");
      }
    }, 500);
  }, [sessionId, subscribeGameState]);

  const createRoom = useCallback(async () => {
    setError(null);
    const code = genCode();
    try {
      const { data, error: err } = await supabase.from("matches")
        .insert({ code, status: "waiting", player1_id: sessionId, game_state: null })
        .select().single();
      if (err) throw err;

      matchIdRef.current = data.id;
      playerIdxRef.current = 0;
      setMyPlayerIndex(0);
      setRoomCode(code);
      setMpStatus("waiting");

      await supabase.from("presence")
        .upsert({ match_id: data.id, player_id: sessionId, last_seen: new Date().toISOString() });

      hostPollRef.current = setInterval(async () => {
        const { data: m } = await supabase.from("matches")
          .select("status, player2_id").eq("id", matchIdRef.current).single();
        if (m?.status === "active" && m?.player2_id) {
          clearInterval(hostPollRef.current);
          hostPollRef.current = null;
          subscribeGameState(matchIdRef.current, 0);
          setMpStatus("connected");
        }
      }, 1000);

      return { joined: false, match: data, code };
    } catch (e) {
      setError(e.message);
      setMpStatus("idle");
    }
  }, [sessionId, subscribeGameState]);

  const quickMatch = useCallback(async () => {
    setError(null);
    setMpStatus("searching");
    try {
      await sleep(Math.random() * 600);
      // Only look for rooms created in the last 5 minutes
      const cutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data: openMatches } = await supabase.from("matches")
        .select("*").eq("status", "waiting").neq("player1_id", sessionId)
        .gte("created_at", cutoff)
        .order("created_at", { ascending: true }).limit(1);

      if (openMatches && openMatches.length > 0) {
        try {
          await joinMatch(openMatches[0]);
        } catch (joinErr) {
          await createRoom();
        }
      } else {
        await createRoom();
      }
    } catch (e) {
      setError(e.message);
      setMpStatus("idle");
    }
  }, [sessionId, joinMatch, createRoom]);

  const joinByCode = useCallback(async (inputCode) => {
    setError(null);
    setMpStatus("searching");
    try {
      const normalized = inputCode.toUpperCase().replace(/[\s-]/g, "");
      const cutoff = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const { data: matches } = await supabase.from("matches")
        .select("*").eq("status", "waiting").gte("created_at", cutoff).limit(50);
      const match = matches?.find(m => m.code.replace(/-/g, "") === normalized);
      if (!match) { setError("Room not found or expired."); setMpStatus("idle"); return; }
      if (match.player1_id === sessionId) { setError("That's your own room."); setMpStatus("idle"); return; }
      await joinMatch(match);
    } catch (e) {
      setError(e.message);
      setMpStatus("idle");
    }
  }, [sessionId, joinMatch]);

  const leaveMatch = useCallback(async () => {
    cleanup();
    if (matchIdRef.current) {
      await supabase.from("matches").update({ status: "finished" }).eq("id", matchIdRef.current);
      await supabase.from("presence").delete().eq("match_id", matchIdRef.current).eq("player_id", sessionId);
    }
    matchIdRef.current = null;
    playerIdxRef.current = null;
    setMpStatus("idle");
    setMyPlayerIndex(null);
    setRoomCode(null);
    setError(null);
  }, [sessionId, cleanup]);

  return { mpStatus, myPlayerIndex, roomCode, error, quickMatch, createRoom, joinByCode, pushGameState, leaveMatch };
}
