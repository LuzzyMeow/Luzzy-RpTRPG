import { createStyles } from 'antd-style';
import { useLocation } from 'react-router-dom';
import { useSettingsStore } from '@/store/useSettingsStore';

const useStyles = createStyles(({ css }) => ({
  header: css`
    flex-shrink: 0;
    height: calc(var(--luzzy-appbar-height) + var(--luzzy-safe-area-top));
    padding-top: var(--luzzy-safe-area-top);
    padding-left: var(--luzzy-spacing-md);
    padding-right: var(--luzzy-spacing-md);
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: var(--luzzy-glass-bg-strong);
    backdrop-filter: blur(var(--luzzy-glass-blur-strong)) saturate(200%);
    -webkit-backdrop-filter: blur(var(--luzzy-glass-blur-strong)) saturate(200%);
    color: var(--luzzy-on-surface);
    border-bottom: var(--luzzy-glass-border-width) solid var(--luzzy-glass-border-color);
    box-shadow: var(--luzzy-glass-shadow);
    position: relative;
    z-index: 10;
  `,
  brand: css`
    font-size: 20px;
    font-weight: 700;
    letter-spacing: 1px;
    background: linear-gradient(135deg, var(--luzzy-primary), var(--luzzy-tertiary));
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    user-select: none;
  `,
  title: css`
    font-size: 17px;
    font-weight: 500;
    color: var(--luzzy-on-surface);
  `,
  actions: css`
    display: flex;
    align-items: center;
    gap: var(--luzzy-spacing-sm);
  `,
  iconBtn: css`
    width: 40px;
    height: 40px;
    border-radius: var(--luzzy-radius-full);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--luzzy-on-surface);
    background: var(--luzzy-glass-bg-subtle);
    backdrop-filter: blur(var(--luzzy-glass-blur-subtle));
    -webkit-backdrop-filter: blur(var(--luzzy-glass-blur-subtle));
    border: var(--luzzy-glass-border-width) solid var(--luzzy-glass-border-color);
    transition: all var(--luzzy-transition-glass);

    &:active {
      transform: scale(0.92);
      background: var(--luzzy-glass-bg);
    }
  `,
}));

const PAGE_TITLES: Record<string, string> = {
  '/chat': '聊天',
  '/characters': '角色',
  '/trpg': 'TRPG',
  '/tools': '工具',
  '/mine': '我的',
};

export function AppHeader() {
  const { styles } = useStyles();
  const location = useLocation();
  const theme = useSettingsStore((s) => s.theme);
  const toggleTheme = useSettingsStore((s) => s.toggleTheme);

  // 优先精确匹配，再回退到首段路径匹配（兼容未来可能的嵌套路由）
  const title =
    PAGE_TITLES[location.pathname] ??
    PAGE_TITLES['/' + (location.pathname.split('/')[1] ?? '')] ??
    'LUZZY';

  return (
    <header className={styles.header}>
      <div className={styles.brand}>LUZZY</div>
      <div className={styles.title}>{title}</div>
      <div className={styles.actions}>
        <button
          className={styles.iconBtn}
          onClick={toggleTheme}
          aria-label="切换主题"
          type="button"
        >
          {theme === 'light' ? <MoonIcon /> : <SunIcon />}
        </button>
      </div>
    </header>
  );
}

function SunIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}
