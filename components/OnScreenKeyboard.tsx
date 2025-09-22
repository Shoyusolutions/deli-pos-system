'use client';

import React, { useState, useEffect } from 'react';
import { X, Delete, Space, ChevronUp, Eye, EyeOff } from 'lucide-react';

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
  const [showPassword, setShowPassword] = useState(false);

  // Physical keyboard support
  useEffect(() => {
    const handlePhysicalKeyboard = (e: KeyboardEvent) => {
      // Prevent default for most keys to avoid browser behavior
      if (e.key !== 'Tab' && e.key !== 'F5' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
      }

      if (e.key === 'Enter') {
        handleEnter();
      } else if (e.key === 'Escape') {
        if (onClose) onClose();
      } else if (e.key === 'Backspace') {
        handleKey('backspace');
      } else if (e.key === ' ') {
        handleKey('space');
      } else if (e.key.length === 1) {
        // Single character keys (letters, numbers, symbols)
        handleKey(e.key.toLowerCase());
      }
    };

    // Add event listener
    document.addEventListener('keydown', handlePhysicalKeyboard);

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handlePhysicalKeyboard);
    };
  }, [value, maxLength, isShift, isCaps, type]); // Dependencies for handleKey

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
      // Handle both physical keyboard input and on-screen keyboard
      const charToAdd = shouldCapitalize ? key.toUpperCase() : key;
      newValue = value + charToAdd;
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

  const displayValue = type === 'password' && !showPassword ? '•'.repeat(value.length) : value;

  return (
    <div className="fixed inset-0 flex items-end justify-center z-[99999] pointer-events-none">
      <div className="bg-white rounded-t-2xl shadow-2xl p-2 sm:p-3 md:p-4 w-full max-h-[75vh] sm:max-h-[80vh] overflow-y-auto pointer-events-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-2 sm:mb-3 pb-1 sm:pb-2 border-b">
          <h3 className="text-sm sm:text-base md:text-lg font-semibold text-black">{title}</h3>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 sm:w-5 sm:h-5 md:w-6 md:h-6 text-black" />
            </button>
          )}
        </div>

        {/* Display with password toggle */}
        <div className="bg-gray-100 rounded-lg p-2 sm:p-3 mb-2 sm:mb-3 min-h-[35px] sm:min-h-[45px] md:min-h-[55px] flex items-center justify-between">
          <span className="text-sm sm:text-base md:text-lg font-medium text-black truncate flex-1">
            {displayValue || <span className="text-gray-400">Type here...</span>}
          </span>
          {type === 'password' && value && (
            <button
              onClick={() => setShowPassword(!showPassword)}
              className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors ml-2"
              type="button"
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4 sm:w-5 sm:h-5 text-black" />
              ) : (
                <Eye className="w-4 h-4 sm:w-5 sm:h-5 text-black" />
              )}
            </button>
          )}
        </div>

        {/* Keyboard */}
        <div className="space-y-1 sm:space-y-2">
          {/* Numbers Row */}
          <div className="flex gap-0.5 justify-center">
            {(isShift ? symbolsRow1 : row1).map((key) => (
              <button
                key={key}
                onClick={() => handleKey(key)}
                className="flex-1 h-9 sm:h-10 md:h-12 text-sm sm:text-sm md:text-base font-medium bg-gray-50 hover:bg-gray-100 active:bg-gray-200 text-black rounded transition-colors touch-manipulation min-w-0"
              >
                {key}
              </button>
            ))}
          </div>

          {/* QWERTY Row */}
          <div className="flex gap-0.5 justify-center">
            {row2.map((key) => (
              <button
                key={key}
                onClick={() => handleKey(key)}
                className="flex-1 h-10 sm:h-11 md:h-13 text-base sm:text-base md:text-lg font-medium bg-gray-50 hover:bg-gray-100 active:bg-gray-200 text-black rounded transition-colors touch-manipulation min-w-0"
              >
                {(isShift || isCaps) ? key.toUpperCase() : key}
              </button>
            ))}
          </div>

          {/* ASDF Row */}
          <div className="flex gap-0.5 justify-center">
            {row3.map((key) => (
              <button
                key={key}
                onClick={() => handleKey(key)}
                className="flex-1 h-10 sm:h-11 md:h-13 text-base sm:text-base md:text-lg font-medium bg-gray-50 hover:bg-gray-100 active:bg-gray-200 text-black rounded transition-colors touch-manipulation min-w-0"
              >
                {(isShift || isCaps) ? key.toUpperCase() : key}
              </button>
            ))}
          </div>

          {/* ZXCV Row with Shift */}
          <div className="flex gap-0.5 justify-center items-center">
            <button
              onClick={toggleShift}
              className={`px-2 sm:px-3 md:px-4 h-10 sm:h-11 md:h-13 text-xs sm:text-sm md:text-base font-medium rounded transition-colors touch-manipulation ${
                isShift ? 'bg-blue-500 text-white' : 'bg-gray-50 hover:bg-gray-100 active:bg-gray-200 text-black'
              }`}
            >
              <ChevronUp className="w-4 h-4 sm:w-4 sm:h-4 md:w-5 md:h-5" />
            </button>

            {row4.map((key) => (
              <button
                key={key}
                onClick={() => handleKey(key)}
                className="flex-1 h-10 sm:h-11 md:h-13 text-base sm:text-base md:text-lg font-medium bg-gray-50 hover:bg-gray-100 active:bg-gray-200 text-black rounded transition-colors touch-manipulation min-w-0"
              >
                {(isShift || isCaps) ? key.toUpperCase() : key}
              </button>
            ))}

            <button
              onClick={() => handleKey('backspace')}
              className="px-2 sm:px-3 md:px-4 h-10 sm:h-11 md:h-13 bg-gray-50 hover:bg-gray-100 active:bg-gray-200 text-black rounded transition-colors touch-manipulation"
            >
              <Delete className="w-4 h-4 sm:w-4 sm:h-4 md:w-5 md:h-5" />
            </button>
          </div>

          {/* Space Bar Row */}
          <div className="flex gap-0.5">
            <button
              onClick={toggleCaps}
              className={`px-2 sm:px-3 md:px-4 h-10 sm:h-11 md:h-13 text-xs sm:text-sm md:text-base font-medium rounded transition-colors touch-manipulation ${
                isCaps ? 'bg-blue-500 text-white' : 'bg-gray-50 hover:bg-gray-100 active:bg-gray-200 text-black'
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
              className="flex-1 h-10 sm:h-11 md:h-13 bg-gray-50 hover:bg-gray-100 active:bg-gray-200 text-black rounded transition-colors touch-manipulation flex items-center justify-center"
            >
              <Space className="w-5 h-5 sm:w-5 sm:h-5 md:w-6 md:h-6" />
            </button>

            <button
              onClick={handleEnter}
              className="px-3 sm:px-5 md:px-7 h-10 sm:h-11 md:h-13 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-semibold rounded transition-colors touch-manipulation text-sm sm:text-sm md:text-base"
            >
              Enter
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}