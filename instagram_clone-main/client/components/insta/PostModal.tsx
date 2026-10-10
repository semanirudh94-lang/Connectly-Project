"use client";

import { X } from "lucide-react";
import { useLanguage } from "@/lib/LanguageProvider";
import Postcard from "./Postcard";

interface PostModalProps {
  post: any;
  onClose: () => void;
}

// Full view of one post opened from the profile grid. It renders the same
// Postcard the feed uses so likes, comments and reporting behave identically.
export default function PostModal({ post, onClose }: PostModalProps) {
  const { t } = useLanguage();
  return (
    <div
      className="fixed inset-0 z-[140] bg-black/70 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[620px] max-h-[92vh] overflow-y-auto rounded-lg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label={t("common.close")}
          className="absolute right-3 top-3 z-10 p-1.5 rounded-full bg-ig-surface/90 text-ig-text hover:opacity-60 transition-opacity"
        >
          <X size={18} />
        </button>
        <Postcard post={post} />
      </div>
    </div>
  );
}
