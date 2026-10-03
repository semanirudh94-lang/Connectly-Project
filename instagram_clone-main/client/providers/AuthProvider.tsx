"use client";

import { useEffect } from "react";
import useAuthStore from "@/store/authStore";

export default function AuthProvider({ children }: any) {
  const loadUser = useAuthStore((state) => state.loadUser);

  useEffect(() => {
    loadUser();
  }, []);

  return <>{children}</>;
}
