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
import { useEffect, useCallback, useRef, useMemo } from 'react'
import * as Y from 'yjs'

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

/**
 * Syncs the ProseMirror document to the Yjs document for position tracking.
 * This allows us to use Yjs relative positions for accurate comment anchoring.
 */
function syncToYjs(
  editor: any,
  yjsSetup: { doc: Y.Doc; fragment: Y.XmlFragment }
) {
  if (!editor || !yjsSetup) return
  
  try {
    const { doc, fragment } = yjsSetup
    
    // Get the plain text content from the editor
    const text = editor.state.doc.textContent
    
    // Use a Y.Text for simpler position tracking
    const ytext = doc.getText('content')
    
    // Only sync if content has changed
    const currentYText = ytext.toString()
    if (currentYText !== text) {
      doc.transact(() => {
        ytext.delete(0, ytext.length)
        ytext.insert(0, text)
      })
    }
  } catch (e) {
    console.warn('Failed to sync to Yjs:', e)
  }
}

interface EditorProps {
  content: EditorContentType
  documentId: string
  onUpdate: (content: EditorContentType) => void
  onSelectionChange?: (selection: TextSelection | null) => void
  onCommentClick?: (commentId: string) => void
  onYjsReady?: (ydoc: Y.Doc, fragment: Y.XmlFragment) => void
  commentMarks?: CommentMark[]
  activeCommentId?: string | null
  editable?: boolean
}

export function Editor({
  content,
  documentId,
  onUpdate,
  onSelectionChange,
  onCommentClick,
  onYjsReady,
  commentMarks = [],
  activeCommentId,
  editable = true,
}: EditorProps) {
  // Create a stable Yjs document for this editor instance
  const yjsRef = useRef<{ doc: Y.Doc; fragment: Y.XmlFragment } | null>(null)
  
  // Track if we've set initial content to avoid overwriting user edits
  const hasSetInitialContent = useRef(false)
  const initialContentSet = useRef(false)

  // Initialize Yjs document - used for relative position tracking
  const yjsSetup = useMemo(() => {
    if (!yjsRef.current) {
      const doc = new Y.Doc()
      const fragment = doc.getXmlFragment('prosemirror')
      yjsRef.current = { doc, fragment }
    }
    return yjsRef.current
  }, [])

  // Notify parent when Yjs is ready
  useEffect(() => {
    if (onYjsReady && yjsSetup) {
      onYjsReady(yjsSetup.doc, yjsSetup.fragment)
    }
  }, [yjsSetup, onYjsReady])

  // Cleanup Yjs on unmount
  useEffect(() => {
    return () => {
      if (yjsRef.current) {
        yjsRef.current.doc.destroy()
        yjsRef.current = null
      }
    }
  }, [])

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
    editable,
    onUpdate: ({ editor }) => {
      // Return JSON for consistency with database storage
      onUpdate(editor.getJSON())
      
      // Sync content to Yjs for position tracking
      // This keeps the Yjs document in sync for relative position calculations
      syncToYjs(editor, yjsSetup)
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

    if (hasContent && !initialContentSet.current) {
      editor.commands.setContent(content)
      initialContentSet.current = true
      
      // Initial sync to Yjs
      syncToYjs(editor, yjsSetup)
    }
  }, [editor, content, yjsSetup])

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