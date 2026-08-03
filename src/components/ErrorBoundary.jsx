import { Component } from 'react'

/**
 * Catches render-time crashes. Without this, one bad value unmounts the whole tree and
 * the user is left staring at a blank page with no way forward.
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
      <div className="mx-auto max-w-sm space-y-4 py-16 text-center">
        <p className="font-display text-2xl font-extrabold tracking-tight">Something broke.</p>
        <p className="text-sm text-fog">
          That page hit an error. Your rack is stored in this browser and is untouched.
        </p>
        <div className="flex justify-center gap-3">
          <button onClick={() => this.setState({ error: null })} className="btn">Try again</button>
          <a href="/" className="btn-primary">All chains</a>
        </div>
      </div>
    )
  }
}
