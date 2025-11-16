import { ArrowLeft, DollarSign, TrendingUp, Users, Award } from 'lucide-react';

/**
 * Quiz Monetize View Component
 * Displays monetization options and opportunities for quiz content
 */
const QuizMonetizeView = ({ onBack }) => {
  // Monetization options
  const monetizationOptions = [
    {
      id: 'subscription',
      title: 'Subscription Model',
      description: 'Offer premium quizzes with a monthly or yearly subscription',
      icon: TrendingUp,
      color: 'primary',
      features: [
        'Recurring revenue stream',
        'Access to exclusive content',
        'Advanced analytics for subscribers',
        'Ad-free experience'
      ]
    },
    {
      id: 'pay-per-quiz',
      title: 'Pay Per Quiz',
      description: 'Charge users for individual quiz access',
      icon: DollarSign,
      color: 'success',
      features: [
        'One-time payment per quiz',
        'Flexible pricing options',
        'No long-term commitments',
        'Instant access after purchase'
      ]
    },
    {
      id: 'corporate',
      title: 'Corporate Licensing',
      description: 'License your quiz content to organizations and businesses',
      icon: Users,
      color: 'info',
      features: [
        'Bulk licensing deals',
        'Custom branding options',
        'Usage analytics and reporting',
        'Dedicated support'
      ]
    },
    {
      id: 'certification',
      title: 'Certification Programs',
      description: 'Offer certificates upon quiz completion for a fee',
      icon: Award,
      color: 'warning',
      features: [
        'Professional certificates',
        'Verifiable credentials',
        'Premium pricing opportunity',
        'Enhanced user engagement'
      ]
    }
  ];

  return (
    <div className="max-w-5xl mb-8">
      <div className="bg-base-200 border border-base-content/10 p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={onBack}
            className="btn btn-ghost btn-circle btn-sm"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold uppercase tracking-wide">Monetize Your Quizzes</h1>
            <p className="text-xs text-base-content/60 mt-1">
              Explore different ways to generate revenue from your quiz content
            </p>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-base-100 p-4 text-center">
            <div className="text-3xl font-bold text-primary">4</div>
            <div className="text-sm text-base-content/60">Monetization Models</div>
          </div>

          <div className="bg-base-100 p-4 text-center">
            <div className="text-3xl font-bold text-success">$0</div>
            <div className="text-sm text-base-content/60">Revenue Generated</div>
          </div>

          <div className="bg-base-100 p-4 text-center">
            <div className="text-3xl font-bold text-info">0</div>
            <div className="text-sm text-base-content/60">Active Subscribers</div>
          </div>

          <div className="bg-base-100 p-4 text-center">
            <div className="text-3xl font-bold text-warning">0</div>
            <div className="text-sm text-base-content/60">Certificates Issued</div>
          </div>
        </div>

        {/* Monetization Options */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-base-content/60 mb-4">
            Available Monetization Options
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {monetizationOptions.map(option => {
              const Icon = option.icon;
              return (
                <div
                  key={option.id}
                  className="bg-base-100 border border-base-content/10 p-5 hover:border-base-content/20 transition-all duration-200"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className={`p-2 rounded bg-${option.color}/10`}>
                      <Icon className={`w-6 h-6 text-${option.color}`} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-base mb-1">{option.title}</h3>
                      <p className="text-sm text-base-content/60">{option.description}</p>
                    </div>
                  </div>

                  <div className="ml-0 mt-4">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-base-content/60 mb-2">
                      Key Features
                    </h4>
                    <ul className="space-y-2">
                      {option.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <span className={`text-${option.color} mt-0.5`}>•</span>
                          <span className="text-base-content/80">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-4 pt-4 border-t border-base-content/10">
                    <button className={`btn btn-${option.color} btn-sm w-full`}>
                      Get Started
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Getting Started Section */}
        <div className="bg-accent/10 border border-accent/20 p-5">
          <div className="flex items-start gap-3">
            <DollarSign className="w-6 h-6 text-accent flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="font-bold text-base mb-2">Ready to Monetize?</h3>
              <p className="text-sm text-base-content/70 mb-4">
                Choose a monetization model that fits your goals and start generating revenue from your quiz content today.
              </p>
              <button className="btn btn-accent">
                Contact Sales Team
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizMonetizeView;
