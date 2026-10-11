import React from 'react';
import { cx } from '../ui';

/*
 * Answer options as an accessible radio group. The chosen option is
 * filled (printed mark) and swiped with highlighter (you / now).
 */
const OptionList = ({ options, selectedId, onSelect, labelledBy, size = 'md', reveal = false, correctId }) => (
  <div role="radiogroup" aria-labelledby={labelledBy} className="space-y-2">
    {options.map((option, idx) => {
      const letter = String.fromCharCode(65 + idx);
      const isSelected = selectedId === option.id;
      const isCorrect = reveal && option.id === correctId;
      const isWrong = reveal && isSelected && option.id !== correctId;
      return (
        <button
          key={option.id}
          type="button"
          role="radio"
          aria-checked={isSelected}
          disabled={reveal}
          onClick={() => onSelect(option.id)}
          className={cx(
            'flex w-full items-center gap-3 rounded-[5px] border bg-paper text-left',
            'transition-[border-color,background-color,scale] duration-150 active:scale-[0.99] disabled:cursor-default disabled:active:scale-100',
            size === 'sm' ? 'min-h-11 px-3 py-2' : 'min-h-[3.5rem] px-4 py-3',
            isCorrect && 'border-ink',
            isWrong && 'border-paper-rule',
            reveal && !isCorrect && !isWrong && 'border-paper-line',
            !reveal && (isSelected ? 'border-ink' : 'border-paper-rule hover:border-ink-faint hover:bg-paper-tint')
          )}
        >
          <span
            className={cx(
              'caps flex shrink-0 items-center justify-center rounded-[3px] border',
              size === 'sm' ? 'h-7 w-7 text-[13px]' : 'h-8 w-8 text-[15px]',
              isSelected ? 'border-ink bg-ink text-white' : 'border-ink-faint/60 text-ink-soft'
            )}
            aria-hidden="true"
          >
            {letter}
          </span>
          <span
            className={cx(
              'leading-snug text-ink',
              size === 'sm' ? 'text-[15px]' : 'text-[17px]',
              isSelected && !reveal && 'hl-mark font-semibold',
              isWrong && 'line-through decoration-ink-faint',
              isCorrect && 'font-bold'
            )}
          >
            {option.text}
          </span>
          {isCorrect && <span className="caps ml-auto text-[11px] text-ink">Correct</span>}
          {isWrong && <span className="caps ml-auto text-[11px] text-ink-faint">Your answer</span>}
        </button>
      );
    })}
  </div>
);

export default OptionList;
