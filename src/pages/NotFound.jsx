import { Link } from 'react-router-dom'
import { CHAINS } from '../data/chains'

export default function NotFound({ what = 'page' }) {
  return (
    <div className="mx-auto max-w-md space-y-5 py-16 text-center">
      <p className="font-display text-3xl font-extrabold tracking-tight">No signal.</p>
      <p className="text-sm text-fog">
        That {what} isn't here. The catalog has {CHAINS.length} chains — try one of these.
      </p>
      <ul className="flex flex-wrap justify-center gap-2">
        {CHAINS.slice(0, 6).map(c => (
          <li key={c.slug}>
            <Link to={`/chain/${c.slug}`}
              className="chip pressable border border-edge bg-raised text-fog hover:border-edge2 hover:text-paper">
              {c.name}
            </Link>
          </li>
        ))}
      </ul>
      <Link to="/" className="btn-primary inline-flex">All chains</Link>
    </div>
  )
}
