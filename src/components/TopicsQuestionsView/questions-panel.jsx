import { FileText, Plus, CheckSquare, ChevronDown, ChevronRight, Trash2, AlertCircle } from "lucide-react";
import { useState, useRef, useEffect } from "react";

export default function QuestionsPanel({
  topics,
  questions,
  selectedTopicIndex,
  totalQuestionsGenerated,
  questionsCount,
  onUpdateQuestion,
  onDeleteQuestions,
  onAddQuestion,
  readOnly = false
}) {
  const [editingField, setEditingField] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [expandedQuestions, setExpandedQuestions] = useState({});
  const [selectMode, setSelectMode] = useState(false);
  const [selectedQuestions, setSelectedQuestions] = useState(new Set());
  const [hoveredQuestionId, setHoveredQuestionId] = useState(null);
  const [localQuestions, setLocalQuestions] = useState([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
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
    if (readOnly) return;
    setEditingField({ questionId, type, optionIndex });
    setEditValues({ [questionId]: value });
  };

  const handleEditSave = () => {
    if (!editingField || readOnly) return;

    const { questionId, type, optionIndex } = editingField;
    const newValue = editValues[questionId];

    // Check if it's a new question (local)
    const localIndex = localQuestions.findIndex(q => q.id === questionId);
    if (localIndex !== -1) {
      const updatedLocalQuestions = [...localQuestions];
      if (type === 'body') {
        updatedLocalQuestions[localIndex].body = newValue;
      } else if (type === 'option') {
        const isCorrect = updatedLocalQuestions[localIndex].options[optionIndex].includes('[correct]');
        updatedLocalQuestions[localIndex].options[optionIndex] = isCorrect ? `${newValue} [correct]` : newValue;
      }
      setLocalQuestions(updatedLocalQuestions);
    } else {
      // It's an existing question - notify parent
      const questionIndex = questions.findIndex(q => q.id === questionId);
      if (questionIndex !== -1) {
        const updatedQuestion = { ...questions[questionIndex] };
        if (type === 'body') {
          updatedQuestion.body = newValue;
        } else if (type === 'option') {
          const isCorrect = updatedQuestion.options[optionIndex].includes('[correct]');
          updatedQuestion.options = [...updatedQuestion.options];
          updatedQuestion.options[optionIndex] = isCorrect ? `${newValue} [correct]` : newValue;
        }
        // Call parent callback
        if (onUpdateQuestion) {
          onUpdateQuestion(updatedQuestion);
        }
      }
    }

    setEditingField(null);
    setEditValues({});
  };

  const handleCorrectAnswerChange = (questionId, optionIndex) => {
    if (readOnly) return;

    // Check if it's a new question (local)
    const localIndex = localQuestions.findIndex(q => q.id === questionId);
    if (localIndex !== -1) {
      const updatedLocalQuestions = [...localQuestions];
      if (updatedLocalQuestions[localIndex].options) {
        // Remove [correct] from all options
        updatedLocalQuestions[localIndex].options = updatedLocalQuestions[localIndex].options.map(opt =>
          opt.replace(' [correct]', '').replace('[correct]', '').trim()
        );
        // Add [correct] to the selected option
        updatedLocalQuestions[localIndex].options[optionIndex] = `${updatedLocalQuestions[localIndex].options[optionIndex]} [correct]`;
        setLocalQuestions(updatedLocalQuestions);
      }
    } else {
      // It's an existing question - notify parent
      const questionIndex = questions.findIndex(q => q.id === questionId);
      if (questionIndex !== -1 && questions[questionIndex].options) {
        const updatedQuestion = { ...questions[questionIndex] };
        updatedQuestion.options = updatedQuestion.options.map(opt =>
          opt.replace(' [correct]', '').replace('[correct]', '').trim()
        );
        updatedQuestion.options[optionIndex] = `${updatedQuestion.options[optionIndex]} [correct]`;

        // Call parent callback
        if (onUpdateQuestion) {
          onUpdateQuestion(updatedQuestion);
        }
      }
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

  // Merge local questions with prop questions
  const allQuestions = [...localQuestions, ...questions];

  // Filter questions based on selected topic
  let filteredQuestions = allQuestions;
  if (selectedTopicIndex !== null) {
    const selectedTopic = topics[selectedTopicIndex];

    filteredQuestions = allQuestions.filter(q => {
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
    setSelectMode(prev => {
      const newSelectMode = !prev;

      // When entering select mode, collapse all questions
      if (newSelectMode) {
        const newState = {};
        filteredQuestions.forEach(q => {
          newState[q.id] = false;
        });
        setExpandedQuestions(newState);
      } else {
        // When exiting select mode, expand all questions
        const newState = {};
        filteredQuestions.forEach(q => {
          newState[q.id] = true;
        });
        setExpandedQuestions(newState);
      }

      return newSelectMode;
    });

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

  const toggleSelectAll = () => {
    if (selectedQuestions.size === filteredQuestions.length) {
      // All are selected, so unselect all
      setSelectedQuestions(new Set());
    } else {
      // Not all are selected, so select all
      const allIds = new Set(filteredQuestions.map(q => q.id));
      setSelectedQuestions(allIds);
    }
  };

  const handleDeleteSelected = () => {
    if (selectedQuestions.size === 0) return;
    setShowDeleteDialog(true);
  };

  const performDelete = () => {
    // Filter out selected questions from local questions
    const updatedLocalQuestions = localQuestions.filter(q => !selectedQuestions.has(q.id));
    setLocalQuestions(updatedLocalQuestions);

    // Get IDs of questions to delete from the main questions array
    const questionsToDelete = Array.from(selectedQuestions).filter(id => {
      return questions.some(q => q.id === id);
    });

    // Notify parent to delete questions
    if (questionsToDelete.length > 0 && onDeleteQuestions) {
      onDeleteQuestions(questionsToDelete);
    }

    // Clear selection and close dialog
    setSelectedQuestions(new Set());
    setShowDeleteDialog(false);
  };

  const cancelDelete = () => {
    setShowDeleteDialog(false);
  };

  const handleAddQuestionClick = () => {
    if (readOnly) return;

    const newQuestion = {
      id: `new-${Date.now()}`,
      body: "New question - click to edit",
      options: [
        "Option A",
        "Option B",
        "Option C",
        "Option D [correct]"
      ],
      resource_session_domain_id: selectedTopicIndex !== null ? topics[selectedTopicIndex]?.id : null,
      page_number: selectedTopicIndex !== null ? topics[selectedTopicIndex]?.start : null,
      isNew: true
    };

    // Add to the beginning of local questions
    setLocalQuestions(prev => [newQuestion, ...prev]);

    // Expand the new question by default
    setExpandedQuestions(prev => ({
      ...prev,
      [newQuestion.id]: true
    }));

    // Notify parent if callback provided
    if (onAddQuestion) {
      onAddQuestion(newQuestion);
    }

    // Optionally start editing immediately
    setTimeout(() => {
      handleEditStart(newQuestion.id, 'body', newQuestion.body);
    }, 100);
  };

  return (
    <div className="flex-1 bg-base-100 border-2 border-primary p-6">
      <div className="mb-4 pb-3 border-b border-base-content/10">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-base font-bold uppercase tracking-wide flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            {selectedTopicIndex === null
              ? 'All Questions'
              : `Questions for ${topics[selectedTopicIndex]?.name}`}
          </h4>
        </div>

        {/* Toolbar */}
        {!readOnly && (
          <div className="flex items-center gap-2">
            <button
              className="btn btn-sm btn-ghost gap-2"
              onClick={handleAddQuestionClick}
              title="Add a new question"
              disabled={selectMode}
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
              disabled={selectMode}
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
        )}

        {/* Select Mode Toolbar */}
        {selectMode && !readOnly && (
          <div className="mt-3 pt-3 border-t border-primary/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                className="btn btn-sm btn-ghost gap-2"
                onClick={toggleSelectAll}
                title={selectedQuestions.size === filteredQuestions.length ? "Unselect all questions" : "Select all questions"}
              >
                <CheckSquare className="w-4 h-4" />
                {selectedQuestions.size === filteredQuestions.length ? "Unselect All" : "Select All"}
              </button>
              <button
                className="btn btn-sm btn-error gap-2"
                onClick={handleDeleteSelected}
                disabled={selectedQuestions.size === 0}
                title="Delete selected questions"
              >
                <Trash2 className="w-4 h-4" />
                Delete Selected
              </button>
            </div>
            <span className="text-sm text-base-content/70">
              {selectedQuestions.size} of {filteredQuestions.length} selected
            </span>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {filteredQuestions.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-base-content/20 mx-auto mb-3" />
            <p className="text-sm text-base-content/40">No questions available for this topic</p>
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
                  className={`p-4 bg-base-100 border transition-colors ${
                    isSelected ? 'border-primary bg-base-200' : 'border-base-content/10'
                  }`}
                  onMouseEnter={() => setHoveredQuestionId(q.id)}
                  onMouseLeave={() => setHoveredQuestionId(null)}
                >
                  <div className="flex items-start gap-2">
                    {/* Chevron - only visible on hover */}
                    {!readOnly && (
                      <button
                        onClick={() => toggleQuestionExpand(q.id)}
                        className={`flex-shrink-0 mt-1 transition-opacity ${
                          isHovered ? 'opacity-100' : 'opacity-0'
                        }`}
                        title={isExpanded ? "Collapse answers" : "Expand answers"}
                        disabled={selectMode}
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-gray-500" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-gray-500" />
                        )}
                      </button>
                    )}

                    {/* Select checkbox - visible in select mode */}
                    {selectMode && !readOnly && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleQuestionSelection(q.id)}
                        className="checkbox checkbox-primary checkbox-sm flex-shrink-0 mt-1"
                      />
                    )}

                    <div className="flex-1 min-w-0">
                      <p
                        className={`font-medium mb-3 px-2 py-1 transition-colors ${
                          readOnly || selectMode ? '' : 'cursor-pointer ' + (isEditingBody ? 'bg-base-200' : 'hover:bg-base-200')
                        }`}
                        onClick={() => !readOnly && !selectMode && !isEditingBody && handleEditStart(q.id, 'body', q.body)}
                        title={readOnly || selectMode ? '' : 'Click to edit question'}
                      >
                        <span className="font-bold text-primary">{index + 1}.</span>{' '}
                        {isEditingBody ? (
                          <textarea
                            ref={textareaRef}
                            value={editValues[q.id]}
                            onChange={(e) => handleValueChange(q.id, e.target.value)}
                            onBlur={handleEditSave}
                            onKeyDown={handleKeyDown}
                            className="font-medium bg-transparent border-none outline-none resize-none align-top p-0 m-0"
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
                                className={`text-sm py-1.5 px-2 flex items-center gap-2 ${
                                  isEditingOption
                                    ? (isCorrect ? 'font-semibold text-success bg-base-200' : 'bg-base-200')
                                    : (isCorrect ? 'font-semibold text-success bg-base-200' : '')
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isCorrect}
                                  onChange={() => !readOnly && !selectMode && handleCorrectAnswerChange(q.id, optIdx)}
                                  className="checkbox checkbox-success checkbox-sm flex-shrink-0"
                                  title={readOnly || selectMode ? '' : 'Mark as correct answer'}
                                  disabled={readOnly || selectMode}
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
                                    className={`bg-transparent border-none outline-none flex-1 px-1 text-sm ${
                                      isCorrect ? 'font-semibold text-success' : ''
                                    }`}
                                    style={{ margin: 0 }}
                                  />
                                ) : (
                                  <span
                                    className={`px-1 transition-colors flex-1 ${
                                      readOnly || selectMode ? '' : 'cursor-pointer hover:bg-base-200'
                                    }`}
                                    onClick={() => !readOnly && !selectMode && handleEditStart(q.id, 'option', displayText, optIdx)}
                                    title={readOnly || selectMode ? '' : 'Click to edit option'}
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

      {/* Delete Confirmation Dialog */}
      <dialog className={`modal ${showDeleteDialog ? 'modal-open' : ''}`}>
        <div className="modal-box">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <AlertCircle className="w-6 h-6 text-error" />
            Delete Selected Questions?
          </h3>
          <p className="py-4">
            Are you sure you want to delete {selectedQuestions.size} selected question{selectedQuestions.size !== 1 ? 's' : ''}? This action cannot be undone.
          </p>
          <div className="modal-action">
            <button onClick={cancelDelete} className="btn btn-ghost">
              Cancel
            </button>
            <button onClick={performDelete} className="btn btn-error">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop" onClick={cancelDelete}>
          <button>close</button>
        </form>
      </dialog>
    </div>
  );
}
