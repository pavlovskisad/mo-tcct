import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Generate a session ID that persists for the browser tab
const getSessionId = () => {
  if (!window._moSessionId) window._moSessionId = Math.random().toString(36).slice(2, 10);
  return window._moSessionId;
};

// Generate a 4-char room code from mantra syllables
const SYLS = ["AH", "RA", "PA", "TSA", "NA", "DHI"];
const genCode = () => Array.from({ length: 4 }, () => SYLS[Math.floor(Math.random() * 6)]).join("-");

export function useMultiplayer({ onGameStateUpdate, onOpponentDisconnect }) {
  const [mpStatus, setMpStatus] = useState("idle"); // idle | searching | waiting | connected | disconnected
  const [matchId, setMatchId] = useState(null);
  const [myPlayerIndex, setMyPlayerIndex] = useState(null); // 0 or 1
  const [roomCode, setRoomCode] = useState(null);
  const [error, setError] = useState(null);
  const subRef = useRef(null);
  const heartbeatRef = useRef(null);
  const sessionId = getSessionId();

  const cleanup = useCallback(() => {
    if (subRef.current) { supabase.removeChannel(subRef.current); subRef.current = null; }
    if (heartbeatRef.current) { clearInterval(heartbeatRef.current); heartbeatRef.current = null; }
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  const subscribeToMatch = useCallback((id, playerIdx) => {
    if (subRef.current) supabase.removeChannel(subRef.current);
    const ch = supabase.channel(`match-${id}`)
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "matches", filter: `id=eq.${id}`
      }, (payload) => {
        const row = payload.new;
        // If opponent just joined (we were waiting)
        if (row.status === "active" && row.player2_id && playerIdx === 0) {
          setMpStatus("connected");
        }
        if (row.game_state) onGameStateUpdate(row.game_state, playerIdx);
      })
      .subscribe();
    subRef.current = ch;

    // Heartbeat every 8s
    heartbeatRef.current = setInterval(async () => {
      await supabase.from("presence").upsert({ match_id: id, player_id: sessionId, last_seen: new Date().toISOString() });
      // Check opponent heartbeat
      const { data } = await supabase.from("presence").select("*").eq("match_id", id).neq("player_id", sessionId).single();
      if (data) {
        const diff = Date.now() - new Date(data.last_seen).getTime();
        if (diff > 30000) onOpponentDisconnect?.();
      }
    }, 8000);
  }, [onGameStateUpdate, onOpponentDisconnect, sessionId]);

  const quickMatch = useCallback(async () => {
    setError(null);
    setMpStatus("searching");
    try {
      // Look for an open room that isn't ours
      const { data: openMatches } = await supabase.from("matches")
        .select("*").eq("status", "waiting").neq("player1_id", sessionId).limit(1);

      if (openMatches && openMatches.length > 0) {
        // Join existing room
        const match = openMatches[0];
        const { error: err } = await supabase.from("matches")
          .update({ player2_id: sessionId, status: "active" }).eq("id", match.id);
        if (err) throw err;
        setMatchId(match.id);
        setMyPlayerIndex(1);
        setRoomCode(match.code);
        setMpStatus("connected");
        subscribeToMatch(match.id, 1);
        // Seed presence
        await supabase.from("presence").upsert({ match_id: match.id, player_id: sessionId, last_seen: new Date().toISOString() });
        return { joined: true, match };
      } else {
        // No open rooms — create one and wait
        return await createRoom();
      }
    } catch (e) {
      setError(e.message);
      setMpStatus("idle");
    }
  }, [sessionId, subscribeToMatch]);

  const createRoom = useCallback(async () => {
    setError(null);
    const code = genCode();
    try {
      const { data, error: err } = await supabase.from("matches")
        .insert({ code, status: "waiting", player1_id: sessionId })
        .select().single();
      if (err) throw err;
      setMatchId(data.id);
      setMyPlayerIndex(0);
      setRoomCode(code);
      setMpStatus("waiting");
      subscribeToMatch(data.id, 0);
      await supabase.from("presence").upsert({ match_id: data.id, player_id: sessionId, last_seen: new Date().toISOString() });
      return { joined: false, match: data, code };
    } catch (e) {
      setError(e.message);
      setMpStatus("idle");
    }
  }, [sessionId, subscribeToMatch]);

  const joinByCode = useCallback(async (inputCode) => {
    setError(null);
    setMpStatus("searching");
    try {
      const normalized = inputCode.toUpperCase().replace(/\s/g, "");
      // Accept with or without dashes
      const { data: matches } = await supabase.from("matches")
        .select("*").eq("status", "waiting")
        .or(`code.eq.${normalized},code.eq.${normalized.replace(/-/g, "-")}`).limit(5);

      // Find by code (flexible match)
      const match = matches?.find(m => m.code.replace(/-/g, "") === normalized.replace(/-/g, ""));
      if (!match) { setError("Room not found or already started."); setMpStatus("idle"); return; }
      if (match.player1_id === sessionId) { setError("You can't join your own room."); setMpStatus("idle"); return; }

      const { error: err } = await supabase.from("matches")
        .update({ player2_id: sessionId, status: "active" }).eq("id", match.id);
      if (err) throw err;
      setMatchId(match.id);
      setMyPlayerIndex(1);
      setRoomCode(match.code);
      setMpStatus("connected");
      subscribeToMatch(match.id, 1);
      await supabase.from("presence").upsert({ match_id: match.id, player_id: sessionId, last_seen: new Date().toISOString() });
      return { joined: true, match };
    } catch (e) {
      setError(e.message);
      setMpStatus("idle");
    }
  }, [sessionId, subscribeToMatch]);

  const pushGameState = useCallback(async (gameState) => {
    if (!matchId) return;
    await supabase.from("matches").update({ game_state: gameState, updated_at: new Date().toISOString() }).eq("id", matchId);
  }, [matchId]);

  const leaveMatch = useCallback(async () => {
    if (matchId) {
      await supabase.from("matches").update({ status: "finished" }).eq("id", matchId);
      await supabase.from("presence").delete().eq("match_id", matchId).eq("player_id", sessionId);
    }
    cleanup();
    setMpStatus("idle");
    setMatchId(null);
    setMyPlayerIndex(null);
    setRoomCode(null);
  }, [matchId, sessionId, cleanup]);

  return { mpStatus, myPlayerIndex, roomCode, error, quickMatch, createRoom, joinByCode, pushGameState, leaveMatch, sessionId };
}
