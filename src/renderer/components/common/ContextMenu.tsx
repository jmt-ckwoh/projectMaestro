/**
 * ContextMenu Component - Right-click Context Menu
 * 
 * Provides customizable context menu functionality for tree nodes and other components
 */

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '@/renderer/utils/cn'

// =============================================================================
// Context Menu Types
// =============================================================================

export interface ContextMenuItem {
  readonly id: string
  readonly label?: string
  readonly icon?: string
  readonly shortcut?: string
  readonly disabled?: boolean
  readonly danger?: boolean
  readonly separator?: boolean
  readonly submenu?: ContextMenuItem[]
  readonly onClick?: () => void
}

export interface ContextMenuProps {
  readonly items: ContextMenuItem[]
  readonly isOpen: boolean
  readonly position: { x: number; y: number }
  readonly onClose: () => void
  readonly className?: string
}

// =============================================================================
// Context Menu Component
// =============================================================================

export const ContextMenu: React.FC<ContextMenuProps> = ({
  items,
  isOpen,
  position,
  onClose,
  className
}) => {
  const menuRef = useRef<HTMLDivElement>(null)
  const [adjustedPosition, setAdjustedPosition] = useState(position)

  // Adjust position to keep menu within viewport
  useEffect(() => {
    if (!isOpen || !menuRef.current) return

    const menu = menuRef.current
    const rect = menu.getBoundingClientRect()
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    }

    let { x, y } = position

    // Adjust horizontal position
    if (x + rect.width > viewport.width) {
      x = viewport.width - rect.width - 8
    }
    if (x < 8) {
      x = 8
    }

    // Adjust vertical position
    if (y + rect.height > viewport.height) {
      y = viewport.height - rect.height - 8
    }
    if (y < 8) {
      y = 8
    }

    setAdjustedPosition({ x, y })
  }, [isOpen, position])

  // Handle clicks outside to close menu
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  const handleItemClick = useCallback((item: ContextMenuItem) => {
    if (item.disabled) return
    
    item.onClick?.()
    onClose()
  }, [onClose])

  if (!isOpen) return null

  return (
    <div
      ref={menuRef}
      className={cn(
        'context-menu',
        'fixed z-50 min-w-48',
        'bg-white rounded-lg shadow-lg border border-gray-200',
        'py-2',
        className
      )}
      style={{
        left: adjustedPosition.x,
        top: adjustedPosition.y
      }}
    >
      {items.map((item, index) => (
        <ContextMenuItemComponent
          key={item.id || index}
          item={item}
          onClick={handleItemClick}
        />
      ))}
    </div>
  )
}

// =============================================================================
// Context Menu Item Component
// =============================================================================

interface ContextMenuItemComponentProps {
  readonly item: ContextMenuItem
  readonly onClick: (item: ContextMenuItem) => void
}

const ContextMenuItemComponent: React.FC<ContextMenuItemComponentProps> = ({
  item,
  onClick
}) => {
  if (item.separator) {
    return <div className="my-1 border-t border-gray-200" />
  }

  return (
    <button
      className={cn(
        'context-menu-item',
        'w-full flex items-center gap-3 px-4 py-2 text-left text-sm',
        'hover:bg-gray-50 transition-colors',
        item.disabled && 'opacity-50 cursor-not-allowed',
        item.danger && 'text-red-600 hover:bg-red-50'
      )}
      onClick={() => onClick(item)}
      disabled={item.disabled}
    >
      {/* Icon */}
      {item.icon && (
        <span className="w-4 h-4 flex items-center justify-center text-gray-400">
          {item.icon}
        </span>
      )}

      {/* Label */}
      <span className="flex-1">{item.label || ''}</span>

      {/* Shortcut */}
      {item.shortcut && (
        <span className="text-xs text-gray-400 font-mono">
          {item.shortcut}
        </span>
      )}

      {/* Submenu indicator */}
      {item.submenu && (
        <span className="text-gray-400">▶</span>
      )}
    </button>
  )
}

// =============================================================================
// Hook for Context Menu State
// =============================================================================

export interface UseContextMenuReturn {
  readonly isOpen: boolean
  readonly position: { x: number; y: number }
  readonly openContextMenu: (event: React.MouseEvent) => void
  readonly closeContextMenu: () => void
}

export const useContextMenu = (): UseContextMenuReturn => {
  const [isOpen, setIsOpen] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })

  const openContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()

    setPosition({
      x: event.clientX,
      y: event.clientY
    })
    setIsOpen(true)
  }, [])

  const closeContextMenu = useCallback(() => {
    setIsOpen(false)
  }, [])

  return {
    isOpen,
    position,
    openContextMenu,
    closeContextMenu
  }
}