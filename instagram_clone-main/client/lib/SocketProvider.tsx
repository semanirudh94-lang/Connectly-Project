"use client";

import useAuthStore from "@/store/authStore";
import { useEffect } from "react";
import { socket } from "./socket";

export default function SocketProvider({ children }: any) {
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (!user) return;

    // The server derives the room from the access token, so re-send it on every
    // (re)connection rather than only on the first one.
    const authenticate = () => {
      const token = localStorage.getItem("accessToken");
      if (token) socket.emit("setup", token);
    };

    socket.connect();
    if (socket.connected) authenticate();
    socket.on("connect", authenticate);

    return () => {
      socket.off("connect", authenticate);
      socket.disconnect();
    };
  }, [user]);

  return <>{children}</>;
}
