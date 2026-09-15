import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  subLabel?: string;
}

interface SearchableSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  noResultsText?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Selecciona una opción...',
  searchPlaceholder = 'Escribe para buscar...',
  noResultsText = 'No se encontraron resultados',
  disabled = false,
  className = '',
  id,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset search when opening/closing
  useEffect(() => {
    if (!isOpen) {
      setSearch('');
    }
  }, [isOpen]);

  const selectedOption = options.find((opt) => opt.value === value);

  const filteredOptions = options.filter((opt) => {
    const term = search.toLowerCase();
    const labelMatch = opt.label.toLowerCase().includes(term);
    const subLabelMatch = opt.subLabel ? opt.subLabel.toLowerCase().includes(term) : false;
    const valueMatch = opt.value.toLowerCase().includes(term);
    return labelMatch || subLabelMatch || valueMatch;
  });

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`} id={id}>
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-white text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 flex items-center justify-between cursor-pointer shadow-sm transition-all duration-200 hover:border-slate-300 disabled:opacity-60 disabled:cursor-not-allowed text-left theme-bg-surface theme-border"
      >
        <span className={selectedOption ? 'text-slate-800' : 'text-slate-400'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1.5 w-full bg-white border border-slate-200 rounded-xl shadow-lg focus:outline-none flex flex-col overflow-hidden theme-bg-surface theme-border max-h-72">
          {/* Search box overlay */}
          <div className="flex items-center px-3 py-2 border-b border-slate-100 theme-border bg-slate-50/50">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0 mr-2" />
            <input
              type="text"
              autoFocus
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs bg-transparent border-none outline-none text-slate-700 placeholder-slate-400 py-0.5 font-medium"
            />
          </div>

          {/* List items */}
          <div className="overflow-y-auto max-h-52 py-1 select-none">
            {filteredOptions.length === 0 ? (
              <div className="px-3.5 py-3 text-xs text-slate-400 text-center font-medium italic">
                {noResultsText}
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <div
                    key={opt.value}
                    onClick={() => handleSelect(opt.value)}
                    className={`px-3.5 py-2.5 text-xs cursor-pointer transition-colors flex flex-col justify-center font-semibold ${
                      isSelected
                        ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="truncate">{opt.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0 ml-1.5" />}
                    </div>
                    {opt.subLabel && (
                      <span className="text-[10px] text-slate-400 font-normal mt-0.5 font-mono truncate">
                        {opt.subLabel}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
