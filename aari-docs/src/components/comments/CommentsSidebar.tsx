'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Comment as CommentType } from '@/lib/types'
import { TextSelection } from '@/components/editor'
import {
  MessageSquare,
  Check,
  RotateCcw,
  Trash2,
  Edit2,
  X,
  Send,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface CommentsSidebarProps {
  comments: CommentType[]
  selectedText: TextSelection | null
  activeCommentId: string | null
  currentUserId: string
  onCommentClick: (commentId: string) => void
  onAddComment: (
    content: string,
    highlightedText: string,
    selectionFrom: number,
    selectionTo: number
  ) => void
  onCancelComment: () => void
  onResolve: (commentId: string, isResolved: boolean) => void
  onDelete: (commentId: string) => void
  onEdit: (commentId: string, content: string) => void
  onReply: (commentId: string, content: string) => void
  onDeleteReply: (replyId: string) => void
  onEditReply: (replyId: string, content: string) => void
}

export function CommentsSidebar({
  comments,
  selectedText,
  activeCommentId,
  currentUserId,
  onCommentClick,
  onAddComment,
  onCancelComment,
  onResolve,
  onDelete,
  onEdit,
  onReply,
  onDeleteReply,
  onEditReply,
}: CommentsSidebarProps) {
  const [newComment, setNewComment] = useState('')
  const [showResolved, setShowResolved] = useState(false)

  const activeComments = comments.filter((c) => !c.isResolved)
  const resolvedComments = comments.filter((c) => c.isResolved)

  const handleSubmitComment = () => {
    if (!newComment.trim() || !selectedText) return
    onAddComment(
      newComment.trim(),
      selectedText.text,
      selectedText.from,
      selectedText.to
    )
    setNewComment('')
  }

  return (
    <aside className="w-full h-full border-l bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="p-3 sm:p-4 border-b bg-white shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2 text-sm sm:text-base">
            <MessageSquare className="h-4 w-4" />
            Comments
          </h2>
          <span className="text-xs sm:text-sm text-gray-500">
            {activeComments.length} active
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* New Comment Form */}
        {selectedText && (
          <div className="p-3 sm:p-4 border-b bg-blue-50">
            <div className="text-xs text-gray-500 mb-2">
              Commenting on:
            </div>
            <div className="bg-white p-2 rounded text-xs sm:text-sm text-gray-700 mb-3 border-l-2 border-blue-400">
              &ldquo;{selectedText.text.slice(0, 100)}
              {selectedText.text.length > 100 ? '...' : ''}&rdquo;
            </div>
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add your comment..."
              className="mb-2 text-sm resize-none"
              rows={3}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleSubmitComment}
                disabled={!newComment.trim()}
                className="flex-1"
              >
                <Send className="h-3 w-3 mr-1" />
                Comment
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={onCancelComment}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}

        {/* Active Comments */}
        {activeComments.length === 0 && !selectedText ? (
          <div className="p-6 sm:p-8 text-center text-gray-500 text-sm">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p>No comments yet</p>
            <p className="text-xs mt-1">Select text to add a comment</p>
          </div>
        ) : (
          <div className="divide-y">
            {activeComments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                isActive={activeCommentId === comment.id}
                currentUserId={currentUserId}
                onClick={() => onCommentClick(comment.id)}
                onResolve={(isResolved) => onResolve(comment.id, isResolved)}
                onDelete={() => onDelete(comment.id)}
                onEdit={(content) => onEdit(comment.id, content)}
                onReply={(content) => onReply(comment.id, content)}
                onDeleteReply={onDeleteReply}
                onEditReply={onEditReply}
              />
            ))}
          </div>
        )}

        {/* Resolved Comments */}
        {resolvedComments.length > 0 && (
          <div className="border-t">
            <button
              onClick={() => setShowResolved(!showResolved)}
              className="w-full p-3 flex items-center justify-between text-sm text-gray-600 hover:bg-gray-100"
            >
              <span>Resolved ({resolvedComments.length})</span>
              {showResolved ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
            {showResolved && (
              <div className="divide-y bg-gray-100">
                {resolvedComments.map((comment) => (
                  <CommentItem
                    key={comment.id}
                    comment={comment}
                    isActive={activeCommentId === comment.id}
                    currentUserId={currentUserId}
                    onClick={() => onCommentClick(comment.id)}
                    onResolve={(isResolved) => onResolve(comment.id, isResolved)}
                    onDelete={() => onDelete(comment.id)}
                    onEdit={(content) => onEdit(comment.id, content)}
                    onReply={(content) => onReply(comment.id, content)}
                    onDeleteReply={onDeleteReply}
                    onEditReply={onEditReply}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  )
}

interface CommentItemProps {
  comment: CommentType
  isActive: boolean
  currentUserId: string
  onClick: () => void
  onResolve: (isResolved: boolean) => void
  onDelete: () => void
  onEdit: (content: string) => void
  onReply: (content: string) => void
  onDeleteReply: (replyId: string) => void
  onEditReply: (replyId: string, content: string) => void
}

function CommentItem({
  comment,
  isActive,
  currentUserId,
  onClick,
  onResolve,
  onDelete,
  onEdit,
  onReply,
  onDeleteReply,
  onEditReply,
}: CommentItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(comment.content)
  const [isReplying, setIsReplying] = useState(false)
  const [replyContent, setReplyContent] = useState('')

  // Check if current user owns this comment
  const isOwner = currentUserId === comment.userId

  const handleSaveEdit = () => {
    if (!editContent.trim()) return
    onEdit(editContent.trim())
    setIsEditing(false)
  }

  const handleSubmitReply = () => {
    if (!replyContent.trim()) return
    onReply(replyContent.trim())
    setReplyContent('')
    setIsReplying(false)
  }

  // Safely get user info
  const userName = comment.user?.name ?? 'Unknown User'
  const userImage = comment.user?.image ?? comment.user?.avatarUrl ?? undefined

  return (
    <div
      id={`comment-${comment.id}`}
      className={`p-3 sm:p-4 cursor-pointer transition-colors ${
        isActive ? 'bg-blue-50' : 'bg-white hover:bg-gray-50'
      }`}
      onClick={onClick}
    >
      {/* Comment Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          {userImage ? (
            <img
              src={userImage}
              alt={userName}
              className="h-6 w-6 sm:h-7 sm:w-7 rounded-full object-cover shrink-0"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="h-6 w-6 sm:h-7 sm:w-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-medium shrink-0">
              {userName[0]?.toUpperCase() || '?'}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">
              {userName}
            </p>
            <p className="text-xs text-gray-500">
              {formatDistanceToNow(new Date(comment.createdAt), {
                addSuffix: true,
              })}
            </p>
          </div>
        </div>

        {/* Actions - Only show for owner */}
        {isOwner && !comment.isResolved && (
          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setIsEditing(true)}
              title="Edit"
            >
              <Edit2 className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
              onClick={onDelete}
              title="Delete"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>

      {/* Highlighted Text */}
      <div className="bg-yellow-50 p-2 rounded text-xs text-gray-600 mb-2 border-l-2 border-yellow-400">
        &ldquo;{comment.highlightedText.slice(0, 80)}
        {comment.highlightedText.length > 80 ? '...' : ''}&rdquo;
      </div>

      {/* Comment Content */}
      {isEditing ? (
        <div onClick={(e) => e.stopPropagation()}>
          <Textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="text-sm mb-2 resize-none"
            rows={2}
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSaveEdit}>
              Save
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setIsEditing(false)
                setEditContent(comment.content)
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-xs sm:text-sm text-gray-700 mb-3">{comment.content}</p>
      )}

      {/* Resolve/Reopen Button */}
      {!isEditing && (
        <div className="flex items-center gap-2 mb-3" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onResolve(!comment.isResolved)}
            className={`text-xs ${comment.isResolved ? 'text-blue-600' : 'text-green-600'}`}
          >
            {comment.isResolved ? (
              <>
                <RotateCcw className="h-3 w-3 mr-1" />
                Reopen
              </>
            ) : (
              <>
                <Check className="h-3 w-3 mr-1" />
                Resolve
              </>
            )}
          </Button>
        </div>
      )}

      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-3 space-y-3 border-l-2 border-gray-200 pl-3">
          {comment.replies.map((reply) => {
            const isReplyOwner = currentUserId === reply.userId
            return (
              <ReplyItem
                key={reply.id}
                reply={reply}
                isOwner={isReplyOwner}
                onDelete={() => onDeleteReply(reply.id)}
                onEdit={(content) => onEditReply(reply.id, content)}
              />
            )
          })}
        </div>
      )}

      {/* Reply Form */}
      {!comment.isResolved && !isEditing && (
        <div onClick={(e) => e.stopPropagation()}>
          {isReplying ? (
            <div className="mt-3">
              <Textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Write a reply..."
                className="text-sm mb-2 resize-none"
                rows={2}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSubmitReply}>
                  Reply
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setIsReplying(false)
                    setReplyContent('')
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsReplying(true)}
              className="text-blue-600 mt-2 text-xs"
            >
              Reply
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

interface ReplyItemProps {
  reply: {
    id: string
    content: string
    createdAt: Date | string
    userId: string
    user?: {
      id: string
      name: string | null
      image?: string | null
      avatarUrl?: string | null
    }
  }
  isOwner: boolean
  onDelete: () => void
  onEdit: (content: string) => void
}

function ReplyItem({ reply, isOwner, onDelete, onEdit }: ReplyItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(reply.content)

  const handleSaveEdit = () => {
    if (!editContent.trim()) return
    onEdit(editContent.trim())
    setIsEditing(false)
  }

  // Safely get user info
  const userName = reply.user?.name ?? 'Unknown User'
  const userImage = reply.user?.image ?? reply.user?.avatarUrl ?? undefined

  return (
    <div className="text-sm">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2 min-w-0">
          {userImage ? (
            <img
              src={userImage}
              alt={userName}
              className="h-5 w-5 rounded-full object-cover shrink-0"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="h-5 w-5 rounded-full bg-gray-400 flex items-center justify-center text-white text-xs shrink-0">
              {userName[0]?.toUpperCase() || '?'}
            </div>
          )}
          <span className="font-medium text-xs text-gray-900 truncate">
            {userName}
          </span>
          <span className="text-xs text-gray-500 shrink-0">
            {formatDistanceToNow(new Date(reply.createdAt), {
              addSuffix: true,
            })}
          </span>
        </div>

        {/* Only show edit/delete for reply owner */}
        {isOwner && (
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setIsEditing(true)}
            >
              <Edit2 className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-red-600"
              onClick={onDelete}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>

      {isEditing ? (
        <div>
          <Textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="text-xs mb-2 resize-none"
            rows={2}
          />
          <div className="flex gap-2">
            <Button size="sm" className="h-6 text-xs" onClick={handleSaveEdit}>
              Save
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-6 text-xs"
              onClick={() => {
                setIsEditing(false)
                setEditContent(reply.content)
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-xs sm:text-sm text-gray-700">{reply.content}</p>
      )}
    </div>
  )
}