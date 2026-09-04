import { Component, type ReactNode } from 'react'

type Props = { fallback: ReactNode; children: ReactNode }
type State = { error: Error | null }

export class PipelineErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  render() {
    if (this.state.error) return this.props.fallback
    return this.props.children
  }
}
