"use client";

import { useRef, useState } from "react";
import { Globe, Users, Star, X, ImageIcon, Film, Trash2 } from "lucide-react";
import {
  uploadStoryMedia,
  createStory,
  StoryMedia,
  StoryPrivacy,
} from "@/lib/story.service";
import { toast } from "../ui/toast";

const PRIVACY_OPTIONS: {
  value: StoryPrivacy;
  label: string;
  sub: string;
  icon: any;
}[] = [
  { value: "public", label: "Public", sub: "Anyone can see", icon: Globe },
  {
    value: "followers",
    label: "Followers",
    sub: "Only your followers",
    icon: Users,
  },
  {
    value: "close_friends",
    label: "Close Friends",
    sub: "Only your close friends list",
    icon: Star,
  },
];

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

interface Draft {
  file: File;
  previewUrl: string;
  type: "image" | "video";
}

const CreateStoryModal = ({ onClose, onCreated }: Props) => {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [privacy, setPrivacy] = useState<StoryPrivacy>("public");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const next: Draft[] = [];
    for (const file of Array.from(files)) {
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");
      if (!isImage && !isVideo) continue;
      next.push({
        file,
        previewUrl: URL.createObjectURL(file),
        type: isVideo ? "video" : "image",
      });
    }
    if (next.length) setDrafts((d) => [...d, ...next]);
  };

  const removeDraft = (idx: number) => {
    setDrafts((d) => {
      const copy = [...d];
      URL.revokeObjectURL(copy[idx].previewUrl);
      copy.splice(idx, 1);
      return copy;
    });
  };

  const handleShare = async () => {
    if (!drafts.length) return;
    setUploading(true);
    try {
      const uploaded: StoryMedia[] = [];
      for (const d of drafts) {
        uploaded.push(await uploadStoryMedia(d.file));
      }
      await createStory(uploaded, privacy);
      toast.add({ type: "success", title: "Story shared" });
      drafts.forEach((d) => URL.revokeObjectURL(d.previewUrl));
      onCreated();
      onClose();
    } catch (error: any) {
      toast.add({
        type: "error",
        title: error?.response?.data?.message || "Failed to share story",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[160] bg-black/70 flex items-center justify-center p-4">
      <div className="bg-ig-surface rounded-xl overflow-hidden w-full max-w-[520px] shadow-2xl flex flex-col max-h-[92vh]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-ig-border shrink-0">
          <h2 className="text-sm font-semibold text-ig-text">New story</h2>
          <button
            onClick={onClose}
            className="p-1 text-ig-text hover:opacity-60 transition-opacity"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          {drafts.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-16 gap-5 cursor-pointer hover:bg-ig-hover transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <div className="w-20 h-20 rounded-full bg-ig-hover flex items-center justify-center">
                <ImageIcon size={40} strokeWidth={1} className="text-ig-text" />
              </div>
              <p className="text-lg text-ig-text">Add photos or videos</p>
              <span className="px-5 py-2 bg-[#0095f6] text-white text-sm font-semibold rounded-lg">
                Select from computer
              </span>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1 p-2">
              {drafts.map((d, i) => (
                <div
                  key={i}
                  className="relative aspect-[9/16] bg-black overflow-hidden rounded-sm group"
                >
                  {d.type === "image" ? (
                    <img
                      src={d.previewUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <video
                      src={d.previewUrl}
                      className="w-full h-full object-cover"
                      muted
                      playsInline
                    />
                  )}
                  <div className="absolute top-1 right-1 flex items-center gap-1">
                    {d.type === "video" && (
                      <Film
                        size={14}
                        className="text-white drop-shadow bg-black/40 rounded p-0.5"
                      />
                    )}
                    <button
                      onClick={() => removeDraft(i)}
                      className="text-white bg-black/50 hover:bg-black/70 rounded-full p-1 transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
              <button
                onClick={() => fileRef.current?.click()}
                className="aspect-[9/16] rounded-sm border border-dashed border-ig-border flex items-center justify-center text-ig-muted hover:bg-ig-hover transition-colors"
              >
                <span className="text-2xl font-light">+</span>
              </button>
            </div>
          )}

          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = "";
            }}
          />

          <div className="px-4 pb-4 pt-2 border-t border-ig-border">
            <p className="text-xs font-semibold text-ig-muted mb-2">
              Who can see this?
            </p>
            <div className="flex flex-col gap-1">
              {PRIVACY_OPTIONS.map(({ value, label, sub, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => setPrivacy(value)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                    privacy === value ? "bg-ig-hover" : "hover:bg-ig-hover/60"
                  }`}
                >
                  <Icon
                    size={18}
                    className={
                      privacy === value ? "text-[#0095f6]" : "text-ig-muted"
                    }
                  />
                  <div className="flex-1">
                    <p className="text-sm text-ig-text font-medium">{label}</p>
                    <p className="text-xs text-ig-muted">{sub}</p>
                  </div>
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      privacy === value
                        ? "border-[#0095f6]"
                        : "border-ig-border"
                    }`}
                  >
                    {privacy === value && (
                      <div className="w-2 h-2 rounded-full bg-[#0095f6]" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="px-4 py-3 border-t border-ig-border shrink-0">
          <button
            onClick={handleShare}
            disabled={!drafts.length || uploading}
            className="w-full py-2 bg-[#0095f6] text-white text-sm font-semibold rounded-lg hover:bg-[#1877f2] disabled:opacity-50 transition-colors"
          >
            {uploading ? "Sharing…" : "Share story"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateStoryModal;
