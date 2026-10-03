"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import axiosInstance from "@/lib/axios";
import useAuthStore from "@/store/authStore";
import { toast } from "@/components/ui/toast";
interface FormData {
  email: string;
  fullName: string;
  username: string;
  password: string;
  profilePicture?: string;
}

interface FormErrors {
  email?: string;
  fullName?: string;
  username?: string;
  password?: string;
}
const PAGE = () => {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    email: "",
    fullName: "",
    username: "",
    password: "",
    profilePicture:
      "https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const login = useAuthStore((state) => state.login);

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!formData.email)
      newErrors.email = "Enter a valid email address or phone number.";
    if (!formData.fullName) newErrors.fullName = "Enter your full name.";
    if (!formData.username || formData.username.length < 3) {
      newErrors.username = "Username must be at least 3 characters.";
    }
    if (!formData.password || formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await axiosInstance.post("/api/auth/register", formData);
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

  const allFilled =
    formData.email &&
    formData.fullName &&
    formData.username &&
    formData.password;

  return (
    <div className="min-h-screen bg-ig-bg flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-[350px] flex flex-col gap-3">
        {/* Main card */}
        <div className="bg-ig-surface border border-ig-border rounded-sm px-10 pt-10 pb-6">
          {/* Logo */}
          <h1 className="instagram-font text-[38px] text-center text-ig-text mb-4 leading-none">
            Instagram
          </h1>

          <p className="text-base font-semibold text-ig-muted text-center leading-tight mb-5">
            Sign up to see photos and videos from your friends.
          </p>

          {/* Facebook button */}
          <button className="w-full flex items-center justify-center gap-2 bg-[#0095f6] text-white text-sm font-semibold rounded-lg py-[7px] mb-4 hover:bg-[#1877f2] transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
            Log in with Facebook
          </button>

          {/* Divider */}
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1 h-px bg-ig-border" />
            <span className="text-[13px] font-semibold text-ig-muted tracking-widest">
              OR
            </span>
            <div className="flex-1 h-px bg-ig-border" />
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-[6px]">
            {/* Email */}
            <div>
              <input
                type="text"
                name="email"
                placeholder="Mobile number or email"
                value={formData.email}
                onChange={handleChange}
                className={`w-full bg-ig-bg border rounded-[3px] text-[12px] px-2 py-[9px] focus:outline-none placeholder:text-ig-muted transition-colors text-ig-text ${
                  errors.email
                    ? "border-[#ed4956]"
                    : "border-ig-border focus:border-ig-muted"
                }`}
              />
              {errors.email && (
                <p className="text-[11px] text-[#ed4956] mt-1">
                  {errors.email}
                </p>
              )}
            </div>

            {/* Full name */}
            <div>
              <input
                type="text"
                name="fullName"
                placeholder="Full name"
                value={formData.fullName}
                onChange={handleChange}
                className={`w-full bg-ig-bg border rounded-[3px] text-[12px] px-2 py-[9px] focus:outline-none placeholder:text-ig-muted transition-colors text-ig-text ${
                  errors.fullName
                    ? "border-[#ed4956]"
                    : "border-ig-border focus:border-ig-muted"
                }`}
              />
              {errors.fullName && (
                <p className="text-[11px] text-[#ed4956] mt-1">
                  {errors.fullName}
                </p>
              )}
            </div>

            {/* Username */}
            <div>
              <input
                type="text"
                name="username"
                placeholder="Username"
                value={formData.username}
                onChange={handleChange}
                minLength={3}
                maxLength={30}
                className={`w-full bg-ig-bg border rounded-[3px] text-[12px] px-2 py-[9px] focus:outline-none placeholder:text-ig-muted transition-colors text-ig-text ${
                  errors.username
                    ? "border-[#ed4956]"
                    : "border-ig-border focus:border-ig-muted"
                }`}
              />
              {errors.username && (
                <p className="text-[11px] text-[#ed4956] mt-1">
                  {errors.username}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleChange}
                  minLength={6}
                  className={`w-full bg-ig-bg border rounded-[3px] text-[12px] px-2 py-[9px] pr-16 focus:outline-none placeholder:text-ig-muted transition-colors text-ig-text ${
                    errors.password
                      ? "border-[#ed4956]"
                      : "border-ig-border focus:border-ig-muted"
                  }`}
                />
                {formData.password && (
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-ig-text"
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                )}
              </div>
              {errors.password && (
                <p className="text-[11px] text-[#ed4956] mt-1">
                  {errors.password}
                </p>
              )}
            </div>

            {/* Terms */}
            <p className="text-[11px] text-ig-muted text-center leading-tight mt-2">
              People who use our service may have uploaded your contact
              information to Instagram.{" "}
              <a href="#" className="text-ig-blue hover:underline">
                Learn more
              </a>
            </p>
            <p className="text-[11px] text-ig-muted text-center leading-tight">
              By signing up, you agree to our{" "}
              <a href="#" className="text-ig-blue hover:underline">
                Terms
              </a>
              ,{" "}
              <a href="#" className="text-ig-blue hover:underline">
                Privacy Policy
              </a>{" "}
              and{" "}
              <a href="#" className="text-ig-blue hover:underline">
                Cookies Policy
              </a>
              .
            </p>

            <button
              type="submit"
              disabled={!allFilled || loading}
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
                  Signing up…
                </span>
              ) : (
                "Sign up"
              )}
            </button>
          </form>
        </div>

        {/* Log in card */}
        <div className="bg-ig-surface border border-ig-border rounded-sm py-4 text-center">
          <p className="text-sm text-ig-text">
            Have an account?{" "}
            <Link
              href="/login"
              className="text-[#0095f6] font-semibold hover:text-[#1877f2] dark:text-[#38b6ff] dark:hover:text-[#5cc8ff]"
            >
              Log in
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

      {/* Footer */}
      <footer className="py-6 text-center">
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
          &copy; 2024 Instagram from Meta
        </p>
      </footer>
    </div>
  );
};

export default PAGE;
