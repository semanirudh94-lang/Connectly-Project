"use client";

import axiosInstance from "@/lib/axios";
import { currentUser, formatLikeCount, formatTimeAgo } from "@/lib/mock-data";
import useAuthStore from "@/store/authStore";
import {
  Bookmark,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Send,
  Smile,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const Postcard = ({ post }: any) => {
  const user = useAuthStore((state) => state.user);
  const [liked, setLiked] = useState(
    post.likes.some((like: any) => like.user?._id === user?._id),
  );
  const [likeCount, setLikeCount] = useState(post.likes.length);
  const [saved, setSaved] = useState(false);
  const [showHeart, setShowHeart] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [showAllComments, setShowAllComments] = useState(false);
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const [localComments, setLocalComments] = useState(post.comments);
  const lastTapRef = useRef(0);

  useEffect(() => {
    setLiked(post.likes.some((like: any) => like.user?._id === user?._id));
    setLikeCount(post.likes.length);
  }, [user, post]);
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

  const handleComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setLocalComments((prev: any) => [
      ...prev,
      {
        _id: `c_${Date.now()}`,
        user: user,
        text: commentText.trim(),
        createdAt: new Date().toISOString(),
      },
    ]);
    setCommentText("");
  };

  const captionText = post.caption;
  const isCaptionLong = captionText.length > 125;
  const displayCaption =
    isCaptionLong && !captionExpanded
      ? captionText.slice(0, 125) + "…"
      : captionText;

  const visibleComments = showAllComments
    ? localComments
    : localComments?.slice(0, 2);
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
        <button className="text-ig-text hover:text-ig-muted transition-colors">
          <MoreHorizontal size={20} />
        </button>
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
          {formatLikeCount(likeCount)} {likeCount === 1 ? "like" : "likes"}
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
              more
            </button>
          )}
        </p>

        {/* Comments */}
        {localComments?.length > 2 && !showAllComments && (
          <button
            onClick={() => setShowAllComments(true)}
            className="text-sm text-ig-muted mb-1 block"
          >
            View all {localComments.length} comments
          </button>
        )}
        {visibleComments?.map((comment: any) => (
          <div key={comment._id} className="flex items-start gap-1 mb-1">
            <p className="text-sm text-ig-text leading-snug">
              <Link
                href={`/profile/${comment.user.username}`}
                className="font-semibold mr-1 hover:opacity-70"
              >
                {comment.user.username}
              </Link>
              {comment.text}
            </p>
          </div>
        ))}

        {/* Timestamp */}
        <p className="text-[10px] uppercase tracking-wide text-ig-muted mt-1 mb-3">
          {formatTimeAgo(post.createdAt)} ago
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
              placeholder="Add a comment…"
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
              Post
            </button>
          )}
        </form>
      </div>
    </article>
  );
};

export default Postcard;
