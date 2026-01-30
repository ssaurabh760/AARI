'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import { Toolbar } from './Toolbar'
import { CommentHighlight } from './extensions/CommentHighlight'
import { AIBubbleMenu } from './AIBubbleMenu'
import { SlashCommands } from './SlashCommands'
import { useEffect, useCallback, useRef } from 'react'

export interface TextSelection {
  from: number
  to: number
  text: string
}

export interface CommentMark {
  id: string
  from: number
  to: number
}

// TipTap content can be either HTML string or JSON object
type EditorContentType = string | object

interface EditorProps {
  content: EditorContentType
  onUpdate: (content: EditorContentType) => void
  onSelectionChange?: (selection: TextSelection | null) => void
  onCommentClick?: (commentId: string) => void
  commentMarks?: CommentMark[]
  activeCommentId?: string | null
  editable?: boolean
}

export function Editor({
  content,
  onUpdate,
  onSelectionChange,
  onCommentClick,
  commentMarks = [],
  activeCommentId,
  editable = true,
}: EditorProps) {
  // Track if we've set initial content to avoid overwriting user edits
  const hasSetInitialContent = useRef(false)

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline cursor-pointer',
        },
      }),
      Placeholder.configure({
        placeholder: 'Start writing... (Type "/" for commands)',
      }),
      CommentHighlight.configure({
        HTMLAttributes: {
          class: 'comment-highlight',
        },
      }),
    ],
    content: '', // Start empty, we'll set content in useEffect
    editable,
    onUpdate: ({ editor }) => {
      // Return JSON for consistency with database storage
      onUpdate(editor.getJSON())
    },
    onSelectionUpdate: ({ editor }) => {
      const { from, to } = editor.state.selection
      if (from !== to && onSelectionChange) {
        const text = editor.state.doc.textBetween(from, to, ' ')
        onSelectionChange({ from, to, text })
      } else if (onSelectionChange) {
        onSelectionChange(null)
      }
    },
    editorProps: {
      attributes: {
        // Mobile responsive: smaller padding and min-height on mobile
        class:
          'prose prose-sm sm:prose-base max-w-none focus:outline-none min-h-[300px] sm:min-h-[500px] px-4 sm:px-8 py-4 sm:py-6',
      },
      handleClick: (view, pos, event) => {
        // Check if clicked on a comment highlight
        const target = event.target as HTMLElement
        const commentMark = target.closest('[data-comment-id]')
        if (commentMark && onCommentClick) {
          const commentId = commentMark.getAttribute('data-comment-id')
          if (commentId) {
            onCommentClick(commentId)
            return true
          }
        }
        return false
      },
    },
  })

  // Set content when it changes from props (e.g., when document loads)
  useEffect(() => {
    if (!editor || editor.isDestroyed) return

    // Only set content if it's meaningful (not empty string/object)
    const hasContent =
      typeof content === 'string'
        ? content.length > 0
        : content && typeof content === 'object' && Object.keys(content).length > 0

    if (hasContent && !hasSetInitialContent.current) {
      editor.commands.setContent(content)
      hasSetInitialContent.current = true
    }
  }, [editor, content])

  // Apply comment highlights
  const applyHighlights = useCallback(() => {
    if (!editor || commentMarks.length === 0) return

    const { tr } = editor.state
    let modified = false

    // First, remove all existing comment highlights
    editor.state.doc.descendants((node, pos) => {
      if (node.marks) {
        node.marks.forEach((mark) => {
          if (mark.type.name === 'commentHighlight') {
            tr.removeMark(pos, pos + node.nodeSize, mark.type)
            modified = true
          }
        })
      }
    })

    // Then apply new highlights
    commentMarks.forEach((mark) => {
      try {
        const from = Math.max(0, mark.from)
        const to = Math.min(editor.state.doc.content.size, mark.to)
        if (from < to) {
          tr.addMark(
            from,
            to,
            editor.schema.marks.commentHighlight.create({ commentId: mark.id })
          )
          modified = true
        }
      } catch (e) {
        console.warn('Failed to apply highlight:', e)
      }
    })

    if (modified) {
      editor.view.dispatch(tr)
    }
  }, [editor, commentMarks])

  useEffect(() => {
    if (editor && commentMarks.length > 0) {
      // Delay to ensure editor is ready
      const timer = setTimeout(applyHighlights, 100)
      return () => clearTimeout(timer)
    }
  }, [editor, commentMarks, applyHighlights])

  // Scroll to active comment highlight
  useEffect(() => {
    if (!editor || !activeCommentId) return

    const element = document.querySelector(
      `[data-comment-id="${activeCommentId}"]`
    )
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      element.classList.add('comment-highlight-active')
      setTimeout(() => {
        element.classList.remove('comment-highlight-active')
      }, 2000)
    }
  }, [editor, activeCommentId])

  if (!editor) {
    return null
  }

  return (
    <div className="flex flex-col h-full">
      <Toolbar editor={editor} />
      <div className="flex-1 overflow-y-auto relative">
        <EditorContent editor={editor} />
        {/* AI Features */}
        <AIBubbleMenu editor={editor} />
        <SlashCommands editor={editor} />
      </div>
    </div>
  )
}