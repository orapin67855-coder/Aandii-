"use client";
import { useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

export type RoomState = "focus" | "rest" | "idle";
export interface Peer { userId: string; displayName: string; state: RoomState }

/** Shows who is in the room and whether they are focusing or resting.
 *  Deliberately shares NO study hours -> no hour-count competition. */
export function useRoomPresence(roomId: string, me: Peer) {
  const supabase = useMemo(
    () => createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!),
    []
  );
  const [peers, setPeers] = useState<Peer[]>([]);
  const [status, setStatus] = useState<"connecting" | "online" | "error">("connecting");

  useEffect(() => {
    const channel = supabase.channel(`room:${roomId}`, {
      config: { private: true, presence: { key: me.userId } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<Peer>();
        setPeers(Object.values(state).flatMap((arr) => arr.map((p) => ({
          userId: p.userId, displayName: p.displayName, state: p.state,
        }))));
      })
      .subscribe(async (s) => {
        if (s === "SUBSCRIBED") {
          setStatus("online");
          await channel.track({ userId: me.userId, displayName: me.displayName, state: me.state });
        } else if (s === "CHANNEL_ERROR" || s === "TIMED_OUT") {
          setStatus("error");
        }
      });

    return () => { void supabase.removeChannel(channel); };
  }, [supabase, roomId, me.userId, me.displayName, me.state]);

  return { peers, status };
}
