"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  Image as ImageIcon,
  Film,
  CreditCard,
  Flag,
  MessageSquare,
  ScrollText,
  Clock,
  ShieldAlert,
  ChevronLeft,
} from "lucide-react";
import Sidebar from "@/components/insta/Sidebar";
import MobileNav from "@/components/insta/MobileNav";
import ResourceTable, {
  type ResourceConfig,
  type Option,
} from "@/components/admin/ResourceTable";
import { useLanguage } from "@/lib/LanguageProvider";
import {
  fetchAdminStats,
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  listPosts,
  updatePost,
  deletePost,
  listScheduledPosts,
  updateScheduledPost,
  listStories,
  updateStory,
  deleteStory,
  listSubscriptions,
  updateSubscription,
  deleteSubscription,
  listReports,
  updateReport,
  deleteReport,
  listComments,
  deleteComment,
  listAuditLogs,
  type AdminStats,
} from "@/lib/admin.service";

type TabId =
  | "overview"
  | "users"
  | "posts"
  | "scheduled"
  | "stories"
  | "subscriptions"
  | "reports"
  | "comments"
  | "audit";

const dateFmt = (d?: string) =>
  d ? new Date(d).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—";

function Badge({ text, tone }: { text: string; tone: string }) {
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${tone}`}
    >
      {text}
    </span>
  );
}

export default function AdminPage() {
  const { t } = useLanguage();

  const [guard, setGuard] = useState<"checking" | "allowed" | "denied">(
    "checking",
  );
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [tab, setTab] = useState<TabId>("overview");

  const loadStats = useCallback(async () => {
    try {
      const s = await fetchAdminStats();
      setStats(s);
      setGuard("allowed");
    } catch (err: any) {
      if (err?.response?.status === 403) setGuard("denied");
      else setGuard("denied");
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats, tab]);

  const yesNo = (v: boolean) =>
    v ? (
      <Badge text={t("admin.yes")} tone="bg-green-500/15 text-green-600" />
    ) : (
      <Badge text={t("admin.no")} tone="bg-ig-hover text-ig-muted" />
    );

  // Enum values are shown as-is (admins read the raw domain values); only the
  // first letter is capitalized for display.
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const opt = (values: string[], _prefix?: string): Option[] =>
    values.map((v) => ({ value: v, label: cap(v.replace(/_/g, " ")) }));

  // ── Entity configs ──────────────────────────────────────────────
  const configs = useMemo<Record<TabId, ResourceConfig | null>>(() => {
    const users: ResourceConfig = {
      title: t("admin.tabs.users"),
      list: listUsers,
      searchable: true,
      searchPlaceholder: t("admin.searchUsers"),
      sortOptions: [
        { value: "createdAt", label: t("admin.sort.newest") },
        { value: "username", label: t("admin.sort.username") },
        { value: "followersCount", label: t("admin.sort.followers") },
      ],
      filters: [
        { name: "role", label: t("admin.role"), type: "select", options: opt(["user", "admin"], "admin.roleVal") },
        { name: "status", label: t("admin.status"), type: "select", options: opt(["active", "deactivated"], "admin.statusVal") },
        { name: "plan", label: t("admin.plan"), type: "select", options: opt(["free", "bronze", "silver", "gold"], "admin.planVal") },
        { name: "isVerified", label: t("admin.verified"), type: "boolean", options: [{ value: "true", label: t("admin.yes") }, { value: "false", label: t("admin.no") }] },
        { name: "from", label: t("admin.from"), type: "date" },
        { name: "to", label: t("admin.to"), type: "date" },
      ],
      columns: [
        { key: "username", label: t("admin.col.username") },
        { key: "email", label: t("admin.col.email") },
        { key: "role", label: t("admin.col.role"), render: (r) => <Badge text={r.role} tone={r.role === "admin" ? "bg-[#0095f6]/15 text-[#0095f6]" : "bg-ig-hover text-ig-muted"} /> },
        { key: "status", label: t("admin.col.status"), render: (r) => <Badge text={r.status} tone={r.status === "active" ? "bg-green-500/15 text-green-600" : "bg-[#ed4956]/15 text-[#ed4956]"} /> },
        { key: "plan", label: t("admin.col.plan") },
        { key: "isVerified", label: t("admin.col.verified"), render: (r) => yesNo(r.isVerified) },
        { key: "createdAt", label: t("admin.col.joined"), render: (r) => dateFmt(r.createdAt) },
      ],
      create: {
        title: t("admin.createUser"),
        submit: createUser,
        fields: [
          { name: "username", label: t("admin.col.username"), type: "text" },
          { name: "fullName", label: t("admin.col.fullName"), type: "text" },
          { name: "email", label: t("admin.col.email"), type: "text" },
          { name: "password", label: t("admin.col.password"), type: "text" },
          { name: "role", label: t("admin.col.role"), type: "select", options: opt(["user", "admin"], "admin.roleVal") },
          { name: "plan", label: t("admin.col.plan"), type: "select", options: opt(["free", "bronze", "silver", "gold"], "admin.planVal") },
        ],
      },
      edit: {
        title: t("admin.editUser"),
        submit: updateUser,
        fields: [
          { name: "fullName", label: t("admin.col.fullName"), type: "text" },
          { name: "email", label: t("admin.col.email"), type: "text" },
          { name: "role", label: t("admin.col.role"), type: "select", options: opt(["user", "admin"], "admin.roleVal") },
          { name: "status", label: t("admin.col.status"), type: "select", options: opt(["active", "deactivated"], "admin.statusVal") },
          { name: "plan", label: t("admin.col.plan"), type: "select", options: opt(["free", "bronze", "silver", "gold"], "admin.planVal") },
          { name: "isVerified", label: t("admin.col.verified"), type: "boolean" },
          { name: "bio", label: t("admin.col.bio"), type: "text" },
        ],
      },
      remove: { submit: deleteUser },
    };

    const posts: ResourceConfig = {
      title: t("admin.tabs.posts"),
      list: listPosts,
      searchable: true,
      searchPlaceholder: t("admin.searchPosts"),
      sortOptions: [
        { value: "createdAt", label: t("admin.sort.newest") },
        { value: "likesCount", label: t("admin.sort.likes") },
        { value: "commentsCount", label: t("admin.sort.comments") },
      ],
      filters: [
        { name: "visibility", label: t("admin.visibility"), type: "select", options: opt(["public", "followers"], "admin.visibilityVal") },
        { name: "isDeleted", label: t("admin.deleted"), type: "boolean", options: [{ value: "true", label: t("admin.yes") }, { value: "false", label: t("admin.no") }] },
        { name: "isArchived", label: t("admin.archived"), type: "boolean", options: [{ value: "true", label: t("admin.yes") }, { value: "false", label: t("admin.no") }] },
        { name: "from", label: t("admin.from"), type: "date" },
        { name: "to", label: t("admin.to"), type: "date" },
      ],
      columns: [
        { key: "user", label: t("admin.col.owner"), render: (r) => r.user?.username || "—" },
        { key: "caption", label: t("admin.col.caption"), render: (r) => <span className="line-clamp-1 max-w-[220px] inline-block">{r.caption || "—"}</span> },
        { key: "visibility", label: t("admin.col.visibility") },
        { key: "likesCount", label: t("admin.col.likes") },
        { key: "commentsCount", label: t("admin.col.comments") },
        { key: "isDeleted", label: t("admin.col.deleted"), render: (r) => yesNo(r.isDeleted) },
        { key: "createdAt", label: t("admin.col.created"), render: (r) => dateFmt(r.createdAt) },
      ],
      edit: {
        title: t("admin.editPost"),
        submit: updatePost,
        fields: [
          { name: "caption", label: t("admin.col.caption"), type: "text" },
          { name: "visibility", label: t("admin.col.visibility"), type: "select", options: opt(["public", "followers"], "admin.visibilityVal") },
          { name: "isArchived", label: t("admin.col.archived"), type: "boolean" },
          { name: "isDeleted", label: t("admin.col.deleted"), type: "boolean" },
        ],
      },
      remove: { submit: deletePost },
    };

    const schedStatusTone = (s: string) =>
      s === "scheduled"
        ? "bg-[#0095f6]/15 text-[#0095f6]"
        : s === "published"
          ? "bg-green-500/15 text-green-600"
          : s === "failed"
            ? "bg-[#ed4956]/15 text-[#ed4956]"
            : "bg-ig-hover text-ig-muted";

    const scheduled: ResourceConfig = {
      title: t("admin.tabs.scheduled"),
      list: listScheduledPosts,
      searchable: true,
      searchPlaceholder: t("admin.searchPosts"),
      sortOptions: [
        { value: "scheduledFor", label: t("admin.sort.scheduleTime") },
        { value: "createdAt", label: t("admin.sort.newest") },
        { value: "status", label: t("admin.sort.status") },
      ],
      filters: [
        { name: "status", label: t("admin.status"), type: "select", options: opt(["scheduled", "published", "cancelled", "failed"], "admin.schedStatusVal") },
        { name: "from", label: t("admin.from"), type: "date" },
        { name: "to", label: t("admin.to"), type: "date" },
      ],
      columns: [
        { key: "user", label: t("admin.col.owner"), render: (r) => r.user?.username || "—" },
        { key: "caption", label: t("admin.col.caption"), render: (r) => <span className="line-clamp-1 max-w-[200px] inline-block">{r.caption || "—"}</span> },
        { key: "status", label: t("admin.col.status"), render: (r) => <Badge text={r.status} tone={schedStatusTone(r.status)} /> },
        { key: "scheduledFor", label: t("admin.col.scheduledFor"), render: (r) => dateFmt(r.scheduledFor) },
        { key: "publishAttempts", label: t("admin.col.attempts"), render: (r) => r.publishAttempts ?? 0 },
        { key: "lastError", label: t("admin.col.lastError"), render: (r) => <span className="line-clamp-1 max-w-[180px] inline-block text-[#ed4956]">{r.lastError || "—"}</span> },
        { key: "publishedAt", label: t("admin.col.publishedAt"), render: (r) => dateFmt(r.publishedAt) },
      ],
      edit: {
        title: t("admin.editScheduled"),
        submit: updateScheduledPost,
        fields: [
          { name: "status", label: t("admin.col.status"), type: "select", options: opt(["scheduled", "published", "cancelled", "failed"], "admin.schedStatusVal") },
          { name: "scheduledFor", label: t("admin.col.scheduledFor"), type: "datetime" },
        ],
      },
    };

    const stories: ResourceConfig = {
      title: t("admin.tabs.stories"),
      list: listStories,
      sortOptions: [
        { value: "createdAt", label: t("admin.sort.newest") },
        { value: "viewsCount", label: t("admin.sort.views") },
        { value: "expiresAt", label: t("admin.sort.expiry") },
      ],
      filters: [
        { name: "privacy", label: t("admin.privacy"), type: "select", options: opt(["public", "followers", "close_friends"], "admin.privacyVal") },
        { name: "isActive", label: t("admin.active"), type: "boolean", options: [{ value: "true", label: t("admin.yes") }, { value: "false", label: t("admin.no") }] },
        { name: "isDeleted", label: t("admin.deleted"), type: "boolean", options: [{ value: "true", label: t("admin.yes") }, { value: "false", label: t("admin.no") }] },
        { name: "from", label: t("admin.from"), type: "date" },
        { name: "to", label: t("admin.to"), type: "date" },
      ],
      columns: [
        { key: "user", label: t("admin.col.owner"), render: (r) => r.user?.username || "—" },
        { key: "privacy", label: t("admin.col.privacy") },
        { key: "viewsCount", label: t("admin.col.views") },
        { key: "isActive", label: t("admin.col.active"), render: (r) => yesNo(r.isActive) },
        { key: "expiresAt", label: t("admin.col.expires"), render: (r) => dateFmt(r.expiresAt) },
        { key: "createdAt", label: t("admin.col.created"), render: (r) => dateFmt(r.createdAt) },
      ],
      edit: {
        title: t("admin.editStory"),
        submit: updateStory,
        fields: [
          { name: "privacy", label: t("admin.col.privacy"), type: "select", options: opt(["public", "followers", "close_friends"], "admin.privacyVal") },
          { name: "isActive", label: t("admin.col.active"), type: "boolean" },
          { name: "isArchived", label: t("admin.col.archived"), type: "boolean" },
          { name: "isDeleted", label: t("admin.col.deleted"), type: "boolean" },
        ],
      },
      remove: { submit: deleteStory },
    };

    const subscriptions: ResourceConfig = {
      title: t("admin.tabs.subscriptions"),
      list: listSubscriptions,
      sortOptions: [
        { value: "createdAt", label: t("admin.sort.newest") },
        { value: "endDate", label: t("admin.sort.endDate") },
        { value: "amount", label: t("admin.sort.amount") },
      ],
      filters: [
        { name: "plan", label: t("admin.plan"), type: "select", options: opt(["bronze", "silver", "gold"], "admin.planVal") },
        { name: "status", label: t("admin.status"), type: "select", options: opt(["active", "expired", "cancelled", "cancellation_scheduled"], "admin.subStatusVal") },
        { name: "from", label: t("admin.from"), type: "date" },
        { name: "to", label: t("admin.to"), type: "date" },
      ],
      columns: [
        { key: "user", label: t("admin.col.user"), render: (r) => r.user?.username || "—" },
        { key: "plan", label: t("admin.col.plan") },
        { key: "status", label: t("admin.col.status"), render: (r) => <Badge text={r.status} tone={r.status === "active" ? "bg-green-500/15 text-green-600" : "bg-ig-hover text-ig-muted"} /> },
        { key: "amount", label: t("admin.col.amount"), render: (r) => `₹${(r.amount / 100).toFixed(2)}` },
        { key: "endDate", label: t("admin.col.endDate"), render: (r) => dateFmt(r.endDate) },
        { key: "createdAt", label: t("admin.col.created"), render: (r) => dateFmt(r.createdAt) },
      ],
      edit: {
        title: t("admin.editSubscription"),
        submit: updateSubscription,
        fields: [
          { name: "plan", label: t("admin.col.plan"), type: "select", options: opt(["bronze", "silver", "gold"], "admin.planVal") },
          { name: "status", label: t("admin.col.status"), type: "select", options: opt(["active", "expired", "cancelled", "cancellation_scheduled"], "admin.subStatusVal") },
          { name: "cancelAtPeriodEnd", label: t("admin.col.cancelAtEnd"), type: "boolean" },
        ],
      },
      remove: { submit: deleteSubscription },
    };

    const reports: ResourceConfig = {
      title: t("admin.tabs.reports"),
      list: listReports,
      sortOptions: [
        { value: "createdAt", label: t("admin.sort.newest") },
        { value: "status", label: t("admin.sort.status") },
      ],
      filters: [
        { name: "status", label: t("admin.status"), type: "select", options: opt(["pending", "reviewed", "resolved", "dismissed"], "admin.reportStatusVal") },
        { name: "targetType", label: t("admin.targetType"), type: "select", options: opt(["user", "post", "story", "comment"], "admin.targetTypeVal") },
        { name: "reason", label: t("admin.reason"), type: "select", options: opt(["spam", "nudity", "violence", "hate", "harassment", "other"], "admin.reasonVal") },
        { name: "from", label: t("admin.from"), type: "date" },
        { name: "to", label: t("admin.to"), type: "date" },
      ],
      columns: [
        { key: "targetType", label: t("admin.col.targetType") },
        { key: "reason", label: t("admin.col.reason") },
        { key: "status", label: t("admin.col.status"), render: (r) => <Badge text={r.status} tone={r.status === "pending" ? "bg-yellow-500/15 text-yellow-600" : r.status === "resolved" ? "bg-green-500/15 text-green-600" : "bg-ig-hover text-ig-muted"} /> },
        { key: "reporter", label: t("admin.col.reporter"), render: (r) => r.reporter?.username || "—" },
        { key: "createdAt", label: t("admin.col.created"), render: (r) => dateFmt(r.createdAt) },
      ],
      edit: {
        title: t("admin.editReport"),
        submit: updateReport,
        fields: [
          { name: "status", label: t("admin.col.status"), type: "select", options: opt(["pending", "reviewed", "resolved", "dismissed"], "admin.reportStatusVal") },
          { name: "description", label: t("admin.col.notes"), type: "text" },
        ],
      },
      remove: { submit: deleteReport },
    };

    const comments: ResourceConfig = {
      title: t("admin.tabs.comments"),
      list: listComments,
      searchable: true,
      searchPlaceholder: t("admin.searchComments"),
      sortOptions: [
        { value: "createdAt", label: t("admin.sort.newest") },
        { value: "likesCount", label: t("admin.sort.likes") },
      ],
      filters: [
        { name: "isDeleted", label: t("admin.deleted"), type: "boolean", options: [{ value: "true", label: t("admin.yes") }, { value: "false", label: t("admin.no") }] },
        { name: "from", label: t("admin.from"), type: "date" },
        { name: "to", label: t("admin.to"), type: "date" },
      ],
      columns: [
        { key: "user", label: t("admin.col.user"), render: (r) => r.user?.username || "—" },
        { key: "text", label: t("admin.col.text"), render: (r) => <span className="line-clamp-1 max-w-[260px] inline-block">{r.text}</span> },
        { key: "likesCount", label: t("admin.col.likes") },
        { key: "isDeleted", label: t("admin.col.deleted"), render: (r) => yesNo(r.isDeleted) },
        { key: "createdAt", label: t("admin.col.created"), render: (r) => dateFmt(r.createdAt) },
      ],
      remove: { submit: deleteComment },
    };

    const audit: ResourceConfig = {
      title: t("admin.tabs.audit"),
      list: listAuditLogs,
      sortOptions: [{ value: "createdAt", label: t("admin.sort.newest") }],
      filters: [
        { name: "entityType", label: t("admin.entityType"), type: "select", options: opt(["user", "post", "story", "subscription", "report", "comment"], "admin.targetTypeVal") },
        { name: "from", label: t("admin.from"), type: "date" },
        { name: "to", label: t("admin.to"), type: "date" },
      ],
      columns: [
        { key: "action", label: t("admin.col.action") },
        { key: "entityType", label: t("admin.col.entity") },
        { key: "admin", label: t("admin.col.byAdmin"), render: (r) => r.admin?.username || "—" },
        { key: "summary", label: t("admin.col.summary"), render: (r) => <span className="line-clamp-1 max-w-[260px] inline-block">{r.summary}</span> },
        { key: "createdAt", label: t("admin.col.when"), render: (r) => dateFmt(r.createdAt) },
      ],
    };

    return {
      overview: null,
      users,
      posts,
      scheduled,
      stories,
      subscriptions,
      reports,
      comments,
      audit,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t, stats]);

  const tabs: { id: TabId; label: string; icon: any }[] = [
    { id: "overview", label: t("admin.tabs.overview"), icon: LayoutDashboard },
    { id: "users", label: t("admin.tabs.users"), icon: Users },
    { id: "posts", label: t("admin.tabs.posts"), icon: ImageIcon },
    { id: "scheduled", label: t("admin.tabs.scheduled"), icon: Clock },
    { id: "stories", label: t("admin.tabs.stories"), icon: Film },
    { id: "subscriptions", label: t("admin.tabs.subscriptions"), icon: CreditCard },
    { id: "reports", label: t("admin.tabs.reports"), icon: Flag },
    { id: "comments", label: t("admin.tabs.comments"), icon: MessageSquare },
    { id: "audit", label: t("admin.tabs.audit"), icon: ScrollText },
  ];

  // ── Guard states ──────────────────────────────────────────────
  if (guard === "checking") {
    return (
      <div className="min-h-screen bg-ig-bg flex items-center justify-center text-ig-muted text-sm">
        {t("common.loading")}
      </div>
    );
  }

  if (guard === "denied") {
    return (
      <div className="min-h-screen bg-ig-bg flex items-center justify-center p-4">
        <div className="max-w-[380px] text-center bg-ig-surface border border-ig-border rounded-xl p-8">
          <ShieldAlert size={40} className="mx-auto text-[#ed4956] mb-3" />
          <h1 className="text-lg font-semibold text-ig-text mb-1">
            {t("admin.accessDenied")}
          </h1>
          <p className="text-sm text-ig-muted mb-5">{t("admin.accessDeniedDesc")}</p>
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm font-semibold text-[#0095f6]"
          >
            <ChevronLeft size={16} /> {t("admin.backToApp")}
          </Link>
        </div>
      </div>
    );
  }

  const active = configs[tab];

  return (
    <div className="bg-ig-surface md:bg-ig-ig min-h-screen">
      <Sidebar />
      <div className="md:ml-[72px] xl:ml-[244px]">
        <div className="max-w-[1100px] mx-auto px-4 py-6 pb-24 md:pb-8">
          <h1 className="text-xl font-semibold text-ig-text mb-1">
            {t("admin.title")}
          </h1>
          <p className="text-sm text-ig-muted mb-6">{t("admin.subtitle")}</p>

          <div className="flex gap-6">
            {/* Tab rail */}
            <nav className="hidden md:flex flex-col gap-1 w-[200px] shrink-0">
              {tabs.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                    tab === id
                      ? "bg-ig-hover text-ig-text font-semibold"
                      : "text-ig-muted hover:bg-ig-hover hover:text-ig-text"
                  }`}
                >
                  <Icon size={18} />
                  {label}
                </button>
              ))}
            </nav>

            {/* Mobile tab bar */}
            <div className="md:hidden fixed bottom-[56px] left-0 right-0 z-40 bg-ig-surface border-t border-ig-border overflow-x-auto scrollbar-hide">
              <div className="flex gap-1 px-2 py-1.5">
                {tabs.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setTab(id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs whitespace-nowrap ${
                      tab === id
                        ? "bg-ig-hover text-ig-text font-semibold"
                        : "text-ig-muted"
                    }`}
                  >
                    <Icon size={15} /> {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Panel */}
            <div className="flex-1 min-w-0">
              {tab === "overview" ? (
                <Overview stats={stats} t={t} />
              ) : (
                active && <ResourceTable key={tab} config={active} />
              )}
            </div>
          </div>
        </div>
      </div>
      <MobileNav />
    </div>
  );
}

function Overview({ stats, t }: { stats: AdminStats | null; t: any }) {
  if (!stats) return null;
  const cards = [
    { label: t("admin.stat.totalUsers"), value: stats.users.total },
    { label: t("admin.stat.activeUsers"), value: stats.users.active },
    { label: t("admin.stat.posts"), value: stats.posts },
    { label: t("admin.stat.stories"), value: stats.stories },
    { label: t("admin.stat.comments"), value: stats.comments },
    { label: t("admin.stat.activeSubs"), value: stats.subscriptions.active },
    { label: t("admin.stat.reports"), value: stats.reports.total },
    { label: t("admin.stat.pendingReports"), value: stats.reports.byStatus.pending },
  ];
  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {cards.map((c) => (
          <div
            key={c.label}
            className="bg-ig-surface border border-ig-border rounded-xl p-4"
          >
            <p className="text-2xl font-semibold text-ig-text">{c.value}</p>
            <p className="text-xs text-ig-muted mt-1">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <section className="bg-ig-surface border border-ig-border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-ig-text mb-3">
            {t("admin.stat.engagement")}
          </h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Row label={t("admin.col.likes")} value={stats.engagement.likes} />
            <Row label={t("admin.col.comments")} value={stats.engagement.comments} />
            <Row label={t("admin.stat.saves")} value={stats.engagement.saves} />
            <Row label={t("admin.stat.shares")} value={stats.engagement.shares} />
          </div>
        </section>

        <section className="bg-ig-surface border border-ig-border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-ig-text mb-3">
            {t("admin.stat.planBreakdown")}
          </h2>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <Row label="Bronze" value={stats.subscriptions.byPlan.bronze} />
            <Row label="Silver" value={stats.subscriptions.byPlan.silver} />
            <Row label="Gold" value={stats.subscriptions.byPlan.gold} />
          </div>
        </section>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between border-b border-ig-border py-1.5">
      <span className="text-ig-muted">{label}</span>
      <span className="font-semibold text-ig-text">{value}</span>
    </div>
  );
}
