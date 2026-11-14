import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MapPin, ChevronDown, Search, Check, X } from 'lucide-react';
import { MOSUL_DISTRICTS, MOSUL_NEIGHBORHOOD_GROUPS } from '../../data/categories';

interface NeighborhoodSelectorProps {
  value: string;
  onChange: (neighborhood: string) => void;
  mode?: 'filter' | 'form';
  areaCounts?: Record<string, number>;
  extraAreas?: string[];
  lang?: 'ar' | 'en';
}

export const NeighborhoodSelector: React.FC<NeighborhoodSelectorProps> = ({
  value,
  onChange,
  mode = 'filter',
  areaCounts = {},
  extraAreas = [],
  lang = 'ar'
}) => {
  const isAr = lang === 'ar';
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen]);

  const unmappedExtraAreas = useMemo(() => {
    const presetSet = new Set(MOSUL_DISTRICTS);
    return extraAreas.filter((area) => area && !presetSet.has(area));
  }, [extraAreas]);

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const groups = MOSUL_NEIGHBORHOOD_GROUPS.map((g) => ({
      id: g.id,
      label: isAr ? g.labelAr : g.labelEn,
      items: g.neighborhoods.filter((n) => !q || n.toLowerCase().includes(q)),
    })).filter((g) => g.items.length > 0);

    const matchingExtra = unmappedExtraAreas.filter(
      (n) => !q || n.toLowerCase().includes(q)
    );
    if (matchingExtra.length > 0) {
      groups.push({
        id: 'other' as const,
        label: isAr ? 'مناطق أخرى في الإعلانات' : 'Other Listed Areas',
        items: matchingExtra,
      });
    }

    return groups;
  }, [query, unmappedExtraAreas, isAr]);

  const handleSelect = (selected: string) => {
    onChange(selected);
    setIsOpen(false);
    setQuery('');
  };

  const isFilteredActive = mode === 'filter' && value !== 'all';
  const displayLabel =
    mode === 'filter'
      ? value === 'all'
        ? isAr
          ? 'الحي: كل الأحياء'
          : 'Area: All'
        : isAr
        ? `الحي: ${value}`
        : value
      : value || (isAr ? 'اختر الحي / المنطقة' : 'Select neighborhood');

  return (
    <div
      ref={containerRef}
      className={`relative ${mode === 'form' ? 'w-full' : 'w-full sm:w-auto shrink-0'}`}
    >
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={
          mode === 'form'
            ? 'group w-full h-11 px-3.5 rounded-xl bg-[#EDC9AF]/35 hover:bg-white border border-[#D9AF91] text-sm text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#008080] transition-all flex items-center justify-between gap-2'
            : `group w-full sm:w-auto min-h-[42px] px-3.5 py-2 rounded-2xl text-xs font-semibold transition-all duration-200 active:scale-95 inline-flex items-center justify-between gap-2 whitespace-nowrap ${
                isFilteredActive
                  ? 'bg-[#008080] text-white shadow-[0_4px_12px_rgba(0,128,128,0.22)]'
                  : 'bg-white text-[#1E293B] border border-[#D9AF91] hover:border-[#C89875] hover:bg-[#EDC9AF]/70 hover:text-[#006666] shadow-[0_2px_10px_rgba(180,120,60,0.08)]'
              }`
        }
      >
        <span className="inline-flex items-center gap-1.5 min-w-0">
          <MapPin
            className={`w-4 h-4 shrink-0 transition-transform duration-200 ${
              isFilteredActive
                ? 'text-white scale-110'
                : 'text-[#008080] group-hover:scale-110'
            }`}
          />
          <span className="truncate max-w-[165px] sm:max-w-[210px]">{displayLabel}</span>
        </span>
        <ChevronDown
          className={`w-4 h-4 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          } ${isFilteredActive ? 'text-white/90' : 'text-[#64748B]'}`}
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          className={`animate-fade-in absolute top-full mt-2 z-50 bg-white rounded-2xl border border-[#D9AF91] shadow-[0_14px_34px_rgba(0,128,128,0.18)] overflow-hidden ${
            mode === 'form' ? 'inset-x-0 w-full' : 'w-72 sm:w-80 start-0 sm:end-0 sm:start-auto'
          }`}
        >
          {/* Search Input Inside Popover */}
          <div className="p-2.5 border-b border-[#D9AF91]/70 bg-[#EDC9AF]/65">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#008080] absolute right-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={isAr ? 'ابحث باسم الحي...' : 'Search neighborhood...'}
                autoFocus
                className="w-full h-9 pr-8 pl-8 rounded-xl bg-white border border-[#D9AF91] text-xs text-[#1E293B] placeholder:text-[#64748B]/70 focus:outline-none focus:ring-2 focus:ring-[#008080]"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute left-2 top-2 p-0.5 text-[#64748B] hover:text-[#1E293B]"
                  aria-label={isAr ? 'مسح' : 'Clear'}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto divide-y divide-[#EDC9AF]">
            {/* All Neighborhoods Option (Filter Mode Only) */}
            {mode === 'filter' && !query.trim() && (
              <button
                type="button"
                onClick={() => handleSelect('all')}
                className={`w-full px-3.5 py-2.5 text-xs flex items-center justify-between gap-2 transition-colors ${
                  value === 'all'
                    ? 'bg-teal-50 text-[#006666] font-bold'
                    : 'text-[#1E293B] hover:bg-[#EDC9AF]/55 font-semibold'
                }`}
              >
                <span className="inline-flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-[#008080]" />
                  <span>{isAr ? 'كل الأحياء' : 'All Neighborhoods'}</span>
                </span>
                {value === 'all' && <Check className="w-4 h-4 text-[#008080]" />}
              </button>
            )}

            {filteredGroups.length === 0 ? (
              <p className="p-4 text-center text-xs text-[#64748B]">
                {isAr ? 'لا توجد أحياء مطابقة' : 'No matching neighborhoods'}
              </p>
            ) : (
              filteredGroups.map((group) => (
                <div key={group.id}>
                  <div className="sticky top-0 z-10 px-3.5 py-1.5 bg-[#EDC9AF]/95 backdrop-blur-xs text-[11px] font-extrabold text-[#006666] border-b border-[#D9AF91]/60">
                    {group.label}
                  </div>
                  <div className="py-1">
                    {group.items.map((name) => {
                      const active = value === name;
                      const count = areaCounts[name] || 0;
                      return (
                        <button
                          key={`${group.id}-${name}`}
                          type="button"
                          onClick={() => handleSelect(name)}
                          className={`w-full px-3.5 py-2 text-xs flex items-center justify-between gap-2 transition-colors ${
                            active
                              ? 'bg-teal-50 text-[#006666] font-bold'
                              : 'text-[#1E293B] hover:bg-[#EDC9AF]/55 font-medium'
                          }`}
                        >
                          <span className="truncate">{name}</span>
                          <span className="inline-flex items-center gap-1.5 shrink-0">
                            {mode === 'filter' && count > 0 && (
                              <span className="px-1.5 py-0.5 rounded-md bg-[#EDC9AF] text-[#1E293B] text-[10px] font-bold tabular-nums">
                                {count}
                              </span>
                            )}
                            {active && <Check className="w-3.5 h-3.5 text-[#008080]" />}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
