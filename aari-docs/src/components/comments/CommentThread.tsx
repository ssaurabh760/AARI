'use client'

import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Comment as CommentType } from '@/lib/types'
import {
  MoreHorizontal,
  Check,
  RotateCcw,
  Trash2,
  Edit2,
  Send,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface CommentThreadProps {
  comment: CommentType
  isActive: boolean
  currentUserId?: string
  onClick: () => void
  onResolve: (isResolved: boolean) => void
  onDelete: () => void
  onEdit: (content: string) => void
  onReply: (content: string) => void
  onDeleteReply: (replyId: string) => void
  onEditReply: (replyId: string, content: string) => void
}

export function CommentThread({
  comment,
  isActive,
  currentUserId = '',
  onClick,
  onResolve,
  onDelete,
  onEdit,
  onReply,
  onDeleteReply,
  onEditReply,
}: CommentThreadProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(comment.content)
  const [isReplying, setIsReplying] = useState(false)
  const [replyContent, setReplyContent] = useState('')

  // Check if current user owns this comment
  const isOwner = currentUserId === comment.userId

  const getInitials = (name: string | null | undefined) => {
    if (!name) return '?'
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

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
      className={`p-4 border-b cursor-pointer transition-colors ${
        isActive ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
      } ${comment.isResolved ? 'opacity-60' : ''}`}
      onClick={onClick}
    >
      {/* Comment Header */}
      <div className="flex items-start gap-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src={userImage} />
          <AvatarFallback className="text-xs">
            {getInitials(userName)}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div>
              <span className="font-medium text-sm text-gray-900">
                {userName}
              </span>
              <span className="text-xs text-gray-500 ml-2">
                {formatDistanceToNow(new Date(comment.createdAt), {
                  addSuffix: true,
                })}
              </span>
            </div>

            {/* Actions dropdown - only show for owner */}
            {isOwner && !comment.isResolved && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setIsEditing(true)}>
                    <Edit2 className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={onDelete}
                    className="text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Highlighted text reference */}
          <div className="mt-1 text-xs text-gray-500 bg-yellow-50 px-2 py-1 rounded border-l-2 border-yellow-400">
            &ldquo;{comment.highlightedText.slice(0, 60)}
            {comment.highlightedText.length > 60 ? '...' : ''}&rdquo;
          </div>

          {/* Comment content */}
          {isEditing ? (
            <div className="mt-2" onClick={(e) => e.stopPropagation()}>
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="text-sm resize-none"
                rows={2}
              />
              <div className="flex gap-2 mt-2">
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
            <p className="mt-2 text-sm text-gray-700">{comment.content}</p>
          )}

          {/* Resolve button */}
          {!isEditing && (
            <div className="mt-2" onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onResolve(!comment.isResolved)}
                className={`text-xs ${
                  comment.isResolved
                    ? 'text-blue-600 hover:text-blue-700'
                    : 'text-green-600 hover:text-green-700'
                }`}
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
        </div>
      </div>

      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-3 ml-11 space-y-3 border-l-2 border-gray-100 pl-3">
          {comment.replies.map((reply) => {
            const isReplyOwner = currentUserId === reply.userId
            return (
              <ReplyItem
                key={reply.id}
                reply={reply}
                isOwner={isReplyOwner}
                onDelete={() => onDeleteReply(reply.id)}
                onEdit={(content) => onEditReply(reply.id, content)}
                getInitials={getInitials}
              />
            )
          })}
        </div>
      )}

      {/* Reply form */}
      {!comment.isResolved && !isEditing && (
        <div className="mt-3 ml-11" onClick={(e) => e.stopPropagation()}>
          {isReplying ? (
            <div>
              <Textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Write a reply..."
                className="text-sm resize-none"
                rows={2}
              />
              <div className="flex gap-2 mt-2">
                <Button size="sm" onClick={handleSubmitReply}>
                  <Send className="h-3 w-3 mr-1" />
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
              className="text-blue-600 text-xs"
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
  getInitials: (name: string | null | undefined) => string
}

function ReplyItem({ reply, isOwner, onDelete, onEdit, getInitials }: ReplyItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(reply.content)

  const handleSaveEdit = () => {
    if (!editContent.trim()) return
    onEdit(editContent.trim())
    setIsEditing(false)
  }

  // Safely get user info
  const replyUserName = reply.user?.name ?? 'Unknown User'
  const replyUserImage = reply.user?.image ?? reply.user?.avatarUrl ?? undefined

  return (
    <div className="flex items-start gap-2">
      <Avatar className="h-6 w-6">
        <AvatarImage src={replyUserImage} />
        <AvatarFallback className="text-xs">
          {getInitials(replyUserName)}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-xs text-gray-900">
            {replyUserName}
          </span>
          <span className="text-xs text-gray-500">
            {formatDistanceToNow(new Date(reply.createdAt), {
              addSuffix: true,
            })}
          </span>

          {/* Edit/Delete for reply owner only */}
          {isOwner && (
            <div className="ml-auto flex gap-1">
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
          <div className="mt-1">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="text-xs resize-none"
              rows={2}
            />
            <div className="flex gap-2 mt-1">
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
          <p className="text-sm text-gray-700">{reply.content}</p>
        )}
      </div>
    </div>
  )
}