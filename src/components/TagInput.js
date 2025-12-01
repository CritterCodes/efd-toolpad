"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Close as XIcon, Add as PlusIcon } from '@mui/icons-material';
import { Box, Chip, TextField, IconButton } from '@mui/material';

const TagInput = ({ 
  value = [], 
  onChange, 
  suggestions = [], 
  placeholder = "Type to add tags...",
  name,
  className = "",
  error = null,
  onAddNewSuggestion = null,
  restrictedMode = false // New prop to only allow selection from suggestions
}) => {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState([]);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);

  useEffect(() => {
    if (inputValue.trim()) {
      const filtered = suggestions.filter(suggestion =>
        suggestion.toLowerCase().includes(inputValue.toLowerCase()) &&
        !value.includes(suggestion)
      );
      setFilteredSuggestions(filtered);
      setShowSuggestions(true);
      setActiveSuggestionIndex(-1);
    } else if (restrictedMode && showSuggestions) {
      // In restricted mode, show all available options when focused
      const availableOptions = suggestions.filter(suggestion => !value.includes(suggestion));
      setFilteredSuggestions(availableOptions);
    } else {
      setShowSuggestions(false);
      setFilteredSuggestions([]);
    }
  }, [inputValue, suggestions, value, restrictedMode, showSuggestions]);

  const addTag = (tag) => {
    const trimmedTag = tag.trim();
    if (trimmedTag && !value.includes(trimmedTag)) {
      // In restricted mode, only allow tags from suggestions
      if (restrictedMode && !suggestions.includes(trimmedTag)) {
        return;
      }
      
      const newTags = [...value, trimmedTag];
      onChange(newTags);
      
      // If it's a new suggestion not in the original list, call the callback
      if (!suggestions.includes(trimmedTag) && onAddNewSuggestion && !restrictedMode) {
        onAddNewSuggestion(trimmedTag);
      }
    }
    
    // In restricted mode, keep the dropdown open and clear input
    if (restrictedMode) {
      setInputValue('');
      // Update filtered suggestions to remove the newly selected item
      const availableOptions = suggestions.filter(suggestion => 
        !value.includes(suggestion) && suggestion !== trimmedTag
      );
      setFilteredSuggestions(availableOptions);
      // Keep the dropdown open
      setShowSuggestions(availableOptions.length > 0);
    } else {
      setInputValue('');
      setShowSuggestions(false);
    }
  };

  const removeTag = (indexToRemove) => {
    const newTags = value.filter((_, index) => index !== indexToRemove);
    onChange(newTags);
    
    // In restricted mode, update the available options after removal
    if (restrictedMode) {
      const availableOptions = suggestions.filter(suggestion => !newTags.includes(suggestion));
      setFilteredSuggestions(availableOptions);
      // If the dropdown was open, keep it open with updated options
      if (showSuggestions || document.activeElement === inputRef.current) {
        setShowSuggestions(availableOptions.length > 0);
      }
    }
  };

  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (activeSuggestionIndex >= 0 && filteredSuggestions[activeSuggestionIndex]) {
        addTag(filteredSuggestions[activeSuggestionIndex]);
      } else if (inputValue.trim() && !restrictedMode) {
        // Only allow free-form entry if not in restricted mode
        addTag(inputValue);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (filteredSuggestions.length > 0) {
        setActiveSuggestionIndex(prev => 
          prev < filteredSuggestions.length - 1 ? prev + 1 : 0
        );
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (filteredSuggestions.length > 0) {
        setActiveSuggestionIndex(prev => 
          prev > 0 ? prev - 1 : filteredSuggestions.length - 1
        );
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setActiveSuggestionIndex(-1);
      setInputValue('');
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      removeTag(value.length - 1);
      // In restricted mode, reopen dropdown after removing a tag
      if (restrictedMode) {
        const availableOptions = suggestions.filter(suggestion => !value.includes(suggestion));
        setFilteredSuggestions(availableOptions);
        setShowSuggestions(availableOptions.length > 0);
      }
    } else if (e.key === ',' || e.key === 'Tab') {
      e.preventDefault();
      if (inputValue.trim() && !restrictedMode) {
        addTag(inputValue);
      }
    }
  };

  const handleSuggestionClick = (suggestion) => {
    addTag(suggestion);
    // In restricted mode, keep focus on the input to allow for more selections
    if (restrictedMode) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    } else {
      inputRef.current?.focus();
    }
  };

  const handleInputFocus = () => {
    if (restrictedMode) {
      // In restricted mode, always show available options on focus
      const availableOptions = suggestions.filter(suggestion => !value.includes(suggestion));
      setFilteredSuggestions(availableOptions);
      setShowSuggestions(true);
    } else if (inputValue.trim()) {
      setShowSuggestions(true);
    }
  };

  const handleInputBlur = (e) => {
    // In restricted mode, be more careful about when to close the dropdown
    if (restrictedMode) {
      // Only close if clicking outside the entire component
      setTimeout(() => {
        if (!suggestionsRef.current?.contains(document.activeElement) && 
            document.activeElement !== inputRef.current) {
          setShowSuggestions(false);
        }
      }, 150);
    } else {
      // Delay hiding suggestions to allow for clicks
      setTimeout(() => {
        if (!suggestionsRef.current?.contains(document.activeElement)) {
          setShowSuggestions(false);
        }
      }, 150);
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Input Container */}
      <div className={`flex flex-wrap gap-1 p-2 border rounded-md bg-white min-h-[42px] ${
        error ? 'border-red-500' : 'border-gray-300'
      } focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent`}>
        
        {/* Selected Tags */}
        {value.map((tag, index) => (
          <span
            key={index}
            className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-full border border-blue-200"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(index)}
              className="hover:bg-blue-200 rounded-full p-0.5 transition-colors"
            >
              <XIcon style={{ fontSize: 12 }} />
            </button>
          </span>
        ))}

        {/* Input Field */}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleInputKeyDown}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          placeholder={value.length === 0 ? placeholder : ""}
          className="flex-1 min-w-[120px] border-none outline-none bg-transparent text-gray-900 placeholder-gray-500"
          name={name}
        />
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && (filteredSuggestions.length > 0 || (inputValue.trim() && !restrictedMode)) && (
        <div
          ref={suggestionsRef}
          className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto"
        >
          {/* Existing Suggestions */}
          {filteredSuggestions.map((suggestion, index) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => handleSuggestionClick(suggestion)}
              className={`w-full text-left px-3 py-2 hover:bg-gray-100 transition-colors ${
                index === activeSuggestionIndex ? 'bg-gray-100' : ''
              }`}
            >
              {suggestion}
            </button>
          ))}

          {/* Add Custom Option - only show if not in restricted mode */}
          {!restrictedMode && inputValue.trim() && 
           !suggestions.some(s => s.toLowerCase() === inputValue.toLowerCase()) &&
           !filteredSuggestions.some(s => s.toLowerCase() === inputValue.toLowerCase()) && (
            <button
              type="button"
              onClick={() => addTag(inputValue)}
              className={`w-full text-left px-3 py-2 hover:bg-gray-100 transition-colors border-t border-gray-200 flex items-center gap-2 text-gray-600 ${
                activeSuggestionIndex === filteredSuggestions.length ? 'bg-gray-100' : ''
              }`}
            >
              <PlusIcon style={{ fontSize: 16 }} />
              Add &quot;{inputValue}&quot;
            </button>
          )}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <p className="text-red-500 text-sm mt-1">{error}</p>
      )}
    </div>
  );
};

export default TagInput;