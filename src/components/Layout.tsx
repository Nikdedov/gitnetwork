import { Link, NavLink, useNavigate } from 'react-router'
import type { ReactNode } from 'react'
import { useApp } from '../app/AppContext'
import { Avatar } from './Avatar'

const navItems = [
  { to: '/home', label: 'Home' },
  { to: '/explore', label: 'Explore' },
]

export function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useApp()
  const navigate = useNavigate()

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl">
      <aside className="sticky top-0 hidden h-screen w-52 shrink-0 flex-col justify-between p-4 md:flex">
        <div>
          <Link to="/" className="mb-6 block text-xl font-bold tracking-tight">
            git<span className="text-accent">network</span>
          </Link>
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className="rounded-lg px-3 py-2 text-sm font-medium text-ink-soft hover:bg-line/60 hover:text-ink"
              >
                {item.label}
              </NavLink>
            ))}
            {user && (
              <NavLink
                to={`/@${encodeURIComponent(user.login)}`}
                className="rounded-lg px-3 py-2 text-sm font-medium text-ink-soft hover:bg-line/60 hover:text-ink"
              >
                Profile
              </NavLink>
            )}
            {user && (
              <NavLink
                to="/settings"
                className="rounded-lg px-3 py-2 text-sm font-medium text-ink-soft hover:bg-line/60 hover:text-ink"
              >
                Settings
              </NavLink>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Avatar src={user.avatar_url} name={user.login} size={32} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{user.name ?? user.login}</div>
                <div className="truncate text-xs text-ink-faint">@{user.login}</div>
              </div>
              <button
                type="button"
                onClick={() => {
                  logout()
                  navigate('/')
                }}
                className="text-xs text-ink-faint hover:text-danger"
              >
                Logout
              </button>
            </>
          ) : (
            <Link to="/login" className="text-sm font-semibold text-accent-deep hover:underline">
              Sign in
            </Link>
          )}
        </div>
      </aside>

      <main className="min-w-0 flex-1 border-x border-line bg-card/40">{children}</main>

      <aside className="sticky top-0 hidden h-screen w-72 shrink-0 p-4 lg:block">
        <div className="rounded-xl border border-line bg-card p-4 text-sm">
          <div className="font-semibold">Your data lives in GitHub</div>
          <p className="mt-1 text-xs leading-relaxed text-ink-soft">
            Posts are stored as files in your public <code>social</code> repository. No backend, no
            database — you can clone or migrate everything at any time.
          </p>
        </div>
      </aside>
    </div>
  )
}

export function PageHeader({ title }: { title: string }) {
  return <h1 className="border-b border-line px-4 py-3 text-lg font-bold sm:px-6">{title}</h1>
}
