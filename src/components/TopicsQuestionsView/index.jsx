import { BookOpen, Plus, BarChart3, DollarSign } from "lucide-react";
import { useState } from "react";
import TopicsSidebar from "./topics-sidebar";
import QuestionsPanel from "./questions-panel";

/**
 * TopicsQuestionsView - Reusable component for displaying topics and questions
 *
 * @param {Object} props
 * @param {Array} props.topics - Array of topic objects
 * @param {Array} props.questions - Array of question objects
 * @param {Array} props.sessions - Array of session objects (optional)
 * @param {boolean} props.isProcessing - Whether data is currently being processed
 * @param {number} props.totalQuestionsGenerated - Total count of questions
 * @param {Function} props.onUpdateQuestion - Callback when a question is updated
 * @param {Function} props.onDeleteQuestions - Callback when questions are deleted
 * @param {Function} props.onAddQuestion - Callback when a question is added
 * @param {Function} props.onAddDocument - Callback when add document button is clicked
 * @param {Function} props.onStartLearning - Callback when start learning button is clicked
 * @param {Function} props.onShowInsights - Callback when insights button is clicked
 * @param {Function} props.onShowMonetize - Callback when monetize button is clicked
 * @param {React.ReactNode} props.actionButtons - Custom action buttons to display in header
 * @param {boolean} props.showDocumentInfo - Whether to show document/session info
 * @param {boolean} props.showAddDocumentButton - Whether to show add document button
 * @param {boolean} props.showStartLearningButton - Whether to show start learning button
 * @param {boolean} props.readOnly - Whether questions are read-only
 * @param {boolean} props.isDemo - Whether this is demo/sample data
 * @param {string} props.className - Additional CSS classes
 */
export default function TopicsQuestionsView({
  topics = [],
  questions = [],
  sessions = [],
  isProcessing = false,
  totalQuestionsGenerated = 0,
  onUpdateQuestion,
  onDeleteQuestions,
  onAddQuestion,
  onAddDocument,
  onStartLearning,
  onShowInsights,
  onShowMonetize,
  actionButtons,
  showDocumentInfo = true,
  showAddDocumentButton = true,
  showStartLearningButton = true,
  readOnly = false,
  isDemo = false,
  className = ""
}) {
  const [selectedTopicIndex, setSelectedTopicIndex] = useState(null);

  // Calculate questions count
  const questionsCount = questions.length;

  // Determine if content should be shown with full opacity
  const hasContent = isProcessing || topics.length > 0 || sessions.length > 0;

  return (
    <div className={`max-w-5xl mb-8 ${className}`}>
      <div className="bg-base-200 border border-base-content/10 p-6">
        {/* Topics & Questions Section - With State-based Opacity */}
        <div className={`transition-opacity ${hasContent ? 'opacity-100' : 'opacity-50'}`}>
          {/* Header with Stats and Action Buttons */}
          <div className="mb-6">
            {/* Title Row */}
            <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded ${hasContent ? 'bg-primary/10' : 'bg-base-content/5'}`}>
                  <BookOpen className={`w-5 h-5 ${
                    hasContent ? 'text-primary' : 'text-base-content/30'
                  }`} />
                </div>
                <div>
                  <h3 className={`text-lg font-bold uppercase tracking-wide ${
                    hasContent ? 'text-base-content' : 'text-base-content/30'
                  }`}>
                    Topics & Questions
                  </h3>
                  {isDemo && (
                    <p className="text-xs text-base-content/60 mt-0.5">
                      Example quiz • Upload your own document to get started
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons Group */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Custom action buttons */}
                {actionButtons}

                {/* Default action buttons */}
                {topics.length > 0 && onShowInsights && (
                  <button
                    onClick={onShowInsights}
                    className="btn btn-secondary gap-2 shadow-sm"
                    title="View learning insights and statistics"
                  >
                    <BarChart3 className="w-5 h-5" />
                    <span className="hidden sm:inline">Insights</span>
                  </button>
                )}
                {topics.length > 0 && onShowMonetize && (
                  <button
                    onClick={onShowMonetize}
                    className="btn btn-warning gap-2"
                    title="Explore monetization options"
                  >
                    <DollarSign className="w-5 h-5" />
                    <span className="hidden sm:inline">Monetize</span>
                  </button>
                )}
                {showStartLearningButton && topics.length > 0 && onStartLearning && (
                  <button
                    onClick={onStartLearning}
                    className="btn btn-accent gap-2"
                  >
                    <span className="hidden sm:inline">Start Learning</span>
                    <span className="sm:hidden">Start</span>
                  </button>
                )}
              </div>
            </div>

            {/* Stats and Document Info Row */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
              {/* Stats Cards */}
              <div className="flex items-center gap-3">
                <div className="bg-base-100 border border-base-content/10 px-4 py-2 rounded">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-base-content/60 uppercase tracking-wide">Topics</span>
                    <div className="badge badge-primary badge-sm font-bold">{topics.length}</div>
                  </div>
                </div>
                <div className="bg-base-100 border border-base-content/10 px-4 py-2 rounded">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-base-content/60 uppercase tracking-wide">Questions</span>
                    <div className="badge badge-neutral badge-sm font-bold">{totalQuestionsGenerated}</div>
                  </div>
                </div>
              </div>

              {/* Document Info Section */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Document Badges */}
                {showDocumentInfo && sessions.length > 0 && (
                  <>
                    {sessions.map((session) => (
                      <div
                        key={session.id}
                        className="inline-flex items-center gap-2 px-3 py-2 bg-base-100 border border-base-content/10 rounded"
                      >
                        <BookOpen className="w-4 h-4 text-primary flex-shrink-0" />
                        <span className="text-sm font-medium truncate max-w-[200px]">
                          {session.name}
                        </span>
                        <div className="badge badge-xs badge-success">
                          {session.status === 'completed' ? 'Done' : session.status}
                        </div>
                        {isDemo && (
                          <div className="badge badge-xs badge-info">DEMO</div>
                        )}
                      </div>
                    ))}
                  </>
                )}

                {/* Add Document Button */}
                {showAddDocumentButton && onAddDocument && (
                  <button
                    onClick={onAddDocument}
                    className={`btn gap-2 ${
                      isDemo
                        ? 'btn-info shadow-lg'
                        : 'btn-outline btn-sm'
                    }`}
                    title={isDemo ? "Upload your own document to create personalized quizzes" : "Add new document"}
                  >
                    <Plus className="w-4 h-4" />
                    {isDemo ? "Upload Your Document" : "Add Document"}
                  </button>
                )}
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-base-content/10 mt-4"></div>
          </div>

          {/* Topics and Questions Layout */}
          {hasContent ? (
            <div className="flex">
              <TopicsSidebar
                topics={topics}
                questions={questions}
                questionsCount={questionsCount}
                selectedTopicIndex={selectedTopicIndex}
                onTopicSelect={setSelectedTopicIndex}
              />

              <QuestionsPanel
                topics={topics}
                questions={questions}
                selectedTopicIndex={selectedTopicIndex}
                totalQuestionsGenerated={totalQuestionsGenerated}
                questionsCount={questionsCount}
                onUpdateQuestion={onUpdateQuestion}
                onDeleteQuestions={onDeleteQuestions}
                onAddQuestion={onAddQuestion}
                readOnly={readOnly}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center py-16 border border-dashed border-base-content/10">
              <div className="text-center">
                <BookOpen className="w-16 h-16 text-base-content/20 mx-auto mb-4" />
                <p className="text-base font-semibold text-base-content/40 mb-2">No Content Yet</p>
                <p className="text-sm text-base-content/30">Upload and process a document to see topics and questions here</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
