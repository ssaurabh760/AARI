'use client'

import { useState, useEffect, useCallback, use, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Editor, TextSelection, CommentMark } from '@/components/editor'
import { CommentsSidebar } from '@/components/comments'
import { useDocument, useComments } from '@/lib/hooks'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Loader2, Save, Check, MessageSquare, X } from 'lucide-react'
import { toast } from 'sonner'
import { UserMenu } from '@/components/UserMenu'
import * as Y from 'yjs'

interface PageProps {
  params: Promise<{ id: string }>
}

export default function DocumentPage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()
  const { data: session, status: sessionStatus } = useSession()
  
  const {
    document: doc,
    isLoading: docLoading,
    updateDocument,
  } = useDocument(id)
  const {
    comments,
    addComment,
    updateComment,
    deleteComment,
    resolveComment,
    addReply,
    updateReply,
    deleteReply,
    setYjsDocument,
    getResolvedComments,
  } = useComments(id)

  const [title, setTitle] = useState('')
  const [content, setContent] = useState<string | object>('')
  const [selectedText, setSelectedText] = useState<TextSelection | null>(null)
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  
  // Mobile sidebar state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  
  // Yjs state for tracking
  const [yjsReady, setYjsReady] = useState(false)

  // Get current user ID from session
  const currentUserId = session?.user?.id || ''

  // Count active comments for badge
  const activeCommentsCount = useMemo(() => {
    return comments.filter((c) => !c.isResolved).length
  }, [comments])

  // Convert comments to marks for highlighting using resolved positions
  const commentMarks: CommentMark[] = useMemo(() => {
    // Use resolved positions if Yjs is ready, otherwise use stored positions
    const resolvedComments = yjsReady ? getResolvedComments() : comments
    
    return resolvedComments
      .filter((c) => !c.isResolved)
      .map((c) => ({
        id: c.id,
        from: c.selectionFrom,
        to: c.selectionTo,
      }))
  }, [comments, getResolvedComments, yjsReady])

  // Initialize content from document
  useEffect(() => {
    if (doc) {
      setTitle(doc.title)
      setContent(doc.content as string | object)
    }
  }, [doc])

  // Handle Yjs ready callback from Editor
  const handleYjsReady = useCallback((ydoc: Y.Doc, fragment: Y.XmlFragment) => {
    setYjsDocument(ydoc, fragment)
    setYjsReady(true)
  }, [setYjsDocument])

  // Auto-save with debounce (5 seconds)
  const saveDocument = useCallback(async () => {
    if (!doc) return
    setIsSaving(true)
    try {
      await updateDocument({ title, content })
      setLastSaved(new Date())
    } catch (error) {
      console.error('Failed to save:', error)
      toast.error('Failed to save document')
    } finally {
      setIsSaving(false)
    }
  }, [doc, title, content, updateDocument])

  // Debounced auto-save
  useEffect(() => {
    if (!doc) return
    const timer = setTimeout(() => {
      if (title !== doc.title || content) {
        saveDocument()
      }
    }, 5000)

    return () => clearTimeout(timer)
  }, [title, content, doc, saveDocument])

  // Open sidebar when text is selected (for adding comment)
  useEffect(() => {
    if (selectedText) {
      setIsSidebarOpen(true)
    }
  }, [selectedText])

  // Comment handlers
  const handleAddComment = async (
    commentContent: string,
    highlightedText: string,
    selectionFrom: number,
    selectionTo: number
  ) => {
    if (!currentUserId) {
      toast.error('You must be signed in to comment')
      return
    }
    try {
      await addComment(
        commentContent,
        highlightedText,
        selectionFrom,
        selectionTo,
        currentUserId
      )
      setSelectedText(null)
      toast.success('Comment added')
    } catch {
      toast.error('Failed to add comment')
    }
  }

  const handleReply = async (commentId: string, replyContent: string) => {
    if (!currentUserId) {
      toast.error('You must be signed in to reply')
      return
    }
    try {
      await addReply(commentId, replyContent, currentUserId)
      toast.success('Reply added')
    } catch {
      toast.error('Failed to add reply')
    }
  }

  const handleResolve = async (commentId: string, isResolved: boolean) => {
    try {
      await resolveComment(commentId, isResolved)
      toast.success(isResolved ? 'Comment resolved' : 'Comment reopened')
    } catch {
      toast.error('Failed to update comment')
    }
  }

  const handleDelete = async (commentId: string) => {
    try {
      await deleteComment(commentId)
      toast.success('Comment deleted')
      if (activeCommentId === commentId) {
        setActiveCommentId(null)
      }
    } catch {
      toast.error('Failed to delete comment')
    }
  }

  const handleEdit = async (commentId: string, content: string) => {
    try {
      await updateComment(commentId, content)
      toast.success('Comment updated')
    } catch {
      toast.error('Failed to update comment')
    }
  }

  const handleDeleteReply = async (replyId: string) => {
    try {
      await deleteReply(replyId)
      toast.success('Reply deleted')
    } catch {
      toast.error('Failed to delete reply')
    }
  }

  const handleEditReply = async (replyId: string, content: string) => {
    try {
      await updateReply(replyId, content)
      toast.success('Reply updated')
    } catch {
      toast.error('Failed to update reply')
    }
  }

  const handleCommentClick = (commentId: string) => {
    setActiveCommentId(commentId)
    const commentElement = window.document.getElementById(`comment-${commentId}`)
    if (commentElement) {
      commentElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  const handleEditorCommentClick = (commentId: string) => {
    setActiveCommentId(commentId)
    setIsSidebarOpen(true)
    const commentElement = window.document.getElementById(`comment-${commentId}`)
    if (commentElement) {
      setTimeout(() => {
        commentElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 300)
    }
  }

  // Show loading while checking session
  if (sessionStatus === 'loading' || docLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!doc) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Document not found</p>
          <Button onClick={() => router.push('/')}>Go Home</Button>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="border-b px-3 md:px-4 py-2 md:py-3 flex items-center justify-between bg-white sticky top-0 z-10">
        <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/')}
            className="shrink-0 p-2 md:px-3"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline ml-2">Back</span>
          </Button>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-base md:text-lg font-semibold border-none shadow-none focus-visible:ring-0 flex-1 min-w-0"
            placeholder="Untitled"
          />
        </div>

        <div className="flex items-center gap-2 md:gap-3 shrink-0">
          {/* Save status - hide on mobile */}
          <div className="hidden sm:flex items-center gap-2 text-sm text-gray-500">
            {isSaving ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="hidden md:inline">Saving...</span>
              </span>
            ) : lastSaved ? (
              <span className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span className="hidden md:inline">Saved</span>
              </span>
            ) : null}
          </div>
          
          {/* Save button */}
          <Button 
            size="sm" 
            onClick={saveDocument} 
            disabled={isSaving}
            className="px-2 md:px-3"
          >
            <Save className="h-4 w-4" />
            <span className="hidden sm:inline ml-2">Save</span>
          </Button>

          {/* Comments toggle button - visible on mobile/tablet */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="lg:hidden relative px-2 md:px-3"
          >
            <MessageSquare className="h-4 w-4" />
            {activeCommentsCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {activeCommentsCount}
              </span>
            )}
          </Button>

          <UserMenu />
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Editor */}
        <div className="flex-1 overflow-y-auto">
          <Editor
            content={content}
            documentId={id}
            onUpdate={setContent}
            onSelectionChange={setSelectedText}
            onCommentClick={handleEditorCommentClick}
            onYjsReady={handleYjsReady}
            commentMarks={commentMarks}
            activeCommentId={activeCommentId}
          />
        </div>

        {/* Comments Sidebar - Desktop: always visible, Mobile: slide-over */}
        <>
          {/* Mobile overlay backdrop */}
          {isSidebarOpen && (
            <div 
              className="fixed inset-0 bg-black/50 z-20 lg:hidden"
              onClick={() => setIsSidebarOpen(false)}
            />
          )}
          
          {/* Sidebar */}
          <div className={`
            fixed lg:relative inset-y-0 right-0 z-30
            w-[85vw] sm:w-80 
            transform transition-transform duration-300 ease-in-out
            lg:transform-none lg:transition-none
            ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
          `}>
            <CommentsSidebar
              comments={comments}
              selectedText={selectedText}
              activeCommentId={activeCommentId}
              currentUserId={currentUserId}
              onCommentClick={handleCommentClick}
              onAddComment={handleAddComment}
              onCancelComment={() => setSelectedText(null)}
              onResolve={handleResolve}
              onDelete={handleDelete}
              onEdit={handleEdit}
              onReply={handleReply}
              onDeleteReply={handleDeleteReply}
              onEditReply={handleEditReply}
              onClose={() => setIsSidebarOpen(false)}
              isMobile={true}
            />
          </div>
        </>
      </div>
    </main>
  )
}