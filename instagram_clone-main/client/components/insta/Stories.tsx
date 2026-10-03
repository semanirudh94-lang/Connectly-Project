"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import StoryViewer from "./StoryViewer";
import CreateStoryModal from "./CreateStoryModal";
import useAuthStore from "@/store/authStore";
import { fetchStoryFeed, StoryGroup } from "@/lib/story.service";

function StoryRing({
  avatar,
  label,
  isSelf = false,
  viewed = false,
  hasStory = true,
  onClick,
}: {
  avatar: string;
  label: string;
  isSelf?: boolean;
  viewed?: boolean;
  hasStory?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      className="flex flex-col items-center gap-[6px] shrink-0 active:opacity-80 transition-opacity"
      onClick={onClick}
    >
      <div className="relative">
        <div
          className={`w-[66px] h-[66px] rounded-full p-[2px] transition-opacity ${
            hasStory && !viewed ? "story-gradient" : "bg-ig-border"
          }`}
        >
          <div className="w-full h-full rounded-full bg-ig-surface p-[2px]">
            <img
              src={avatar}
              alt={label}
              className="w-full h-full rounded-full object-cover"
            />
          </div>
        </div>
        {isSelf && !hasStory && (
          <div className="absolute bottom-0 right-0 w-5 h-5 bg-[#0095f6] rounded-full flex items-center justify-center border-2 border-ig-surface">
            <Plus size={10} strokeWidth={3} className="text-white" />
          </div>
        )}
      </div>
      <span className="text-xs text-ig-text truncate w-[66px] text-center">
        {label}
      </span>
    </button>
  );
}

export default function Stories() {
  const me = useAuthStore((state) => state.user);
  const [groups, setGroups] = useState<StoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [openCreate, setOpenCreate] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerGroupIndex, setViewerGroupIndex] = useState(0);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const loadFeed = useCallback(async () => {
    try {
      const g = await fetchStoryFeed();
      setGroups(g);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    updateScrollState();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [updateScrollState, groups]);

  const scrollBy = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === "left" ? -300 : 300, behavior: "smooth" });
  };

  // Separate the current user's own group (if any) from the rest.
  const ownGroup = groups.find((g) => g.user._id === me?._id);
  const otherGroups = groups.filter((g) => g.user._id !== me?._id);
  // Viewer plays all groups; index 0 is own (if present) else first other.
  const viewerGroups = groups;

  const groupIsSeen = (g: StoryGroup) => g.stories.every((s) => s.seen);

  const openViewerAt = (group: StoryGroup) => {
    const idx = viewerGroups.findIndex((g) => g.user._id === group.user._id);
    setViewerGroupIndex(idx < 0 ? 0 : idx);
    setViewerOpen(true);
  };

  if (loading) {
    return (
      <div className="bg-ig-surface border-b border-ig-border md:border md:rounded-sm md:mb-6">
        <div className="flex gap-4 px-4 py-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-[6px]">
              <div className="w-[66px] h-[66px] rounded-full bg-ig-hover animate-pulse" />
              <div className="w-12 h-2 rounded bg-ig-hover animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-ig-surface border-b border-ig-border md:border md:rounded-sm md:mb-6 relative">
        {canScrollLeft && (
          <button
            onClick={() => scrollBy("left")}
            aria-label="Scroll stories left"
            className="hidden md:flex absolute left-1 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-ig-surface border border-ig-border items-center justify-center shadow-sm hover:bg-ig-hover transition-colors"
          >
            <ChevronLeft size={16} className="text-ig-text" />
          </button>
        )}
        {canScrollRight && (
          <button
            onClick={() => scrollBy("right")}
            aria-label="Scroll stories right"
            className="hidden md:flex absolute right-1 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-ig-surface border border-ig-border items-center justify-center shadow-sm hover:bg-ig-hover transition-colors"
          >
            <ChevronRight size={16} className="text-ig-text" />
          </button>
        )}

        <div
          ref={scrollRef}
          className="flex gap-4 px-4 py-3 overflow-x-auto scrollbar-hide scroll-smooth"
        >
          {ownGroup ? (
            <StoryRing
              avatar={ownGroup.user.profilePicture}
              label="Your story"
              isSelf
              hasStory
              viewed={groupIsSeen(ownGroup)}
              onClick={() => openViewerAt(ownGroup)}
            />
          ) : (
            <StoryRing
              avatar={me?.profilePicture || ""}
              label="Your story"
              isSelf
              hasStory={false}
              onClick={() => setOpenCreate(true)}
            />
          )}

          {otherGroups.map((g) => (
            <StoryRing
              key={g.user._id}
              avatar={g.user.profilePicture}
              label={g.user.username}
              viewed={groupIsSeen(g)}
              onClick={() => openViewerAt(g)}
            />
          ))}
        </div>
      </div>

      {openCreate && (
        <CreateStoryModal
          onClose={() => setOpenCreate(false)}
          onCreated={loadFeed}
        />
      )}

      {viewerOpen && viewerGroups.length > 0 && (
        <StoryViewer
          groups={viewerGroups}
          initialGroupIndex={viewerGroupIndex}
          onClose={() => setViewerOpen(false)}
          onSeen={loadFeed}
        />
      )}
    </>
  );
}
