import { useAuth } from "@/lib/admin/auth";
import { useNavigate } from "react-router-dom";
import { Globe } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { usePostHog } from "@/components/PostHogProvider";

export default function HomePage() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [language, setLanguage] = useState("en");
  const { t } = useTranslation();
  const { trackEvent } = usePostHog();

  const handleMainButton = () => {
    if (user) {
      trackEvent('admin_access_clicked', { props: { source: 'homepage' } });
      navigate("/admin");
    } else {
      trackEvent('login_clicked', { props: { source: 'homepage' } });
      navigate("/auth");
    }
  };

  const handleHeaderButton = async () => {
    if (user) {
      trackEvent('logout_clicked', { props: { source: 'homepage' } });
      try {
        const { error } = await signOut();
        if (error) {
          console.error("Logout error:", error);
        }
        navigate("/");
      } catch (err) {
        console.error("Logout exception:", err);
        navigate("/");
      }
    } else {
      trackEvent('signin_clicked', { props: { source: 'homepage_header' } });
      navigate("/auth");
    }
  };

  const changeLanguage = (lng) => {
    trackEvent('language_changed', { props: { language: lng, source: 'homepage' } });
    setLanguage(lng);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="loading loading-spinner loading-lg"></div>
          <p className="text-base-content/70 mt-2">{t("Loading...")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="navbar bg-base-100 shadow-sm px-4">
        <div className="flex-1">
          <a href="/" className="flex items-center gap-3 group cursor-pointer">
            <img
              src="/sabuho_logo_3.png"
              alt="Sabuho Logo"
              className="h-10 w-auto object-contain transition-transform group-hover:scale-105"
            />
            <span className="text-2xl font-black tracking-tight">
              Sabuho<span className="text-primary">.</span>
            </span>
          </a>
        </div>
        <div className="flex-none">
          <div className="flex items-center gap-2">
            {/* Language Selector */}
            <div className="dropdown dropdown-end">
              <div tabIndex={0} role="button" className="btn btn-ghost btn-circle">
                <Globe className="w-5 h-5" />
              </div>
              <ul
                tabIndex={0}
                className="dropdown-content menu bg-base-100 rounded-box z-[1] w-40 p-2 shadow"
              >
                <li>
                  <button
                    onClick={() => changeLanguage("en")}
                    className={language === "en" ? "active" : ""}
                  >
                    🇺🇸 English
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => changeLanguage("es")}
                    className={language === "es" ? "active" : ""}
                  >
                    🇪🇸 Spanish
                  </button>
                </li>
              </ul>
            </div>

            {user && (
              <button
                onClick={() => navigate("/admin")}
                className="btn btn-ghost"
              >
                {t("Admin")}
              </button>
            )}

            <button onClick={handleHeaderButton} className="btn btn-primary">
              {user ? t("Logout") : t("Sign In")}
            </button>
          </div>
        </div>
      </header>

      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
        <div className="text-center max-w-4xl w-full">
          <div className="hero-content text-center">
            <div className="max-w-3xl">
              <p className="text-lg sm:text-xl lg:text-2xl text-base-content/70 mb-12 font-light max-w-2xl mx-auto">
                {t(
                  "Manage your learning domains, quizzes, and educational content all in one place."
                )}
              </p>

              <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-8">
                <button
                  onClick={handleMainButton}
                  className="btn btn-primary btn-lg text-lg px-8 py-4 min-w-48 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                >
                  {user ? t("Go to Admin Panel") : t("Login")}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
