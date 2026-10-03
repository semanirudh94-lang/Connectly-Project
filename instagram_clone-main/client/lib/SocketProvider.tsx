"use client";

import useAuthStore from "@/store/authStore";
import { useEffect } from "react";
import { socket } from "./socket";

export default function SocketProvider({ children }: any) {
  const user = useAuthStore((state) => state.user);
  useEffect(() => {
    if (!user) return;
    socket.connect();
    socket.emit("setup", user._id);
    return () => {
      socket.disconnect();
    };
  }, [user]);
  return <>{children}</>;
}
