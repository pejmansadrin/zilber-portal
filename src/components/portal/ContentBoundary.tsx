'use client';
import { Component, type ReactNode } from 'react';

// Optional identity/overview errors must not remove working navigation or forms.
export class ContentBoundary extends Component<{ children: ReactNode; fallback?: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <>{this.props.fallback}<p role="alert">دریافت این بخش انجام نشد. <button type="button" onClick={() => window.location.reload()}>تلاش دوباره</button></p></>;
    return this.props.children;
  }
}
