import { Link } from 'react-router-dom'

/** Previously any unknown URL rendered an empty <main> with no explanation. */
export default function NotFound() {
  return (
    <div className="mx-auto max-w-sm space-y-4 py-10 text-center">
      <p className="font-display text-5xl font-extrabold text-stage">404</p>
      <p className="font-display text-xl font-extrabold">Nothing trades here.</p>
      <p className="text-sm text-fog">
        That page doesn’t exist. It may have been an old artist link.
      </p>
      <Link to="/" className="inline-block rounded-lg bg-stage px-4 py-2 text-sm font-semibold text-ink">
        Back to market
      </Link>
    </div>
  )
}
