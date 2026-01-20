import React, { useState, useRef, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SubItem {
  title: string;
  url: string;
  icon: LucideIcon;
}

interface FlyoutSubmenuProps {
  title: string;
  icon: LucideIcon;
  subItems: SubItem[];
  isActive: (url: string) => boolean;
}

export function FlyoutSubmenu({ title, icon: Icon, subItems, isActive }: FlyoutSubmenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [openedViaClick, setOpenedViaClick] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<number | null>(null);

  // Check if any child route is active
  const hasActiveChild = subItems.some(item => isActive(item.url));

  const clearCloseTimeout = () => {
    if (closeTimeoutRef.current) {
      window.clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  };

  // Click outside detection
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        clearCloseTimeout();
        setIsOpen(false);
        setOpenedViaClick(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    clearCloseTimeout();
    setIsOpen(!isOpen);
    setOpenedViaClick(!isOpen);
  };

  const handleMouseEnter = () => {
    clearCloseTimeout();
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    // Small delay prevents the menu from closing while crossing the tiny gap
    // between the icon and the flyout panel.
    if (!openedViaClick) {
      clearCloseTimeout();
      closeTimeoutRef.current = window.setTimeout(() => {
        setIsOpen(false);
      }, 140);
    }
  };

  const handleNavClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    clearCloseTimeout();
    setIsOpen(false);
    setOpenedViaClick(false);
  };

  const getSubNavClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "flex w-full items-center gap-2.5 h-10 px-3 rounded-lg transition-all duration-[160ms] outline-none border-0",
      isActive
        ? "bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-accent-foreground))] font-medium"
        : "bg-transparent text-sidebar-foreground hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--sidebar-accent-foreground))]"
    );

  return (
    <div 
      ref={ref}
      className="relative w-16 flex items-start justify-center"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Trigger icon */}
      <button
        onClick={handleClick}
        className={cn(
          "relative flex items-center justify-center w-11 h-11 rounded-lg transition-all duration-[160ms] outline-none border-0",
          hasActiveChild
            ? "bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-accent-foreground))]"
            : "bg-transparent text-[hsl(var(--sidebar-muted))] hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--sidebar-accent-foreground))]",
          "focus-visible:shadow-[0_0_0_2px_hsl(var(--sidebar-ring))]"
        )}
        aria-label={title}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {hasActiveChild && (
          <span className="absolute left-0 top-[8px] bottom-[8px] w-[3px] bg-[hsl(var(--sidebar-primary))] rounded-r-[3px]" />
        )}
        <Icon className="h-[18px] w-[18px]" />
      </button>

      {/* Flyout panel */}
      {isOpen && (
        <div
          className="absolute left-full -ml-px top-0 z-50 min-w-[220px] animate-in fade-in-0 slide-in-from-left-1 duration-200"
          onMouseEnter={handleMouseEnter}
        >
          <div className="bg-popover border border-[hsl(var(--sidebar-border))] rounded-xl shadow-[0_10px_24px_rgba(0,0,0,0.26)] p-2">
            <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {title}
            </div>
            <div className="space-y-1">
              {subItems.map((subItem) => (
                <NavLink
                  key={subItem.url}
                  to={subItem.url}
                  onClick={handleNavClick}
                  className={getSubNavClass}
                >
                  <subItem.icon className="h-4 w-4" />
                  <span className="text-sm">{subItem.title}</span>
                </NavLink>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}