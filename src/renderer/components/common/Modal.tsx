/**
 * Modal Component - Reusable Modal Dialog
 * 
 * Provides accessible modal functionality with backdrop, keyboard handling, and focus management
 */

import React, { useEffect, useRef } from 'react'
import { cn } from '@/renderer/utils/cn'

// =============================================================================
// Modal Types
// =============================================================================

export interface ModalProps {
  readonly isOpen: boolean
  readonly onClose: () => void
  readonly title?: string
  readonly children: React.ReactNode
  readonly size?: 'sm' | 'md' | 'lg' | 'xl'
  readonly closable?: boolean
  readonly className?: string
}

// =============================================================================
// Modal Component
// =============================================================================

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  closable = true,
  className
}) => {
  const modalRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && closable) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, closable, onClose])

  // Focus management
  useEffect(() => {
    if (isOpen) {
      // Store current focus
      previousFocusRef.current = document.activeElement as HTMLElement
      
      // Focus modal
      setTimeout(() => {
        modalRef.current?.focus()
      }, 0)
    } else {
      // Restore focus
      previousFocusRef.current?.focus()
    }
  }, [isOpen])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen) return null

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl'
  }

  const handleBackdropClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget && closable) {
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black bg-opacity-50 transition-opacity" />

      {/* Modal */}
      <div
        ref={modalRef}
        className={cn(
          'relative w-full bg-white rounded-lg shadow-xl',
          'max-h-[90vh] overflow-hidden',
          sizeClasses[size],
          className
        )}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
      >
        {/* Header */}
        {(title || closable) && (
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            {title && (
              <h2 id="modal-title" className="text-lg font-semibold text-gray-900">
                {title}
              </h2>
            )}
            
            {closable && (
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
                aria-label="Close modal"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
          {children}
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// Modal Footer Component
// =============================================================================

export interface ModalFooterProps {
  readonly children: React.ReactNode
  readonly className?: string
}

export const ModalFooter: React.FC<ModalFooterProps> = ({
  children,
  className
}) => {
  return (
    <div className={cn(
      'flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50',
      className
    )}>
      {children}
    </div>
  )
}

// =============================================================================
// Modal Body Component
// =============================================================================

export interface ModalBodyProps {
  readonly children: React.ReactNode
  readonly className?: string
}

export const ModalBody: React.FC<ModalBodyProps> = ({
  children,
  className
}) => {
  return (
    <div className={cn('p-6', className)}>
      {children}
    </div>
  )
}