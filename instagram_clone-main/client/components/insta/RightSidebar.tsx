"use client";

import { currentUser, suggestedUsers } from "@/lib/mock-data";
import Link from "next/link";
import { useState } from "react";

const RightSidebar = () => {
  const [followed, setFollowed] = useState<Record<string, boolean>>({});
  const toggleFollow = (id: string) => {
    setFollowed((prev) => ({ ...prev, [id]: !prev[id] }));
  };
  return (
    <aside className="hidden lg:block w-[320px] shrink-0 pt-6">
      {/* Current user */}
      <div className="flex items-center gap-3 mb-5 px-1">
        <Link href="/profile">
          <div className="w-11 h-11 rounded-full overflow-hidden story-gradient p-[2px] shrink-0">
            <div className="w-full h-full rounded-full bg-ig-surface p-[1px]">
              <img
                src={currentUser.profilePic}
                alt={currentUser.username}
                className="w-full h-full rounded-full object-cover"
              />
            </div>
          </div>
        </Link>
        <div className="flex-1 min-w-0">
          <Link href="/profile" className="block text-sm font-semibold text-ig-text hover:opacity-70 truncate">
            {currentUser.username}
          </Link>
          <p className="text-sm text-ig-muted truncate">{currentUser.fullName}</p>
        </div>
        <Link
          href="/login"
          className="text-xs font-semibold text-[#0095f6] hover:text-[#1877f2] transition-colors shrink-0"
        >
          Switch
        </Link>
      </div>

      {/* Suggested */}
      <div className="flex items-center justify-between mb-3 px-1">
        <p className="text-sm font-semibold text-ig-muted">Suggested for you</p>
        <Link href="/explore" className="text-xs font-semibold text-ig-text hover:opacity-70">
          See All
        </Link>
      </div>

      <div className="flex flex-col gap-3">
        {suggestedUsers.map((user) => (
          <div key={user._id} className="flex items-center gap-3 px-1">
            <Link href={`/profile/${user.username}`}>
              <div className="w-8 h-8 rounded-full overflow-hidden shrink-0">
                <img
                  src={user.profilePic}
                  alt={user.username}
                  className="w-full h-full object-cover"
                />
              </div>
            </Link>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <Link
                  href={`/profile/${user.username}`}
                  className="text-xs font-semibold text-ig-text hover:opacity-70 truncate"
                >
                  {user.username}
                </Link>
                {user.isVerified && (
                  <svg width="10" height="10" viewBox="0 0 24 24" className="text-[#0095f6] fill-current shrink-0">
                    <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm-1.177 14.232l-3.536-3.536 1.414-1.414 2.122 2.121 4.596-4.596 1.414 1.414-5.01 5.011z" />
                  </svg>
                )}
              </div>
              <p className="text-xs text-ig-muted truncate">
                {user.followers.length > 0
                  ? `Followed by ${user.followers.length} people`
                  : "Suggested for you"}
              </p>
            </div>
            <button
              onClick={() => toggleFollow(user._id)}
              className={`text-xs font-semibold transition-colors shrink-0 ${
                followed[user._id]
                  ? "text-ig-text hover:opacity-70"
                  : "text-[#0095f6] hover:text-[#1877f2] dark:text-[#38b6ff] dark:hover:text-[#5cc8ff]"
              }`}
            >
              {followed[user._id] ? "Following" : "Follow"}
            </button>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-6 px-1">
        <div className="flex flex-wrap gap-x-2 gap-y-1 mb-3">
          {[
            "About",
            "Help",
            "Press",
            "API",
            "Jobs",
            "Privacy",
            "Terms",
            "Locations",
            "Language",
          ].map((item) => (
            <a
              key={item}
              href="#"
              className="text-[11px] text-ig-muted hover:underline"
            >
              {item}
            </a>
          ))}
        </div>
        <p className="text-[11px] text-ig-muted uppercase tracking-wide">
          &copy; 2026 Instagram from Meta
        </p>
      </div>
    </aside>
  );
};

export default RightSidebar;
