'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useDocuments } from '@/lib/hooks'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  FileText,
  Plus,
  Search,
  Loader2,
  MoreVertical,
  Trash2,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { UserMenu } from '@/components/UserMenu'

export default function HomePage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { documents, isLoading, createDocument, deleteDocument } = useDocuments()
  const [search, setSearch] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const filteredDocuments = documents.filter((doc) =>
    doc.title.toLowerCase().includes(search.toLowerCase())
  )

  const handleCreate = async () => {
    setIsCreating(true)
    try {
      const doc = await createDocument()
      router.push(`/documents/${doc.id}`)
    } catch {
      toast.error('Failed to create document')
    } finally {
      setIsCreating(false)
    }
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this document?')) return
    try {
      await deleteDocument(id)
      toast.success('Document deleted')
    } catch {
      toast.error('Failed to delete document')
    }
  }

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3">
          {/* Top row - Logo and User Menu */}
          <div className="flex items-center justify-between mb-3 sm:mb-0">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-blue-600 rounded-lg">
                <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <h1 className="text-lg sm:text-xl font-semibold text-gray-900">AARI Docs</h1>
            </div>
            
            {/* Desktop: Search + New + User in one row */}
            <div className="hidden sm:flex items-center gap-4">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search documents..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button onClick={handleCreate} disabled={isCreating}>
                {isCreating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                New Document
              </Button>
              <UserMenu />
            </div>

            {/* Mobile: Just User Menu */}
            <div className="sm:hidden">
              <UserMenu />
            </div>
          </div>

          {/* Mobile: Search and New button row */}
          <div className="flex sm:hidden items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
            <Button 
              onClick={handleCreate} 
              disabled={isCreating} 
              size="sm"
              className="shrink-0"
            >
              {isCreating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              <span className="ml-1">New</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Welcome Banner */}
      {session?.user && (
        <div className="bg-blue-50 border-b border-blue-100">
          <div className="max-w-6xl mx-auto px-4 py-2 sm:py-3">
            <p className="text-sm sm:text-base text-blue-800">
              Welcome back, <span className="font-medium">{session.user.name?.split(' ')[0]}</span>!
            </p>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-4 sm:py-8">
        <h2 className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4">
          Recent Documents
        </h2>

        {filteredDocuments.length === 0 ? (
          <div className="text-center py-8 sm:py-12">
            <FileText className="h-10 w-10 sm:h-12 sm:w-12 text-gray-300 mx-auto mb-3 sm:mb-4" />
            <p className="text-gray-500 mb-4 text-sm sm:text-base">
              {search
                ? 'No documents found matching your search'
                : 'No documents yet'}
            </p>
            {!search && (
              <Button onClick={handleCreate} disabled={isCreating}>
                <Plus className="h-4 w-4 mr-2" />
                Create your first document
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {filteredDocuments.map((doc) => (
              <div
                key={doc.id}
                onClick={() => router.push(`/documents/${doc.id}`)}
                className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group active:scale-[0.98]"
              >
                <div className="flex items-start justify-between mb-2 sm:mb-3">
                  <div className="p-1.5 sm:p-2 bg-blue-50 rounded-lg">
                    <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 sm:opacity-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(e) => handleDelete(doc.id, e as unknown as React.MouseEvent)}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <h3 className="font-medium text-gray-900 truncate mb-1 text-sm sm:text-base">
                  {doc.title || 'Untitled'}
                </h3>
                <p className="text-xs text-gray-500">
                  Updated {formatDate(doc.updatedAt)}
                </p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}