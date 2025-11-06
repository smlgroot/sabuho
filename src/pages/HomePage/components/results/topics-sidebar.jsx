import { BookOpen } from "lucide-react";

export default function TopicsSidebar({
  topics,
  questions,
  questionsCount,
  selectedTopicIndex,
  onTopicSelect
}) {
  return (
    <div className="w-64 flex-shrink-0 space-y-2 py-6">
      {/* All Topics Tab */}
      <div
        onClick={() => onTopicSelect(null)}
        className={`px-4 py-3 cursor-pointer transition-all relative rounded-l-lg border-l-2 border-t-2 border-b-2 ${
          selectedTopicIndex === null
            ? 'bg-blue-50 pr-6 z-10 border-blue-500'
            : 'bg-gray-100 hover:bg-gray-200 border-gray-100'
        }`}
        style={ selectedTopicIndex === null ? { marginRight: '-2px' } : { marginRight: '0px' } }
      >
        <div className="flex items-center gap-3">
          <BookOpen className={`w-4 h-4 flex-shrink-0 ${selectedTopicIndex === null ? 'text-blue-600' : 'text-gray-500'}`} />
          <div className="flex-1 min-w-0">
            <p className={`font-semibold text-sm ${selectedTopicIndex === null ? 'text-blue-900' : 'text-gray-900'}`}>All Topics</p>
            <p className="text-xs text-gray-500">{questionsCount} questions</p>
          </div>
        </div>
      </div>

      {/* Individual Topic Tabs */}
      {topics.map((topic, index) => {
        const topicQuestions = questions.filter(q => {
          // Match by resource_session_domain_id (from resource_session_domains table)
          if (q.resource_session_domain_id && topic.id) {
            return q.resource_session_domain_id === topic.id;
          }
          // Fallback to page number range for legacy data
          if (q.page_number && topic.start && topic.end) {
            return q.page_number >= topic.start && q.page_number <= topic.end;
          }
          return false;
        });

        return (
          <div
            key={index}
            onClick={() => onTopicSelect(index)}
            className={`px-4 py-3 cursor-pointer transition-all relative rounded-l-lg border-l-2 border-t-2 border-b-2 ${
              selectedTopicIndex === index
                ? 'bg-blue-50 z-10 border-blue-500'
                : 'bg-gray-100 hover:bg-gray-200 border-gray-100'
            }`}
            style={ selectedTopicIndex === index ? { marginRight: '-2px' } : { marginRight: '0px' } }
          >
            <div className="flex items-start gap-3">
              <span className={`font-bold text-sm flex-shrink-0 ${
                selectedTopicIndex === index ? 'text-blue-600' : 'text-gray-500'
              }`}>{index + 1}.</span>
              <div className="flex-1 min-w-0">
                <p className={`font-medium text-sm mb-1 line-clamp-2 ${
                  selectedTopicIndex === index ? 'text-blue-900' : 'text-gray-900'
                }`}>{topic.name}</p>
                <p className="text-xs text-gray-500">
                  Pages {topic.start}-{topic.end}
                  {topicQuestions.length > 0 && ` • ${topicQuestions.length} questions`}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
