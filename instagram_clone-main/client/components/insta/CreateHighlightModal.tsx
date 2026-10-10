"use client";

import { useEffect, useState } from "react";
import { X, Check } from "lucide-react";
import { useLanguage } from "@/lib/LanguageProvider";
import { serverMessage } from "@/lib/serverError";
import { fetchArchive, ArchiveStory } from "@/lib/story.service";
import { createHighlight } from "@/lib/highlight.service";
import { toast } from "../ui/toast";

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

const CreateHighlightModal = ({ onClose, onCreated }: Props) => {
  const { t, language } = useLanguage();
  const [stories, setStories] = useState<ArchiveStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchArchive()
      .then(setStories)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggle = (id: string) => {
    setSelected((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : [...s, id],
    );
  };

  const handleCreate = async () => {
    if (!name.trim() || !selected.length) {
      toast.add({ type: "error", title: t("highlight.addNameAndPick") });
      return;
    }
    setSaving(true);
    try {
      const first = stories.find((s) => s._id === selected[0]);
      await createHighlight(name.trim(), first?.media?.url || "", selected);
      toast.add({ type: "success", title: t("highlight.created") });
      onCreated();
      onClose();
    } catch (error: any) {
      toast.add({
        type: "error",
        title: serverMessage(error, language, t, t("highlight.createFailed")),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[170] bg-black/70 flex items-center justify-center p-4">
      <div className="bg-ig-surface rounded-xl w-full max-w-[520px] max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-ig-border shrink-0">
          <h2 className="text-sm font-semibold text-ig-text">{t("highlight.newHighlight")}</h2>
          <button
            onClick={onClose}
            className="p-1 text-ig-text hover:opacity-60 transition-opacity"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-4 py-3 border-b border-ig-border shrink-0">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            placeholder={t("highlight.namePlaceholder")}
            className="w-full text-sm text-ig-text bg-ig-input rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-ig-border"
          />
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 p-2">
          {loading ? (
            <p className="text-sm text-ig-muted text-center py-10">
              {t("highlight.loadingStories")}
            </p>
          ) : stories.length === 0 ? (
            <p className="text-sm text-ig-muted text-center py-10">
              {t("highlight.noStories")}
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-1">
              {stories.map((s) => {
                const isSel = selected.includes(s._id);
                return (
                  <button
                    key={s._id}
                    onClick={() => toggle(s._id)}
                    className={`relative aspect-square overflow-hidden rounded-sm ${
                      isSel ? "ring-2 ring-[#0095f6]" : ""
                    }`}
                  >
                    {s.media.type === "video" ? (
                      <video
                        src={s.media.url}
                        className="w-full h-full object-cover"
                        muted
                        playsInline
                      />
                    ) : (
                      <img
                        src={s.media.url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    )}
                    {isSel && (
                      <div className="absolute top-1 right-1 w-5 h-5 bg-[#0095f6] rounded-full flex items-center justify-center">
                        <Check size={12} className="text-white" strokeWidth={3} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-4 py-3 border-t border-ig-border shrink-0 flex items-center justify-between gap-3">
          <span className="text-xs text-ig-muted">
            {t("highlight.selected", { n: selected.length })}
          </span>
          <button
            onClick={handleCreate}
            disabled={saving || !selected.length}
            className="px-5 py-2 bg-[#0095f6] text-white text-sm font-semibold rounded-lg hover:bg-[#1877f2] disabled:opacity-50 transition-colors"
          >
            {saving ? t("highlight.creating") : t("highlight.create")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateHighlightModal;
