import { FileText, CheckCircle, Plus, CheckSquare, ChevronDown, ChevronRight } from "lucide-react";
import { useState, useRef, useEffect } from "react";

export default function QuestionsPanel({
  topics,
  questions,
  selectedTopicIndex,
  totalQuestionsGenerated,
  questionsCount,
  user,
  onSaveQuiz
}) {
  const [editingField, setEditingField] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [expandedQuestions, setExpandedQuestions] = useState({});
  const [selectMode, setSelectMode] = useState(false);
  const [selectedQuestions, setSelectedQuestions] = useState(new Set());
  const [hoveredQuestionId, setHoveredQuestionId] = useState(null);
  const textareaRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (editingField) {
      if (editingField.type === 'body' && textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.select();
      } else if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
    }
  }, [editingField]);

  const handleEditStart = (questionId, type, value, optionIndex = null) => {
    setEditingField({ questionId, type, optionIndex });
    setEditValues({ [questionId]: value });
  };

  const handleEditSave = () => {
    if (!editingField) return;

    const { questionId, type, optionIndex } = editingField;
    const newValue = editValues[questionId];
    const questionIndex = questions.findIndex(q => q.id === questionId);

    if (questionIndex !== -1) {
      if (type === 'body') {
        questions[questionIndex].body = newValue;
      } else if (type === 'option') {
        const isCorrect = questions[questionIndex].options[optionIndex].includes('[correct]');
        questions[questionIndex].options[optionIndex] = isCorrect ? `${newValue} [correct]` : newValue;
      }
    }

    setEditingField(null);
    setEditValues({});
  };

  const handleCorrectAnswerChange = (questionId, optionIndex) => {
    const questionIndex = questions.findIndex(q => q.id === questionId);
    if (questionIndex !== -1 && questions[questionIndex].options) {
      // Remove [correct] from all options
      questions[questionIndex].options = questions[questionIndex].options.map(opt =>
        opt.replace(' [correct]', '').replace('[correct]', '').trim()
      );
      // Add [correct] to the selected option
      questions[questionIndex].options[optionIndex] = `${questions[questionIndex].options[optionIndex]} [correct]`;
      // Force re-render
      setEditingField({ ...editingField });
    }
  };

  const handleEditCancel = () => {
    setEditingField(null);
    setEditValues({});
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && editingField?.type === 'option') {
      e.preventDefault();
      handleEditSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleEditCancel();
    }
  };

  const handleValueChange = (questionId, value) => {
    setEditValues({ [questionId]: value });
  };

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

  const toggleQuestionExpand = (questionId) => {
    setExpandedQuestions(prev => ({
      ...prev,
      [questionId]: !prev[questionId]
    }));
  };

  const handleCollapseExpandAll = () => {
    const allExpanded = filteredQuestions.every(q => expandedQuestions[q.id]);
    const newState = {};
    filteredQuestions.forEach(q => {
      newState[q.id] = !allExpanded;
    });
    setExpandedQuestions(newState);
  };

  const toggleSelectMode = () => {
    setSelectMode(prev => !prev);
    if (selectMode) {
      setSelectedQuestions(new Set());
    }
  };

  const toggleQuestionSelection = (questionId) => {
    setSelectedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  };

  return (
    <div className="flex-1 bg-blue-50 border-2 border-blue-500 rounded-lg p-6">
      <div className="mb-4 pb-3 border-b border-blue-400">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-lg font-bold text-blue-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            {selectedTopicIndex === null
              ? 'All Questions'
              : `Questions for ${topics[selectedTopicIndex]?.name}`}
          </h4>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2">
          <button
            className="btn btn-sm btn-ghost gap-2"
            onClick={() => {/* TODO: Implement add question */}}
            title="Add a new question"
          >
            <Plus className="w-4 h-4" />
            Add Question
          </button>

          <button
            className={`btn btn-sm ${selectMode ? 'btn-primary' : 'btn-ghost'} gap-2`}
            onClick={toggleSelectMode}
            title="Toggle select mode"
          >
            <CheckSquare className="w-4 h-4" />
            {selectMode ? 'Exit Select' : 'Select Mode'}
          </button>

          <button
            className="btn btn-sm btn-ghost gap-2"
            onClick={handleCollapseExpandAll}
            title="Collapse or expand all questions"
          >
            {filteredQuestions.every(q => expandedQuestions[q.id]) ? (
              <>
                <ChevronRight className="w-4 h-4" />
                Collapse All
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                Expand All
              </>
            )}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {filteredQuestions.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No questions available for this topic</p>
          </div>
        ) : (
          <>
            {filteredQuestions.map((q, index) => {
              const isEditingBody = editingField?.questionId === q.id && editingField?.type === 'body';
              const isExpanded = expandedQuestions[q.id] !== false; // Default to expanded
              const isHovered = hoveredQuestionId === q.id;
              const isSelected = selectedQuestions.has(q.id);

              return (
                <div
                  key={q.id}
                  className={`p-4 bg-gray-50 border rounded-lg transition-colors ${
                    isSelected ? 'border-primary bg-primary/5' : 'border-gray-200'
                  }`}
                  onMouseEnter={() => setHoveredQuestionId(q.id)}
                  onMouseLeave={() => setHoveredQuestionId(null)}
                >
                  <div className="flex items-start gap-2">
                    {/* Chevron - only visible on hover */}
                    <button
                      onClick={() => toggleQuestionExpand(q.id)}
                      className={`flex-shrink-0 mt-1 transition-opacity ${
                        isHovered ? 'opacity-100' : 'opacity-0'
                      }`}
                      title={isExpanded ? "Collapse answers" : "Expand answers"}
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-500" />
                      )}
                    </button>

                    {/* Select checkbox - visible in select mode */}
                    {selectMode && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleQuestionSelection(q.id)}
                        className="checkbox checkbox-primary checkbox-sm flex-shrink-0 mt-1"
                      />
                    )}

                    <div className="flex-1 min-w-0">
                      <p
                        className={`font-medium text-gray-900 mb-3 cursor-pointer rounded px-2 py-1 transition-colors ${
                          isEditingBody ? 'bg-blue-100' : 'hover:bg-gray-100'
                        }`}
                        onClick={() => !isEditingBody && handleEditStart(q.id, 'body', q.body)}
                        title="Click to edit question"
                      >
                        <span className="font-bold text-purple-600">{index + 1}.</span>{' '}
                        {isEditingBody ? (
                          <textarea
                            ref={textareaRef}
                            value={editValues[q.id]}
                            onChange={(e) => handleValueChange(q.id, e.target.value)}
                            onBlur={handleEditSave}
                            onKeyDown={handleKeyDown}
                            className="font-medium text-gray-900 bg-transparent border-none outline-none resize-none align-top p-0 m-0"
                            rows="1"
                            style={{ minHeight: '1.5em', width: 'calc(100% - 2rem)' }}
                          />
                        ) : (
                          q.body
                        )}
                      </p>

                      {/* Answer options - only shown when expanded */}
                      {isExpanded && q.options && q.options.length > 0 && (
                    <div className="space-y-1 pl-5">
                      {q.options.map((option, optIdx) => {
                        const isCorrect = option.includes('[correct]');
                        const displayText = option.replace('[correct]', '').trim();
                        const isEditingOption = editingField?.questionId === q.id &&
                                               editingField?.type === 'option' &&
                                               editingField?.optionIndex === optIdx;

                        return (
                          <div
                            key={optIdx}
                            className={`text-sm py-1.5 px-2 rounded flex items-center gap-2 ${
                              isEditingOption
                                ? (isCorrect ? 'font-semibold text-green-700 bg-green-100' : 'text-gray-700 bg-blue-100')
                                : (isCorrect ? 'font-semibold text-green-700 bg-green-50' : 'text-gray-700')
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isCorrect}
                              onChange={() => handleCorrectAnswerChange(q.id, optIdx)}
                              className="checkbox checkbox-success checkbox-sm flex-shrink-0"
                              title="Mark as correct answer"
                            />
                            <span className="flex-shrink-0">{String.fromCharCode(65 + optIdx)}.</span>
                            {isEditingOption ? (
                              <input
                                ref={inputRef}
                                type="text"
                                value={editValues[q.id]}
                                onChange={(e) => handleValueChange(q.id, e.target.value)}
                                onBlur={handleEditSave}
                                onKeyDown={handleKeyDown}
                                className={`bg-transparent border-none outline-none flex-1 px-1 rounded text-sm ${
                                  isCorrect ? 'font-semibold text-green-700' : 'text-gray-700'
                                }`}
                                style={{ margin: 0 }}
                              />
                            ) : (
                              <span
                                className="cursor-pointer hover:bg-white/50 rounded px-1 transition-colors flex-1"
                                onClick={() => handleEditStart(q.id, 'option', displayText, optIdx)}
                                title="Click to edit option"
                              >
                                {displayText}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
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
