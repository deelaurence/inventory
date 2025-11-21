import { useState, useRef, useEffect } from 'react';

interface SearchableSelectProps<T> {
  options: T[];
  value: string;
  onChange: (value: string) => void;
  getOptionLabel: (option: T) => string;
  getOptionValue: (option: T) => string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  limit?: number;
}

export default function SearchableSelect<T>({
  options,
  value,
  onChange,
  getOptionLabel,
  getOptionValue,
  placeholder = 'Select...',
  disabled = false,
  className = '',
  limit = 50,
}: SearchableSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter options based on search term
  const filteredOptions = options
    .filter(option => {
      const label = getOptionLabel(option).toLowerCase();
      return label.includes(searchTerm.toLowerCase());
    })
    .slice(0, limit);

  // Get selected option label
  const selectedOption = options.find(opt => getOptionValue(opt) === value);
  const displayValue = selectedOption ? getOptionLabel(selectedOption) : '';

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full px-3 py-2 text-left border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
          disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className={value ? 'text-gray-900' : 'text-gray-500'}>
            {displayValue || placeholder}
          </span>
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'transform rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-hidden">
          <div className="p-2 border-b border-gray-200">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              autoFocus
            />
          </div>
          <div className="overflow-y-auto max-h-48">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-2 text-sm text-gray-500 text-center">No options found</div>
            ) : (
              filteredOptions.map((option) => {
                const optionValue = getOptionValue(option);
                const optionLabel = getOptionLabel(option);
                const isSelected = optionValue === value;
                return (
                  <button
                    key={optionValue}
                    type="button"
                    onClick={() => handleSelect(optionValue)}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-blue-50 transition-colors ${
                      isSelected ? 'bg-blue-100 text-blue-900 font-medium' : 'text-gray-900'
                    }`}
                  >
                    {optionLabel}
                  </button>
                );
              })
            )}
            {options.length > limit && (
              <div className="px-4 py-2 text-xs text-gray-500 text-center border-t border-gray-200">
                Showing {filteredOptions.length} of {options.length} options
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

