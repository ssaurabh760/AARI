import * as Y from 'yjs'
import {
  relativePositionToAbsolutePosition,
  absolutePositionToRelativePosition,
} from 'y-prosemirror'
import { EditorState } from '@tiptap/pm/state'

/**
 * Yjs-based Comment Anchoring System
 * 
 * This module provides 100% accurate comment positioning using CRDTs.
 * Instead of storing absolute positions (which shift when text is edited),
 * we store relative positions that are tied to specific characters in the document.
 */

export interface CommentAnchor {
  // Encoded relative position for the start of the comment
  fromRelative: string
  // Encoded relative position for the end of the comment
  toRelative: string
}

export interface ResolvedAnchor {
  from: number
  to: number
  isValid: boolean
}

/**
 * Creates a comment anchor from absolute positions.
 * The anchor will remain accurate even as the document is edited.
 */
export function createCommentAnchor(
  yXmlFragment: Y.XmlFragment,
  state: EditorState,
  from: number,
  to: number
): CommentAnchor {
  const mapping = yXmlFragment.doc!.getMap('mapping')
  
  // Convert absolute positions to relative positions
  const fromRelative = absolutePositionToRelativePosition(from, yXmlFragment, mapping)
  const toRelative = absolutePositionToRelativePosition(to, yXmlFragment, mapping)
  
  return {
    fromRelative: encodeRelativePosition(fromRelative),
    toRelative: encodeRelativePosition(toRelative),
  }
}

/**
 * Resolves a comment anchor to current absolute positions.
 * Returns the current positions in the document, accounting for all edits.
 */
export function resolveCommentAnchor(
  yXmlFragment: Y.XmlFragment,
  state: EditorState,
  anchor: CommentAnchor
): ResolvedAnchor {
  try {
    const mapping = yXmlFragment.doc!.getMap('mapping')
    
    const fromRelative = decodeRelativePosition(anchor.fromRelative)
    const toRelative = decodeRelativePosition(anchor.toRelative)
    
    const from = relativePositionToAbsolutePosition(
      yXmlFragment.doc!,
      yXmlFragment,
      fromRelative,
      mapping
    )
    
    const to = relativePositionToAbsolutePosition(
      yXmlFragment.doc!,
      yXmlFragment,
      toRelative,
      mapping
    )
    
    // Check if positions are valid
    if (from === null || to === null || from < 0 || to < 0) {
      return { from: 0, to: 0, isValid: false }
    }
    
    // Ensure from is before to
    const validFrom = Math.min(from, to)
    const validTo = Math.max(from, to)
    
    // Clamp to document bounds
    const docSize = state.doc.content.size
    return {
      from: Math.max(0, Math.min(validFrom, docSize)),
      to: Math.max(0, Math.min(validTo, docSize)),
      isValid: true,
    }
  } catch (error) {
    console.warn('Failed to resolve comment anchor:', error)
    return { from: 0, to: 0, isValid: false }
  }
}

/**
 * Encodes a relative position to a storable string format.
 */
export function encodeRelativePosition(relPos: Y.RelativePosition): string {
  return Buffer.from(Y.encodeRelativePosition(relPos)).toString('base64')
}

/**
 * Decodes a stored string back to a relative position.
 */
export function decodeRelativePosition(encoded: string): Y.RelativePosition {
  const uint8Array = Buffer.from(encoded, 'base64')
  return Y.decodeRelativePosition(uint8Array)
}

/**
 * Creates a simple fallback anchor using absolute positions.
 * Used when Yjs is not available.
 */
export function createFallbackAnchor(from: number, to: number): CommentAnchor {
  // Store as JSON for fallback (less accurate but still works)
  return {
    fromRelative: JSON.stringify({ absolute: from }),
    toRelative: JSON.stringify({ absolute: to }),
  }
}

/**
 * Resolves a fallback anchor (just returns the stored positions).
 */
export function resolveFallbackAnchor(anchor: CommentAnchor): ResolvedAnchor {
  try {
    const fromData = JSON.parse(anchor.fromRelative)
    const toData = JSON.parse(anchor.toRelative)
    
    if (fromData.absolute !== undefined && toData.absolute !== undefined) {
      return {
        from: fromData.absolute,
        to: toData.absolute,
        isValid: true,
      }
    }
  } catch {
    // Not a fallback anchor
  }
  
  return { from: 0, to: 0, isValid: false }
}

/**
 * Check if an anchor is a fallback (absolute position) anchor.
 */
export function isFallbackAnchor(anchor: CommentAnchor): boolean {
  try {
    const fromData = JSON.parse(anchor.fromRelative)
    return fromData.absolute !== undefined
  } catch {
    return false
  }
}