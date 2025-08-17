import React from 'react';

// Lazy-loaded components with loading states
export const LazyRecentsView = React.lazy(() =>
  import('./Views/RecentsView').then(module => ({ default: module.RecentsView }))
);

export const LazyThisPCView = React.lazy(() =>
  import('./Views/ThisPCView').then(module => ({ default: module.ThisPCView }))
);

export const LazyTabContent = React.lazy(() =>
  import('./Views/TabContent').then(module => ({ default: module.TabContent }))
);

export const LazyFileList = React.lazy(() =>
  import('./Views/FileList').then(module => ({ default: module.FileList }))
);

export const LazyDetailsPanel = React.lazy(() =>
  import('./DetailsPanel').then(module => ({ default: module.DetailsPanel }))
);

export const LazySettingsMenu = React.lazy(() =>
  import('./SettingsMenu/SettingsMenu').then(module => ({ default: module.SettingsMenu }))
);

export const LazySetupWizard = React.lazy(() =>
  import('./SetupWizard/SetupWizard').then(module => ({ default: module.SetupWizard }))
);

export const LazyFileTransferUI = React.lazy(() =>
  import('./FileTransferUI/FileTransferUI').then(module => ({ default: module.FileTransferUI }))
);

export const LazyThemeSelector = React.lazy(() =>
  import('./ThemeSelector/ThemeSelector').then(module => ({ default: module.ThemeSelector }))
);

export const LazyCustomStyleEditor = React.lazy(() =>
  import('./CustomStyleEditor/CustomStyleEditor').then(module => ({ default: module.CustomStyleEditor }))
);

// Loading component for Suspense fallbacks
export const ComponentLoader: React.FC<{ message?: string }> = ({ message = "Loading..." }) => (
  <div className="component-loader">
    <div className="loader-spinner"></div>
    <span className="loader-text">{message}</span>
  </div>
);

// Error boundary for lazy components
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class LazyComponentErrorBoundary extends React.Component<
  React.PropsWithChildren<{ fallback?: React.ReactNode }>,
  ErrorBoundaryState
> {
  constructor(props: React.PropsWithChildren<{ fallback?: React.ReactNode }>) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('LazyComponent error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="component-error">
          <span>Failed to load component</span>
          <button onClick={() => this.setState({ hasError: false, error: undefined })}>
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
