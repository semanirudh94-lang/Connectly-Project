"use client";

import { useCallback, useEffect, useState } from "react";
import { X, Eye, Users, CheckCircle2, Heart, MessageCircle } from "lucide-react";
import axiosInstance from "@/lib/axios";
import { useLanguage } from "@/lib/LanguageProvider";
import { socket } from "@/lib/socket";
import { toast } from "../ui/toast";

interface Viewer {
  _id: string;
  viewedAt: string;
  completed: boolean;
  viewer: {
    _id: string;
    username: string;
    fullName: string;
    profilePicture: string;
  };
}

interface Analytics {
  storyId: string;
  createdAt: string;
  expiresAt: string;
  isArchived: boolean;
  isActive: boolean;
  viewsCount: number;
  uniqueViewers: number;
  completedCount: number;
  completionRate: number;
  reactionsCount: number;
  reactions: { _id: string; count: number }[];
  repliesCount: number;
  replies: {
    _id: string;
    text: string;
    createdAt: string;
    user: { username: string; profilePicture: string };
  }[];
  viewers: Viewer[];
  page: number;
  limit: number;
  hasMore: boolean;
  timeline: { hour: string; views: number }[];
}

interface LiveEvent {
  id: string;
  kind: string;
  username: string;
  emoji?: string;
  at: string;
}

interface Props {
  storyId: string;
  onClose: () => void;
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: any;
  label: string;
  value: number | string;
  accent?: string;
}) {
  return (
    <div className="flex-1 min-w-[120px] bg-ig-hover rounded-lg p-3">
      <div className="flex items-center gap-1.5 text-ig-muted mb-1">
        <Icon size={15} className={accent} />
        <span className="text-[11px] font-semibold uppercase tracking-wide">
          {label}
        </span>
      </div>
      <p className="text-2xl font-semibold text-ig-text">{value}</p>
    </div>
  );
}

function TimelineChart({ data }: { data: { hour: string; views: number }[] }) {
  const { t } = useLanguage();
  if (!data.length) {
    return (
      <p className="text-sm text-ig-muted py-6 text-center">
        {t("analytics.noViews")}
      </p>
    );
  }
  const max = Math.max(...data.map((d) => d.views), 1);
  const W = 100;
  const H = 40;
  const step = W / data.length;
  const points = data
    .map((d, i) => {
      const x = i * step + step / 2;
      const y = H - (d.views / max) * (H - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="w-full h-28"
      >
        <polyline
          points={`0,${H} ${points} ${W},${H}`}
          fill="rgba(0,149,246,0.15)"
          stroke="none"
        />
        <polyline
          points={points}
          fill="none"
          stroke="#0095f6"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="flex justify-between text-[10px] text-ig-muted mt-1">
        <span>{new Date(data[0].hour).toLocaleString()}</span>
        <span>{new Date(data[data.length - 1].hour).toLocaleString()}</span>
      </div>
    </div>
  );
}

const StoryAnalytics = ({ storyId, onClose }: Props) => {
  const { t } = useLanguage();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [live, setLive] = useState<LiveEvent[]>([]);

  const load = useCallback(
    async (p = 1, append = false) => {
      try {
        const res = await axiosInstance.get(
          `/api/stories/${storyId}/analytics?page=${p}`,
        );
        const data: Analytics = res.data.analytics;
        setAnalytics((prev) => {
          if (!append || !prev) return data;
          return {
            ...data,
            viewers: [...prev.viewers, ...data.viewers],
            hasMore: data.hasMore,
            page: p,
          };
        });
        setPage(p);
      } catch (error: any) {
        toast.add({
          type: "error",
          title:
            error?.response?.status === 403
              ? t("analytics.notYourStory")
              : t("analytics.loadFailed"),
        });
      } finally {
        setLoading(false);
      }
    },
    [storyId],
  );

  useEffect(() => {
    load(1);
  }, [load]);

  // Real-time updates for this story.
  useEffect(() => {
    const handler = (payload: any) => {
      if (payload?.storyId !== storyId) return;
      const counts = payload.counts || {};
      setAnalytics((prev) =>
        prev
          ? {
              ...prev,
              viewsCount: counts.viewsCount ?? prev.viewsCount,
              uniqueViewers: counts.viewsCount ?? prev.uniqueViewers,
              completedCount: counts.completedCount ?? prev.completedCount,
              completionRate: counts.viewsCount
                ? Math.round(
                    ((counts.completedCount ?? prev.completedCount) /
                      counts.viewsCount) *
                      100,
                  )
                : prev.completionRate,
              reactionsCount: counts.reactionsCount ?? prev.reactionsCount,
              repliesCount: counts.repliesCount ?? prev.repliesCount,
            }
          : prev,
      );
      setLive((prev) =>
        [
          {
            id: `${Date.now()}-${Math.random()}`,
            kind: payload.kind,
            username: payload.actor?.username || "someone",
            emoji: payload.meta?.emoji,
            at: new Date().toISOString(),
          },
          ...prev,
        ].slice(0, 20),
      );
    };
    socket.on("story-analytics", handler);
    return () => {
      socket.off("story-analytics", handler);
    };
  }, [storyId]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const kindLabel = (e: LiveEvent) => {
    if (e.kind === "view") return t("analytics.viewedYourStory");
    if (e.kind === "completed") return t("analytics.watchedToEnd");
    if (e.kind === "reaction") return t("analytics.reacted", { emoji: e.emoji || "" });
    if (e.kind === "reply") return t("analytics.repliedYourStory");
    return e.kind;
  };

  return (
    <div className="fixed inset-0 z-[210] bg-black/70 flex items-center justify-center p-4">
      <div className="bg-ig-surface rounded-xl w-full max-w-[640px] max-h-[92vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-ig-surface flex items-center justify-between px-4 py-3 border-b border-ig-border z-10">
          <div>
            <h2 className="text-sm font-semibold text-ig-text">
              {t("analytics.title")}
            </h2>
            {analytics && (
              <p className="text-[11px] text-ig-muted">
                {analytics.isArchived
                  ? t("analytics.archived")
                  : analytics.isActive
                    ? t("analytics.live")
                    : t("analytics.expired")}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 text-ig-text hover:opacity-60 transition-opacity"
          >
            <X size={20} />
          </button>
        </div>

        {loading || !analytics ? (
          <div className="flex justify-center py-20 text-ig-muted text-sm">
            {t("analytics.loading")}
          </div>
        ) : (
          <div className="p-4 flex flex-col gap-5">
            {/* Summary */}
            <div className="flex flex-wrap gap-3">
              <StatCard
                icon={Eye}
                label={t("analytics.views")}
                value={analytics.viewsCount}
              />
              <StatCard
                icon={Users}
                label={t("analytics.uniqueViewers")}
                value={analytics.uniqueViewers}
              />
              <StatCard
                icon={CheckCircle2}
                label={t("analytics.completion")}
                value={`${analytics.completionRate}%`}
                accent="text-[#0095f6]"
              />
              <StatCard
                icon={Heart}
                label={t("analytics.reactions")}
                value={analytics.reactionsCount}
                accent="text-[#ed4956]"
              />
              <StatCard
                icon={MessageCircle}
                label={t("analytics.replies")}
                value={analytics.repliesCount}
              />
            </div>

            {/* Timeline */}
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-ig-muted mb-2">
                {t("analytics.viewTimeline")}
              </h3>
              <TimelineChart data={analytics.timeline} />
            </section>

            {/* Reactions breakdown */}
            {analytics.reactions.length > 0 && (
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-ig-muted mb-2">
                  {t("analytics.reactions")}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {analytics.reactions.map((r) => {
                    const max = Math.max(
                      ...analytics.reactions.map((x) => x.count),
                      1,
                    );
                    return (
                      <div
                        key={r._id}
                        className="flex items-center gap-2 bg-ig-hover rounded-full px-3 py-1.5"
                      >
                        <span className="text-lg">{r._id}</span>
                        <div className="w-16 h-1.5 bg-ig-border rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#0095f6]"
                            style={{ width: `${(r.count / max) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-ig-text font-semibold">
                          {r.count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Live activity */}
            {live.length > 0 && (
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-ig-muted mb-2">
                  {t("analytics.liveActivity")}
                </h3>
                <div className="flex flex-col gap-1 max-h-32 overflow-y-auto">
                  {live.map((e) => (
                    <p key={e.id} className="text-xs text-ig-text">
                      <span className="font-semibold">{e.username}</span>{" "}
                      {kindLabel(e)}
                    </p>
                  ))}
                </div>
              </section>
            )}

            {/* Viewers */}
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-ig-muted mb-2">
                {t("analytics.viewers")} ({analytics.viewsCount})
              </h3>
              {analytics.viewers.length === 0 ? (
                <p className="text-sm text-ig-muted">{t("analytics.noViewers")}</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {analytics.viewers.map((v) => (
                    <div key={v._id} className="flex items-center gap-3">
                      <img
                        src={v.viewer?.profilePicture}
                        alt=""
                        className="w-9 h-9 rounded-full object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-ig-text font-medium truncate">
                          {v.viewer?.username}
                        </p>
                        <p className="text-xs text-ig-muted truncate">
                          {v.viewer?.fullName}
                        </p>
                      </div>
                      {v.completed && (
                        <span className="text-[10px] text-[#0095f6] font-semibold">
                          {t("analytics.completed")}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {analytics.hasMore && (
                <button
                  onClick={() => load(page + 1, true)}
                  className="mt-3 text-sm font-semibold text-[#0095f6] hover:text-[#1877f2]"
                >
                  {t("analytics.loadMore")}
                </button>
              )}
            </section>

            {/* Replies */}
            {analytics.replies.length > 0 && (
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-ig-muted mb-2">
                  {t("analytics.replies")}
                </h3>
                <div className="flex flex-col gap-2">
                  {analytics.replies.map((r) => (
                    <div key={r._id} className="flex items-start gap-3">
                      <img
                        src={r.user?.profilePicture}
                        alt=""
                        className="w-8 h-8 rounded-full object-cover shrink-0"
                      />
                      <div className="bg-ig-hover rounded-lg px-3 py-2 flex-1">
                        <p className="text-xs font-semibold text-ig-text">
                          {r.user?.username}
                        </p>
                        <p className="text-sm text-ig-text">{r.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StoryAnalytics;
