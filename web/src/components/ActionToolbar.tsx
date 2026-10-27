import React, { useState, useRef, useEffect } from 'react';
import { ToolbarButtonDef, OpenFile } from '../types';
import { Play, ChevronDown, Check, Globe, Server, Terminal, Sparkles, Command } from 'lucide-react';

interface ActionToolbarProps {
  buttons: ToolbarButtonDef[];
  currentFile: OpenFile | null;
  accentColor?: string;
}

// Matches filename against glob patterns (e.g. Makefile, *.mk, .html, docker-compose*.yml)
function matchesPattern(filename: string, pattern: string): boolean {
  const f = filename.toLowerCase();
  const p = pattern.toLowerCase().trim();
  if (p === f) return true;
  if (p.startsWith('*.')) {
    const ext = p.slice(1);
    return f.endsWith(ext);
  }
  if (p.startsWith('.')) {
    return f.endsWith(p);
  }
  if (p.includes('*')) {
    const parts = p.split('*');
    if (parts.length === 2) {
      return f.startsWith(parts[0]) && f.endsWith(parts[1]);
    }
  }
  return false;
}

export const ActionToolbar: React.FC<ActionToolbarProps> = ({
  buttons,
  currentFile,
  accentColor = '#00d2b4',
}) => {
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [activeOptions, setActiveOptions] = useState<Record<string, string>>({});
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdownId(null);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter buttons matching the active file context
  const activeButtons = buttons.filter((btn) => {
    if (btn.visible && !btn.visible(currentFile)) {
      return false;
    }
    if (btn.fileMatches && btn.fileMatches.length > 0) {
      if (!currentFile) return false;
      const matched = btn.fileMatches.some(
        (pat) => matchesPattern(currentFile.name, pat) || matchesPattern(currentFile.path, pat)
      );
      if (!matched) return false;
    }
    return true;
  });

  // Global F5 shortcut support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F5' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        // If there's an active split button or default action button
        const defaultBtn = activeButtons.find(
          (b) => b.shortcut === 'F5' || (b.options && b.options.length > 0)
        );
        if (defaultBtn) {
          e.preventDefault();
          const selectedOptId = activeOptions[defaultBtn.id] || defaultBtn.options?.[0]?.id;
          defaultBtn.onClick(selectedOptId);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeButtons, activeOptions]);

  // Zero-Clutter Principle: If no buttons match the current file, render nothing!
  if (activeButtons.length === 0) {
    return null;
  }

  const renderIcon = (iconName?: string) => {
    switch (iconName) {
      case 'globe':
        return <Globe size={12} />;
      case 'server':
        return <Server size={12} />;
      case 'terminal':
        return <Terminal size={12} />;
      case 'sparkles':
        return <Sparkles size={12} />;
      case 'command':
        return <Command size={12} />;
      default:
        if (iconName && iconName.length <= 4) {
          return <span className="text-xs">{iconName}</span>;
        }
        return <Play size={11} fill="currentColor" />;
    }
  };

  return (
    <div
      ref={dropdownRef}
      className="flex items-center space-x-1.5 pl-2 relative select-none animate-in fade-in duration-150"
    >
      {activeButtons.map((btn) => {
        const hasOptions = btn.options && btn.options.length > 0;
        const currentOptId = activeOptions[btn.id] || btn.activeOptionId || btn.options?.[0]?.id;
        const activeOption = btn.options?.find((o) => o.id === currentOptId) || btn.options?.[0];

        // 1. Split Action Button [ ▶ Run: build | ▾ ]
        if (hasOptions && activeOption) {
          const isDropdownOpen = openDropdownId === btn.id;
          const displayLabel = btn.label.includes(':')
            ? btn.label.split(':')[0] + `: ${activeOption.label}`
            : `${btn.label} ${activeOption.label}`;

          return (
            <div key={btn.id} className="relative inline-flex items-center rounded-lg shadow-sm">
              {/* Main Action Trigger in 1 click */}
              <button
                type="button"
                onClick={() => btn.onClick(activeOption.id)}
                title={btn.title || `${displayLabel} (${activeOption.shortcut || 'F5'})`}
                className="flex items-center space-x-1.5 px-2.5 py-1 text-xs font-semibold rounded-l-lg bg-accent text-gray-900 hover:opacity-90 active:scale-[0.98] transition cursor-pointer"
                style={{ backgroundColor: accentColor }}
              >
                {renderIcon(activeOption.icon || btn.icon)}
                <span>{displayLabel}</span>
              </button>

              {/* Dropdown Toggle Arrow */}
              <button
                type="button"
                onClick={() => setOpenDropdownId(isDropdownOpen ? null : btn.id)}
                title="Переключить действие / цель"
                className="px-1.5 py-1 text-xs rounded-r-lg bg-accent text-gray-900 hover:opacity-90 border-l border-black/15 transition cursor-pointer flex items-center justify-center"
                style={{ backgroundColor: accentColor }}
              >
                <ChevronDown
                  size={12}
                  className={`transition-transform duration-150 ${isDropdownOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {/* Split Action Dropdown Menu */}
              {isDropdownOpen && (
                <div
                  className="absolute right-0 top-full mt-1.5 w-56 bg-[#161b22] border border-[#30363d] rounded-xl shadow-2xl py-1 z-50 animate-in fade-in slide-in-from-top-1 duration-150"
                  style={{ boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)' }}
                >
                  <div className="px-3 py-1.5 border-b border-[#21262d] text-[10px] uppercase font-semibold text-[#8b949e] tracking-wider">
                    Выберите действие ({currentFile?.name})
                  </div>
                  <div className="max-h-56 overflow-y-auto py-1">
                    {btn.options?.map((opt) => {
                      const isSelected = opt.id === activeOption.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            setActiveOptions((prev) => ({ ...prev, [btn.id]: opt.id }));
                            btn.onSelectOption?.(opt.id);
                            btn.onClick(opt.id);
                            setOpenDropdownId(null);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-1.5 text-xs text-left transition ${
                            isSelected
                              ? 'bg-accent/15 text-white font-medium border-l-2 border-accent'
                              : 'text-[#c9d1d9] hover:bg-white/5 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center space-x-2 truncate">
                            {renderIcon(opt.icon || btn.icon)}
                            <span className="truncate">{opt.label}</span>
                          </div>
                          <div className="flex items-center space-x-2 shrink-0">
                            {opt.shortcut && (
                              <span className="text-[10px] text-[#8b949e] font-mono bg-black/40 px-1.5 py-0.5 rounded border border-[#30363d]">
                                {opt.shortcut}
                              </span>
                            )}
                            {isSelected && <Check size={13} className="text-accent" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        }

        // 2. Standard 1-click Button [ 🌐 Live Preview ]
        return (
          <button
            key={btn.id}
            type="button"
            onClick={() => btn.onClick()}
            title={btn.title || btn.label}
            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-accent text-gray-900 hover:opacity-90 shadow-sm transition flex items-center space-x-1.5 cursor-pointer active:scale-[0.98]"
            style={{ backgroundColor: accentColor }}
          >
            {renderIcon(btn.icon)}
            <span>{btn.label}</span>
          </button>
        );
      })}
    </div>
  );
};
