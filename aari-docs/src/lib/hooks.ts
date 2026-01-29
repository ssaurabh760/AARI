'use client'

import { useState, useEffect, useCallback } from 'react'
import { Document, Comment } from './types'

const API_BASE = '/api'

// Simulated current user (in production, this would come from auth)
export const CURRENT_USER_ID = 'user_0_' // Will be completed after seed

// TipTap content can be either HTML string or JSON object
type EditorContent = string | object

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

export function useComments(documentId: string) {
  const [comments, setComments] = useState<Comment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  const addComment = async (
    content: string,
    highlightedText: string,
    selectionFrom: number,
    selectionTo: number,
    userId: string
  ) => {
    try {
      const res = await fetch(`${API_BASE}/documents/${documentId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          highlightedText,
          selectionFrom,
          selectionTo,
          userId,
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