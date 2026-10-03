"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  X,
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  MoreHorizontal,
  Smile,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Post, currentUser, formatTimeAgo, formatLikeCount } from "@/lib/mock-data";

interface PostModalProps {
  post: Post;
  posts: Post[];
  onClose: () => void;
}

export default function PostModal({ post: initialPost, posts, onClose }: PostModalProps) {
  const [currentIndex, setCurrentIndex] = useState(
    posts.findIndex((p) => p._id === initialPost._id)
  );
  const post = posts[currentIndex] ?? initialPost;

  const [liked, setLiked] = useState(post.likes.includes(currentUser._id));
  const [likeCount, setLikeCount] = useState(post.likes.length);
  const [saved, setSaved] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [localComments, setLocalComments] = useState(post.comments);
  const commentInputRef = useRef<HTMLInputElement>(null);

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < posts.length - 1;

  useEffect(() => {
    setLiked(post.likes.includes(currentUser._id));
    setLikeCount(post.likes.length);
    setLocalComments(post.comments);
    setSaved(false);
  }, [currentIndex]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && hasPrev) setCurrentIndex((i) => i - 1);
      if (e.key === "ArrowRight" && hasNext) setCurrentIndex((i) => i + 1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [hasPrev, hasNext, onClose]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const handleLike = () => {
    setLiked((prev) => {
      setLikeCount((c) => (prev ? c - 1 : c + 1));
      return !prev;
    });
  };

  const handleComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setLocalComments((prev) => [
      ...prev,
      {
        _id: `cm_${Date.now()}`,
        user: currentUser,
        text: commentText.trim(),
        createdAt: new Date().toISOString(),
      },
    ]);
    setCommentText("");
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-3 right-3 md:top-4 md:right-4 text-white hover:text-gray-300 z-[101] transition-colors bg-black/20 rounded-full p-1"
      >
        <X size={24} strokeWidth={1.5} />
      </button>

      {/* Prev — desktop only */}
      {hasPrev && (
        <button
          onClick={() => setCurrentIndex((i) => i - 1)}
          className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-1.5 z-[101] shadow-lg transition-all items-center justify-center"
        >
          <ChevronLeft size={22} className="text-ig-text" />
        </button>
      )}

      {/* Next — desktop only */}
      {hasNext && (
        <button
          onClick={() => setCurrentIndex((i) => i + 1)}
          className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-1.5 z-[101] shadow-lg transition-all items-center justify-center"
        >
          <ChevronRight size={22} className="text-ig-text" />
        </button>
      )}

      {/* Modal */}
      <div
        className="bg-ig-surface w-full h-full md:h-auto md:max-h-[90vh] md:rounded-sm flex flex-col md:flex-row md:max-w-[935px] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Image — desktop: left half; mobile: fixed height top */}
        <div className="bg-black flex items-center justify-center shrink-0 h-[44vw] min-h-[240px] max-h-[360px] md:h-auto md:max-h-none md:flex-1 md:min-h-0">
          <img
            src={post.imageUrl}
            alt="post"
            className="w-full h-full object-cover md:object-contain md:max-h-[90vh]"
          />
        </div>

        {/* Panel */}
        <div className="flex-1 md:flex-none md:w-[340px] flex flex-col border-t border-ig-border md:border-t-0 md:border-l bg-ig-surface overflow-hidden min-h-0">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-ig-border shrink-0">
            <Link
              href={`/profile/${post.user.username}`}
              className="flex items-center gap-3"
              onClick={onClose}
            >
              <div className="w-8 h-8 rounded-full overflow-hidden story-gradient p-[2px] shrink-0">
                <div className="w-full h-full rounded-full bg-ig-surface p-[1px]">
                  <img
                    src={post.user.profilePic}
                    alt={post.user.username}
                    className="w-full h-full rounded-full object-cover"
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <span className="text-sm font-semibold text-ig-text">{post.user.username}</span>
                  {post.user.isVerified && (
                    <svg width="12" height="12" viewBox="0 0 24 24" className="text-[#0095f6] fill-current">
                      <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm-1.177 14.232l-3.536-3.536 1.414-1.414 2.122 2.121 4.596-4.596 1.414 1.414-5.01 5.011z" />
                    </svg>
                  )}
                </div>
                {post.location && (
                  <span className="text-[11px] text-ig-text">{post.location}</span>
                )}
              </div>
            </Link>
            <button className="text-ig-text hover:text-ig-muted">
              <MoreHorizontal size={20} />
            </button>
          </div>

          {/* Mobile prev/next inside panel */}
          {(hasPrev || hasNext) && (
            <div className="md:hidden flex items-center justify-between px-4 py-2 border-b border-ig-border">
              <button
                onClick={() => hasPrev && setCurrentIndex((i) => i - 1)}
                disabled={!hasPrev}
                className="flex items-center gap-1 text-xs font-semibold text-[#0095f6] disabled:text-[#c7c7c7] transition-colors"
              >
                <ChevronLeft size={14} /> Previous
              </button>
              <span className="text-xs text-ig-muted">{currentIndex + 1} / {posts.length}</span>
              <button
                onClick={() => hasNext && setCurrentIndex((i) => i + 1)}
                disabled={!hasNext}
                className="flex items-center gap-1 text-xs font-semibold text-[#0095f6] disabled:text-[#c7c7c7] transition-colors"
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          )}

          {/* Comments */}
          <div className="flex-1 overflow-y-auto px-4 py-3 scrollbar-hide min-h-0">
            {/* Caption */}
            <div className="flex gap-3 mb-4">
              <Link href={`/profile/${post.user.username}`} onClick={onClose} className="shrink-0">
                <img
                  src={post.user.profilePic}
                  alt={post.user.username}
                  className="w-8 h-8 rounded-full object-cover"
                />
              </Link>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-ig-text leading-snug">
                  <Link
                    href={`/profile/${post.user.username}`}
                    className="font-semibold mr-1 hover:opacity-70"
                    onClick={onClose}
                  >
                    {post.user.username}
                  </Link>
                  {post.caption}
                </p>
                <p className="text-[10px] text-ig-muted mt-1 uppercase tracking-wide">
                  {formatTimeAgo(post.createdAt)} ago
                </p>
              </div>
            </div>

            {localComments.map((comment) => (
              <div key={comment._id} className="flex gap-3 mb-4">
                <img
                  src={comment.user.profilePic}
                  alt={comment.user.username}
                  className="w-8 h-8 rounded-full object-cover shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-ig-text leading-snug">
                    <span className="font-semibold mr-1">{comment.user.username}</span>
                    {comment.text}
                  </p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] text-ig-muted uppercase tracking-wide">
                      {formatTimeAgo(comment.createdAt)} ago
                    </span>
                    <button className="text-[11px] font-semibold text-ig-muted hover:text-ig-text">
                      Reply
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="border-t border-ig-border px-4 pt-3 pb-1 shrink-0">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-4">
                <button onClick={handleLike} className="hover:opacity-60 transition-all active:scale-125 duration-150">
                  <Heart
                    size={24}
                    strokeWidth={1.5}
                    className={liked ? "fill-[#ed4956] text-[#ed4956]" : "text-ig-text"}
                  />
                </button>
                <button onClick={() => commentInputRef.current?.focus()} className="hover:opacity-60 transition-opacity">
                  <MessageCircle size={24} strokeWidth={1.5} className="text-ig-text" />
                </button>
                <button className="hover:opacity-60 transition-opacity">
                  <Send size={24} strokeWidth={1.5} className="text-ig-text" />
                </button>
              </div>
              <button onClick={() => setSaved((s) => !s)} className="hover:opacity-60 transition-all active:scale-110 duration-150">
                <Bookmark
                  size={24}
                  strokeWidth={1.5}
                  className={saved ? "fill-ig-text text-ig-text" : "text-ig-text"}
                />
              </button>
            </div>
            <p className="text-sm font-semibold text-ig-text mb-0.5">
              {formatLikeCount(likeCount)} {likeCount === 1 ? "like" : "likes"}
            </p>
            <p className="text-[10px] text-ig-muted uppercase tracking-wide mb-2">
              {formatTimeAgo(post.createdAt)} ago
            </p>
          </div>

          {/* Comment input */}
          <div className="border-t border-ig-border px-4 py-2.5 shrink-0 flex items-center gap-3">
            <button className="text-ig-muted hover:text-ig-text transition-colors shrink-0">
              <Smile size={22} />
            </button>
            <form onSubmit={handleComment} className="flex-1 flex items-center gap-2">
              <input
                ref={commentInputRef}
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add a comment…"
                className="flex-1 text-sm text-ig-text placeholder:text-ig-muted outline-none bg-transparent min-w-0"
              />
              {commentText.trim() && (
                <button type="submit" className="text-sm font-semibold text-[#0095f6] hover:text-[#1877f2] dark:text-[#38b6ff] dark:hover:text-[#5cc8ff] shrink-0">
                  Post
                </button>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
