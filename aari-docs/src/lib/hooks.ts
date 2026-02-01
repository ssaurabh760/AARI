'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Document, Comment } from './types'
import * as Y from 'yjs'

const API_BASE = '/api'

// TipTap content can be either HTML string or JSON object
type EditorContent = string | object

/**
 * Browser-compatible base64 encoding for Uint8Array
 */
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

/**
 * Browser-compatible base64 decoding to Uint8Array
 */
function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

export function useDocument(id: string) {
  const [document, setDocument] = useState<Document | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDocument = useCallback(async () => {
    try {
      setIsLoading(true)
      const res = await fetch(`${API_BASE}/documents/${id}`)
      if (!res.ok) throw new Error('Failed to fetch document')
      const { data } = await res.json()
      setDocument(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchDocument()
  }, [fetchDocument])

  // Accept both string and object content types
  const updateDocument = async (updates: { title?: string; content?: EditorContent }) => {
    try {
      const res = await fetch(`${API_BASE}/documents/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (!res.ok) throw new Error('Failed to update document')
      const { data } = await res.json()
      setDocument(data)
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      throw err
    }
  }

  return { document, isLoading, error, refetch: fetchDocument, updateDocument }
}

/**
 * Enhanced useComments hook with Yjs CRDT support.
 * 
 * This hook manages comments with proper position tracking using Yjs relative positions.
 * Comments will maintain their correct positions even as the document is edited.
 */
export function useComments(documentId: string) {
  const [comments, setComments] = useState<Comment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Yjs references for position calculations
  const yjsRef = useRef<{ doc: Y.Doc; fragment: Y.XmlFragment } | null>(null)

  /**
   * Sets the Yjs document reference for accurate position tracking.
   * Should be called from the Editor component when Yjs is ready.
   */
  const setYjsDocument = useCallback((doc: Y.Doc, fragment: Y.XmlFragment) => {
    yjsRef.current = { doc, fragment }
  }, [])

  const fetchComments = useCallback(async () => {
    try {
      setIsLoading(true)
      const res = await fetch(`${API_BASE}/documents/${documentId}/comments`)
      if (!res.ok) throw new Error('Failed to fetch comments')
      const { data } = await res.json()
      setComments(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }, [documentId])

  useEffect(() => {
    fetchComments()
  }, [fetchComments])

  /**
   * Adds a new comment with Yjs relative position anchoring.
   */
  const addComment = async (
    content: string,
    highlightedText: string,
    selectionFrom: number,
    selectionTo: number,
    userId: string
  ) => {
    try {
      // Create relative position anchors if Yjs is available
      let anchorData: { fromRelative?: string; toRelative?: string } = {}
      
      if (yjsRef.current) {
        const { doc } = yjsRef.current
        try {
          const ytext = doc.getText('content')
          
          // Create relative positions that will survive edits
          const fromRelPos = Y.createRelativePositionFromTypeIndex(ytext, selectionFrom)
          const toRelPos = Y.createRelativePositionFromTypeIndex(ytext, selectionTo)
          
          // Encode to storable format (browser-compatible base64)
          anchorData = {
            fromRelative: uint8ArrayToBase64(Y.encodeRelativePosition(fromRelPos)),
            toRelative: uint8ArrayToBase64(Y.encodeRelativePosition(toRelPos)),
          }
        } catch (e) {
          console.warn('Could not create relative positions:', e)
        }
      }

      const res = await fetch(`${API_BASE}/documents/${documentId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          highlightedText,
          selectionFrom,
          selectionTo,
          userId,
          ...anchorData,
        }),
      })
      if (!res.ok) throw new Error('Failed to add comment')
      const { data } = await res.json()
      setComments((prev) => [data, ...prev])
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      throw err
    }
  }

  /**
   * Resolves comment positions using Yjs relative positions if available.
   * Falls back to stored absolute positions if relative positions fail.
   */
  const resolveCommentPositions = useCallback((comment: Comment): { from: number; to: number } => {
    // Try to use relative positions if available
    if (yjsRef.current && comment.fromRelative && comment.toRelative) {
      try {
        const { doc } = yjsRef.current
        const ytext = doc.getText('content')
        
        // Decode relative positions (browser-compatible)
        const fromRelPos = Y.decodeRelativePosition(base64ToUint8Array(comment.fromRelative))
        const toRelPos = Y.decodeRelativePosition(base64ToUint8Array(comment.toRelative))
        
        // Convert back to absolute positions
        const fromAbsPos = Y.createAbsolutePositionFromRelativePosition(fromRelPos, doc)
        const toAbsPos = Y.createAbsolutePositionFromRelativePosition(toRelPos, doc)
        
        if (fromAbsPos && toAbsPos && fromAbsPos.type === ytext && toAbsPos.type === ytext) {
          return { from: fromAbsPos.index, to: toAbsPos.index }
        }
      } catch (e) {
        console.warn('Failed to resolve relative positions, using absolute:', e)
      }
    }
    
    // Fallback to stored absolute positions
    return { from: comment.selectionFrom, to: comment.selectionTo }
  }, [])

  /**
   * Gets comments with resolved positions for highlighting.
   */
  const getResolvedComments = useCallback(() => {
    return comments.map((comment) => {
      const resolved = resolveCommentPositions(comment)
      return {
        ...comment,
        selectionFrom: resolved.from,
        selectionTo: resolved.to,
      }
    })
  }, [comments, resolveCommentPositions])

  const updateComment = async (commentId: string, content: string) => {
    try {
      const res = await fetch(`${API_BASE}/comments/${commentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      if (!res.ok) throw new Error('Failed to update comment')
      const { data } = await res.json()
      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? data : c))
      )
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      throw err
    }
  }

  const deleteComment = async (commentId: string) => {
    try {
      const res = await fetch(`${API_BASE}/comments/${commentId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete comment')
      setComments((prev) => prev.filter((c) => c.id !== commentId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      throw err
    }
  }

  const resolveComment = async (commentId: string, isResolved: boolean) => {
    try {
      const res = await fetch(`${API_BASE}/comments/${commentId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isResolved }),
      })
      if (!res.ok) throw new Error('Failed to resolve comment')
      const { data } = await res.json()
      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? data : c))
      )
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      throw err
    }
  }

  const addReply = async (commentId: string, content: string, userId: string) => {
    try {
      const res = await fetch(`${API_BASE}/comments/${commentId}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, userId }),
      })
      if (!res.ok) throw new Error('Failed to add reply')
      await fetchComments() // Refetch to get updated replies
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      throw err
    }
  }

  const updateReply = async (replyId: string, content: string) => {
    try {
      const res = await fetch(`${API_BASE}/replies/${replyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      if (!res.ok) throw new Error('Failed to update reply')
      await fetchComments() // Refetch to get updated replies
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      throw err
    }
  }

  const deleteReply = async (replyId: string) => {
    try {
      const res = await fetch(`${API_BASE}/replies/${replyId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete reply')
      await fetchComments() // Refetch to get updated comments
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      throw err
    }
  }

  return {
    comments,
    isLoading,
    error,
    refetch: fetchComments,
    addComment,
    updateComment,
    deleteComment,
    resolveComment,
    addReply,
    updateReply,
    deleteReply,
    setYjsDocument,
    getResolvedComments,
  }
}

export function useDocuments() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDocuments = useCallback(async () => {
    try {
      setIsLoading(true)
      const res = await fetch(`${API_BASE}/documents`)
      if (!res.ok) throw new Error('Failed to fetch documents')
      const { data } = await res.json()
      setDocuments(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  const createDocument = async (title?: string) => {
    try {
      const res = await fetch(`${API_BASE}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      })
      if (!res.ok) throw new Error('Failed to create document')
      const { data } = await res.json()
      setDocuments((prev) => [data, ...prev])
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      throw err
    }
  }

  const deleteDocument = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/documents/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete document')
      setDocuments((prev) => prev.filter((d) => d.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      throw err
    }
  }

  return {
    documents,
    isLoading,
    error,
    refetch: fetchDocuments,
    createDocument,
    deleteDocument,
  }
}