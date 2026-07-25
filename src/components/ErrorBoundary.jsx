import { Component } from 'react'

/**
 * Catches render-time crashes. Without this, one bad value (a null artist, a malformed
 * tick) unmounts the whole tree and the user is left staring at a blank white page with
 * no way forward.
 */
export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Unhandled UI error:', error, info?.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="mx-auto max-w-sm space-y-4 py-10 text-center">
        <p className="font-display text-2xl font-extrabold">Something broke.</p>
        <p className="text-sm text-fog">
          That page hit an error. Your account and positions are safe — nothing was lost.
        </p>
        <div className="flex justify-center gap-3">
          <button
            onClick={() => this.setState({ error: null })}
            className="rounded-lg border border-edge px-4 py-2 text-sm font-semibold hover:border-stage">
            Try again
          </button>
          <a href="/" className="rounded-lg bg-stage px-4 py-2 text-sm font-semibold text-ink">
            Back to market
          </a>
        </div>
      </div>
    )
  }
}
