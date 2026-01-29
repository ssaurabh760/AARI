'use client'

import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  CheckCircle,
  Circle,
  MoreHorizontal,
  Pencil,
  Trash2,
  Reply,
} from 'lucide-react'
import { Comment, Reply as ReplyType } from '@/lib/types'

interface CommentThreadProps {
  comment: Comment
  isActive: boolean
  onClick: () => void
  onResolve: (commentId: string, isResolved: boolean) => Promise<void>
  onDelete: (commentId: string) => Promise<void>
  onEdit: (commentId: string, content: string) => Promise<void>
  onReply: (commentId: string, content: string) => Promise<void>
  onDeleteReply: (replyId: string) => Promise<void>
  onEditReply: (replyId: string, content: string) => Promise<void>
}

export function CommentThread({
  comment,
  isActive,
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
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null)
  const [editReplyContent, setEditReplyContent] = useState('')

  const handleEdit = async () => {
    await onEdit(comment.id, editContent)
    setIsEditing(false)
  }

  const handleReply = async () => {
    if (!replyContent.trim()) return
    await onReply(comment.id, replyContent)
    setReplyContent('')
    setIsReplying(false)
  }

  const handleEditReply = async (replyId: string) => {
    await onEditReply(replyId, editReplyContent)
    setEditingReplyId(null)
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div
      id={`comment-${comment.id}`}
      className={`rounded-lg border transition-all cursor-pointer ${
        isActive
          ? 'border-blue-400 bg-blue-50/50 shadow-sm'
          : 'border-gray-200 bg-white hover:border-gray-300'
      } ${comment.isResolved ? 'opacity-60' : ''}`}
      onClick={onClick}
    >
      {/* Highlighted Text */}
      <div className="px-4 pt-3 pb-2 border-b bg-gray-50/50 rounded-t-lg">
        <p className="text-xs text-gray-500 line-clamp-2">
          "{comment.highlightedText}"
        </p>
      </div>

      {/* Main Comment */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={comment.user.avatarUrl || undefined} />
            <AvatarFallback className="text-xs">
              {getInitials(comment.user.name)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium truncate">
                  {comment.user.name}
                </span>
                <span className="text-xs text-gray-400">
                  {formatDistanceToNow(new Date(comment.createdAt), {
                    addSuffix: true,
                  })}
                </span>
              </div>

              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => onResolve(comment.id, !comment.isResolved)}
                  title={comment.isResolved ? 'Reopen' : 'Resolve'}
                >
                  {comment.isResolved ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <Circle className="h-4 w-4 text-gray-400" />
                  )}
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setIsEditing(true)}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onDelete(comment.id)}
                      className="text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {isEditing ? (
              <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="min-h-[60px] text-sm"
                />
                <div className="flex justify-end gap-2 mt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditing(false)}
                  >
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleEdit}>
                    Save
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-700 mt-1">{comment.content}</p>
            )}
          </div>
        </div>

        {/* Replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-4 ml-11 space-y-3 border-l-2 border-gray-100 pl-4">
            {comment.replies.map((reply: ReplyType) => (
              <ReplyItem
                key={reply.id}
                reply={reply}
                isEditing={editingReplyId === reply.id}
                editContent={editReplyContent}
                onEditChange={setEditReplyContent}
                onStartEdit={() => {
                  setEditingReplyId(reply.id)
                  setEditReplyContent(reply.content)
                }}
                onCancelEdit={() => setEditingReplyId(null)}
                onSaveEdit={() => handleEditReply(reply.id)}
                onDelete={() => onDeleteReply(reply.id)}
                getInitials={getInitials}
              />
            ))}
          </div>
        )}

        {/* Reply Input */}
        <div className="mt-3 ml-11" onClick={(e) => e.stopPropagation()}>
          {isReplying ? (
            <div>
              <Textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Write a reply..."
                className="min-h-[60px] text-sm"
                autoFocus
              />
              <div className="flex justify-end gap-2 mt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsReplying(false)}
                >
                  Cancel
                </Button>
                <Button size="sm" onClick={handleReply}>
                  Reply
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-500 h-8 px-2"
              onClick={() => setIsReplying(true)}
            >
              <Reply className="h-4 w-4 mr-1" />
              Reply
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

interface ReplyItemProps {
  reply: ReplyType
  isEditing: boolean
  editContent: string
  onEditChange: (content: string) => void
  onStartEdit: () => void
  onCancelEdit: () => void
  onSaveEdit: () => void
  onDelete: () => void
  getInitials: (name: string) => string
}

function ReplyItem({
  reply,
  isEditing,
  editContent,
  onEditChange,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  getInitials,
}: ReplyItemProps) {
  return (
    <div className="flex items-start gap-2">
      <Avatar className="h-6 w-6">
        <AvatarImage src={reply.user.avatarUrl || undefined} />
        <AvatarFallback className="text-xs">
          {getInitials(reply.user.name)}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium">{reply.user.name}</span>
            <span className="text-xs text-gray-400">
              {formatDistanceToNow(new Date(reply.createdAt), {
                addSuffix: true,
              })}
            </span>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onStartEdit}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="text-red-600">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {isEditing ? (
          <div className="mt-1">
            <Textarea
              value={editContent}
              onChange={(e) => onEditChange(e.target.value)}
              className="min-h-[40px] text-sm"
            />
            <div className="flex justify-end gap-2 mt-1">
              <Button variant="ghost" size="sm" onClick={onCancelEdit}>
                Cancel
              </Button>
              <Button size="sm" onClick={onSaveEdit}>
                Save
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-600">{reply.content}</p>
        )}
      </div>
    </div>
  )
}