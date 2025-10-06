'use client';

import { useState, useRef, useEffect, Fragment } from 'react';
import { ChevronDown, ChevronRight, Check } from 'lucide-react';

export default function QuestionsSectionCustomTable({ domain }) {
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [selectedCells, setSelectedCells] = useState(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [activeQuestionGroup, setActiveQuestionGroup] = useState(null);
  const [lastClickedCell, setLastClickedCell] = useState(null);
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

  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingCell]);

  const handleDoubleClick = (rowIndex, value, event, type = 'question', answerId = null, questionId = null) => {
    const cell = event.currentTarget;
    const cellRect = cell.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();

    const isCorrect = value?.includes('[correct]');
    const displayValue = value?.replace('[correct]', '').trim() || '';

    setEditingCell({
      rowIndex,
      type,
      answerId,
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
  };

  const handleBlur = () => {
    // Here you would save the edited value
    const valueToSave = editingCell?.isCorrect ? `${editValue} [correct]` : editValue;
    console.log('Saving:', editingCell, valueToSave);
    setEditingCell(null);
    setEditValue('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleBlur();
    } else if (e.key === 'Escape') {
      setEditingCell(null);
      setEditValue('');
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

  const handleContextMenu = (e, rowIndex, type = 'question', optionIndex = null) => {
    e.preventDefault();

    const cellId = getCellId(rowIndex, type, optionIndex);

    // If right-clicked cell is not in selection, select it
    if (!selectedCells.has(cellId)) {
      setSelectedCells(new Set([cellId]));
    }

    setContextMenu({
      x: e.clientX,
      y: e.clientY,
    });
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

  const handleDeleteRows = () => {
    const rowIndices = getSelectedRowIndices();
    console.log('Delete rows:', rowIndices);
    // Implement delete logic here
    setContextMenu(null);
    setSelectedCells(new Set());
    setActiveQuestionGroup(null);
  };

  const handleDuplicateRows = () => {
    const rowIndices = getSelectedRowIndices();
    console.log('Duplicate rows:', rowIndices);
    // Implement duplicate logic here
    setContextMenu(null);
    setSelectedCells(new Set());
    setActiveQuestionGroup(null);
  };

  const handleDeleteOptions = () => {
    const optionIndices = getSelectedOptionIndices();
    console.log('Delete options:', optionIndices, 'from question:', activeQuestionGroup);
    // Implement delete options logic here
    setContextMenu(null);
    setSelectedCells(new Set());
    setActiveQuestionGroup(null);
  };

  const handleInsertOption = () => {
    console.log('Insert new option for question:', activeQuestionGroup);
    // Implement insert option logic here
    setContextMenu(null);
    setSelectedCells(new Set());
    setActiveQuestionGroup(null);
  };

  useEffect(() => {
    const handleClickOutside = () => {
      setContextMenu(null);
    };

    if (contextMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [contextMenu]);

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        handleMouseUp();
      }
    };

    document.addEventListener('mouseup', handleGlobalMouseUp);
    return () => document.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isDragging]);

  return (
    <div ref={containerRef} className="relative overflow-auto">
      <div className="sticky top-0 z-20 bg-base-100 border-b border-base-300 p-4 flex items-center gap-2">
        <span className="text-sm font-medium">
          {isSelectingOptions()
            ? `${getSelectedOptionIndices().length} ${getSelectedOptionIndices().length === 1 ? 'option' : 'options'} selected`
            : `${getSelectedRowIndices().length} ${getSelectedRowIndices().length === 1 ? 'row' : 'rows'} selected`
          }
        </span>
        <div className="flex gap-2">
          {isSelectingOptions() ? (
            <>
              <button onClick={handleDeleteOptions} className="btn btn-error btn-sm" disabled={selectedCells.size === 0}>
                Delete
              </button>
              <button onClick={handleInsertOption} className="btn btn-primary btn-sm" disabled={selectedCells.size === 0}>
                Insert new option
              </button>
            </>
          ) : (
            <>
              <button onClick={handleDeleteRows} className="btn btn-error btn-sm" disabled={selectedCells.size === 0}>
                Delete
              </button>
              <button onClick={handleDuplicateRows} className="btn btn-primary btn-sm" disabled={selectedCells.size === 0}>
                Duplicate
              </button>
            </>
          )}
        </div>
      </div>
      <table className="table table-zebra w-full [&_td]:border-x-0 [&_th]:border-x-0">
        <thead>
          <tr>
            <th className="w-12"></th>
            <th>Question</th>
          </tr>
        </thead>
        <tbody>
          {questions.map((question, rowIndex) => {
            const isExpanded = expandedRows.has(question.id);
            const options = question.options || [];

            return (
              <Fragment key={question.id}>
                <tr>
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
                    onContextMenu={(e) => handleContextMenu(e, rowIndex, 'question')}
                    onDoubleClick={(e) =>
                      handleDoubleClick(rowIndex, question.body, e, 'question')
                    }
                    className={`cursor-cell relative select-none ${
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
                    <td className="w-12 text-center text-xs text-base-content/50">
                      EXP
                    </td>
                    <td
                      onDoubleClick={(e) =>
                        handleDoubleClick(rowIndex, question.explanation, e, 'explanation', null, question.id)
                      }
                      className="cursor-cell italic text-base-content/70"
                    >
                      {question.explanation || ''}
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
                      <td className="w-12 text-center">
                        {isCorrect && (
                          <span className="badge badge-success badge-sm flex items-center justify-center">
                            <Check className="w-3 h-3" />
                          </span>
                        )}
                      </td>
                      <td
                        onClick={(e) => handleCellClick(e, rowIndex, 'option', optionIndex)}
                        onMouseDown={(e) => handleMouseDown(e, rowIndex, 'option', optionIndex)}
                        onMouseEnter={(e) => handleMouseEnter(e, rowIndex, 'option', optionIndex)}
                        onContextMenu={(e) => handleContextMenu(e, rowIndex, 'option', optionIndex)}
                        onDoubleClick={(e) =>
                          handleDoubleClick(
                            `${rowIndex}-${optionIndex}`,
                            option,
                            e,
                            'option',
                            optionIndex
                          )
                        }
                        className={`cursor-cell relative select-none ${
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
          className="absolute z-10 border-2 border-blue-500 resize-none overflow-hidden bg-white"
          style={{
            position: 'absolute',
            top: `${editingCell.position.top}px`,
            left: `${editingCell.position.left}px`,
            width: `${editingCell.position.width}px`,
            height: `${editingCell.position.height}px`,
            padding: '12px',
            margin: 0,
            fontSize: '14px',
            fontFamily: 'inherit',
            lineHeight: 'inherit',
            boxSizing: 'border-box',
          }}
        />
      )}

      {contextMenu && (
        <div
          className="fixed z-50 menu bg-base-100 rounded-box shadow-lg border border-base-300 w-56"
          style={{
            top: `${contextMenu.y}px`,
            left: `${contextMenu.x}px`,
          }}
        >
          {isSelectingOptions() ? (
            <>
              <li>
                <button onClick={handleDeleteOptions} className="text-error">
                  Delete ({getSelectedOptionIndices().length} {getSelectedOptionIndices().length === 1 ? 'option' : 'options'})
                </button>
              </li>
              <li>
                <button onClick={handleInsertOption}>
                  Insert new option
                </button>
              </li>
            </>
          ) : (
            <>
              <li>
                <button onClick={handleDeleteRows} className="text-error">
                  Delete ({getSelectedRowIndices().length} {getSelectedRowIndices().length === 1 ? 'row' : 'rows'})
                </button>
              </li>
              <li>
                <button onClick={handleDuplicateRows}>
                  Duplicate ({getSelectedRowIndices().length} {getSelectedRowIndices().length === 1 ? 'row' : 'rows'})
                </button>
              </li>
            </>
          )}
        </div>
      )}
    </div>
  );
}
