// components/Header.tsx - Header Component

import React from 'react';
import { Info, Key, Settings } from 'lucide-react';

interface HeaderProps {
  onInfoClick: () => void;
  onAPIKeysClick: () => void;
  onSettingsClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  onInfoClick, 
  onAPIKeysClick, 
  onSettingsClick 
}) => {
  return (
    <div className="flex items-center justify-between px-4 sm:px-8 lg:px-12 pt-4 sm:pt-6 pb-4 border-b border-[var(--divider)]">
      <div className="flex items-center gap-4 sm:gap-8 read-only:cursor-default disabled:cursor-default">
        <h1 className="text-2xl sm:text-3xl font-outfit leading-none flex items-center select-none cursor-default">
          <span className="text-[#736C9E] tracking-[0.01em] font-normal">Thread</span>
          <span className="text-[#505C88] tracking-[-0.03em] font-medium">Link</span>
        </h1>
        <p className="text-sm font-outfit font-normal text-[#7D87AD] opacity-75 whitespace-nowrap hidden lg:block select-none read-only:pointer-events-none disabled:pointer-events-none">
          Condense, copy, continue — without breaking flow.
        </p>
      </div>
      <div className="flex gap-1 sm:gap-2">
        <button 
          onClick={onInfoClick}
          aria-label="Open help documentation"
          className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-md bg-[var(--card-bg)] border border-[var(--divider)] text-[var(--text-primary)] opacity-80 hover:opacity-100 transition-opacity select-none cursor-pointer"
        >
          <Info size={18} className="opacity-50 sm:hidden" />
          <Info size={20} className="opacity-50 hidden sm:block" />
        </button>
        <button 
          onClick={onAPIKeysClick}
          aria-label="Manage API keys"
          className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-md bg-[var(--card-bg)] border border-[var(--divider)] text-[var(--text-primary)] opacity-80 hover:opacity-100 transition-opacity select-none cursor-pointer"
        >
          <Key size={18} className="opacity-50 sm:hidden" />
          <Key size={20} className="opacity-50 hidden sm:block" />
        </button>
        <button 
          onClick={onSettingsClick}
          aria-label="Open settings"
          className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-md bg-[var(--card-bg)] border border-[var(--divider)] text-[var(--text-primary)] opacity-80 hover:opacity-100 transition-opacity select-none cursor-pointer"
        >
          <Settings size={18} className="opacity-50 sm:hidden" />
          <Settings size={20} className="opacity-50 hidden sm:block" />
        </button>
      </div>
    </div>
  );
};

export default Header;
