'use client';

import { useState, useRef, useEffect } from 'react';

export default function QuestionsSectionCustomTable({ domain }) {
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef(null);
  const cellRefs = useRef({});
  const containerRef = useRef(null);

  const questions = domain?.questions || [];

  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingCell]);

  const handleDoubleClick = (rowIndex, value, event) => {
    const cell = event.currentTarget;
    const cellRect = cell.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();

    setEditingCell({
      rowIndex,
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
            <th>Question</th>
          </tr>
        </thead>
        <tbody>
          {questions.map((question, rowIndex) => (
            <tr key={question.id}>
              <td
                onDoubleClick={(e) =>
                  handleDoubleClick(rowIndex, question.body, e)
                }
                className="cursor-cell relative"
                ref={(el) => {
                  if (el) cellRefs.current[rowIndex] = el;
                }}
              >
                {question.body || ''}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {editingCell && (
        <textarea
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="absolute z-10 border-2 border-blue-500 resize-none overflow-hidden"
          style={{
            position: 'absolute',
            top: `${editingCell.position.top}px`,
            left: `${editingCell.position.left}px`,
            width: `${editingCell.position.width}px`,
            minHeight: `${editingCell.position.height}px`,
            padding: '12px',
            margin: 0,
            fontSize: 'inherit',
            fontFamily: 'inherit',
            lineHeight: 'inherit',
            boxSizing: 'border-box',
          }}
        />
      )}
    </div>
  );
}
