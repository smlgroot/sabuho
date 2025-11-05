import { FileText, CheckCircle } from "lucide-react";

export default function QuestionsPanel({
  topics,
  questions,
  selectedTopicIndex,
  totalQuestionsGenerated,
  questionsCount,
  user,
  onSaveQuiz
}) {
  // Filter questions based on selected topic
  let filteredQuestions = questions;
  if (selectedTopicIndex !== null) {
    const selectedTopic = topics[selectedTopicIndex];

    filteredQuestions = questions.filter(q => {
      // Match by resource_session_domain_id (from resource_session_domains table)
      if (q.resource_session_domain_id && selectedTopic.id) {
        return q.resource_session_domain_id === selectedTopic.id;
      }
      // Fallback to page number range for legacy data
      if (q.page_number && selectedTopic.start && selectedTopic.end) {
        return q.page_number >= selectedTopic.start && q.page_number <= selectedTopic.end;
      }
      return false;
    });
  }

  return (
    <div className="flex-1 bg-blue-50 border-2 border-blue-500 rounded-lg p-6">
      <div className="mb-4 pb-3 border-b border-blue-400">
        <h4 className="text-lg font-bold text-blue-900 flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600" />
          {selectedTopicIndex === null
            ? 'All Questions'
            : `Questions for ${topics[selectedTopicIndex]?.name}`}
        </h4>
      </div>

      <div className="space-y-4">
        {filteredQuestions.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No questions available for this topic</p>
          </div>
        ) : (
          <>
            {filteredQuestions.map((q, index) => (
              <div key={q.id} className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="font-medium text-gray-900 mb-3">
                  <span className="font-bold text-purple-600">{index + 1}.</span> {q.body}
                </p>
                {q.options && q.options.length > 0 && (
                  <div className="space-y-2 pl-5">
                    {q.options.map((option, optIdx) => {
                      const isCorrect = option.includes('[correct]');
                      const displayText = option.replace('[correct]', '').trim();
                      return (
                        <div
                          key={optIdx}
                          className={`text-sm py-1.5 px-2 rounded ${
                            isCorrect ? 'font-semibold text-green-700 bg-green-50' : 'text-gray-700'
                          }`}
                        >
                          {String.fromCharCode(65 + optIdx)}. {displayText}
                          {isCorrect && ' ✓'}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </>
        )}
      </div>

      {/* Action Buttons - Show when all questions are displayed */}
      {totalQuestionsGenerated <= questionsCount && filteredQuestions.length > 0 && (
        <div className="flex justify-end mt-6 pt-4 border-t border-gray-200">
          <button onClick={onSaveQuiz} className="btn btn-primary">
            <CheckCircle className="w-5 h-5 mr-2" />
            {user ? "Save Quiz" : "Sign Up to Save"}
          </button>
        </div>
      )}
    </div>
  );
}
