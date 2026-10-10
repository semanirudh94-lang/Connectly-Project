"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarClock, Hash, ImagePlus, Loader2, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { useLanguage } from "@/lib/LanguageProvider";
import { serverMessage } from "@/lib/serverError";
import TagUsersInput from "@/components/insta/TagUsersInput";
import type { TaggableUser } from "@/lib/auth.service";
import {
  cancelScheduledPost,
  createScheduledPost,
  fetchMyScheduledPosts,
  updateScheduledPost,
  uploadPostMedia,
  type ScheduledPost,
} from "@/lib/post.service";

const MAX_SCHEDULED = 2;

function toLocalInput(v?: string | null): string {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

function fmt(v?: string | null): string {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function StatusBadge({ status }: { status: ScheduledPost["status"] }) {
  const tone =
    status === "scheduled"
      ? "bg-[#0095f6]/15 text-[#0095f6]"
      : status === "published"
        ? "bg-green-500/15 text-green-600"
        : status === "failed"
          ? "bg-[#ed4956]/15 text-[#ed4956]"
          : "bg-ig-hover text-ig-muted";
  const { t } = useLanguage();
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${tone}`}
    >
      {t(`schedule.status.${status}`)}
    </span>
  );
}

export default function ScheduledPostsSection() {
  const { t, language } = useLanguage();

  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(true);

  // create form state
  const [media, setMedia] = useState<{ url: string; type: string } | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [caption, setCaption] = useState("");
  const [location, setLocation] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [tagged, setTagged] = useState<TaggableUser[]>([]);
  const [visibility, setVisibility] = useState<"public" | "followers">("public");
  const [when, setWhen] = useState("");
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);

  // edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCaption, setEditCaption] = useState("");
  const [editWhen, setEditWhen] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await fetchMyScheduledPosts("all");
      setPosts(list);
    } catch (err: any) {
      toast.add({
        type: "error",
        title: serverMessage(err, language, t, t("schedule.loadFailed")),
      });
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const pendingCount = posts.filter((p) => p.status === "scheduled").length;
  const atLimit = pendingCount >= MAX_SCHEDULED;

  function resetForm() {
    setMedia(null);
    setPreview("");
    setCaption("");
    setLocation("");
    setHashtags("");
    setTagged([]);
    setVisibility("public");
    setWhen("");
  }

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const uploaded = await uploadPostMedia(file);
      setMedia({ url: uploaded.url, type: uploaded.type });
      setPreview(uploaded.url);
    } catch (err: any) {
      toast.add({
        type: "error",
        title: serverMessage(err, language, t, t("schedule.uploadFailed")),
      });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleSchedule() {
    if (!media) {
      toast.add({ type: "error", title: t("schedule.needMedia") });
      return;
    }
    if (!when) {
      toast.add({ type: "error", title: t("schedule.needTime") });
      return;
    }
    if (new Date(when).getTime() <= Date.now()) {
      toast.add({ type: "error", title: t("schedule.futureOnly") });
      return;
    }
    setBusy(true);
    try {
      await createScheduledPost({
        media: [media],
        caption,
        location,
        hashtags,
        taggedUsers: tagged.map((u) => u._id),
        visibility,
        scheduledFor: new Date(when).toISOString(),
      });
      toast.add({ type: "success", title: t("schedule.created") });
      resetForm();
      await load();
    } catch (err: any) {
      toast.add({
        type: "error",
        title: serverMessage(err, language, t, t("schedule.actionFailed")),
      });
    } finally {
      setBusy(false);
    }
  }

  function startEdit(p: ScheduledPost) {
    setEditingId(p._id);
    setEditCaption(p.caption || "");
    setEditWhen(toLocalInput(p.scheduledFor));
  }

  async function saveEdit(id: string) {
    if (editWhen && new Date(editWhen).getTime() <= Date.now()) {
      toast.add({ type: "error", title: t("schedule.futureOnly") });
      return;
    }
    setBusy(true);
    try {
      const body: any = { caption: editCaption };
      if (editWhen) body.scheduledFor = new Date(editWhen).toISOString();
      await updateScheduledPost(id, body);
      toast.add({ type: "success", title: t("schedule.updated") });
      setEditingId(null);
      await load();
    } catch (err: any) {
      toast.add({
        type: "error",
        title: serverMessage(err, language, t, t("schedule.actionFailed")),
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleCancel(id: string) {
    if (!window.confirm(t("schedule.confirmCancel"))) return;
    setBusy(true);
    try {
      await cancelScheduledPost(id);
      toast.add({ type: "success", title: t("schedule.cancelled") });
      await load();
    } catch (err: any) {
      toast.add({
        type: "error",
        title: serverMessage(err, language, t, t("schedule.actionFailed")),
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="bg-ig-surface border border-ig-border rounded-xl p-5 mt-4">
      <div className="flex items-center gap-2 mb-1">
        <CalendarClock size={18} className="text-ig-text" />
        <h2 className="text-base font-semibold text-ig-text">
          {t("schedule.title")}
        </h2>
      </div>
      <p className="text-sm text-ig-muted mb-5">{t("schedule.desc")}</p>

      {/* Create form */}
      <div className="border border-ig-border rounded-lg p-4 mb-5">
        <div className="flex items-center gap-3 mb-3">
          <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-ig-border text-sm text-ig-text hover:bg-ig-hover cursor-pointer">
            {uploading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <ImagePlus size={16} />
            )}
            {t("schedule.chooseImage")}
            <input
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={onFileChange}
              disabled={uploading}
            />
          </label>
          {preview && (
            <img
              src={preview}
              alt="preview"
              className="w-12 h-12 object-cover rounded-md border border-ig-border"
            />
          )}
        </div>

        <input
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder={t("schedule.caption")}
          className="w-full mb-2 px-3 py-2 text-sm rounded-lg border border-ig-border bg-transparent text-ig-text placeholder:text-ig-muted focus:outline-none focus:border-ig-text"
        />
        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder={t("schedule.location")}
          className="w-full mb-2 px-3 py-2 text-sm rounded-lg border border-ig-border bg-transparent text-ig-text placeholder:text-ig-muted focus:outline-none focus:border-ig-text"
        />
        <div className="flex items-center gap-2 mb-2">
          <Hash size={15} className="text-ig-muted shrink-0" />
          <input
            value={hashtags}
            onChange={(e) => setHashtags(e.target.value)}
            placeholder={t("schedule.hashtags")}
            className="w-full px-3 py-2 text-sm rounded-lg border border-ig-border bg-transparent text-ig-text placeholder:text-ig-muted focus:outline-none focus:border-ig-text"
          />
        </div>
        <div className="mb-3">
          <p className="text-xs font-semibold text-ig-muted mb-1.5">
            {t("schedule.tagPeople")}
          </p>
          <TagUsersInput selected={tagged} onChange={setTagged} />
        </div>
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as any)}
            className="px-3 py-2 text-sm rounded-lg border border-ig-border bg-transparent text-ig-text focus:outline-none"
          >
            <option value="public">{t("schedule.public")}</option>
            <option value="followers">{t("schedule.followers")}</option>
          </select>
          <input
            type="datetime-local"
            value={when}
            onChange={(e) => setWhen(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg border border-ig-border bg-transparent text-ig-text focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={handleSchedule} disabled={busy || uploading || atLimit}>
            {busy ? t("common.loading") : t("schedule.scheduleBtn")}
          </Button>
          <span className="text-xs text-ig-muted">
            {t("schedule.quota", { used: pendingCount, max: MAX_SCHEDULED })}
          </span>
        </div>
        {atLimit && (
          <p className="text-xs text-[#ed4956] mt-2">{t("schedule.atLimit")}</p>
        )}
      </div>

      {/* List */}
      {loading ? (
        <p className="text-sm text-ig-muted">{t("common.loading")}</p>
      ) : posts.length === 0 ? (
        <p className="text-sm text-ig-muted">{t("schedule.empty")}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {posts.map((p) => (
            <div
              key={p._id}
              className="flex gap-3 border border-ig-border rounded-lg p-3"
            >
              {p.media?.[0]?.url && (
                <img
                  src={p.media[0].url}
                  alt=""
                  className="w-16 h-16 object-cover rounded-md shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                {editingId === p._id ? (
                  <div className="flex flex-col gap-2">
                    <input
                      value={editCaption}
                      onChange={(e) => setEditCaption(e.target.value)}
                      placeholder={t("schedule.caption")}
                      className="px-3 py-1.5 text-sm rounded-lg border border-ig-border bg-transparent text-ig-text focus:outline-none focus:border-ig-text"
                    />
                    <input
                      type="datetime-local"
                      value={editWhen}
                      onChange={(e) => setEditWhen(e.target.value)}
                      className="px-3 py-1.5 text-sm rounded-lg border border-ig-border bg-transparent text-ig-text focus:outline-none"
                    />
                    <div className="flex items-center gap-2">
                      <Button onClick={() => saveEdit(p._id)} disabled={busy}>
                        {t("common.save")}
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => setEditingId(null)}
                        disabled={busy}
                      >
                        {t("common.cancel")}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 mb-1">
                      <StatusBadge status={p.status} />
                      <span className="text-xs text-ig-muted">
                        {fmt(p.scheduledFor)}
                      </span>
                    </div>
                    <p className="text-sm text-ig-text line-clamp-2">
                      {p.caption || t("schedule.noCaption")}
                    </p>
                    {p.hashtags && p.hashtags.length > 0 && (
                      <p className="text-xs text-[#0095f6] mt-1 line-clamp-1">
                        {p.hashtags.map((h) => `#${h}`).join(" ")}
                      </p>
                    )}
                    {Array.isArray(p.taggedUsers) && p.taggedUsers.length > 0 && (
                      <p className="text-xs text-ig-muted mt-1">
                        {t("schedule.taggedCount", { count: p.taggedUsers.length })}
                      </p>
                    )}
                    {p.status === "failed" && p.lastError && (
                      <p className="text-xs text-[#ed4956] mt-1">
                        {t("schedule.lastError")}: {p.lastError}
                      </p>
                    )}
                    {p.status === "scheduled" && (
                      <div className="flex items-center gap-3 mt-2">
                        <button
                          onClick={() => startEdit(p)}
                          disabled={busy}
                          className="flex items-center gap-1 text-xs font-semibold text-[#0095f6] disabled:opacity-50"
                        >
                          <Pencil size={13} /> {t("schedule.edit")}
                        </button>
                        <button
                          onClick={() => handleCancel(p._id)}
                          disabled={busy}
                          className="flex items-center gap-1 text-xs font-semibold text-[#ed4956] disabled:opacity-50"
                        >
                          <X size={13} /> {t("schedule.cancel")}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
