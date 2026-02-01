export interface User {
  id: string
  name: string | null
  email: string
  image?: string | null
  avatarUrl?: string | null
  createdAt: Date | string
}

export interface Document {
  id: string
  title: string
  content: string | object
  createdAt: Date | string
  updatedAt: Date | string
  // Yjs state can be stored for persistence (optional)
  yjsState?: string | null
}

export interface Reply {
  id: string
  content: string
  createdAt: Date | string
  updatedAt: Date | string
  commentId: string
  userId: string
  user?: User
}

export interface Comment {
  id: string
  content: string
  highlightedText: string
  // Absolute positions (fallback)
  selectionFrom: number
  selectionTo: number
  // Yjs relative positions (CRDT-based, survives edits)
  fromRelative?: string | null
  toRelative?: string | null
  isResolved: boolean
  createdAt: Date | string
  updatedAt: Date | string
  documentId: string
  userId: string
  user?: User
  replies?: Reply[]
}

// Comment mark for highlighting in the editor
export interface CommentMark {
  id: string
  from: number
  to: number
}