"use client";
import MobileHeader from "@/components/insta/MobileHeader";
import MobileNav from "@/components/insta/MobileNav";
import Postcard from "@/components/insta/Postcard";
import RightSidebar from "@/components/insta/RightSidebar";
import Sidebar from "@/components/insta/Sidebar";
import Stories from "@/components/insta/Stories";
import axiosInstance from "@/lib/axios";
import { mockPosts } from "@/lib/mock-data";
import { useEffect, useState } from "react";

export default function Home() {
  const [posts, setPosts] = useState([]);
  const [loading, setloading] = useState(true);
  const fetchPosts = async () => {
    try {
      const res = await axiosInstance.get("/api/posts");
      setPosts(res.data.posts);
    } catch (error) {
      console.log(error);
    } finally {
      setloading(false);
    }
  };
  useEffect(() => {
    fetchPosts();
  }, []);
  return (
    <div className="bg-ig-surface md:bg-ig-ig min-h-screen">
      <MobileHeader />
      <Sidebar />
      <div className="md:ml-[72px] xl:ml-[244px]">
        <div className="max-w-[1200px] mx-auto flex gap-10 px-8 py-6">
          <main className="flex-1 max-w-[600px]">
            <Stories />
            {loading ? (
              <div className="flex justify-center py-20">
                <p className="text-ig-muted">Loading posts...</p>
              </div>
            ) : (
              <>
                {posts.map((post: any) => (
                  <Postcard key={post._id} post={post} />
                ))}
                <div className="flex flex-col items-center py-8 gap-2 px-4">
                  <div className="w-12 h-12 rounded-full bg-ig-border flex items-center justify-center">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      className="text-ig-muted"
                    >
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                      <polyline points="9 22 9 12 15 12 15 22" />
                    </svg>
                  </div>

                  <p className="text-sm font-semibold text-ig-text">
                    You're all caught up
                  </p>

                  <p className="text-sm text-ig-muted text-center">
                    You've seen all new posts from the past 3 days.
                  </p>
                </div>
              </>
            )}
            {/* {mockPosts.map((post) => (
              <Postcard key={post._id} post={post} />
            ))} */}
            {/* End of feed */}
          </main>
          <RightSidebar />
        </div>
      </div>
      <MobileNav />
    </div>
  );
}
