"use client";

import {
  ChevronLeft,
  ChevronRight,
  Heart,
  MoreHorizontal,
  Send,
  X,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLanguage } from "@/lib/LanguageProvider";
import {
  StoryGroup,
  recordStoryView,
  reactToStory,
  replyToStory,
  deleteStory,
} from "@/lib/story.service";
import { toast } from "../ui/toast";
import StoryAnalytics from "./StoryAnalytics";

const IMAGE_DURATION = 5000;
const QUICK_REACTIONS = ["❤️", "🔥", "👏", "😍", "😮", "😂"];

interface Props {
  groups: StoryGroup[];
  initialGroupIndex: number;
  onClose: () => void;
  onSeen?: () => void;
}

const StoryViewer = ({ groups, initialGroupIndex, onClose, onSeen }: Props) => {
  const { t } = useLanguage();
  const [groupIndex, setGroupIndex] = useState(initialGroupIndex);
  const [storyIndex, setStoryIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reactionBurst, setReactionBurst] = useState<string | null>(null);
  const [analyticsFor, setAnalyticsFor] = useState<string | null>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isHoldingRef = useRef(false);
  const completedRef = useRef<Set<string>>(new Set());

  const currentGroup = groups[groupIndex];
  const totalStories = currentGroup?.stories.length ?? 0;
  const currentStory = currentGroup?.stories[storyIndex];
  const isOwn = !!currentGroup?.stories[storyIndex]?.isOwn;

  const duration =
    currentStory?.media.type === "video" && currentStory.media.duration
      ? currentStory.media.duration * 1000
      : IMAGE_DURATION;

  // Record a (deduped) view whenever a new story becomes visible.
  useEffect(() => {
    if (!currentStory || isOwn) return;
    recordStoryView(currentStory._id, false, storyIndex).catch(() => {});
  }, [currentStory?._id, isOwn, storyIndex]);

  const markCompleted = useCallback(() => {
    if (!currentStory || isOwn) return;
    if (completedRef.current.has(currentStory._id)) return;
    completedRef.current.add(currentStory._id);
    recordStoryView(currentStory._id, true, storyIndex).catch(() => {});
  }, [currentStory, isOwn, storyIndex]);

  const goNext = useCallback(
    (natural = false) => {
      if (natural) markCompleted();
      if (storyIndex < totalStories - 1) {
        setStoryIndex((i) => i + 1);
      } else if (groupIndex < groups.length - 1) {
        setGroupIndex((g) => g + 1);
        setStoryIndex(0);
      } else {
        onClose();
      }
    },
    [storyIndex, totalStories, groupIndex, groups.length, onClose, markCompleted],
  );

  const goPrev = useCallback(() => {
    if (storyIndex > 0) {
      setStoryIndex((i) => i - 1);
    } else if (groupIndex > 0) {
      setGroupIndex((g) => g - 1);
      setStoryIndex(0);
    }
  }, [storyIndex, groupIndex]);

  const goToGroup = (idx: number) => {
    setGroupIndex(idx);
    setStoryIndex(0);
  };

  // Auto-advance for images (videos advance on `ended`).
  useEffect(() => {
    if (paused || !currentStory) return;
    if (currentStory.media.type === "video") return;
    timerRef.current = setTimeout(() => goNext(true), duration);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [groupIndex, storyIndex, paused, duration, currentStory, goNext]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, goNext, goPrev]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const handlePointerDown = () => {
    holdTimerRef.current = setTimeout(() => {
      isHoldingRef.current = true;
      setPaused(true);
    }, 180);
  };

  const handlePointerUp = (side: "left" | "right") => {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    if (isHoldingRef.current) {
      isHoldingRef.current = false;
      setPaused(false);
    } else {
      if (side === "left") goPrev();
      else goNext();
    }
  };

  const burst = (emoji: string) => {
    setReactionBurst(emoji);
    setTimeout(() => setReactionBurst(null), 700);
  };

  const handleReaction = async (emoji: string) => {
    if (!currentStory || isOwn) return;
    burst(emoji);
    try {
      await reactToStory(currentStory._id, emoji);
    } catch (error) {
      console.log(error);
    }
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reply.trim() || !currentStory || sending) return;
    setSending(true);
    try {
      await replyToStory(currentStory._id, reply.trim());
      setReply("");
      setPaused(false);
      toast.add({ type: "success", title: t("story.replySent") });
    } catch (error) {
      toast.add({ type: "error", title: t("story.replyFailed") });
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async () => {
    if (!currentStory) return;
    try {
      await deleteStory(currentStory._id);
      toast.add({ type: "success", title: t("story.deleted") });
      setMenuOpen(false);
      onSeen?.();
      onClose();
    } catch (error) {
      toast.add({ type: "error", title: t("story.deleteFailed") });
    }
  };

  if (!currentGroup || !currentStory) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-black flex items-center justify-center">
      {/* Group navigation arrows — desktop */}
      <div className="hidden md:flex items-center gap-2 absolute left-1/2 -translate-x-1/2 w-full max-w-[800px] px-4 justify-between pointer-events-none">
        {groupIndex > 0 && (
          <button
            onClick={() => goToGroup(groupIndex - 1)}
            className="pointer-events-auto bg-white/90 hover:bg-white rounded-full p-2 shadow-lg transition-all shrink-0"
          >
            <ChevronLeft size={22} className="text-ig-text" />
          </button>
        )}
        {groupIndex < groups.length - 1 && (
          <button
            onClick={() => goToGroup(groupIndex + 1)}
            className="pointer-events-auto bg-white/90 hover:bg-white rounded-full p-2 shadow-lg transition-all ml-auto shrink-0"
          >
            <ChevronRight size={22} className="text-ig-text" />
          </button>
        )}
      </div>

      <div
        className="relative w-full max-w-[400px] bg-black overflow-hidden"
        style={{ height: "100dvh" }}
      >
        {/* Media */}
        {currentStory.media.type === "video" ? (
          <video
            key={currentStory._id}
            src={currentStory.media.url}
            className="absolute inset-0 w-full h-full object-cover"
            autoPlay
            playsInline
            muted
            onEnded={() => goNext(true)}
            onPause={() => setPaused(true)}
            onPlay={() => {
              if (!isHoldingRef.current) setPaused(false);
            }}
          />
        ) : (
          <img
            key={currentStory._id}
            src={currentStory.media.url}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}

        {/* Dark gradients */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/50 pointer-events-none" />

        {/* Progress bars */}
        <div className="absolute top-3 left-3 right-3 flex gap-1 z-10 pointer-events-none">
          {currentGroup.stories.map((s, i) => (
            <div
              key={s._id}
              className="flex-1 h-[2px] bg-white/40 rounded-full overflow-hidden"
            >
              {i < storyIndex ? (
                <div className="h-full w-full bg-white" />
              ) : i === storyIndex ? (
                <div
                  key={`${groupIndex}-${storyIndex}`}
                  className="h-full bg-white rounded-full"
                  style={{
                    animation: `storyFill ${duration}ms linear forwards`,
                    animationPlayState: paused ? "paused" : "running",
                  }}
                />
              ) : (
                <div className="h-full w-0 bg-white" />
              )}
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-7 left-3 right-3 flex items-center justify-between z-10">
          <div className="flex items-center gap-2 pointer-events-none">
            <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-white shrink-0">
              <img
                src={currentGroup.user.profilePicture}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
            <span className="text-white text-sm font-semibold drop-shadow">
              {currentGroup.user.username}
            </span>
            <span className="text-white/60 text-xs">· 23h</span>
          </div>
          <div className="flex items-center gap-3 relative">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="text-white hover:opacity-70 transition-opacity"
            >
              <MoreHorizontal size={20} />
            </button>
            <button
              onClick={onClose}
              className="text-white hover:opacity-70 transition-opacity"
            >
              <X size={20} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-8 bg-ig-surface border border-ig-border rounded-lg shadow-lg py-1 min-w-[160px] z-20">
                {isOwn && (
                  <button
                    onClick={handleDelete}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[#ed4956] hover:bg-ig-hover transition-colors"
                  >
                    <Trash2 size={16} /> {t("story.deleteStory")}
                  </button>
                )}
                <button
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-ig-text hover:bg-ig-hover transition-colors"
                >
                  <Send size={16} /> {t("story.report")}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Tap navigation areas */}
        <div className="absolute inset-0 flex" style={{ top: 60, bottom: 120 }}>
          <div
            className="w-1/3 h-full cursor-pointer select-none"
            onPointerDown={handlePointerDown}
            onPointerUp={() => handlePointerUp("left")}
          />
          <div
            className="flex-1 h-full cursor-pointer select-none"
            onPointerDown={handlePointerDown}
            onPointerUp={() => handlePointerUp("right")}
          />
        </div>

        {/* Pause indicator */}
        {paused && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="flex gap-2">
              <div className="w-1.5 h-8 bg-white rounded-full" />
              <div className="w-1.5 h-8 bg-white rounded-full" />
            </div>
          </div>
        )}

        {/* Reaction burst */}
        {reactionBurst && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <span
              className="text-7xl"
              style={{ animation: "storyBurst 700ms ease-out forwards" }}
            >
              {reactionBurst}
            </span>
          </div>
        )}

        {/* Bottom bar */}
        <div className="absolute bottom-5 left-3 right-3 z-10 flex flex-col gap-2">
          {!isOwn && (
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
              {QUICK_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleReaction(emoji);
                  }}
                  className="text-2xl hover:scale-125 active:scale-95 transition-transform shrink-0"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
          <div className="flex items-center gap-3">
            {isOwn ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setAnalyticsFor(currentStory._id);
                }}
                className="flex-1 text-left text-white/80 hover:text-white text-sm px-4 py-2 border border-white/40 rounded-full transition-colors"
              >
                {t("story.viewAnalytics")}
              </button>
            ) : (
              <form onSubmit={handleReply} className="flex-1 flex items-center gap-3">
                <input
                  type="text"
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder={t("story.replyTo", { name: currentGroup.user.username })}
                  className="flex-1 bg-transparent border border-white/50 rounded-full px-4 py-2 text-white text-sm placeholder:text-white/60 focus:outline-none focus:border-white transition-colors"
                  onFocus={() => setPaused(true)}
                  onBlur={() => {
                    if (!reply) setPaused(false);
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
                <button
                  type="submit"
                  disabled={sending}
                  onClick={(e) => e.stopPropagation()}
                  className="text-white hover:opacity-70 disabled:opacity-40"
                >
                  <Send size={24} strokeWidth={1.5} />
                </button>
              </form>
            )}
            {!isOwn && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleReaction("❤️");
                }}
                className="hover:scale-110 transition-transform active:scale-95"
              >
                <Heart size={26} strokeWidth={1.5} className="text-white" />
              </button>
            )}
          </div>
        </div>
      </div>

      {analyticsFor && (
        <StoryAnalytics
          storyId={analyticsFor}
          onClose={() => setAnalyticsFor(null)}
        />
      )}
    </div>
  );
};

export default StoryViewer;
