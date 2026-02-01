import { Mark, mergeAttributes } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Slice, Fragment } from '@tiptap/pm/model'

export interface CommentHighlightOptions {
  HTMLAttributes: Record<string, unknown>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    commentHighlight: {
      setCommentHighlight: (attributes: { commentId: string }) => ReturnType
      unsetCommentHighlight: () => ReturnType
      removeAllCommentHighlights: () => ReturnType
    }
  }
}

/**
 * CommentHighlight Mark Extension
 * 
 * Key features:
 * 1. Non-inclusive: New text typed at the edges won't get the mark
 * 2. Non-copyable: When copying highlighted text, the mark is stripped
 * 3. Unique per comment: Each highlight is tied to a specific comment ID
 */
export const CommentHighlight = Mark.create<CommentHighlightOptions>({
  name: 'commentHighlight',

  // Important: This makes the mark NOT extend when typing at its edges
  inclusive: false,

  // Exclude from other marks to prevent nesting issues
  excludes: '',

  // Allow spanning across nodes
  spanning: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  addAttributes() {
    return {
      commentId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-comment-id'),
        renderHTML: (attributes) => {
          if (!attributes.commentId) return {}
          return { 'data-comment-id': attributes.commentId }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'mark[data-comment-id]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'mark',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: 'comment-highlight',
      }),
      0,
    ]
  },

  addCommands() {
    return {
      setCommentHighlight:
        (attributes) =>
        ({ commands }) => {
          return commands.setMark(this.name, attributes)
        },
      unsetCommentHighlight:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name)
        },
      removeAllCommentHighlights:
        () =>
        ({ tr, state, dispatch }) => {
          if (dispatch) {
            const { doc } = state
            doc.descendants((node, pos) => {
              if (node.marks) {
                node.marks.forEach((mark) => {
                  if (mark.type.name === 'commentHighlight') {
                    tr.removeMark(pos, pos + node.nodeSize, mark.type)
                  }
                })
              }
            })
            dispatch(tr)
          }
          return true
        },
    }
  },

  addProseMirrorPlugins() {
    const markType = this.type

    return [
      // Plugin to strip comment highlights from copied/cut content
      new Plugin({
        key: new PluginKey('commentHighlightCopyHandler'),
        props: {
          // Transform copied content to remove comment highlights
          transformCopied(slice) {
            return stripCommentHighlightsFromSlice(slice, markType)
          },
          
          // Also handle paste to ensure no highlights sneak through
          handlePaste(view, event, slice) {
            // The slice is already processed by transformCopied for internal copies
            // For external pastes, we also strip any comment highlights
            const cleanSlice = stripCommentHighlightsFromSlice(slice, markType)
            
            // Let ProseMirror handle the clean paste
            // Return false to let default handling proceed with clean content
            if (cleanSlice !== slice) {
              const { tr } = view.state
              tr.replaceSelection(cleanSlice)
              view.dispatch(tr)
              return true
            }
            
            return false
          },
          
          // Handle drag and drop - strip highlights from dragged content
          handleDrop(view, event, slice, moved) {
            if (slice) {
              const cleanSlice = stripCommentHighlightsFromSlice(slice, markType)
              if (cleanSlice !== slice) {
                // We need to handle this differently for drop
                // Let default handling proceed, marks will be stripped
              }
            }
            return false
          },
        },
      }),
    ]
  },
})

/**
 * Recursively strips comment highlight marks from a slice's content.
 * This ensures copied/pasted text doesn't carry comment highlights.
 */
function stripCommentHighlightsFromSlice(slice: Slice, markType: Mark['type']): Slice {
  const content = stripCommentHighlightsFromFragment(slice.content, markType)
  return new Slice(content, slice.openStart, slice.openEnd)
}

/**
 * Recursively processes a fragment to remove comment highlight marks.
 */
function stripCommentHighlightsFromFragment(fragment: Fragment, markType: Mark['type']): Fragment {
  const nodes: any[] = []
  
  fragment.forEach((node) => {
    if (node.isText) {
      // Remove comment highlight marks from text nodes
      const newMarks = node.marks.filter((mark) => mark.type.name !== 'commentHighlight')
      if (newMarks.length !== node.marks.length) {
        // Marks were removed, create new node
        nodes.push(node.mark(newMarks))
      } else {
        nodes.push(node)
      }
    } else if (node.content && node.content.size > 0) {
      // Recursively process child nodes
      const newContent = stripCommentHighlightsFromFragment(node.content, markType)
      if (newContent !== node.content) {
        nodes.push(node.copy(newContent))
      } else {
        nodes.push(node)
      }
    } else {
      nodes.push(node)
    }
  })
  
  return Fragment.fromArray(nodes)
}