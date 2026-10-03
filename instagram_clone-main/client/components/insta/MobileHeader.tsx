"use client";

import { mockConversations } from "@/lib/mock-data";
import { useTheme } from "@/lib/theme-context";
import { Heart, Moon, Sun } from "lucide-react";
import Link from "next/link";

const MobileHeader = () => {
  const totalUnread = mockConversations.reduce((s, c) => s + c.unread, 0);
  const { theme, toggle } = useTheme();
  return (
    <header className="md:hidden fixed top-0 left-0 right-0 bg-ig-surface border-b border-ig-border z-50 h-[44px] flex items-center justify-between px-4">
      <button
        onClick={toggle}
        className="text-ig-text active:opacity-60 transition-opacity"
      >
        {theme === "light" ? (
          <Moon size={20} strokeWidth={1.5} />
        ) : (
          <Sun size={20} strokeWidth={1.5} />
        )}
      </button>
      <Link href="/">
        <span className="instagram-font text-[26px] leading-none text-ig-text">
          Instagram
        </span>
      </Link>
      <div className="flex items-center gap-5">
        <button className="text-ig-text active:opacity-60 transition-opacity">
          <Heart size={22} strokeWidth={1.5} />
        </button>
        <Link
          href="/messages"
          className="text-ig-text active:opacity-60 transition-opacity relative"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          {totalUnread > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#ed4956] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
              {totalUnread}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
};

export default MobileHeader;
