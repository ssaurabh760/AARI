'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Editor } from '@tiptap/core'
import {
  Sparkles,
  Wand2,
  FileText,
  ArrowUpRight,
  GraduationCap,
  List,
  Heading1,
  Heading2,
  Heading3,
  ListOrdered,
  Code,
  Quote,
  Loader2,
} from 'lucide-react'

interface CommandRange {
  from: number
  to: number
}

interface CommandItem {
  title: string
  description: string
  icon: React.ReactNode
  command: (editor: Editor, range: CommandRange) => void | Promise<void>
  category: 'ai' | 'format'
}

interface SlashCommandsProps {
  editor: Editor
}

export function SlashCommands({ editor }: SlashCommandsProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const [commandRange, setCommandRange] = useState<CommandRange | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const aiAction = useCallback(
    async (action: string, range: CommandRange) => {
      // Get the current paragraph text
      const { from } = range
      const $pos = editor.state.doc.resolve(from)
      const paragraph = $pos.parent
      const paragraphText = paragraph.textContent

      // Remove the slash command
      editor.chain().focus().deleteRange(range).run()

      if (!paragraphText || paragraphText.trim() === '') {
        // If no text, insert a placeholder
        editor
          .chain()
          .focus()
          .insertContent(`[Select some text first, then use Ask AI]`)
          .run()
        return
      }

      setIsLoading(true)
      setIsOpen(false)

      try {
        const response = await fetch('/api/ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: paragraphText, action }),
        })

        const data = await response.json()

        if (data.result) {
          // Replace the paragraph content with AI result
          const start = $pos.before()
          const end = $pos.after()
          editor
            .chain()
            .focus()
            .deleteRange({ from: start, to: end })
            .insertContent(`<p>${data.result}</p>`)
            .run()
        }
      } catch (error) {
        console.error('AI command failed:', error)
      } finally {
        setIsLoading(false)
      }
    },
    [editor]
  )

  const commands: CommandItem[] = [
    // AI Commands
    {
      title: 'Improve writing',
      description: 'Make the text clearer and more engaging',
      icon: <Wand2 className="h-4 w-4 text-purple-600" />,
      command: (editor, range) => aiAction('improve', range),
      category: 'ai',
    },
    {
      title: 'Fix grammar',
      description: 'Fix spelling and grammar errors',
      icon: <Sparkles className="h-4 w-4 text-green-600" />,
      command: (editor, range) => aiAction('fix', range),
      category: 'ai',
    },
    {
      title: 'Summarize',
      description: 'Create a brief summary',
      icon: <FileText className="h-4 w-4 text-blue-600" />,
      command: (editor, range) => aiAction('summarize', range),
      category: 'ai',
    },
    {
      title: 'Expand',
      description: 'Add more detail and examples',
      icon: <ArrowUpRight className="h-4 w-4 text-orange-600" />,
      command: (editor, range) => aiAction('expand', range),
      category: 'ai',
    },
    {
      title: 'Simplify',
      description: 'Make it easier to understand',
      icon: <GraduationCap className="h-4 w-4 text-teal-600" />,
      command: (editor, range) => aiAction('simplify', range),
      category: 'ai',
    },
    {
      title: 'To bullet points',
      description: 'Convert to a bulleted list',
      icon: <List className="h-4 w-4 text-gray-600" />,
      command: (editor, range) => aiAction('bullets', range),
      category: 'ai',
    },
    // Format Commands
    {
      title: 'Heading 1',
      description: 'Large section heading',
      icon: <Heading1 className="h-4 w-4" />,
      command: (editor, range) => {
        editor.chain().focus().deleteRange(range).setHeading({ level: 1 }).run()
      },
      category: 'format',
    },
    {
      title: 'Heading 2',
      description: 'Medium section heading',
      icon: <Heading2 className="h-4 w-4" />,
      command: (editor, range) => {
        editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run()
      },
      category: 'format',
    },
    {
      title: 'Heading 3',
      description: 'Small section heading',
      icon: <Heading3 className="h-4 w-4" />,
      command: (editor, range) => {
        editor.chain().focus().deleteRange(range).setHeading({ level: 3 }).run()
      },
      category: 'format',
    },
    {
      title: 'Bullet list',
      description: 'Create a simple bullet list',
      icon: <List className="h-4 w-4" />,
      command: (editor, range) => {
        editor.chain().focus().deleteRange(range).toggleBulletList().run()
      },
      category: 'format',
    },
    {
      title: 'Numbered list',
      description: 'Create a numbered list',
      icon: <ListOrdered className="h-4 w-4" />,
      command: (editor, range) => {
        editor.chain().focus().deleteRange(range).toggleOrderedList().run()
      },
      category: 'format',
    },
    {
      title: 'Code block',
      description: 'Add a code block',
      icon: <Code className="h-4 w-4" />,
      command: (editor, range) => {
        editor.chain().focus().deleteRange(range).toggleCodeBlock().run()
      },
      category: 'format',
    },
    {
      title: 'Quote',
      description: 'Add a blockquote',
      icon: <Quote className="h-4 w-4" />,
      command: (editor, range) => {
        editor.chain().focus().deleteRange(range).toggleBlockquote().run()
      },
      category: 'format',
    },
  ]

  const filteredCommands = commands.filter(
    (cmd) =>
      cmd.title.toLowerCase().includes(search.toLowerCase()) ||
      cmd.description.toLowerCase().includes(search.toLowerCase())
  )

  // Group commands by category
  const aiCommands = filteredCommands.filter((c) => c.category === 'ai')
  const formatCommands = filteredCommands.filter((c) => c.category === 'format')

  // Listen for keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return

      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setSelectedIndex((prev) =>
          prev < filteredCommands.length - 1 ? prev + 1 : 0
        )
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault()
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredCommands.length - 1
        )
      }

      if (event.key === 'Enter') {
        event.preventDefault()
        if (filteredCommands[selectedIndex] && commandRange) {
          filteredCommands[selectedIndex].command(editor, commandRange)
          setIsOpen(false)
          setSearch('')
        }
      }

      if (event.key === 'Escape') {
        setIsOpen(false)
        setSearch('')
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, selectedIndex, filteredCommands, editor, commandRange])

  // Listen for editor changes to detect slash command
  useEffect(() => {
    const handleUpdate = () => {
      const { selection } = editor.state
      const { $from } = selection

      // Get text before cursor in current node
      const textBefore = $from.parent.textContent.slice(0, $from.parentOffset)

      // Check if we're typing a slash command
      const slashMatch = textBefore.match(/\/(\w*)$/)

      if (slashMatch) {
        const coords = editor.view.coordsAtPos($from.pos)
        setPosition({
          top: coords.bottom + 8,
          left: coords.left,
        })

        const from = $from.pos - slashMatch[0].length
        const to = $from.pos
        setCommandRange({ from, to })
        setSearch(slashMatch[1])
        setIsOpen(true)
        setSelectedIndex(0)
      } else {
        setIsOpen(false)
        setSearch('')
        setCommandRange(null)
      }
    }

    editor.on('update', handleUpdate)
    editor.on('selectionUpdate', handleUpdate)

    return () => {
      editor.off('update', handleUpdate)
      editor.off('selectionUpdate', handleUpdate)
    }
  }, [editor])

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearch('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (!isOpen || isLoading) {
    if (isLoading) {
      return (
        <div
          className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 p-4 flex items-center gap-2"
          style={{ top: position.top, left: position.left }}
        >
          <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
          <span className="text-sm text-gray-600">AI is thinking...</span>
        </div>
      )
    }
    return null
  }

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 w-72 max-h-80 overflow-y-auto"
      style={{ top: position.top, left: position.left }}
    >
      {filteredCommands.length === 0 ? (
        <div className="p-3 text-sm text-gray-500">No commands found</div>
      ) : (
        <>
          {/* AI Commands */}
          {aiCommands.length > 0 && (
            <>
              <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider bg-gray-50">
                AI Commands
              </div>
              {aiCommands.map((cmd) => {
                const globalIndex = filteredCommands.indexOf(cmd)
                return (
                  <button
                    key={cmd.title}
                    onClick={() => {
                      if (commandRange) {
                        cmd.command(editor, commandRange)
                        setIsOpen(false)
                        setSearch('')
                      }
                    }}
                    className={`w-full px-3 py-2 flex items-start gap-3 text-left hover:bg-gray-50 ${
                      selectedIndex === globalIndex ? 'bg-purple-50' : ''
                    }`}
                  >
                    <div className="mt-0.5">{cmd.icon}</div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {cmd.title}
                      </div>
                      <div className="text-xs text-gray-500">{cmd.description}</div>
                    </div>
                  </button>
                )
              })}
            </>
          )}

          {/* Format Commands */}
          {formatCommands.length > 0 && (
            <>
              <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider bg-gray-50 border-t">
                Format
              </div>
              {formatCommands.map((cmd) => {
                const globalIndex = filteredCommands.indexOf(cmd)
                return (
                  <button
                    key={cmd.title}
                    onClick={() => {
                      if (commandRange) {
                        cmd.command(editor, commandRange)
                        setIsOpen(false)
                        setSearch('')
                      }
                    }}
                    className={`w-full px-3 py-2 flex items-start gap-3 text-left hover:bg-gray-50 ${
                      selectedIndex === globalIndex ? 'bg-purple-50' : ''
                    }`}
                  >
                    <div className="mt-0.5">{cmd.icon}</div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {cmd.title}
                      </div>
                      <div className="text-xs text-gray-500">{cmd.description}</div>
                    </div>
                  </button>
                )
              })}
            </>
          )}
        </>
      )}

      <div className="px-3 py-2 text-xs text-gray-400 border-t bg-gray-50">
        ↑↓ Navigate · Enter Select · Esc Close
      </div>
    </div>
  )
}