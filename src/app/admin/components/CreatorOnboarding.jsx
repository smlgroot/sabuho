import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DollarSign, User, Shield, CheckCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/lib/admin/auth';
import * as supabaseService from '@/services/supabaseService';
import { toast } from 'sonner';

export function CreatorOnboarding({ onComplete, onCancel }) {
  const { t } = useTranslation();
  const { user, loadUserProfile } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    displayName: '',
    bio: '',
    acceptedTerms: false
  });

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCompleteOnboarding = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Update display_name, terms_accepted, and is_creator_enabled columns
      const { error } = await supabaseService.updateUserProfile(user.id, {
        display_name: formData.displayName,
        terms_accepted: formData.acceptedTerms,
        is_creator_enabled: formData.acceptedTerms // Enable creator when terms are accepted
      });

      if (error) {
        throw error;
      }

      // Reload user profile to get updated data
      await loadUserProfile(user.id);
      
      toast.success(t('Creator account activated successfully!'));
      onComplete();
    } catch (error) {
      console.error('Error completing onboarding:', error);
      toast.error(t('Failed to complete onboarding. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="text-center max-w-sm mx-auto">
            <DollarSign className="h-16 w-16 text-primary mx-auto mb-6" />
            <h4 className="text-xl font-semibold mb-4">{t("Become a Quiz Creator")}</h4>
            <p className="text-base-content/70 mb-6 leading-relaxed">
              {t("Transform your knowledge into income by creating educational domains and quizzes that learners can purchase.")}
            </p>
            <div className="bg-base-200 rounded-lg p-4 mb-6">
              <div className="text-left space-y-3">
                <div className="flex items-center gap-3">
                  <div className="badge badge-primary badge-sm px-2">1</div>
                  <span className="text-sm">{t("Create domains to organize your content")}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="badge badge-primary badge-sm px-2">2</div>
                  <span className="text-sm">{t("Build engaging quizzes with questions")}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="badge badge-primary badge-sm px-2">3</div>
                  <span className="text-sm">{t("Generate quiz codes to sell")}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="badge badge-primary badge-sm px-2">4</div>
                  <span className="text-sm">{t("Earn revenue from learners")}</span>
                </div>
              </div>
            </div>
            <button 
              className="btn btn-primary"
              onClick={handleNext}
            >
              {t("Get Started")} <ArrowRight className="h-4 w-4 ml-2" />
            </button>
          </div>
        );

      case 2:
        return (
          <div className="max-w-sm mx-auto">
            <User className="h-16 w-16 text-primary mx-auto mb-6" />
            <h4 className="text-xl font-semibold mb-4 text-center">{t("Tell Us About You")}</h4>
            <p className="text-base-content/70 mb-6 text-center">
              {t("Let's set up your creator profile so learners can get to know you.")}
            </p>
            <div className="space-y-4">
              <div>
                <label className="label">
                  <span className="label-text">{t("Display Name")} *</span>
                </label>
                <input
                  type="text"
                  placeholder={t("What should learners call you?")}
                  className="input input-bordered w-full"
                  value={formData.displayName}
                  onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="label">
                  <span className="label-text">{t("Bio (optional)")}</span>
                </label>
                <textarea
                  placeholder={t("Tell learners about your expertise...")}
                  className="textarea textarea-bordered w-full h-24"
                  value={formData.bio}
                  onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button className="btn btn-outline flex-1" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4 mr-2" /> {t("Back")}
              </button>
              <button 
                className="btn btn-primary flex-1"
                onClick={handleNext}
                disabled={!formData.displayName.trim()}
              >
                {t("Continue")} <ArrowRight className="h-4 w-4 ml-2" />
              </button>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="max-w-md mx-auto">
            <Shield className="h-16 w-16 text-primary mx-auto mb-6" />
            <h4 className="text-xl font-semibold mb-4 text-center">{t("Terms & Conditions")}</h4>
            <p className="text-base-content/70 mb-6 text-center">
              {t("Please review and accept our terms to become a creator.")}
            </p>
            
            <div className="bg-base-200 rounded-lg p-4 mb-6 max-h-48 overflow-y-auto">
              <div className="text-sm space-y-3">
                <div>
                  <h5 className="font-semibold mb-2">{t("Creator Agreement")}</h5>
                  <p className="text-xs leading-relaxed">
                    {t("By becoming a creator, you agree to:")}
                  </p>
                  <ul className="text-xs mt-2 space-y-1 list-disc list-inside">
                    <li>{t("Create original, educational content")}</li>
                    <li>{t("Respect intellectual property rights")}</li>
                    <li>{t("Maintain appropriate content standards")}</li>
                    <li>{t("Follow platform guidelines and policies")}</li>
                  </ul>
                </div>
                
                <div>
                  <h5 className="font-semibold mb-2">{t("Revenue & Payments")}</h5>
                  <p className="text-xs leading-relaxed">
                    {t("You understand that quiz code sales are subject to our revenue sharing model and payment terms as outlined in our full Creator Terms of Service.")}
                  </p>
                </div>
                
                <div>
                  <h5 className="font-semibold mb-2">{t("Content Ownership")}</h5>
                  <p className="text-xs leading-relaxed">
                    {t("You retain ownership of your original content while granting us license to distribute it through our platform.")}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input 
                  type="checkbox"
                  className="checkbox checkbox-primary mt-1"
                  checked={formData.acceptedTerms}
                  onChange={(e) => setFormData(prev => ({ ...prev, acceptedTerms: e.target.checked }))}
                />
                <span className="text-sm leading-relaxed">
                  {t("I have read and agree to the")} <a href="#" className="link link-primary">{t("Creator Terms of Service")}</a> {t("and")} <a href="#" className="link link-primary">{t("Privacy Policy")}</a>
                </span>
              </label>
            </div>

            <div className="flex gap-3 mt-6">
              <button className="btn btn-outline flex-1" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4 mr-2" /> {t("Back")}
              </button>
              <button 
                className="btn btn-success flex-1"
                onClick={handleCompleteOnboarding}
                disabled={!formData.acceptedTerms || loading}
              >
                {loading ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    {t("Activating...")}
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {t("Activate")}
                  </>
                )}
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header with progress */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold">{t("Creator Onboarding")}</h3>
          <button 
            className="btn btn-ghost btn-sm"
            onClick={onCancel}
          >
            ✕
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-base-content/70">{t("Step")} {currentStep} {t("of")} 3</span>
          <progress className="progress progress-primary flex-1" value={currentStep} max="3"></progress>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 flex items-center justify-center">
        {renderStep()}
      </div>
    </div>
  );
}