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
  // Optional async search handler. If provided, the component will call this
  // with the current query and display returned results instead of filtering
  // the local `options` prop. Useful for server-side searching/pagination.
  onSearch?: (query: string) => Promise<T[]>;
  // Called with the full option object when a user selects an option.
  onSelect?: (option: T) => void;
  // Pagination support
  hasMore?: boolean;
  onLoadMore?: () => void;
  loadingMore?: boolean;
  total?: number;
  page?: number;
  totalPages?: number;
  error?: boolean;
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
  limit = 100,
  onSearch,
  onSelect,
  hasMore,
  onLoadMore,
  loadingMore,
  total,
  page,
  totalPages,
  error,
}: SearchableSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [remoteOptions, setRemoteOptions] = useState<T[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Determine the source list: remoteOptions (if onSearch used) or local options
  const sourceOptions = remoteOptions !== null ? remoteOptions : options;
  // Filter options based on search term (only applies to local options)
  const filteredOptions = (remoteOptions !== null
    ? sourceOptions
    : sourceOptions.filter(option => {
      const label = getOptionLabel(option).toLowerCase();
      return label.includes(searchTerm.toLowerCase());
    })
  ).slice(0, limit);

  // Determine display value: prefer explicit `selectedLabel` (set on select),
  // otherwise try to find the option in the current source list.
  const foundInSource = sourceOptions.find(opt => getOptionValue(opt) === value);
  const displayValue = selectedLabel || (foundInSource ? getOptionLabel(foundInSource) : '');

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
        // clear remote results when closing
        setRemoteOptions(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (optionValue: string, optionLabel?: string, optionObj?: T) => {
    onChange(optionValue);
    if (optionLabel) setSelectedLabel(optionLabel);
    if (onSelect && optionObj) onSelect(optionObj);
    setIsOpen(false);
    setSearchTerm('');
    setRemoteOptions(null);
  };

  // Keep a synced label for the currently selected value so that selections
  // coming from remote results (which may not be present in the local
  // `options` prop) still display correctly after the dropdown closes.
  useEffect(() => {
    if (!value) {
      setSelectedLabel('');
      return;
    }
    const foundLocal = options.find(opt => getOptionValue(opt) === value);
    const foundRemote = remoteOptions ? remoteOptions.find(opt => getOptionValue(opt) === value) : undefined;
    const found = foundLocal || foundRemote;
    if (found) setSelectedLabel(getOptionLabel(found));
  }, [value, options, remoteOptions, getOptionLabel, getOptionValue]);

  // Debounced async search when `onSearch` is provided
  useEffect(() => {
    if (!onSearch) return;
    let mounted = true;
    const delay = 1000;
    const timer = setTimeout(async () => {
      const q = searchTerm.trim();
      try {
        setSearching(true);
        const res = await onSearch(q);
        if (mounted) setRemoteOptions(res || []);
      } catch (e) {
        if (mounted) setRemoteOptions([]);
      } finally {
        if (mounted) setSearching(false);
      }
    }, delay);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [searchTerm, onSearch]);

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full px-3 py-2 text-left border rounded-lg focus:ring-2 transition-colors ${
          disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
        } ${
          error 
            ? 'border-red-500 ring-1 ring-red-500 focus:ring-red-500 focus:border-red-500' 
            : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
        } ${className}`}
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
            {searching ? (
              <div className="px-4 py-2 text-sm text-gray-500 text-center">Searching...</div>
            ) : filteredOptions.length === 0 ? (
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
                    onClick={() => handleSelect(optionValue, optionLabel, option)}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-blue-50 transition-colors ${
                      isSelected ? 'bg-blue-100 text-blue-900 font-medium' : 'text-gray-900'
                    }`}
                  >
                    {optionLabel}
                  </button>
                );
              })
            )}
            {(sourceOptions.length > limit || total) && !hasMore && (
              <div className="px-4 py-2 text-xs text-gray-500 text-center border-t border-gray-200 bg-gray-50/50">
                <div className="flex flex-col space-y-0.5">
                  <span className="font-medium">Showing {filteredOptions.length} of {total || sourceOptions.length} results</span>
                  {page !== undefined && totalPages !== undefined && (
                    <span className="text-[10px] text-gray-400">Page {page} of {totalPages}</span>
                  )}
                </div>
              </div>
            )}
            
            {hasMore && (
              <div className="p-2 border-t border-gray-200 space-y-2 bg-gray-50/50">
                <div className="flex flex-col items-center space-y-0.5">
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">
                    Showing {sourceOptions.length} of {total || 'more'} results
                  </span>
                  {page !== undefined && totalPages !== undefined && (
                    <span className="text-[10px] text-gray-500 font-medium">Page {page} of {totalPages}</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onLoadMore) onLoadMore();
                  }}
                  disabled={loadingMore}
                  className="w-full py-2 text-sm text-blue-600 font-medium hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loadingMore ? 'Loading more...' : 'Load more results'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

