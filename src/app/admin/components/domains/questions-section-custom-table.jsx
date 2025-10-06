'use client';

import { useState, useRef, useEffect, Fragment } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

export default function QuestionsSectionCustomTable({ domain }) {
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [expandedRows, setExpandedRows] = useState(new Set());
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

  const handleDoubleClick = (rowIndex, value, event, type = 'question', answerId = null) => {
    const cell = event.currentTarget;
    const cellRect = cell.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();

    setEditingCell({
      rowIndex,
      type,
      answerId,
      position: {
        top: cellRect.top - containerRect.top,
        left: cellRect.left - containerRect.left,
        width: cellRect.width,
        height: cellRect.height,
      },
    });
    setEditValue(value || '');
  };

  const handleBlur = () => {
    // Here you would save the edited value
    console.log('Saving:', editingCell, editValue);
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

  return (
    <div ref={containerRef} className="relative overflow-auto">
      <table className="table table-zebra w-full">
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
                    onDoubleClick={(e) =>
                      handleDoubleClick(rowIndex, question.body, e, 'question')
                    }
                    className="cursor-cell relative"
                    ref={(el) => {
                      if (el) cellRefs.current[`q-${rowIndex}`] = el;
                    }}
                  >
                    {question.body || ''}
                  </td>
                </tr>
                {isExpanded && options.map((option, optionIndex) => (
                  <tr key={`${question.id}-option-${optionIndex}`} className="bg-base-200">
                    <td></td>
                    <td
                      onDoubleClick={(e) =>
                        handleDoubleClick(
                          `${rowIndex}-${optionIndex}`,
                          option,
                          e,
                          'option',
                          optionIndex
                        )
                      }
                      className="cursor-cell relative pl-12"
                      ref={(el) => {
                        if (el) cellRefs.current[`o-${rowIndex}-${optionIndex}`] = el;
                      }}
                    >
                      {option || ''}
                    </td>
                  </tr>
                ))}
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
            minHeight: `${editingCell.position.height}px`,
            padding: '12px',
            margin: 0,
            fontSize: '14px',
            fontFamily: 'inherit',
            lineHeight: 'inherit',
            boxSizing: 'border-box',
          }}
        />
      )}
    </div>
  );
}
