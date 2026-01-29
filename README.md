# AARI Docs

A Google Docs-like note interface with rich text editing, comments, and threaded discussions.

![AARI Docs Screenshot](screenshot.png)

## Features

### Document Editor
- Rich text formatting (bold, italic, underline, strikethrough)
- Headings (H1, H2, H3)
- Lists (bullet and numbered)
- Blockquotes and code blocks
- Links
- Keyboard shortcuts (⌘B, ⌘I, ⌘U)
- Auto-save with debouncing

### Comments System
- **Add comments** — Select text and add contextual comments
- **Highlighting** — Commented text is visually highlighted in yellow
- **Threads** — Reply to comments to create discussion threads
- **Resolve/Reopen** — Mark comments as resolved when addressed
- **Edit/Delete** — Full CRUD operations on comments and replies
- **Bidirectional navigation** — Click highlight → scrolls to comment, click comment → scrolls to highlight
- **Filter** — View all, open, or resolved comments

### Scale & Performance
- Seeded with 100+ documents, 1000+ comments for testing at scale
- Batch database operations for fast seeding
- Indexed queries for efficient lookups
- Optimistic UI updates

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| UI Components | shadcn/ui |
| Editor | TipTap (ProseMirror-based) |
| Database | PostgreSQL (Supabase) |
| ORM | Prisma |

## Getting Started

### Prerequisites

- Node.js 20.x
- PostgreSQL database (or Supabase account)

### Installation

1. **Clone the repository**
```bash
   git clone https://github.com/yourusername/aari-docs.git
   cd aari-docs
```

2. **Install dependencies**
```bash
   npm install
```

3. **Set up environment variables**
```bash
   cp .env.example .env
```
   
   Update `.env` with your database credentials:
```env
   DATABASE_URL="postgresql://..."
   DIRECT_URL="postgresql://..."
```

4. **Run database migrations**
```bash
   npx prisma migrate dev
```

5. **Seed the database** (optional, for test data)
```bash
   npm run db:seed
```

6. **Start the development server**
```bash
   npm run dev
```

7. Open [http://localhost:3000](http://localhost:3000)

## Project Structure
```
src/
├── app/
│   ├── api/
│   │   ├── documents/       # Document CRUD endpoints
│   │   ├── comments/        # Comment CRUD + resolve
│   │   ├── replies/         # Reply CRUD
│   │   └── users/           # User listing
│   ├── documents/[id]/      # Document editor page
│   └── page.tsx             # Documents list
├── components/
│   ├── editor/              # TipTap editor + toolbar
│   ├── comments/            # Comments sidebar + threads
│   └── ui/                  # shadcn components
├── lib/
│   ├── db.ts                # Prisma client
│   ├── hooks.ts             # React hooks for API
│   └── types.ts             # TypeScript interfaces
└── prisma/
    ├── schema.prisma        # Database schema
    └── seed.ts              # Seed script
```

## API Endpoints

### Documents
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/documents` | List all documents |
| POST | `/api/documents` | Create document |
| GET | `/api/documents/:id` | Get document |
| PATCH | `/api/documents/:id` | Update document |
| DELETE | `/api/documents/:id` | Delete document |

### Comments
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/documents/:id/comments` | List comments |
| POST | `/api/documents/:id/comments` | Create comment |
| PATCH | `/api/comments/:id` | Update comment |
| DELETE | `/api/comments/:id` | Delete comment |
| POST | `/api/comments/:id/resolve` | Resolve/reopen |

### Replies
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/comments/:id/replies` | Add reply |
| PATCH | `/api/replies/:id` | Update reply |
| DELETE | `/api/replies/:id` | Delete reply |

## Database Schema
```
User
├── id, name, email, avatarUrl
├── comments[], replies[]

Document
├── id, title, content (JSON)
├── comments[]

Comment
├── id, documentId, userId
├── highlightedText, selectionFrom, selectionTo
├── content, isResolved
├── replies[]

Reply
├── id, commentId, userId, content
```

## Scripts
```bash
npm run dev        # Start development server
npm run build      # Build for production
npm run start      # Start production server
npm run db:seed    # Seed database with test data
npm run db:reset   # Reset and re-seed database
```

## Design Decisions

### Why TipTap?
- Built on ProseMirror, battle-tested and extensible
- First-class support for custom marks (used for comment highlighting)
- Great React integration
- Active community and documentation

### Why Prisma?
- Type-safe database queries
- Excellent TypeScript integration
- Easy migrations and seeding
- Works well with Supabase

### Comment Highlighting Approach
- Custom TipTap Mark extension stores `commentId` as attribute
- Highlights rendered as `<mark>` elements with CSS styling
- Click events on marks trigger comment activation
- Bidirectional sync between editor and sidebar

## Future Enhancements

- [ ] Real-time collaboration (WebSockets/Supabase Realtime)
- [ ] User authentication
- [ ] @mentions in comments
- [ ] Document sharing/permissions
- [ ] Export to PDF/Markdown
- [ ] Mobile responsive design
- [ ] Dark mode

## License

MIT