import React, { useEffect, useRef } from 'react';

interface ContextMenuOption {
  label: string;
  icon?: string;
  action: () => void;
  danger?: boolean;
}

interface ContextMenuProps {
  x: number;
  y: number;
  options: ContextMenuOption[];
  onClose: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, options, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  // Adjust position if menu would go off screen
  const adjustedX = x + 200 > window.innerWidth ? x - 200 : x;
  const adjustedY = y + (options.length * 50) > window.innerHeight ? y - (options.length * 50) : y;

  return (
    <div
      ref={menuRef}
      className="fixed z-50 dating-card rounded-xl p-2 shadow-2xl min-w-[200px]"
      style={{
        left: `${adjustedX}px`,
        top: `${adjustedY}px`,
      }}
    >
      {options.map((option, index) => (
        <button
          key={index}
          onClick={() => {
            option.action();
            onClose();
          }}
          className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center gap-3 ${
            option.danger
              ? 'text-red-400 hover:bg-red-500/20'
              : 'text-white hover:bg-white/10'
          }`}
        >
          {option.icon && <span className="text-lg">{option.icon}</span>}
          <span>{option.label}</span>
        </button>
      ))}
    </div>
  );
};

