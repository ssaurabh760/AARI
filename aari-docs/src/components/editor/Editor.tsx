'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import { Toolbar } from './Toolbar'

export interface TextSelection {
  from: number
  to: number
  text: string
}

interface EditorProps {
  content: string
  onUpdate: (content: string) => void
  onSelectionChange?: (selection: TextSelection | null) => void
  editable?: boolean
}

export function Editor({
  content,
  onUpdate,
  onSelectionChange,
  editable = true,
}: EditorProps) {
  const editor = useEditor({
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
        placeholder: 'Start writing...',
      }),
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      onUpdate(editor.getHTML())
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
        class:
          'prose prose-sm sm:prose-base max-w-none focus:outline-none min-h-[500px] px-8 py-6',
      },
    },
  })

  if (!editor) {
    return null
  }

  return (
    <div className="flex flex-col h-full">
      <Toolbar editor={editor} />
      <div className="flex-1 overflow-y-auto">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}