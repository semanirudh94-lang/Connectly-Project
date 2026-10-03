"use client";

import { toast } from "@/components/ui/toast";
import useAuthStore from "@/store/authStore";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import axiosInstance from "@/lib/axios";
const page = () => {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const login = useAuthStore((state) => state.login);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await axiosInstance.post("/api/auth/login", {
        email: email,
        password: password,
      });
      if (res.data.success) {
        login({ user: res.data.user, token: res.data.accessToken });
        toast.add({
          type: "success",
          title: "Login Successfulle",
          description: `Hello ${res.data.user.username}`,
        });
        setLoading(false);
        router.push("/");
      }
    } catch (error: any) {
      console.log(error);
      toast.add({
        type: "error",
        description: error.message,
        priority: "high",
      });
    }
  };

  return (
    <div className="min-h-screen bg-ig-bg flex flex-col">
      {/* Desktop: two-column; Mobile: single card */}
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full flex gap-8 items-center justify-center max-w-[900px]">
          {/* Left – phone mockup (desktop only) */}
          <div className="hidden lg:flex flex-col items-center justify-center w-[380px] shrink-0">
            <div className="relative w-[250px] h-[500px]">
              {/* Phone frame */}
              <div className="absolute inset-0 rounded-[36px] border-4 border-ig-text bg-ig-surface shadow-2xl overflow-hidden">
                {/* Status bar */}
                <div className="h-8 bg-ig-surface flex items-center justify-between px-5 pt-2">
                  <span className="text-[10px] font-semibold text-ig-text">
                    9:41
                  </span>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-2 border border-ig-text rounded-[2px] relative">
                      <div className="absolute left-[1px] top-[1px] bottom-[1px] right-[3px] bg-ig-text rounded-[1px]" />
                    </div>
                  </div>
                </div>
                {/* App content inside phone */}
                <div className="overflow-hidden h-full">
                  <div className="px-3 py-2">
                    <p className="instagram-font text-xl text-center text-ig-text mb-3">
                      Instagram
                    </p>
                    {/* Mini stories */}
                    <div className="flex gap-2 overflow-hidden mb-3">
                      {[
                        "https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg",
                        "https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg",
                        "https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg",
                        "https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg",
                      ].map((src, i) => (
                        <div
                          key={i}
                          className="shrink-0 flex flex-col items-center gap-1"
                        >
                          <div className="w-10 h-10 rounded-full story-gradient p-[2px]">
                            <div className="w-full h-full rounded-full bg-ig-surface p-[1px]">
                              <img
                                src={`${src}?auto=compress&cs=tinysrgb&w=80`}
                                className="w-full h-full rounded-full object-cover"
                                alt=""
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* Mini posts */}
                    {[
                      {
                        img: "https://images.pexels.com/photos/3225517/pexels-photo-3225517.jpeg",
                        user: "sophiaw",
                        avatar:
                          "https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg",
                      },
                      {
                        img: "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg",
                        user: "isabellef",
                        avatar:
                          "https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg",
                      },
                    ].map((p, i) => (
                      <div
                        key={i}
                        className="mb-3 border border-ig-border rounded-sm overflow-hidden bg-ig-surface"
                      >
                        <div className="flex items-center gap-1 px-2 py-1">
                          <img
                            src={`${p.avatar}?auto=compress&cs=tinysrgb&w=40`}
                            className="w-5 h-5 rounded-full object-cover"
                            alt=""
                          />
                          <span className="text-[8px] font-semibold text-ig-text">
                            {p.user}
                          </span>
                        </div>
                        <img
                          src={`${p.img}?auto=compress&cs=tinysrgb&w=300`}
                          className="w-full h-28 object-cover"
                          alt=""
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {/* Notch */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-6 bg-ig-text rounded-b-2xl" />
            </div>
          </div>

          {/* Right – form */}
          <div className="w-full max-w-[350px] flex flex-col gap-3">
            {/* Login card */}
            <div className="bg-ig-surface border border-ig-border rounded-sm px-10 pt-10 pb-6">
              {/* Logo */}
              <h1 className="instagram-font text-[38px] text-center text-ig-text mb-8 leading-none">
                Instagram
              </h1>

              {error && (
                <p className="text-xs text-[#ed4956] text-center mb-3">
                  {error}
                </p>
              )}

              <form onSubmit={handleSubmit} className="flex flex-col gap-[6px]">
                <input
                  type="email"
                  placeholder="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-ig-bg border border-ig-border rounded-[3px] text-[12px] px-2 py-[9px] focus:outline-none focus:border-ig-muted placeholder:text-ig-muted text-ig-text"
                />
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-ig-bg border border-ig-border rounded-[3px] text-[12px] px-2 py-[9px] pr-16 focus:outline-none focus:border-ig-muted placeholder:text-ig-muted text-ig-text"
                  />
                  {password && (
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-ig-text"
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={!email || !password || loading}
                  className="w-full bg-[#0095f6] text-white text-sm font-semibold rounded-lg py-[7px] mt-2 disabled:opacity-50 hover:bg-[#1877f2] transition-colors active:scale-[0.98]"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg
                        className="animate-spin w-4 h-4 text-white"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v8H4z"
                        />
                      </svg>
                      Logging in…
                    </span>
                  ) : (
                    "Log in"
                  )}
                </button>
              </form>

              {/* Divider */}
              <div className="flex items-center gap-4 my-4">
                <div className="flex-1 h-px bg-ig-border" />
                <span className="text-[13px] font-semibold text-ig-muted tracking-widest">
                  OR
                </span>
                <div className="flex-1 h-px bg-ig-border" />
              </div>

              {/* Facebook login */}
              <button className="flex items-center justify-center gap-2 w-full text-sm font-semibold text-ig-blue hover:opacity-80 transition-opacity">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="text-ig-blue"
                >
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                Log in with Facebook
              </button>

              <a
                href="#"
                className="block text-center text-xs text-ig-blue mt-4 hover:underline"
              >
                Forgot password?
              </a>
            </div>

            {/* Sign up card */}
            <div className="bg-ig-surface border border-ig-border rounded-sm py-4 text-center">
              <p className="text-sm text-ig-text">
                Don&apos;t have an account?{" "}
                <Link
                  href="/signup"
                  className="text-[#0095f6] font-semibold hover:text-[#1877f2] dark:text-[#38b6ff] dark:hover:text-[#5cc8ff]"
                >
                  Sign up
                </Link>
              </p>
            </div>

            {/* App stores */}
            <div className="mt-1 text-center">
              <p className="text-sm text-ig-text mb-4">Get the app.</p>
              <div className="flex justify-center gap-2">
                <div className="border border-ig-text rounded-lg px-3 py-1 flex items-center gap-2">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="text-ig-text"
                  >
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                  </svg>
                  <div className="text-left">
                    <p className="text-[8px] text-ig-text leading-none">
                      Download on the
                    </p>
                    <p className="text-[12px] font-semibold text-ig-text leading-tight">
                      App Store
                    </p>
                  </div>
                </div>
                <div className="border border-ig-text rounded-lg px-3 py-1 flex items-center gap-2">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="text-ig-text"
                  >
                    <path d="M3.18 23.76c.35.2.75.25 1.15.14l12.17-7.04-2.9-2.9-10.42 9.8zM.75 1.4C.28 1.72 0 2.27 0 2.95v18.1c0 .68.28 1.23.75 1.55l.09.07 10.14-10.14v-.24L.84 1.33l-.09.07zM20.31 10.43l-2.9-1.68-3.22 3.22 3.22 3.22 2.93-1.7c.84-.48.84-1.58-.03-2.06zM4.33.1L16.5 7.14l-2.9 2.9L3.18.24C3.53.02 3.97.04 4.33.1z" />
                  </svg>
                  <div className="text-left">
                    <p className="text-[8px] text-ig-text leading-none">
                      Get it on
                    </p>
                    <p className="text-[12px] font-semibold text-ig-text leading-tight">
                      Google Play
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-4 text-center">
        <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mb-2">
          {[
            "Meta",
            "About",
            "Blog",
            "Jobs",
            "Help",
            "API",
            "Privacy",
            "Terms",
            "Locations",
            "Instagram Lite",
            "Threads",
          ].map((item) => (
            <a
              key={item}
              href="#"
              className="text-[12px] text-ig-muted hover:underline"
            >
              {item}
            </a>
          ))}
        </div>
        <p className="text-[12px] text-ig-muted">
          &copy; 2026 Instagram from Meta
        </p>
      </footer>
    </div>
  );
};

export default page;
