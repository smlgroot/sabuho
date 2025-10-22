'use client';

import { useState, useRef, useEffect, Fragment } from 'react';
import { ChevronDown, ChevronRight, Check, Minimize2 } from 'lucide-react';
import { createQuestion, deleteQuestion, updateQuestion } from '@/lib/admin/questions';

export default function QuestionsSectionCustomTable({ domain, onDomainUpdate }) {
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [originalValue, setOriginalValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [selectedCells, setSelectedCells] = useState(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [activeQuestionGroup, setActiveQuestionGroup] = useState(null);
  const [lastClickedCell, setLastClickedCell] = useState(null);
  const [isCreatingQuestion, setIsCreatingQuestion] = useState(false);
  const [isDeletingQuestions, setIsDeletingQuestions] = useState(false);
  const [dialog, setDialog] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const inputRef = useRef(null);
  const cellRefs = useRef({});
  const containerRef = useRef(null);

  const questions = domain?.questions || [];

  const toggleRow = (questionId) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  };

  const handleCollapseAll = () => {
    setExpandedRows(new Set());
  };

  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingCell]);

  const handleDoubleClick = (rowIndex, value, event, type = 'question', optionIndex = null, questionId = null) => {
    const cell = event.currentTarget;
    const cellRect = cell.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();

    const isCorrect = value?.includes('[correct]');
    const displayValue = value?.replace('[correct]', '').trim() || '';

    setEditingCell({
      rowIndex,
      type,
      optionIndex,
      questionId,
      isCorrect,
      position: {
        top: cellRect.top - containerRect.top,
        left: cellRect.left - containerRect.left,
        width: cellRect.width,
        height: cellRect.height,
      },
    });
    setEditValue(displayValue);
    setOriginalValue(displayValue);
  };

  const handleBlur = async () => {
    if (!editingCell || isSaving) return;

    // Check if value has changed
    if (editValue.trim() === originalValue.trim()) {
      setEditingCell(null);
      setEditValue('');
      setOriginalValue('');
      return;
    }

    setIsSaving(true);
    try {
      const question = questions[editingCell.rowIndex];
      let updates = {};

      if (editingCell.type === 'question') {
        // Update question body
        updates.body = editValue.trim();
      } else if (editingCell.type === 'explanation') {
        // Update explanation
        updates.explanation = editValue.trim();
      } else if (editingCell.type === 'option') {
        // Update option
        const updatedOptions = [...(question.options || [])];
        const valueToSave = editingCell.isCorrect ? `${editValue.trim()} [correct]` : editValue.trim();
        updatedOptions[editingCell.optionIndex] = valueToSave;
        updates.options = updatedOptions;
      }

      // Save to backend
      const updatedQuestion = await updateQuestion(question.id, updates);

      // Update local domain state
      const updatedQuestions = [...questions];
      updatedQuestions[editingCell.rowIndex] = {
        ...question,
        ...updatedQuestion
      };

      const updatedDomain = {
        ...domain,
        questions: updatedQuestions
      };

      if (onDomainUpdate) {
        onDomainUpdate(updatedDomain);
      }

      setEditingCell(null);
      setEditValue('');
      setOriginalValue('');
    } catch (error) {
      console.error('Failed to update question:', error);
      setDialog({
        type: 'alert',
        title: 'Error',
        message: `Failed to save changes: ${error.message}`
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleBlur();
    } else if (e.key === 'Escape') {
      setEditingCell(null);
      setEditValue('');
      setOriginalValue('');
    }
  };

  const getCellId = (rowIndex, type = 'question', optionIndex = null) => {
    return type === 'question' ? `q-${rowIndex}` : `o-${rowIndex}-${optionIndex}`;
  };

  const getRowIndexFromCellId = (cellId) => {
    if (cellId.startsWith('q-')) {
      return parseInt(cellId.split('-')[1]);
    } else if (cellId.startsWith('o-')) {
      return parseInt(cellId.split('-')[1]);
    }
    return null;
  };

  const handleCellClick = (e, rowIndex, type = 'question', optionIndex = null) => {
    if (e.detail === 2) return; // Ignore double-clicks

    const cellId = getCellId(rowIndex, type, optionIndex);

    // If clicking on an option, check if it's from the active question group
    if (type === 'option') {
      if (activeQuestionGroup !== null && activeQuestionGroup !== rowIndex) {
        // Different question group, clear selection and start new group
        setActiveQuestionGroup(rowIndex);
        setSelectedCells(new Set([cellId]));
        setLastClickedCell({ cellId, rowIndex, type, optionIndex });
        return;
      }
      setActiveQuestionGroup(rowIndex);
    } else {
      // Clicking on a question, clear option group
      setActiveQuestionGroup(null);
    }

    if (e.shiftKey && lastClickedCell) {
      // Shift-select mode: select range from last clicked cell to current cell
      const cellsInRange = new Set();

      if (type === 'option' && lastClickedCell.type === 'option' && rowIndex === lastClickedCell.rowIndex) {
        // Both are options from the same question
        const minOption = Math.min(lastClickedCell.optionIndex, optionIndex);
        const maxOption = Math.max(lastClickedCell.optionIndex, optionIndex);

        for (let i = minOption; i <= maxOption; i++) {
          cellsInRange.add(`o-${rowIndex}-${i}`);
        }
      } else if (type === 'question' && lastClickedCell.type === 'question') {
        // Both are questions
        const minRow = Math.min(lastClickedCell.rowIndex, rowIndex);
        const maxRow = Math.max(lastClickedCell.rowIndex, rowIndex);

        for (let i = minRow; i <= maxRow; i++) {
          cellsInRange.add(`q-${i}`);
        }
      } else {
        // Mixed types, just select the current cell
        cellsInRange.add(cellId);
      }

      setSelectedCells(cellsInRange);
    } else if (e.ctrlKey || e.metaKey) {
      // Multi-select mode
      setSelectedCells((prev) => {
        const next = new Set(prev);
        if (next.has(cellId)) {
          next.delete(cellId);
        } else {
          next.add(cellId);
        }
        return next;
      });
      setLastClickedCell({ cellId, rowIndex, type, optionIndex });
    } else {
      // Single select
      setSelectedCells(new Set([cellId]));
      setLastClickedCell({ cellId, rowIndex, type, optionIndex });
    }
  };

  const handleMouseDown = (e, rowIndex, type = 'question', optionIndex = null) => {
    if (e.button !== 0) return; // Only handle left mouse button

    const cellId = getCellId(rowIndex, type, optionIndex);

    // Set active question group for options
    if (type === 'option') {
      setActiveQuestionGroup(rowIndex);
    } else {
      setActiveQuestionGroup(null);
    }

    setIsDragging(true);
    setDragStart(cellId);
    setSelectedCells(new Set([cellId]));
  };

  const handleMouseEnter = (e, rowIndex, type = 'question', optionIndex = null) => {
    if (!isDragging || !dragStart) return;

    // If we're in option mode, only select options from the same question
    if (activeQuestionGroup !== null) {
      // Only allow dragging within the same question's options
      if (type !== 'option' || rowIndex !== activeQuestionGroup) return;

      const startOptionIndex = parseInt(dragStart.split('-')[2]);
      const endOptionIndex = optionIndex;

      const minOption = Math.min(startOptionIndex, endOptionIndex);
      const maxOption = Math.max(startOptionIndex, endOptionIndex);

      const cellsInRange = new Set();
      for (let i = minOption; i <= maxOption; i++) {
        cellsInRange.add(`o-${rowIndex}-${i}`);
      }

      setSelectedCells(cellsInRange);
    } else {
      // Question mode - select questions only
      const startRow = getRowIndexFromCellId(dragStart);
      const endRow = rowIndex;

      const minRow = Math.min(startRow, endRow);
      const maxRow = Math.max(startRow, endRow);

      const cellsInRange = new Set();

      // Select all question cells in the range
      for (let i = minRow; i <= maxRow; i++) {
        cellsInRange.add(`q-${i}`);
      }

      setSelectedCells(cellsInRange);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragStart(null);
  };

  const getSelectedRowIndices = () => {
    const rowIndices = new Set();
    selectedCells.forEach((cellId) => {
      const rowIndex = getRowIndexFromCellId(cellId);
      if (rowIndex !== null) {
        rowIndices.add(rowIndex);
      }
    });
    return Array.from(rowIndices).sort((a, b) => a - b);
  };

  const getSelectedOptionIndices = () => {
    const optionIndices = [];
    selectedCells.forEach((cellId) => {
      if (cellId.startsWith('o-')) {
        const parts = cellId.split('-');
        optionIndices.push(parseInt(parts[2]));
      }
    });
    return optionIndices.sort((a, b) => a - b);
  };

  const isSelectingOptions = () => {
    return activeQuestionGroup !== null;
  };

  const handleDeleteRows = async () => {
    if (isDeletingQuestions) return;

    const rowIndices = getSelectedRowIndices();
    if (rowIndices.length === 0) return;

    const questionsToDelete = rowIndices.map(index => questions[index]);
    const questionIds = questionsToDelete.map(q => q.id);

    setDialog({
      type: 'confirm',
      title: 'Delete Questions',
      message: `Are you sure you want to delete ${questionIds.length} ${questionIds.length === 1 ? 'question' : 'questions'}?`,
      onConfirm: async () => {
        setIsDeletingQuestions(true);
        setDialog(null);
        try {
          // Delete all selected questions
          await Promise.all(questionIds.map(id => deleteQuestion(id)));

          // Update the domain by removing deleted questions
          const updatedQuestions = questions.filter(q => !questionIds.includes(q.id));
          const updatedDomain = {
            ...domain,
            questions: updatedQuestions
          };

          if (onDomainUpdate) {
            onDomainUpdate(updatedDomain);
          }

          setSelectedCells(new Set());
          setActiveQuestionGroup(null);
        } catch (error) {
          console.error('Failed to delete questions:', error);
          setDialog({
            type: 'alert',
            title: 'Error',
            message: `Failed to delete questions: ${error.message}`
          });
        } finally {
          setIsDeletingQuestions(false);
        }
      }
    });
  };

  const handleDeleteOptions = async () => {
    if (isDeletingQuestions) return;

    const optionIndices = getSelectedOptionIndices();
    if (optionIndices.length === 0) return;

    const question = questions[activeQuestionGroup];
    if (!question) return;

    setDialog({
      type: 'confirm',
      title: 'Delete Options',
      message: `Are you sure you want to delete ${optionIndices.length} ${optionIndices.length === 1 ? 'option' : 'options'}?`,
      onConfirm: async () => {
        setIsDeletingQuestions(true);
        setDialog(null);
        try {
          // Remove the selected options
          const updatedOptions = question.options.filter((_, index) => !optionIndices.includes(index));

          // Update the question
          const updatedQuestion = await updateQuestion(question.id, { options: updatedOptions });

          // Update local domain state
          const updatedQuestions = [...questions];
          updatedQuestions[activeQuestionGroup] = {
            ...question,
            ...updatedQuestion
          };

          const updatedDomain = {
            ...domain,
            questions: updatedQuestions
          };

          if (onDomainUpdate) {
            onDomainUpdate(updatedDomain);
          }

          setSelectedCells(new Set());
          setActiveQuestionGroup(null);
        } catch (error) {
          console.error('Failed to delete options:', error);
          setDialog({
            type: 'alert',
            title: 'Error',
            message: `Failed to delete options: ${error.message}`
          });
        } finally {
          setIsDeletingQuestions(false);
        }
      }
    });
  };

  const handleInsertOption = async (questionIndex = null) => {
    if (isDeletingQuestions) return;

    const targetIndex = questionIndex !== null ? questionIndex : activeQuestionGroup;
    if (targetIndex === null || targetIndex === undefined) return;

    const question = questions[targetIndex];
    if (!question) return;

    setIsDeletingQuestions(true);
    try {
      // Find the position to insert: after the last selected option, or at the end
      const selectedOptions = getSelectedOptionIndices();
      let insertPosition;

      if (selectedOptions.length > 0) {
        // Insert after the last selected option
        insertPosition = Math.max(...selectedOptions) + 1;
      } else {
        // No selection, add at the end
        insertPosition = (question.options || []).length;
      }

      const updatedOptions = [...(question.options || [])];
      updatedOptions.splice(insertPosition, 0, 'New option');

      const updatedQuestion = await updateQuestion(question.id, { options: updatedOptions });

      const updatedQuestions = [...questions];
      updatedQuestions[targetIndex] = {
        ...question,
        ...updatedQuestion
      };

      const updatedDomain = {
        ...domain,
        questions: updatedQuestions
      };

      if (onDomainUpdate) {
        onDomainUpdate(updatedDomain);
      }

      // Keep activeQuestionGroup so user can continue adding options
      // Only clear selection
      setSelectedCells(new Set());
    } catch (error) {
      console.error('Failed to insert option:', error);
      setDialog({
        type: 'alert',
        title: 'Error',
        message: `Failed to insert option: ${error.message}`
      });
    } finally {
      setIsDeletingQuestions(false);
    }
  };

  const handleToggleCorrect = async (questionIndex, optionIndex) => {
    if (isSaving) return;

    const question = questions[questionIndex];
    if (!question) return;

    setIsSaving(true);
    try {
      const updatedOptions = [...(question.options || [])];
      const currentOption = updatedOptions[optionIndex];
      const isCurrentlyCorrect = currentOption?.includes('[correct]');

      // Remove [correct] from all options first
      const cleanedOptions = updatedOptions.map(opt => opt?.replace(' [correct]', '').replace('[correct]', '').trim() || '');

      // Toggle the clicked option
      if (!isCurrentlyCorrect) {
        cleanedOptions[optionIndex] = `${cleanedOptions[optionIndex]} [correct]`;
      }

      const updatedQuestion = await updateQuestion(question.id, { options: cleanedOptions });

      const updatedQuestions = [...questions];
      updatedQuestions[questionIndex] = {
        ...question,
        ...updatedQuestion
      };

      const updatedDomain = {
        ...domain,
        questions: updatedQuestions
      };

      if (onDomainUpdate) {
        onDomainUpdate(updatedDomain);
      }
    } catch (error) {
      console.error('Failed to toggle correct answer:', error);
      setDialog({
        type: 'alert',
        title: 'Error',
        message: `Failed to update correct answer: ${error.message}`
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddNewQuestion = async (insertIndex = null) => {
    if (!domain?.id || isCreatingQuestion) return;

    setIsCreatingQuestion(true);
    try {
      const newQuestion = await createQuestion({
        body: 'New question',
        domain_id: domain.id,
        options: [
          { label: 'Option 1' },
          { label: 'Option 2' },
          { label: 'Option 3' },
          { label: 'Option 4 [correct]' }
        ],
        explanation: '',
      });

      // Update the domain with the new question
      let updatedQuestions;
      if (insertIndex !== null) {
        // Insert at specific position (above the selected question)
        updatedQuestions = [
          ...(domain.questions || []).slice(0, insertIndex),
          newQuestion,
          ...(domain.questions || []).slice(insertIndex)
        ];
      } else {
        // Add at the end
        updatedQuestions = [...(domain.questions || []), newQuestion];
      }

      const updatedDomain = {
        ...domain,
        questions: updatedQuestions
      };

      if (onDomainUpdate) {
        onDomainUpdate(updatedDomain);
      }

      setSelectedCells(new Set());
      setActiveQuestionGroup(null);
    } catch (error) {
      console.error('Failed to create question:', error);
      setDialog({
        type: 'alert',
        title: 'Error',
        message: `Failed to create question: ${error.message}`
      });
    } finally {
      setIsCreatingQuestion(false);
    }
  };

  const handleAddQuestionAboveSelected = () => {
    const rowIndices = getSelectedRowIndices();
    if (rowIndices.length > 0) {
      // Insert above the first selected question
      handleAddNewQuestion(rowIndices[0]);
    } else {
      // No selection, add at the end
      handleAddNewQuestion();
    }
  };

  const handleContextMenu = (e, rowIndex, type = 'question', optionIndex = null) => {
    e.preventDefault();

    // Select the cell that was right-clicked if it's not already selected
    const cellId = getCellId(rowIndex, type, optionIndex);
    if (!selectedCells.has(cellId)) {
      setSelectedCells(new Set([cellId]));
      setLastClickedCell({ cellId, rowIndex, type, optionIndex });

      if (type === 'option') {
        setActiveQuestionGroup(rowIndex);
      } else {
        setActiveQuestionGroup(null);
      }
    }

    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      type,
      rowIndex,
      optionIndex
    });
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        handleMouseUp();
      }
    };

    document.addEventListener('mouseup', handleGlobalMouseUp);
    return () => document.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isDragging]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.context-menu')) {
        setContextMenu(null);
      }
    };

    if (contextMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [contextMenu]);

  return (
    <div ref={containerRef} className="relative overflow-auto">
      <div className="sticky top-0 z-20 bg-base-100 py-4 flex items-center gap-2">
        {isSelectingOptions() ? (
          <>
            <button onClick={() => handleInsertOption()} className="btn btn-primary btn-sm" disabled={isDeletingQuestions}>
              {isDeletingQuestions ? <span className="loading loading-spinner loading-xs"></span> : 'Insert option'}
            </button>
            <div className="divider divider-horizontal mx-0"></div>
            <button onClick={handleDeleteOptions} className="btn btn-error btn-sm" disabled={selectedCells.size === 0}>
              Delete ({getSelectedOptionIndices().length})
            </button>
          </>
        ) : (
          <>
            <button
              onClick={handleAddQuestionAboveSelected}
              className="btn btn-primary btn-sm"
              disabled={isCreatingQuestion}
            >
              {isCreatingQuestion ? <span className="loading loading-spinner loading-xs"></span> : 'Insert question'}
            </button>
            <div className="divider divider-horizontal mx-0"></div>
            <button
              onClick={handleDeleteRows}
              className="btn btn-error btn-sm"
              disabled={selectedCells.size === 0 || isDeletingQuestions}
            >
              {isDeletingQuestions ? <span className="loading loading-spinner loading-xs"></span> : `Delete (${getSelectedRowIndices().length})`}
            </button>
          </>
        )}
      </div>
      <table className="w-full border-collapse [&_td]:border [&_td]:border-base-300 [&_th]:border [&_th]:border-base-300">
        <thead>
          <tr className="bg-base-200">
            <th className="w-10 bg-base-200 text-center font-semibold text-xs">&nbsp;</th>
            <th className="w-12 bg-base-200">
              {expandedRows.size > 0 && (
                <button
                  onClick={handleCollapseAll}
                  className="btn btn-ghost btn-xs"
                  aria-label="Collapse all questions"
                >
                  <Minimize2 className="w-4 h-4" />
                </button>
              )}
            </th>
            <th className="bg-base-200">&nbsp;</th>
          </tr>
        </thead>
        <tbody>
          {questions.length === 0 ? (
            <tr>
              <td colSpan="3" className="text-center py-12">
                <div className="flex flex-col items-center gap-4">
                  <p className="text-base-content/60">No questions yet</p>
                  <button
                    onClick={handleAddNewQuestion}
                    className="btn btn-success btn-sm"
                    disabled={isCreatingQuestion}
                  >
                    {isCreatingQuestion ? <span className="loading loading-spinner loading-xs"></span> : 'Add First Question'}
                  </button>
                </div>
              </td>
            </tr>
          ) : questions.map((question, rowIndex) => {
            const isExpanded = expandedRows.has(question.id);
            const options = question.options || [];

            return (
              <Fragment key={question.id}>
                <tr>
                  <td className="w-10 bg-base-200 text-center font-semibold text-xs text-base-content/60">
                    {rowIndex + 1}
                  </td>
                  <td className="w-12">
                    <button
                      className="btn btn-ghost btn-xs"
                      onClick={() => toggleRow(question.id)}
                      aria-label={isExpanded ? 'Collapse row' : 'Expand row'}
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                  </td>
                  <td
                    onClick={(e) => handleCellClick(e, rowIndex, 'question')}
                    onMouseDown={(e) => handleMouseDown(e, rowIndex, 'question')}
                    onMouseEnter={(e) => handleMouseEnter(e, rowIndex, 'question')}
                    onDoubleClick={(e) =>
                      handleDoubleClick(rowIndex, question.body, e, 'question')
                    }
                    onContextMenu={(e) => handleContextMenu(e, rowIndex, 'question')}
                    className={`cursor-cell relative select-none hover:bg-base-300 text-sm p-2 align-top ${
                      selectedCells.has(`q-${rowIndex}`)
                        ? 'ring-2 ring-blue-500 ring-inset bg-blue-50'
                        : ''
                    }`}
                    ref={(el) => {
                      if (el) cellRefs.current[`q-${rowIndex}`] = el;
                    }}
                  >
                    {question.body || ''}
                  </td>
                </tr>
                {isExpanded && (
                  <tr className="bg-base-200/50 border-l-4 border-l-secondary">
                    <td className="w-10 bg-base-200"></td>
                    <td className="w-12 text-center text-xs text-base-content/50">
                      EXP
                    </td>
                    <td
                      onDoubleClick={(e) =>
                        handleDoubleClick(rowIndex, question.explanation, e, 'explanation', null, question.id)
                      }
                      className={`cursor-cell italic hover:bg-base-300 text-sm p-2 align-top ${question.explanation ? 'text-base-content/70' : 'text-base-content/40'}`}
                    >
                      {question.explanation || 'Add question explanation'}
                    </td>
                  </tr>
                )}
                {isExpanded && options.length === 0 && (
                  <tr className="bg-base-200 border-l-4 border-l-primary">
                    <td colSpan="3" className="text-center py-8">
                      <div className="flex flex-col items-center gap-4">
                        <p className="text-base-content/60">No answer options</p>
                        <button
                          onClick={() => handleInsertOption(rowIndex)}
                          className="btn btn-primary btn-sm"
                          disabled={isDeletingQuestions}
                        >
                          {isDeletingQuestions ? <span className="loading loading-spinner loading-xs"></span> : 'Add First Option'}
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
                {isExpanded && options.map((option, optionIndex) => {
                  const isCorrect = option?.includes('[correct]');
                  const displayText = option?.replace('[correct]', '').trim() || '';

                  return (
                    <tr
                      key={`${question.id}-option-${optionIndex}`}
                      className="bg-base-200 border-l-4 border-l-primary"
                    >
                      <td className="w-10 bg-base-200"></td>
                      <td
                        className="w-12 cursor-pointer hover:bg-base-300"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleCorrect(rowIndex, optionIndex);
                        }}
                      >
                        <div className="flex items-center justify-center">
                          {isCorrect ? (
                            <span className="badge badge-success badge-sm flex items-center justify-center">
                              <Check className="w-3 h-3" />
                            </span>
                          ) : (
                            <span className="w-4 h-4 inline-block border-2 border-base-content/30 rounded"></span>
                          )}
                        </div>
                      </td>
                      <td
                        onClick={(e) => handleCellClick(e, rowIndex, 'option', optionIndex)}
                        onMouseDown={(e) => handleMouseDown(e, rowIndex, 'option', optionIndex)}
                        onMouseEnter={(e) => handleMouseEnter(e, rowIndex, 'option', optionIndex)}
                        onDoubleClick={(e) =>
                          handleDoubleClick(
                            rowIndex,
                            option,
                            e,
                            'option',
                            optionIndex,
                            question.id
                          )
                        }
                        onContextMenu={(e) => handleContextMenu(e, rowIndex, 'option', optionIndex)}
                        className={`cursor-cell relative select-none hover:bg-base-300 text-sm p-2 align-top ${
                          selectedCells.has(`o-${rowIndex}-${optionIndex}`)
                            ? 'ring-2 ring-blue-500 ring-inset bg-blue-50'
                            : ''
                        }`}
                        ref={(el) => {
                          if (el) cellRefs.current[`o-${rowIndex}-${optionIndex}`] = el;
                        }}
                      >
                        {displayText}
                      </td>
                    </tr>
                  );
                })}
              </Fragment>
            );
          })}
        </tbody>
      </table>

      {editingCell && (
        <textarea
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          disabled={isSaving}
          className={`absolute z-10 resize-none overflow-hidden bg-white text-sm ${isSaving ? 'opacity-50 cursor-wait' : ''}`}
          style={{
            top: `${editingCell.position.top}px`,
            left: `${editingCell.position.left}px`,
            width: `${editingCell.position.width}px`,
            height: `${editingCell.position.height}px`,
            padding: '0.5rem',
            margin: 0,
            border: '2px solid rgb(59, 130, 246)',
            boxSizing: 'border-box',
            lineHeight: '1.25',
          }}
        />
      )}

      {contextMenu && (
        <div
          className="context-menu fixed z-50 bg-base-100 border border-base-300 rounded-lg shadow-lg py-2 min-w-48"
          style={{
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`,
          }}
        >
          {contextMenu.type === 'question' ? (
            <>
              <button
                className="w-full text-left px-4 py-2 hover:bg-base-200 text-sm"
                onClick={() => {
                  handleAddQuestionAboveSelected();
                  setContextMenu(null);
                }}
              >
                Insert question
              </button>
              <button
                className="w-full text-left px-4 py-2 hover:bg-base-200 text-sm text-error"
                onClick={() => {
                  handleDeleteRows();
                  setContextMenu(null);
                }}
                disabled={selectedCells.size === 0}
              >
                Delete question{getSelectedRowIndices().length > 1 ? 's' : ''} ({getSelectedRowIndices().length})
              </button>
            </>
          ) : (
            <>
              <button
                className="w-full text-left px-4 py-2 hover:bg-base-200 text-sm"
                onClick={() => {
                  handleToggleCorrect(contextMenu.rowIndex, contextMenu.optionIndex);
                  setContextMenu(null);
                }}
              >
                Toggle correct
              </button>
              <div className="divider my-1"></div>
              <button
                className="w-full text-left px-4 py-2 hover:bg-base-200 text-sm"
                onClick={() => {
                  handleInsertOption(contextMenu.rowIndex);
                  setContextMenu(null);
                }}
              >
                Insert option
              </button>
              <button
                className="w-full text-left px-4 py-2 hover:bg-base-200 text-sm text-error"
                onClick={() => {
                  handleDeleteOptions();
                  setContextMenu(null);
                }}
                disabled={selectedCells.size === 0}
              >
                Delete option{getSelectedOptionIndices().length > 1 ? 's' : ''} ({getSelectedOptionIndices().length})
              </button>
            </>
          )}
        </div>
      )}

      {dialog && (
        <dialog className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">{dialog.title}</h3>
            <p className="py-4">{dialog.message}</p>
            <div className="modal-action">
              {dialog.type === 'confirm' ? (
                <>
                  <button
                    className="btn"
                    onClick={() => setDialog(null)}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn btn-error"
                    onClick={dialog.onConfirm}
                  >
                    Delete
                  </button>
                </>
              ) : (
                <button
                  className="btn"
                  onClick={() => setDialog(null)}
                >
                  OK
                </button>
              )}
            </div>
          </div>
        </dialog>
      )}
    </div>
  );
}
