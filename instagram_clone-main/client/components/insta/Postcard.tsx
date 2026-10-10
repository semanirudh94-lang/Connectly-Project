"use client";

import axiosInstance from "@/lib/axios";
import { currentUser, formatLikeCount, formatTimeAgo } from "@/lib/mock-data";
import { useLanguage } from "@/lib/LanguageProvider";
import { serverMessage } from "@/lib/serverError";
import {
  addComment,
  fetchComments,
  removeComment,
  type PostComment,
} from "@/lib/comment.service";
import { reportTarget } from "@/lib/report.service";
import useAuthStore from "@/store/authStore";
import {
  Bookmark,
  Flag,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Send,
  Smile,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { toast } from "../ui/toast";

// The feed populates a full `likes` array; the profile grid only sends
// `likesCount`, so read whichever the payload provides.
const isLikedByMe = (post: any, userId?: string) =>
  (post.likes ?? []).some((like: any) => like.user?._id === userId);

const totalLikes = (post: any) =>
  (post.likes ?? []).length || post.likesCount || 0;

const Postcard = ({ post }: any) => {
  const user = useAuthStore((state) => state.user);
  const { t, language } = useLanguage();
  const [liked, setLiked] = useState(isLikedByMe(post, user?._id));
  const [likeCount, setLikeCount] = useState(totalLikes(post));
  const [saved, setSaved] = useState(false);
  const [showHeart, setShowHeart] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [showAllComments, setShowAllComments] = useState(false);
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reportText, setReportText] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);
  const lastTapRef = useRef(0);

  useEffect(() => {
    setLiked(post.likes.some((like: any) => like.user?._id === user?._id));
    setLikeCount(post.likes.length);
  }, [user, post]);

  useEffect(() => {
    let active = true;
    fetchComments(post._id)
      .then((list) => active && setComments(list))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [post._id]);
  const handleLike = async () => {
    try {
      if (liked) {
        await axiosInstance.delete(`/api/likes/${post._id}`);
        setLiked(false);
        setLikeCount((prev: number) => prev - 1);
      } else {
        await axiosInstance.post(`/api/likes/${post._id}`);
        setLiked(true);
        setLikeCount((prev: number) => prev + 1);
      }
    } catch (error) {
      console.log(error);
    }
    // setLiked((prev: any) => {
    //   setLikeCount((c: any) => (prev ? c - 1 : c + 1));
    //   return !prev;
    // });
  };

  const handleDoubleTap = async () => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      if (!liked) {
        try {
          await axiosInstance.post(`/api/likes/${post._id}`);
          setLiked(true);
          setLikeCount((c: any) => c + 1);
        } catch (error) {}
      }
      setShowHeart(true);
      setTimeout(() => setShowHeart(false), 1000);
    }
    lastTapRef.current = now;
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = commentText.trim();
    if (!text) return;
    try {
      const created = await addComment(post._id, text);
      setComments((prev) => [created, ...prev]);
      setCommentText("");
    } catch (error: any) {
      toast.add({
        type: "error",
        description: serverMessage(
          error,
          language,
          t,
          t("post.commentFailed"),
        ),
        priority: "high",
      });
    }
  };

  const canDeleteComment = (comment: PostComment) =>
    comment.user?._id === user?._id || post.user?._id === user?._id;

  const handleDeleteComment = async (comment: PostComment) => {
    try {
      await removeComment(comment._id);
      setComments((prev) => prev.filter((c) => c._id !== comment._id));
    } catch (error: any) {
      toast.add({
        type: "error",
        description: serverMessage(
          error,
          language,
          t,
          t("post.commentDeleteFailed"),
        ),
        priority: "high",
      });
    }
  };

  const handleReport = async () => {
    setSubmittingReport(true);
    try {
      await reportTarget("post", post._id, reportText.trim());
      toast.add({ type: "success", title: t("post.reportSubmitted") });
      setMenuOpen(false);
      setReporting(false);
      setReportText("");
    } catch (error: any) {
      toast.add({
        type: "error",
        description: serverMessage(
          error,
          language,
          t,
          t("post.reportFailed"),
        ),
        priority: "high",
      });
    } finally {
      setSubmittingReport(false);
    }
  };

  const captionText = post.caption;
  const isCaptionLong = captionText.length > 125;
  const displayCaption =
    isCaptionLong && !captionExpanded
      ? captionText.slice(0, 125) + "…"
      : captionText;

  const commentCount = post.commentsCount ?? comments.length;
  const visibleComments = showAllComments ? comments : comments.slice(0, 2);
  return (
    <article className="bg-ig-surface border-b border-ig-border md:border md:rounded-sm md:mb-6">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <Link
          href={`/profile/${post.user.username}`}
          className="flex items-center gap-3"
        >
          <div className="w-8 h-8 rounded-full overflow-hidden story-gradient p-[2px]">
            <div className="w-full h-full rounded-full bg-ig-surface p-[1px]">
              <img
                src={post.user.profilePicture}
                alt={post.user.username}
                className="w-full h-full rounded-full object-cover"
              />
            </div>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1">
              <span className="text-sm font-semibold text-ig-text">
                {post.user.username}
              </span>
              {post.user.isVerified && (
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  className="text-[#0095f6] fill-current"
                >
                  <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm-1.177 14.232l-3.536-3.536 1.414-1.414 2.122 2.121 4.596-4.596 1.414 1.414-5.01 5.011z" />
                </svg>
              )}
            </div>
            {post.location && (
              <span className="text-[11px] text-ig-text leading-none">
                {post.location}
              </span>
            )}
          </div>
        </Link>
        <div className="relative">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            aria-label={t("post.options")}
            className="text-ig-text hover:text-ig-muted transition-colors"
          >
            <MoreHorizontal size={20} />
          </button>

          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-[160]"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 top-7 z-[161] w-56 rounded-lg border border-ig-border bg-ig-surface shadow-lg">
                {reporting ? (
                  <div className="p-3 flex flex-col gap-2">
                    <p className="text-xs text-ig-muted">{t("post.reportDesc")}</p>
                    <textarea
                      value={reportText}
                      onChange={(e) => setReportText(e.target.value)}
                      rows={3}
                      maxLength={1000}
                      placeholder={t("post.reportPlaceholder")}
                      className="text-sm text-ig-text placeholder:text-ig-muted border border-ig-border rounded px-2 py-1.5 outline-none resize-none focus:border-ig-muted"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setReporting(false)}
                        className="text-xs text-ig-muted hover:text-ig-text"
                      >
                        {t("common.cancel")}
                      </button>
                      <button
                        onClick={handleReport}
                        disabled={submittingReport}
                        className="text-xs font-semibold text-[#0095f6] hover:text-[#1877f2] disabled:opacity-50"
                      >
                        {t("common.submit")}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {user?._id === post.user?._id ? (
                      <p className="px-3 py-2.5 text-xs text-ig-muted">
                        {t("post.reportOwnPost")}
                      </p>
                    ) : (
                      <button
                        onClick={() => setReporting(true)}
                        className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-ig-text hover:bg-ig-hover"
                      >
                        <Flag size={15} />
                        {t("post.report")}
                      </button>
                    )}
                    <button
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-ig-text hover:bg-ig-hover border-t border-ig-border"
                    >
                      <X size={15} />
                      {t("common.close")}
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
      {/* Image */}
      <div
        className="relative bg-black cursor-pointer select-none"
        onClick={handleDoubleTap}
      >
        <img
          src={post.media[0].url}
          alt="post"
          className="w-full object-cover max-h-[600px]"
          draggable={false}
        />
        {/* Double-tap heart */}
        <div
          className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-all duration-300 ${
            showHeart ? "opacity-100 scale-100" : "opacity-0 scale-75"
          }`}
        >
          <Heart
            size={90}
            className="text-red-500 fill-red-500 drop-shadow-lg"
          />
        </div>
      </div>
      <div className="px-4 pt-3 pb-1">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-4">
            <button
              onClick={handleLike}
              className="hover:opacity-60 transition-all active:scale-125 duration-150"
            >
              <Heart
                size={24}
                strokeWidth={1.5}
                className={`transition-colors duration-200 ${
                  liked ? "fill-[#ed4956] text-[#ed4956]" : "text-ig-text"
                }`}
              />
            </button>
            <button className="hover:opacity-60 transition-opacity">
              <MessageCircle
                size={24}
                strokeWidth={1.5}
                className="text-ig-text"
              />
            </button>
            <button className="hover:opacity-60 transition-opacity">
              <Send size={24} strokeWidth={1.5} className="text-ig-text" />
            </button>
          </div>
          <button
            onClick={() => setSaved((s) => !s)}
            className="hover:opacity-60 transition-all active:scale-110 duration-150"
          >
            <Bookmark
              size={24}
              strokeWidth={1.5}
              className={saved ? "fill-ig-text text-ig-text" : "text-ig-text"}
            />
          </button>
        </div>

        {/* Likes */}
        <p className="text-sm font-semibold text-ig-text mb-1">
          {formatLikeCount(likeCount)}{" "}
          {likeCount === 1 ? t("post.like") : t("post.likes")}
        </p>

        {/* Caption */}
        <p className="text-sm text-ig-text leading-snug mb-1">
          <Link
            href={`/profile/${post.user.username}`}
            className="font-semibold mr-1 hover:opacity-70"
          >
            {post.user.username}
          </Link>
          {displayCaption}
          {isCaptionLong && !captionExpanded && (
            <button
              onClick={() => setCaptionExpanded(true)}
              className="text-ig-muted ml-1 text-sm"
            >
              {t("post.more")}
            </button>
          )}
        </p>

        {/* Comments */}
        {commentCount > 2 && !showAllComments && (
          <button
            onClick={() => setShowAllComments(true)}
            className="text-sm text-ig-muted mb-1 block"
          >
            {t("post.viewAllComments", { n: commentCount })}
          </button>
        )}
        {visibleComments.map((comment) => (
          <div
            key={comment._id}
            className="flex items-start gap-1 mb-1 group/comment"
          >
            <p className="text-sm text-ig-text leading-snug">
              <Link
                href={`/profile/${comment.user.username}`}
                className="font-semibold mr-1 hover:opacity-70"
              >
                {comment.user.username}
              </Link>
              {comment.text}
            </p>
            {canDeleteComment(comment) && (
              <button
                onClick={() => handleDeleteComment(comment)}
                aria-label={t("post.deleteComment")}
                className="opacity-0 group-hover/comment:opacity-100 transition-opacity p-0.5 text-ig-muted hover:text-[#ed4956]"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        ))}
        {showAllComments && comments.length > 2 && (
          <button
            onClick={() => setShowAllComments(false)}
            className="text-sm text-ig-muted mb-1 block"
          >
            {t("post.viewFewerComments")}
          </button>
        )}

        {/* Timestamp */}
        <p className="text-[10px] uppercase tracking-wide text-ig-muted mt-1 mb-3">
          {formatTimeAgo(post.createdAt)} {t("post.ago")}
        </p>
      </div>

      {/* Comment input */}
      <div className="border-t border-ig-border px-4 py-3 flex items-center gap-3">
        <div className="w-7 h-7 rounded-full overflow-hidden shrink-0">
          <img
            src={user?.profilePicture}
            alt="you"
            className="w-full h-full object-cover"
          />
        </div>
        <form
          onSubmit={handleComment}
          className="flex-1 flex items-center gap-2"
        >
          <div className="flex-1 flex items-center">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder={t("post.addComment")}
              className="flex-1 text-sm text-ig-text placeholder:text-ig-muted outline-none bg-transparent"
            />
            <button
              type="button"
              className="text-ig-muted hover:text-ig-text transition-colors"
            >
              <Smile size={18} />
            </button>
          </div>
          {commentText.trim() && (
            <button
              type="submit"
              className="text-sm font-semibold text-[#0095f6] hover:text-[#1877f2] dark:text-[#38b6ff] dark:hover:text-[#5cc8ff]"
            >
              {t("post.post")}
            </button>
          )}
        </form>
      </div>
    </article>
  );
};

export default Postcard;
