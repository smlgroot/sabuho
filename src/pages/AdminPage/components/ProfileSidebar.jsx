import React from 'react';
import { useTranslation } from 'react-i18next';
import { X, Moon, Sun, Languages, User, HelpCircle, LogOut } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/admin/auth";
import { useNavigate } from 'react-router-dom';
import { usePostHog } from "@/components/PostHogProvider";
import { ThemeToggle } from "../../../components/ThemeToggle";
import { useThemeContext } from "../../../components/ThemeProvider";

export function ProfileSidebar({ onClose }) {
  const { user, signOut } = useAuth();
  const { isDark } = useThemeContext();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { trackEvent } = usePostHog();

  const handleSignOut = async () => {
    trackEvent('logout_clicked', { props: { source: 'profile_sidebar' } });
    try {
      const { error } = await signOut();
      if (error) {

        toast.error('Failed to sign out. Please try again.');
      } else {
        navigate('/');
      }
    } catch (err) {

      toast.error('Failed to sign out. Please try again.');
    }
  };

  const handleLanguageChange = (language) => {
    trackEvent('language_changed', { props: { language: language, source: 'profile_sidebar' } });
    i18n.changeLanguage(language);
  };

  return (
    <aside className="w-64 gmail-sidebar-bg flex flex-col h-full">
      {/* Header */}
      <div className="p-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-medium">{t('Profile')}</h2>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Profile Menu Items */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-3">
          {/* Theme Selection */}
          <div className="mb-6">
            <h3 className="text-xs mb-3 text-base-content/70">{t('Appearance')}</h3>
            <div className="flex items-center justify-between p-3 rounded-lg bg-white">
              <div className="flex items-center gap-2">
                {isDark ? <Moon className="h-4 w-4 text-base-content/60" /> : <Sun className="h-4 w-4 text-base-content/60" />}
                <span className="text-sm">{isDark ? t('Dark Mode') : t('Light Mode')}</span>
              </div>
              <ThemeToggle size="sm" variant="outline" />
            </div>
          </div>

          {/* Language Selection */}
          <div className="mb-6">
            <h3 className="text-xs mb-3 text-base-content/70">{t('Language')}</h3>
            <div className="space-y-2">
              <button
                onClick={() => handleLanguageChange('en')}
                className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
                  i18n.language === 'en' ? 'bg-primary/10' : 'bg-white hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Languages className="h-4 w-4 text-base-content/60" />
                  <span className="text-sm">{t('English')}</span>
                </div>
                {i18n.language === 'en' && (
                  <div className="w-2 h-2 bg-primary rounded-full" />
                )}
              </button>
              <button
                onClick={() => handleLanguageChange('es')}
                className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
                  i18n.language === 'es' ? 'bg-primary/10' : 'bg-white hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Languages className="h-4 w-4 text-base-content/60" />
                  <span className="text-sm">{t('Spanish')}</span>
                </div>
                {i18n.language === 'es' && (
                  <div className="w-2 h-2 bg-primary rounded-full" />
                )}
              </button>
            </div>
          </div>

          {/* Profile Settings - Placeholder */}
          <div className="mb-6">
            <h3 className="text-xs mb-3 text-base-content/70">{t('Account')}</h3>
            <button className="w-full flex items-center gap-2 p-3 rounded-lg bg-white hover:bg-gray-50 transition-colors">
              <User className="h-4 w-4 text-base-content/60" />
              <span className="text-sm">{t('Profile Settings')}</span>
            </button>
          </div>

          {/* Help and Support - Placeholder */}
          <div className="mb-6">
            <h3 className="text-xs mb-3 text-base-content/70">{t('Support')}</h3>
            <button className="w-full flex items-center gap-2 p-3 rounded-lg bg-white hover:bg-gray-50 transition-colors">
              <HelpCircle className="h-4 w-4 text-base-content/60" />
              <span className="text-sm">{t('Help & Support')}</span>
            </button>
          </div>

          {/* Sign Out */}
          <div className="mb-6">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-2 p-3 rounded-lg bg-error/5 hover:bg-error/10 transition-colors text-error"
            >
              <LogOut className="h-4 w-4" />
              <span className="text-sm">{t('Sign Out')}</span>
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}