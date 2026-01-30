'use client'

import { useState, useEffect, useRef } from 'react'
import { Editor } from '@tiptap/core'
import {
  Sparkles,
  Wand2,
  FileText,
  Check,
  X,
  Loader2,
  ChevronDown,
  Languages,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface AIBubbleMenuProps {
  editor: Editor
}

type AIAction = 'improve' | 'fix' | 'summarize' | 'expand' | 'translate'

type MenuState = 'hidden' | 'menu' | 'loading' | 'suggestion'

export function AIBubbleMenu({ editor }: AIBubbleMenuProps) {
  const [menuState, setMenuState] = useState<MenuState>('hidden')
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const [suggestion, setSuggestion] = useState<string>('')
  const [selectionRange, setSelectionRange] = useState<{ from: number; to: number } | null>(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const isInteractingRef = useRef(false)

  // Listen to selection changes
  useEffect(() => {
    const handleSelectionUpdate = () => {
      // Don't update if interacting with menu or in special states
      if (isInteractingRef.current || dropdownOpen || menuState === 'loading' || menuState === 'suggestion') {
        return
      }

      const { from, to } = editor.state.selection
      const hasSelection = from !== to

      if (!hasSelection) {
        setMenuState('hidden')
        setSelectionRange(null)
        return
      }

      let text = ''
      try {
        text = editor.state.doc.textBetween(from, to, ' ')
      } catch {
        setMenuState('hidden')
        return
      }

      const shouldShow = text.trim().length >= 3

      if (shouldShow) {
        try {
          const coords = editor.view.coordsAtPos(from)
          setPosition({
            top: coords.top - 50,
            left: Math.max(10, coords.left),
          })
          setSelectionRange({ from, to })
          setMenuState('menu')
        } catch {
          // Ignore position errors
        }
      } else {
        setMenuState('hidden')
        setSelectionRange(null)
      }
    }

    editor.on('selectionUpdate', handleSelectionUpdate)
    
    // Also listen to blur to hide menu when clicking outside editor
    const handleBlur = () => {
      // Small delay to allow clicking on menu
      setTimeout(() => {
        if (!isInteractingRef.current && !dropdownOpen && menuState === 'menu') {
          setMenuState('hidden')
        }
      }, 150)
    }
    
    editor.on('blur', handleBlur)

    return () => {
      editor.off('selectionUpdate', handleSelectionUpdate)
      editor.off('blur', handleBlur)
    }
  }, [editor, dropdownOpen, menuState])

  const handleAIAction = async (action: AIAction) => {
    if (!selectionRange) return

    const { from, to } = selectionRange
    let selectedText = ''
    try {
      selectedText = editor.state.doc.textBetween(from, to, ' ')
    } catch {
      return
    }

    if (!selectedText.trim()) return

    setDropdownOpen(false)
    setMenuState('loading')

    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: selectedText, action }),
      })

      const data = await response.json()

      if (data.error) {
        console.error('AI error:', data.error)
        setMenuState('hidden')
      } else {
        setSuggestion(data.result)
        setMenuState('suggestion')
      }
    } catch (error) {
      console.error('AI request failed:', error)
      setMenuState('hidden')
    }
  }

  const acceptSuggestion = () => {
    if (!suggestion || !selectionRange) return

    const { from, to } = selectionRange
    editor.chain().focus().deleteRange({ from, to }).insertContent(suggestion).run()

    // Reset everything
    setSuggestion('')
    setSelectionRange(null)
    setMenuState('hidden')
    isInteractingRef.current = false
  }

  const rejectSuggestion = () => {
    // Reset everything
    setSuggestion('')
    setSelectionRange(null)
    setMenuState('hidden')
    isInteractingRef.current = false
    
    // Focus editor so user can make new selection
    editor.commands.focus()
  }

  // Handle mouse interactions
  const handleMouseEnter = () => {
    isInteractingRef.current = true
  }

  const handleMouseLeave = () => {
    isInteractingRef.current = false
  }

  // Don't render if hidden
  if (menuState === 'hidden') return null

  // Show suggestion view
  if (menuState === 'suggestion' && suggestion) {
    return (
      <div
        ref={menuRef}
        className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 p-3 max-w-md"
        style={{ top: position.top, left: position.left }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="flex items-center gap-2 mb-2 text-xs text-gray-500">
          <Sparkles className="h-3 w-3 text-purple-500" />
          AI Suggestion
        </div>
        <div className="text-sm text-gray-800 mb-3 p-2 bg-purple-50 rounded border border-purple-100 max-h-40 overflow-y-auto">
          {suggestion}
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={acceptSuggestion}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            <Check className="h-3 w-3 mr-1" />
            Accept
          </Button>
          <Button size="sm" variant="outline" onClick={rejectSuggestion}>
            <X className="h-3 w-3 mr-1" />
            Reject
          </Button>
        </div>
      </div>
    )
  }

  // Show loading state
  if (menuState === 'loading') {
    return (
      <div
        ref={menuRef}
        className="fixed z-50 flex items-center gap-2 px-3 py-2 bg-white rounded-lg shadow-lg border border-gray-200"
        style={{ top: position.top, left: position.left }}
      >
        <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
        <span className="text-sm text-gray-600">AI is thinking...</span>
      </div>
    )
  }

  // Show action menu
  return (
    <div
      ref={menuRef}
      className="fixed z-50 flex items-center gap-1 bg-white rounded-lg shadow-lg border border-gray-200 p-1"
      style={{ top: position.top, left: position.left }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Quick action */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleAIAction('improve')}
        className="h-8 gap-1.5 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
      >
        <Sparkles className="h-4 w-4" />
        <span className="text-xs font-medium">Ask AI</span>
      </Button>

      <div className="w-px h-5 bg-gray-200" />

      {/* Dropdown for more options */}
      <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 px-2">
            <ChevronDown className="h-4 w-4 text-gray-500" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          {/* <DropdownMenuItem onClick={() => handleAIAction('improve')}>
            <Wand2 className="h-4 w-4 mr-2 text-purple-600" />
            Improve writing
          </DropdownMenuItem> */}
          <DropdownMenuItem onClick={() => handleAIAction('fix')}>
            <Check className="h-4 w-4 mr-2 text-green-600" />
            Fix grammar
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleAIAction('summarize')}>
            <FileText className="h-4 w-4 mr-2 text-blue-600" />
            Summarize
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleAIAction('translate')}>
            <Languages className="h-4 w-4 mr-2 text-orange-600" />
            Translate to English
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}