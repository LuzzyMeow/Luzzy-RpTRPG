import { Component, useEffect, Suspense, lazy, type ReactNode } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from 'antd-style';
import { useSettingsStore } from '@/store/useSettingsStore';
import { MobileLayout } from '@/components/layout/MobileLayout';

const ChatPage = lazy(() =>
  import('@/pages/ChatPage').then((m) => ({ default: m.ChatPage })),
);
const CharactersPage = lazy(() =>
  import('@/pages/CharactersPage').then((m) => ({ default: m.CharactersPage })),
);
const TrpgPage = lazy(() =>
  import('@/pages/TrpgPage').then((m) => ({ default: m.TrpgPage })),
);
const ToolsPage = lazy(() =>
  import('@/pages/ToolsPage').then((m) => ({ default: m.ToolsPage })),
);
const MinePage = lazy(() =>
  import('@/pages/MinePage').then((m) => ({ default: m.MinePage })),
);

/** 应用级错误边界状态 */
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/** 应用级错误边界组件 */
class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }): void {
    // 记录错误与组件栈，便于排查线上问题（避免错误被静默吞没）
    console.error('[ErrorBoundary] 捕获到渲染错误:', error, info.componentStack);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 24, textAlign: 'center' }}>
          <h2 style={{ marginBottom: 12 }}>页面出错了</h2>
          <p style={{ color: 'var(--luzzy-error)', marginBottom: 16, wordBreak: 'break-word' }}>
            {this.state.error?.message ?? '未知错误'}
          </p>
          <button
            type="button"
            onClick={this.handleReset}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              background: 'var(--luzzy-primary)',
              color: 'var(--luzzy-on-primary)',
              cursor: 'pointer',
            }}
          >
            重试
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

/** 懒加载占位 */
function PageLoading(): ReactNode {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--luzzy-on-surface-variant)',
      }}
    >
      加载中...
    </div>
  );
}

export function App() {
  const theme = useSettingsStore((s) => s.theme);

  // 同步主题到 <html data-theme>
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  return (
    <ThemeProvider appearance={theme} themeMode={theme}>
      <ErrorBoundary>
        <MobileLayout>
          <Suspense fallback={<PageLoading />}>
            <Routes>
              <Route path="/" element={<Navigate to="/chat" replace />} />
              <Route path="/chat" element={<ChatPage />} />
              <Route path="/characters" element={<CharactersPage />} />
              <Route path="/trpg" element={<TrpgPage />} />
              <Route path="/tools" element={<ToolsPage />} />
              <Route path="/mine" element={<MinePage />} />
              <Route path="*" element={<Navigate to="/chat" replace />} />
            </Routes>
          </Suspense>
        </MobileLayout>
      </ErrorBoundary>
    </ThemeProvider>
  );
}
