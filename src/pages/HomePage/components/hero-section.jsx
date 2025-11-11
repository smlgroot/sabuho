import { Upload, Sparkles, BookOpen, Brain } from "lucide-react";

export default function HeroSection({ onGetStarted }) {
  return (
    <>
      {/* Main Hero Content */}
      <div className="text-center mb-16">
        <button
          onClick={onGetStarted}
          className="btn btn-primary btn-lg gap-2 font-semibold px-8"
        >
          <Upload className="w-5 h-5" />
          Upload Your First Document
        </button>
      </div>

      {/* Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="border border-base-300 bg-base-100 p-6 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/10 mb-4">
            <Upload className="w-6 h-6 text-primary" />
          </div>
          <h3 className="font-semibold mb-2 uppercase text-sm">Easy Upload</h3>
          <p className="text-sm text-base-content/60">
            Drop any PDF, DOCX, or TXT file to get started
          </p>
        </div>

        <div className="border border-base-300 bg-base-100 p-6 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/10 mb-4">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <h3 className="font-semibold mb-2 uppercase text-sm">AI Powered</h3>
          <p className="text-sm text-base-content/60">
            Advanced AI analyzes content and generates smart questions
          </p>
        </div>

        <div className="border border-base-300 bg-base-100 p-6 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/10 mb-4">
            <Brain className="w-6 h-6 text-primary" />
          </div>
          <h3 className="font-semibold mb-2 uppercase text-sm">Learn Better</h3>
          <p className="text-sm text-base-content/60">
            Test your knowledge with custom quizzes tailored to your content
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="bg-base-200/50 border border-base-300 p-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
          <div>
            <div className="text-3xl font-bold text-primary mb-1">5 sec</div>
            <div className="text-sm text-base-content/60 uppercase tracking-wide">
              Average Upload Time
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold text-primary mb-1">10-50</div>
            <div className="text-sm text-base-content/60 uppercase tracking-wide">
              Questions per Document
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold text-primary mb-1">100%</div>
            <div className="text-sm text-base-content/60 uppercase tracking-wide">
              AI Generated Content
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
