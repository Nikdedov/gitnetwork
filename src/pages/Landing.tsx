import { Link } from 'react-router'

export function Landing() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="text-4xl font-bold tracking-tight">
        git<span className="text-accent">network</span>
      </div>
      <p className="mt-4 max-w-md text-lg text-ink-soft">
        A social network where your <strong>GitHub repository is your profile</strong>. Posts are
        plain files in your <code>social</code> repo. Zero backend, fully yours.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          to="/login"
          className="rounded-full bg-accent px-6 py-2.5 font-semibold text-white transition hover:bg-accent-deep"
        >
          Continue with GitHub
        </Link>
        <Link
          to="/explore"
          className="rounded-full border border-line bg-card px-6 py-2.5 font-semibold text-ink-soft transition hover:text-ink"
        >
          Browse without an account
        </Link>
      </div>
      <ul className="mt-12 grid max-w-lg gap-3 text-sm text-ink-soft sm:grid-cols-3">
        <li className="rounded-xl border border-line bg-card p-4">
          <div className="font-semibold text-ink">Your data</div>
          Stored in your public GitHub repo. Clone it anytime.
        </li>
        <li className="rounded-xl border border-line bg-card p-4">
          <div className="font-semibold text-ink">No backend</div>
          Browser talks directly to the GitHub API.
        </li>
        <li className="rounded-xl border border-line bg-card p-4">
          <div className="font-semibold text-ink">Open source</div>
          The whole network is code you can read.
        </li>
      </ul>
    </div>
  )
}
