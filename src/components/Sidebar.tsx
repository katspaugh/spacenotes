import { useCallback, useEffect, useState } from 'react'
import { makeUrl, getUrlId } from '../lib/url.js'
import { ForkButton } from './ForkButton.js'
import { signOut } from '../services/supabaseService.js'
import { listDocsPage, type SpaceMeta } from '../lib/dinky-api.js'
import { useSession } from '@supabase/auth-helpers-react'

type SidebarProps = {
  isOpen: boolean
  onClose: () => void
  isLocked?: boolean
  onFork: () => void
  onShareSession: () => void
  isOwner?: boolean
  onSignIn: () => void
}

const ITEMS_PER_PAGE = 100

// Simple color generator based on string
function getSpaceColor(title: string): string {
  const colors = [
    '#3B82F6', // Blue
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#EF4444', // Red
    '#F97316', // Orange
    '#EAB308', // Yellow
    '#22C55E', // Green
    '#14B8A6', // Teal
  ]
  const hash = title?.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) || 0
  return colors[hash % colors.length]
}

// Format relative time
function formatTimeAgo(dateStr?: string): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

export function Sidebar({ isOpen, onClose, isLocked, onFork, onShareSession, isOwner, onSignIn }: SidebarProps) {
  const [docs, setDocs] = useState<SpaceMeta[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const session = useSession()
  const userId = session?.user?.id || ''
  const userEmail = session?.user?.email || ''
  const currentId = getUrlId()

  const loadDocs = useCallback(async (p: number) => {
    if (!userId) return
    try {
      const { spaces, total } = await listDocsPage(userId, p, ITEMS_PER_PAGE)
      const pages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE))
      setDocs(spaces)
      setTotalPages(pages)
      if (p > pages) setPage(pages)
    } catch (err) {
      console.error('Error loading spaces', err)
    }
  }, [userId])

  useEffect(() => {
    if (isOpen && userId) {
      loadDocs(page)
    }
  }, [isOpen, page, loadDocs, userId])

  const onSignOut = useCallback(() => {
    signOut()
  }, [])

  const stopPropagation = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
  }, [])

  // Filter docs by search query (UI only - no backend filtering)
  const filteredDocs = searchQuery
    ? docs.filter(doc => doc.title?.toLowerCase().includes(searchQuery.toLowerCase()))
    : docs

  // Get user initials for avatar
  const userInitials = userEmail
    ? userEmail.split('@')[0].slice(0, 2).toUpperCase()
    : '?'

  return (
    <aside className={`Sidebar${isLocked ? ' Sidebar_locked' : ''}`}>
      <div
        className="Sidebar_drawer"
        style={{ transform: `translateX(${isOpen ? 0 : '100%'})` }}
        onClick={stopPropagation}
      >
        {/* Header */}
        <div className="MenuHeader">
          <div className="MenuHeaderLeft">
            <div className="LogoIcon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
            </div>
            <span className="MenuTitle">SpaceNotes</span>
          </div>
          <button className="CloseBtn" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Action Buttons */}
        {userId && (
          <div className="MenuActions">
            <a href={makeUrl(Math.random().toString(36).slice(2))}>
              <button className="Button_primary">+ New space</button>
            </a>
            {isLocked ? (
              <ForkButton onFork={onFork} />
            ) : isOwner && (
              <button className="Button_secondary" onClick={onShareSession}>
                Invite
              </button>
            )}
          </div>
        )}

        {/* Search Bar */}
        {userId && (
          <div className="SearchBar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search spaces..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        )}

        {/* Spaces Section */}
        {userId && (
          <div className="SpacesSection">
            <div className="SpacesSectionHeader">
              <span className="SpacesSectionTitle">Your Spaces</span>
              <span className="SpacesCount">{filteredDocs.length}</span>
            </div>
            <div className="SpacesList">
              {filteredDocs.map((doc) => {
                const isActive = doc.id === currentId
                const color = getSpaceColor(doc.title || doc.id)
                const initial = (doc.title || 'U')[0].toUpperCase()

                return (
                  <a
                    key={doc.id}
                    href={makeUrl(doc.id, doc.title)}
                    className={`SpaceItem${isActive ? ' SpaceItem_active' : ''}`}
                  >
                    <div className="SpaceItemIcon" style={{ backgroundColor: color }}>
                      {initial}
                    </div>
                    <div className="SpaceItemContent">
                      <div className="SpaceItemTitle">{doc.title || 'Untitled'}</div>
                      <div className="SpaceItemMeta">{formatTimeAgo(doc.updated_at)}</div>
                    </div>
                  </a>
                )
              })}
            </div>

            {totalPages > 1 && (
              <div className="Sidebar_pagination">
                <button type="button" onClick={() => setPage(page - 1)} disabled={page <= 1}>
                  Prev
                </button>
                <span>{page} / {totalPages}</span>
                <button type="button" onClick={() => setPage(page + 1)} disabled={page >= totalPages}>
                  Next
                </button>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="MenuFooter">
          {userId ? (
            <>
              <div className="UserSection">
                <div className="UserAvatar">{userInitials}</div>
                <div className="UserInfo">
                  <div className="UserName">{userEmail.split('@')[0]}</div>
                  <div className="UserEmail">{userEmail}</div>
                </div>
              </div>
              <button className="SignOutBtn" onClick={onSignOut}>
                Sign out
              </button>
            </>
          ) : (
            <button className="Button_primary" onClick={onSignIn} style={{ width: '100%' }}>
              Sign in / Sign up
            </button>
          )}
        </div>
      </div>
    </aside>
  )
}
