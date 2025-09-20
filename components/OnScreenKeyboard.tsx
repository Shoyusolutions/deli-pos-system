'use client';

import React, { useState } from 'react';
import { X, Delete, Space, ChevronUp } from 'lucide-react';

interface OnScreenKeyboardProps {
  value: string;
  onChange: (value: string) => void;
  onClose?: () => void;
  onEnter?: () => void;
  title?: string;
  maxLength?: number;
  type?: 'text' | 'email' | 'password';
}

export default function OnScreenKeyboard({
  value,
  onChange,
  onClose,
  onEnter,
  title = 'Enter Text',
  maxLength = 50,
  type = 'text'
}: OnScreenKeyboardProps) {
  const [isShift, setIsShift] = useState(false);
  const [isCaps, setIsCaps] = useState(false);

  // Keyboard layouts
  const row1 = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
  const row2 = ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'];
  const row3 = ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'];
  const row4 = ['z', 'x', 'c', 'v', 'b', 'n', 'm'];

  const symbolsRow1 = ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')'];

  const handleKey = (key: string) => {
    if (value.length >= maxLength && key !== 'backspace') return;

    let newValue = value;
    const shouldCapitalize = isShift || isCaps;

    if (key === 'backspace') {
      newValue = value.slice(0, -1);
    } else if (key === 'space') {
      newValue = value + ' ';
    } else if (key === '@' && type === 'email') {
      newValue = value + '@';
    } else if (key === '.' && type === 'email') {
      newValue = value + '.';
    } else {
      newValue = value + (shouldCapitalize ? key.toUpperCase() : key);
    }

    onChange(newValue);

    // Auto turn off shift after typing (but not caps)
    if (isShift && key !== 'shift' && key !== 'caps' && key !== 'backspace') {
      setIsShift(false);
    }
  };

  const handleEnter = () => {
    if (onEnter) {
      onEnter();
    } else if (onClose) {
      onClose();
    }
  };

  const toggleShift = () => {
    setIsShift(!isShift);
    if (isCaps) setIsCaps(false);
  };

  const toggleCaps = () => {
    setIsCaps(!isCaps);
    if (isShift) setIsShift(false);
  };

  const displayValue = type === 'password' ? '•'.repeat(value.length) : value;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl p-3 sm:p-4 md:p-5 w-full sm:max-w-2xl md:max-w-3xl lg:max-w-4xl max-h-[90vh] sm:max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between mb-3 sm:mb-4 pb-2 border-b">
          <h3 className="text-base sm:text-lg md:text-xl font-semibold text-black">{title}</h3>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-gray-600" />
            </button>
          )}
        </div>

        {/* Display */}
        <div className="bg-gray-100 rounded-lg p-3 sm:p-4 mb-3 sm:mb-4 min-h-[40px] sm:min-h-[50px] md:min-h-[60px] flex items-center">
          <span className="text-base sm:text-lg md:text-xl font-medium text-black truncate">
            {displayValue || 'Type here...'}
          </span>
        </div>

        {/* Keyboard */}
        <div className="space-y-1 sm:space-y-2">
          {/* Numbers Row */}
          <div className="flex gap-0.5 sm:gap-1 justify-center">
            {(isShift ? symbolsRow1 : row1).map((key) => (
              <button
                key={key}
                onClick={() => handleKey(key)}
                className="flex-1 h-8 sm:h-10 md:h-12 text-xs sm:text-sm md:text-base font-medium bg-gray-50 hover:bg-gray-100 text-black rounded transition-colors active:scale-95 min-w-0"
              >
                {key}
              </button>
            ))}
          </div>

          {/* QWERTY Row */}
          <div className="flex gap-0.5 sm:gap-1 justify-center px-2 sm:px-4">
            {row2.map((key) => (
              <button
                key={key}
                onClick={() => handleKey(key)}
                className="flex-1 h-10 sm:h-12 md:h-14 text-sm sm:text-base md:text-lg font-medium bg-gray-50 hover:bg-gray-100 text-black rounded transition-colors active:scale-95 min-w-0"
              >
                {(isShift || isCaps) ? key.toUpperCase() : key}
              </button>
            ))}
          </div>

          {/* ASDF Row */}
          <div className="flex gap-0.5 sm:gap-1 justify-center px-4 sm:px-8">
            {row3.map((key) => (
              <button
                key={key}
                onClick={() => handleKey(key)}
                className="flex-1 h-10 sm:h-12 md:h-14 text-sm sm:text-base md:text-lg font-medium bg-gray-50 hover:bg-gray-100 text-black rounded transition-colors active:scale-95 min-w-0"
              >
                {(isShift || isCaps) ? key.toUpperCase() : key}
              </button>
            ))}
          </div>

          {/* ZXCV Row with Shift */}
          <div className="flex gap-0.5 sm:gap-1 justify-center items-center">
            <button
              onClick={toggleShift}
              className={`px-2 sm:px-3 md:px-4 h-10 sm:h-12 md:h-14 text-xs sm:text-sm md:text-base font-medium rounded transition-colors active:scale-95 ${
                isShift ? 'bg-blue-500 text-white' : 'bg-gray-50 hover:bg-gray-100 text-black'
              }`}
            >
              <ChevronUp className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5" />
            </button>

            {row4.map((key) => (
              <button
                key={key}
                onClick={() => handleKey(key)}
                className="flex-1 h-10 sm:h-12 md:h-14 text-sm sm:text-base md:text-lg font-medium bg-gray-50 hover:bg-gray-100 text-black rounded transition-colors active:scale-95 min-w-0"
              >
                {(isShift || isCaps) ? key.toUpperCase() : key}
              </button>
            ))}

            <button
              onClick={() => handleKey('backspace')}
              className="px-2 sm:px-3 md:px-4 h-10 sm:h-12 md:h-14 bg-gray-50 hover:bg-gray-100 text-black rounded transition-colors active:scale-95"
            >
              <Delete className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5" />
            </button>
          </div>

          {/* Space Bar Row */}
          <div className="flex gap-0.5 sm:gap-1">
            <button
              onClick={toggleCaps}
              className={`px-2 sm:px-3 md:px-4 h-10 sm:h-12 md:h-14 text-xs sm:text-sm md:text-base font-medium rounded transition-colors active:scale-95 ${
                isCaps ? 'bg-blue-500 text-white' : 'bg-gray-50 hover:bg-gray-100 text-black'
              }`}
            >
              CAPS
            </button>

            {type === 'email' && (
              <>
                <button
                  onClick={() => handleKey('@')}
                  className="px-2 sm:px-3 md:px-4 h-10 sm:h-12 md:h-14 text-sm sm:text-base md:text-lg font-medium bg-gray-50 hover:bg-gray-100 text-black rounded transition-colors active:scale-95"
                >
                  @
                </button>
                <button
                  onClick={() => handleKey('.')}
                  className="px-2 sm:px-3 md:px-4 h-10 sm:h-12 md:h-14 text-sm sm:text-base md:text-lg font-medium bg-gray-50 hover:bg-gray-100 text-black rounded transition-colors active:scale-95"
                >
                  .
                </button>
              </>
            )}

            <button
              onClick={() => handleKey('space')}
              className="flex-1 h-10 sm:h-12 md:h-14 bg-gray-50 hover:bg-gray-100 text-black rounded transition-colors active:scale-95 flex items-center justify-center"
            >
              <Space className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
            </button>

            <button
              onClick={handleEnter}
              className="px-4 sm:px-6 md:px-8 h-10 sm:h-12 md:h-14 bg-green-600 hover:bg-green-700 text-white font-semibold rounded transition-colors active:scale-95 text-xs sm:text-sm md:text-base"
            >
              Enter
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}