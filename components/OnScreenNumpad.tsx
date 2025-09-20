'use client';

import React, { useState, useEffect } from 'react';
import { X, Delete } from 'lucide-react';

interface OnScreenNumpadProps {
  value: string;
  onChange: (value: string) => void;
  onClose?: () => void;
  onEnter?: () => void;
  decimal?: boolean;
  title?: string;
  maxLength?: number;
}

export default function OnScreenNumpad({
  value,
  onChange,
  onClose,
  onEnter,
  decimal = true,
  title = 'Enter Amount',
  maxLength = 10
}: OnScreenNumpadProps) {

  // Internal state - for currency mode track cents, for integer mode track raw value
  const [rawValue, setRawValue] = useState(() => {
    if (!value) return '';

    if (decimal) {
      // Currency mode - convert dollars to cents
      const numValue = parseFloat(value);
      if (!isNaN(numValue)) {
        return Math.round(numValue * 100).toString();
      }
    } else {
      // Integer mode - use value as-is
      return value;
    }
    return '';
  });

  // Update parent when raw value changes
  useEffect(() => {
    if (rawValue === '') {
      onChange('');
    } else if (decimal) {
      // Currency mode - convert cents to dollars
      const cents = parseInt(rawValue) || 0;
      const dollars = (cents / 100).toFixed(2);
      onChange(dollars);
    } else {
      // Integer mode - pass through as-is
      onChange(rawValue);
    }
  }, [rawValue, onChange, decimal]);

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
        handleBackspace();
      } else if (e.key >= '0' && e.key <= '9') {
        handleNumber(e.key);
      } else if (e.key === '.' && decimal) {
        // For decimal inputs, ignore . key since we handle it automatically
        return;
      }
    };

    // Add event listener
    document.addEventListener('keydown', handlePhysicalKeyboard);

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handlePhysicalKeyboard);
    };
  }, [rawValue, decimal]); // Dependencies for handleNumber and handleBackspace

  const handleNumber = (num: string) => {
    if (num === '.') return; // Ignore decimal button - we handle it automatically

    // Limit the length of cents (e.g., 999999 = $9999.99)
    if (rawValue.length >= 6) return;

    // Don't allow leading zeros
    if (rawValue === '0' && num === '0') return;

    setRawValue(rawValue + num);
  };

  const handleBackspace = () => {
    setRawValue(rawValue.slice(0, -1));
  };

  const handleClear = () => {
    setRawValue('');
  };

  const handleEnter = () => {
    if (onEnter) {
      onEnter();
    } else if (onClose) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4 sm:p-6 md:p-8">
      <div className="bg-white rounded-xl shadow-2xl p-3 sm:p-4 md:p-5 w-full max-w-[95vw] sm:max-w-sm md:max-w-md lg:max-w-lg">
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
        <div className="bg-gray-100 rounded-lg p-3 sm:p-4 mb-3 sm:mb-4 min-h-[50px] sm:min-h-[60px] md:min-h-[70px] flex items-center justify-end">
          <span className="text-xl sm:text-2xl md:text-3xl font-bold text-black">
            {decimal ? `$${value || '0.00'}` : (value || '0')}
          </span>
        </div>

        {/* Number Grid */}
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
          {[7, 8, 9, 4, 5, 6, 1, 2, 3].map((num) => (
            <button
              key={num}
              onClick={() => handleNumber(num.toString())}
              className="h-12 sm:h-14 md:h-16 lg:h-20 text-lg sm:text-xl md:text-2xl font-semibold bg-gray-50 hover:bg-gray-100 text-black rounded-lg transition-colors active:scale-95"
            >
              {num}
            </button>
          ))}
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
          {decimal ? (
            <button
              onClick={() => setRawValue(rawValue + '00')}
              className="h-12 sm:h-14 md:h-16 lg:h-20 text-lg sm:text-xl md:text-2xl font-semibold bg-gray-50 hover:bg-gray-100 text-black rounded-lg transition-colors active:scale-95"
            >
              00
            </button>
          ) : (
            <button
              onClick={() => handleNumber('00')}
              className="h-12 sm:h-14 md:h-16 lg:h-20 text-lg sm:text-xl md:text-2xl font-semibold bg-gray-50 hover:bg-gray-100 text-black rounded-lg transition-colors active:scale-95"
            >
              00
            </button>
          )}

          <button
            onClick={() => handleNumber('0')}
            className="h-12 sm:h-14 md:h-16 lg:h-20 text-lg sm:text-xl md:text-2xl font-semibold bg-gray-50 hover:bg-gray-100 text-black rounded-lg transition-colors active:scale-95"
          >
            0
          </button>

          <button
            onClick={handleBackspace}
            className="h-12 sm:h-14 md:h-16 lg:h-20 text-lg sm:text-xl md:text-2xl font-semibold bg-gray-50 hover:bg-gray-100 text-black rounded-lg transition-colors active:scale-95 flex items-center justify-center"
          >
            <Delete className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-1.5 sm:gap-2 mt-2 sm:mt-3">
          <button
            onClick={handleClear}
            className="h-12 sm:h-14 md:h-16 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition-colors active:scale-95 text-sm sm:text-base md:text-lg"
          >
            Clear
          </button>

          <button
            onClick={handleEnter}
            className="h-12 sm:h-14 md:h-16 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors active:scale-95 text-sm sm:text-base md:text-lg"
          >
            Enter
          </button>
        </div>
      </div>
    </div>
  );
}