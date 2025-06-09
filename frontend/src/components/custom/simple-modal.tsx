"use client";

import React, { useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SimpleModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
  showCloseButton?: boolean;
  showFooter?: boolean;
  footerContent?: React.ReactNode;
}

export function SimpleModal({
  isOpen,
  onClose,
  title,
  children,
  className,
  showCloseButton = true,
  showFooter = true,
  footerContent
}: SimpleModalProps) {
  
  // Handle ESC key to close the modal
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (isOpen && event.key === 'Escape') {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleEsc);
    
    // Add overflow hidden to body when modal is open
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      window.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);
  
  // Handle click outside to close the modal
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div 
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
      onClick={handleOverlayClick}
    >
      <div 
        className={cn(
          "bg-white dark:bg-slate-950 rounded-lg p-6 shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto",
          "border border-slate-200 dark:border-slate-800",
          className
        )}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          {title && <h2 className="text-xl font-semibold">{title}</h2>}
          {showCloseButton && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onClose} 
              className="h-8 w-8 rounded-full"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        
        <div className="py-2">{children}</div>
        
        {showFooter && (
          <div className="flex justify-end space-x-2 mt-6">
            {footerContent ? (
              footerContent
            ) : (
              <Button variant="outline" onClick={onClose}>Close</Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
