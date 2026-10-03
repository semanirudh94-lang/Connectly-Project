"use client";

import { currentUser } from "@/lib/mock-data";
import { ChevronDown, ChevronLeft, ImageIcon, MapPin, X } from "lucide-react";
import { useRef, useState } from "react";
import { uploadImage } from "@/lib/imgbb.service";
import axiosInstance from "@/lib/axios";
import { toast } from "../ui/toast";
type Stage = "select" | "crop" | "share";
type AspectRatio = "original" | "1:1" | "4:5" | "16:9";

const sampleImages = [
  "https://images.pexels.com/photos/3225517/pexels-photo-3225517.jpeg?auto=compress&cs=tinysrgb&w=300",
  "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=300",
  "https://images.pexels.com/photos/3165335/pexels-photo-3165335.jpeg?auto=compress&cs=tinysrgb&w=300",
  "https://images.pexels.com/photos/1581554/pexels-photo-1581554.jpeg?auto=compress&cs=tinysrgb&w=300",
  "https://images.pexels.com/photos/2827392/pexels-photo-2827392.jpeg?auto=compress&cs=tinysrgb&w=300",
  "https://images.pexels.com/photos/1183992/pexels-photo-1183992.jpeg?auto=compress&cs=tinysrgb&w=300",
  "https://images.pexels.com/photos/1323550/pexels-photo-1323550.jpeg?auto=compress&cs=tinysrgb&w=300",
  "https://images.pexels.com/photos/3408744/pexels-photo-3408744.jpeg?auto=compress&cs=tinysrgb&w=300",
];

const aspectOptions: { label: string; value: AspectRatio; css: string }[] = [
  { label: "Original", value: "original", css: "" },
  { label: "1 : 1", value: "1:1", css: "aspect-square" },
  { label: "4 : 5", value: "4:5", css: "aspect-[4/5]" },
  { label: "16 : 9", value: "16:9", css: "aspect-video" },
];

interface CreatePostModalProps {
  onClose: () => void;
}

const Createpostmodel = ({ onClose }: CreatePostModalProps) => {
  const [stage, setStage] = useState<Stage>("select");
  const [image, setImage] = useState<string | null>(null);
  const [ratio, setRatio] = useState<AspectRatio>("1:1");
  const [caption, setCaption] = useState("");
  const [location, setLocation] = useState("");
  const [dragging, setDragging] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shared, setShared] = useState(false);
  const [accessOpen, setAccessOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [enhancedCaption, setEnhancedCaption] = useState(false);
  const handleenhancedcaption = async () => {
    if (!caption.trim()) {
      toast.add({
        type: "error",
        title: "Write a caption first",
      });
      return;
    }
    try {
      setEnhancedCaption(true);
      const res = await axiosInstance.post("/api/ai/caption", {
        prompt: caption,
      });
      if (res.data.success) {
        setCaption(res.data.caption);
      }
    } catch (error: any) {
      toast.add({
        type: "error",
        title: error?.message || "Failed to enhance caption",
      });
    } finally {
      setEnhancedCaption(false);
    }
  };
  const fileRef = useRef<HTMLInputElement>(null);

  const pickFile = (file: File) => {
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setImage(e.target?.result as string);
      setStage("crop");
    };
    reader.readAsDataURL(file);
  };
  const pickSampleImage = async (url: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();

      const file = new File([blob], "sample-image.jpg", {
        type: blob.type,
      });

      pickFile(file);
    } catch (error) {
      console.error(error);
    }
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) pickFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith("image/")) pickFile(file);
  };
  const handleShare = async () => {
    if (!selectedFile) return;
    setSharing(true);
    try {
      const uploadedImage = await uploadImage(selectedFile);
      const res = await axiosInstance.post("/api/posts", {
        caption,
        location,
        media: [uploadedImage],
      });
      if (res.data.success) {
        toast.add({
          type: "success",
          title: "Posted Successfulle",
        });
      }
      setTimeout(() => {
        setCaption("");
        setLocation("");
        setSelectedFile(null);
        setImage(null);
        setStage("select");
        setSharing(false);
        setShared(true);
        onClose();
      }, 1200);
    } catch (error: any) {
      toast.add({
        type: "error",
        title: error.message,
      });
    }
  };
  const imgClass = aspectOptions.find((o) => o.value === ratio)?.css ?? "";
  const title = {
    select: "Create new post",
    crop: "Crop",
    share: "Create new post",
  }[stage];
  const handleBack = () => {
    if (stage === "share") setStage("crop");
    else if (stage === "crop") {
      setStage("select");
      setImage(null);
    } else onClose();
  };
  return (
    <div className="fixed inset-0 z-[150] bg-black/70 flex items-center justify-center p-4">
      <div
        className="bg-white rounded-xl overflow-hidden w-full max-w-[860px] shadow-2xl flex flex-col"
        style={{ maxHeight: "92vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-ig-border shrink-0">
          <button
            onClick={handleBack}
            className="p-1 text-ig-text hover:opacity-60 transition-opacity"
          >
            {stage === "select" ? (
              <X size={20} />
            ) : (
              <ChevronLeft size={22} strokeWidth={2} />
            )}
          </button>
          <h2 className="text-sm font-semibold text-ig-text">{title}</h2>
          {stage === "select" ? (
            <div className="w-8" />
          ) : stage === "crop" ? (
            <button
              onClick={() => setStage("share")}
              className="text-sm font-semibold text-[#0095f6] hover:text-[#1877f2] transition-colors"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleShare}
              disabled={sharing || shared}
              className="text-sm font-semibold text-[#0095f6] hover:text-[#1877f2] disabled:opacity-50 transition-colors"
            >
              {shared ? "Shared!" : sharing ? "Sharing…" : "Share"}
            </button>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {/* ── Stage 1: Select ── */}
          {stage === "select" && (
            <div>
              <div
                className={`flex flex-col items-center justify-center py-14 gap-5 border-b border-ig-border transition-colors cursor-pointer ${
                  dragging ? "bg-[#0095f6]/10" : "hover:bg-ig-hover"
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
              >
                <div className="w-20 h-20 rounded-full bg-ig-hover flex items-center justify-center">
                  <ImageIcon
                    size={40}
                    strokeWidth={1}
                    className="text-ig-text"
                  />
                </div>
                <p className="text-xl text-ig-text">
                  {dragging
                    ? "Drop your photo here"
                    : "Drag photos and videos here"}
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <button
                  onClick={(e) => e.stopPropagation()}
                  onClickCapture={() => fileRef.current?.click()}
                  className="px-5 py-2 bg-[#0095f6] text-white text-sm font-semibold rounded-lg hover:bg-[#1877f2] transition-colors"
                >
                  Select from computer
                </button>
              </div>
              <div className="p-4">
                <p className="text-sm font-semibold text-ig-text mb-3">
                  Or choose a sample photo
                </p>
                <div className="grid grid-cols-4 gap-1">
                  {sampleImages.map((url, i) => (
                    <button
                      key={i}
                      onClick={() => pickSampleImage(url)}
                      className="aspect-square overflow-hidden rounded-sm hover:opacity-80 transition-opacity"
                    >
                      <img
                        src={url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Stage 2: Crop ── */}
          {stage === "crop" && image && (
            <div>
              <div
                className="bg-black flex items-center justify-center overflow-hidden"
                style={{ minHeight: 380 }}
              >
                <div
                  className={`w-full max-w-[560px] overflow-hidden ${imgClass}`}
                >
                  <img
                    src={image}
                    alt="preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <div className="flex items-center justify-center gap-2 p-4 border-t border-ig-border">
                {aspectOptions.map(({ label, value }) => (
                  <button
                    key={value}
                    onClick={() => setRatio(value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                      ratio === value
                        ? "bg-ig-text text-ig-surface"
                        : "bg-ig-hover text-ig-muted hover:bg-ig-border"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Stage 3: Share ── */}
          {stage === "share" && image && (
            <div className="flex flex-col md:flex-row min-h-[480px]">
              {/* Preview */}
              <div className="bg-black md:w-[52%] flex items-center justify-center shrink-0 min-h-[260px]">
                <img
                  src={image}
                  alt="preview"
                  className="w-full max-h-[540px] object-contain"
                />
              </div>

              {/* Details */}
              <div className="flex-1 flex flex-col overflow-y-auto divide-y divide-ig-border">
                {/* User + caption */}
                <div className="p-4 flex gap-3">
                  <img
                    src={currentUser.profilePic}
                    alt={currentUser.username}
                    className="w-8 h-8 rounded-full object-cover shrink-0"
                  />
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-ig-text mb-1">
                      {currentUser.username}
                    </p>
                    <button
                      type="button"
                      onClick={handleenhancedcaption}
                      disabled={enhancedCaption}
                      className="text-xs font-semibold text-[#0095f6] hover:text-[#1877f2] disabled:opacity-50 bg-gray-200 p-2 rounded-xl"
                    >
                      {enhancedCaption ? "Enhancing..." : "✨ AI Enhance"}
                    </button>
                    <textarea
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      placeholder="Write a caption…"
                      rows={5}
                      maxLength={2200}
                      className="w-full text-sm text-ig-text placeholder:text-ig-muted outline-none resize-none"
                    />
                    <div className="flex justify-end mt-1">
                      <span className="text-xs text-[#c7c7c7]">
                        {caption.length}/2,200
                      </span>
                    </div>
                  </div>
                </div>

                {/* Location */}
                <div className="flex items-center justify-between px-4 py-3">
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Add location"
                    className="text-sm text-ig-text placeholder:text-ig-muted outline-none flex-1 bg-transparent"
                  />
                  <MapPin size={18} className="text-ig-muted shrink-0" />
                </div>

                {/* Accessibility */}
                <div>
                  <button
                    onClick={() => setAccessOpen((o) => !o)}
                    className="flex items-center justify-between w-full px-4 py-3"
                  >
                    <span className="text-sm text-ig-text">Accessibility</span>
                    <ChevronDown
                      size={18}
                      className={`text-ig-muted transition-transform duration-200 ${accessOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                  {accessOpen && (
                    <div className="px-4 pb-4">
                      <p className="text-xs text-ig-muted mb-2">
                        Alt text describes your photo for people with visual
                        impairments.
                      </p>
                      <input
                        type="text"
                        placeholder="Write alt text…"
                        className="w-full text-xs text-ig-text border border-ig-border rounded px-3 py-2 outline-none focus:border-ig-muted"
                      />
                    </div>
                  )}
                </div>

                {/* Advanced settings */}
                <div>
                  <button
                    onClick={() => setAdvancedOpen((o) => !o)}
                    className="flex items-center justify-between w-full px-4 py-3"
                  >
                    <span className="text-sm text-ig-text">
                      Advanced settings
                    </span>
                    <ChevronDown
                      size={18}
                      className={`text-ig-muted transition-transform duration-200 ${advancedOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                  {advancedOpen && (
                    <div className="px-4 pb-4 flex flex-col gap-4">
                      {[
                        {
                          label: "Hide like and view counts",
                          sub: "Only you will see the total number of likes and views on this post.",
                        },
                        {
                          label: "Turn off commenting",
                          sub: "You can change this later by going to the post.",
                        },
                      ].map(({ label, sub }) => (
                        <div
                          key={label}
                          className="flex items-start justify-between gap-4"
                        >
                          <div>
                            <p className="text-sm text-ig-text">{label}</p>
                            <p className="text-xs text-ig-muted mt-0.5">
                              {sub}
                            </p>
                          </div>
                          <label className="relative inline-flex cursor-pointer shrink-0 mt-0.5">
                            <input type="checkbox" className="sr-only peer" />
                            <div className="w-10 h-6 bg-ig-border rounded-full peer-checked:bg-[#0095f6] transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-ig-surface after:rounded-full after:h-5 after:w-5 after:transition-transform peer-checked:after:translate-x-4" />
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Success state */}
                {shared && (
                  <div className="flex flex-col items-center py-10 gap-3 px-4">
                    <div className="w-16 h-16 rounded-full bg-[#0095f6] flex items-center justify-center">
                      <svg
                        width="30"
                        height="30"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="white"
                        strokeWidth="2.5"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                    <p className="text-lg font-semibold text-ig-text">
                      Your post has been shared.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Createpostmodel;
