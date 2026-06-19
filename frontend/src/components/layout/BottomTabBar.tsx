import { createStyles } from 'antd-style';
import { useLocation, useNavigate } from 'react-router-dom';
import type { TabIconName, TabItem } from '@/types';

const useStyles = createStyles(({ css }) => ({
  tabbar: css`
    flex-shrink: 0;
    height: calc(var(--luzzy-tabbar-height) + var(--luzzy-safe-area-bottom));
    padding-bottom: var(--luzzy-safe-area-bottom);
    display: flex;
    align-items: stretch;
    background: var(--luzzy-glass-bg-strong);
    backdrop-filter: blur(var(--luzzy-glass-blur-strong)) saturate(200%);
    -webkit-backdrop-filter: blur(var(--luzzy-glass-blur-strong)) saturate(200%);
    border-top: var(--luzzy-glass-border-width) solid var(--luzzy-glass-border-color);
    box-shadow: var(--luzzy-glass-shadow);
    position: relative;
    z-index: 10;
  `,
  tab: css`
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    color: var(--luzzy-on-surface-variant);
    transition: color var(--luzzy-transition), transform var(--luzzy-transition);
    user-select: none;
    -webkit-tap-highlight-color: transparent;
    position: relative;

    &:active {
      transform: scale(0.92);
    }
  `,
  tabActive: css`
    color: var(--luzzy-primary);
  `,
  tabIcon: css`
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform var(--luzzy-transition-glass);
  `,
  tabActiveIcon: css`
    transform: scale(1.1);
  `,
  tabLabel: css`
    font-size: 11px;
    font-weight: 500;
    line-height: 1;
  `,
  trpgTab: css`
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    color: var(--luzzy-on-surface-variant);
    transition: color var(--luzzy-transition), transform var(--luzzy-transition);
    user-select: none;
    -webkit-tap-highlight-color: transparent;
    position: relative;

    &:active {
      transform: scale(0.92);
    }
  `,
  trpgActive: css`
    color: #8b5cf6;
  `,
  trpgBadge: css`
    position: absolute;
    top: 6px;
    right: 50%;
    transform: translateX(20px);
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #8b5cf6;
    box-shadow: 0 0 4px rgba(139, 92, 246, 0.6);
  `,
}));

const TABS: TabItem[] = [
  { key: 'chat', label: '聊天', icon: 'chat', path: '/chat' },
  { key: 'characters', label: '角色', icon: 'characters', path: '/characters' },
  { key: 'trpg', label: 'TRPG', icon: 'trpg', path: '/trpg' },
  { key: 'tools', label: '工具', icon: 'tools', path: '/tools' },
  { key: 'mine', label: '我的', icon: 'mine', path: '/mine' },
];

export function BottomTabBar() {
  const { styles, cx } = useStyles();
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className={styles.tabbar}>
      {TABS.map((tab) => {
        const active = location.pathname === tab.path || location.pathname.startsWith(tab.path + '/');
        const isTrpg = tab.key === 'trpg';
        return (
          <button
            key={tab.key}
            type="button"
            className={cx(
              isTrpg ? styles.trpgTab : styles.tab,
              active && (isTrpg ? styles.trpgActive : styles.tabActive),
            )}
            onClick={() => navigate(tab.path)}
            aria-label={tab.label}
            aria-current={active ? 'page' : undefined}
          >
            <span className={cx(styles.tabIcon, active && styles.tabActiveIcon)}>
              <TabIcon name={tab.icon} active={active} isTrpg={isTrpg} />
            </span>
            {isTrpg && !active && <span className={styles.trpgBadge} />}
            <span className={styles.tabLabel}>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function TabIcon({ name, active, isTrpg }: { name: TabIconName; active: boolean; isTrpg?: boolean }) {
  const color = active
    ? isTrpg
      ? '#8b5cf6'
      : 'var(--luzzy-primary)'
    : 'var(--luzzy-on-surface-variant)';
  const common = {
    width: 24,
    height: 24,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: color,
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  switch (name) {
    case 'chat':
      return (
        <svg {...common}>
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      );
    case 'characters':
      return (
        <svg {...common}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case 'trpg':
      return (
        <svg {...common}>
          <rect x="2" y="6" width="20" height="12" rx="2" />
          <path d="M6 12h.01M10 12h.01M14 12h.01M18 12h.01" />
          <path d="M7 18v2M17 18v2" />
        </svg>
      );
    case 'tools':
      return (
        <svg {...common}>
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
        </svg>
      );
    case 'mine':
      return (
        <svg {...common}>
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      );
    default:
      return null;
  }
}
