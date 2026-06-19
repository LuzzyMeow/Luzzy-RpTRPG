/**
 * TRPG 模式页面
 *
 * 独立菜单项，iframe 嵌入 AI Sandbox Game。
 * - 首次进入弹出说明弹窗
 * - 使用 v-show 保活 iframe 状态
 * - 推送 API 配置到原生代理层
 * - 液态玻璃风格加载遮罩
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { createStyles } from 'antd-style';
import { Modal, Switch, Button, message } from 'antd';
import { useSettingsStore } from '@/store/useSettingsStore';

const useStyles = createStyles(({ css }) => ({
  page: css`
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    position: relative;
    background: var(--luzzy-background);
  `,
  iframe: css`
    flex: 1;
    width: 100%;
    height: 100%;
    border: none;
    background: #000;
  `,
  loadingOverlay: css`
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--luzzy-spacing-md);
    background: var(--luzzy-glass-bg-strong);
    backdrop-filter: blur(var(--luzzy-glass-blur-strong)) saturate(200%);
    -webkit-backdrop-filter: blur(var(--luzzy-glass-blur-strong)) saturate(200%);
    z-index: 5;
    transition: opacity var(--luzzy-transition-glass);
  `,
  loadingHidden: css`
    opacity: 0;
    pointer-events: none;
  `,
  loadingText: css`
    font-size: 16px;
    font-weight: 500;
    color: var(--luzzy-on-surface);
  `,
  loadingSubtext: css`
    font-size: 13px;
    color: var(--luzzy-on-surface-variant);
  `,
  spinner: css`
    width: 40px;
    height: 40px;
    border: 3px solid var(--luzzy-glass-bg-subtle);
    border-top-color: var(--luzzy-primary);
    border-radius: 50%;
    animation: luzzy-spin 0.8s linear infinite;
  `,
  toolbar: css`
    position: absolute;
    top: var(--luzzy-spacing-sm);
    right: var(--luzzy-spacing-sm);
    display: flex;
    gap: var(--luzzy-spacing-xs);
    z-index: 4;
  `,
  toolBtn: css`
    width: 36px;
    height: 36px;
    border-radius: var(--luzzy-radius-full);
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--luzzy-glass-bg-strong);
    backdrop-filter: blur(var(--luzzy-glass-blur)) saturate(180%);
    -webkit-backdrop-filter: blur(var(--luzzy-glass-blur)) saturate(180%);
    border: var(--luzzy-glass-border-width) solid var(--luzzy-glass-border-color);
    box-shadow: var(--luzzy-glass-shadow);
    color: var(--luzzy-on-surface);
    cursor: pointer;
    transition: all var(--luzzy-transition-glass);

    &:active {
      transform: scale(0.92);
    }
  `,
  proxyConfig: css`
    display: flex;
    flex-direction: column;
    gap: var(--luzzy-spacing-md);
  `,
  proxyInfo: css`
    padding: var(--luzzy-spacing-md);
    background: var(--luzzy-glass-bg);
    backdrop-filter: blur(var(--luzzy-glass-blur)) saturate(180%);
    -webkit-backdrop-filter: blur(var(--luzzy-glass-blur)) saturate(180%);
    border: var(--luzzy-glass-border-width) solid var(--luzzy-glass-border-color);
    border-radius: var(--luzzy-radius-md);
    font-size: 13px;
    line-height: 1.6;
    color: var(--luzzy-on-surface-variant);
  `,
  proxyField: css`
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--luzzy-spacing-sm) 0;
    border-bottom: 1px solid var(--luzzy-outline-variant);

    &:last-child {
      border-bottom: none;
    }
  `,
  proxyLabel: css`
    font-weight: 500;
    color: var(--luzzy-on-surface);
  `,
  proxyValue: css`
    color: var(--luzzy-on-surface-variant);
    font-family: monospace;
    font-size: 12px;
  `,
}));

const TRPG_URL = 'https://aisandboxgame.com/';
const TRPG_DISMISS_KEY = 'luzzy_trpg_dismissed';

export function TrpgPage() {
  const { styles, cx } = useStyles();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showIntro, setShowIntro] = useState(false);
  const [showProxyConfig, setShowProxyConfig] = useState(false);
  const [dismissThisSession, setDismissThisSession] = useState(false);

  const settings = useSettingsStore();

  // 首次进入检查
  useEffect(() => {
    const dismissed = sessionStorage.getItem(TRPG_DISMISS_KEY);
    if (!dismissed) {
      setShowIntro(true);
    }
  }, []);

  // 推送 API 配置到原生代理层
  const pushApiConfigToNative = useCallback(() => {
    const config = {
      apiUrl: settings.apiUrl,
      apiKey: settings.apiKey,
      modelName: settings.modelName,
      enableThinking: settings.enableThinking,
      customRequestBody: settings.customRequestBody || '',
    };
    // 写入 localStorage 供原生层读取
    try {
      localStorage.setItem('luzzy_trpg_proxy_config', JSON.stringify(config));
    } catch (e) {
      console.error('[TRPG] 推送配置失败:', e);
    }
  }, [
    settings.apiUrl,
    settings.apiKey,
    settings.modelName,
    settings.enableThinking,
    settings.customRequestBody,
  ]);

  // 页面加载时推送配置
  useEffect(() => {
    pushApiConfigToNative();
  }, [pushApiConfigToNative]);

  const handleIframeLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

  const handleIntroClose = useCallback(() => {
    setShowIntro(false);
    if (dismissThisSession) {
      sessionStorage.setItem(TRPG_DISMISS_KEY, '1');
    }
  }, [dismissThisSession]);

  const handleRefresh = useCallback(() => {
    if (iframeRef.current) {
      setIsLoading(true);
      iframeRef.current.src = TRPG_URL;
    }
  }, []);

  return (
    <div className={styles.page}>
      {/* iframe - 使用 v-show 保活 */}
      <iframe
        ref={iframeRef}
        className={styles.iframe}
        src={TRPG_URL}
        onLoad={handleIframeLoad}
        title="TRPG"
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
        style={{ display: isLoading ? 'none' : 'block' }}
      />

      {/* 加载遮罩 */}
      <div className={cx(styles.loadingOverlay, !isLoading && styles.loadingHidden)}>
        <div className={styles.spinner} />
        <div className={styles.loadingText}>正在加载 TRPG 模式</div>
        <div className={styles.loadingSubtext}>正在连接 AI Sandbox Game...</div>
      </div>

      {/* 工具栏 */}
      <div className={styles.toolbar}>
        <button
          className={styles.toolBtn}
          onClick={handleRefresh}
          aria-label="刷新"
          type="button"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 4v6h-6M1 20v-6h6" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
        </button>
        <button
          className={styles.toolBtn}
          onClick={() => setShowProxyConfig(true)}
          aria-label="代理配置"
          type="button"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>

      {/* 首次说明弹窗 */}
      <Modal
        open={showIntro}
        onCancel={handleIntroClose}
        title="TRPG 模式说明"
        width="90%"
        centered
        footer={[
          <Button key="cancel" onClick={handleIntroClose}>
            稍后再看
          </Button>,
          <Button key="ok" type="primary" onClick={handleIntroClose}>
            我已了解，开始游戏
          </Button>,
        ]}
      >
        <div style={{ lineHeight: 1.8, fontSize: 14 }}>
          <p style={{ marginBottom: 12 }}>
            <strong>TRPG 模式</strong>嵌入 AI Sandbox Game 网页，通过本地代理服务器连接 LUZZY 的 API 配置。
          </p>
          <p style={{ marginBottom: 12, fontWeight: 500 }}>配置步骤：</p>
          <ol style={{ paddingLeft: 20, marginBottom: 12 }}>
            <li style={{ marginBottom: 6 }}>在 LUZZY 主设置中配置好 API 地址和 API Key</li>
            <li style={{ marginBottom: 6 }}>进入 TRPG 网页的 API 设置中添加自定义供应商</li>
            <li style={{ marginBottom: 6 }}>
              API 地址填：<code style={{ background: 'var(--luzzy-surface-container-high)', padding: '2px 6px', borderRadius: 4 }}>
                http://localhost:18527/v1
              </code>
            </li>
            <li style={{ marginBottom: 6 }}>API Key 随便填（占位符，实际使用 LUZZY 的 Key）</li>
            <li style={{ marginBottom: 6 }}>模型名自由设置（如 <code>DeepSeek-V4-Pro</code>，无需在 LUZZY 预先配置）</li>
          </ol>
          <div style={{
            padding: 12,
            background: 'var(--luzzy-surface-container-high)',
            borderRadius: 8,
            fontSize: 13,
            color: 'var(--luzzy-on-surface-variant)',
          }}>
            <strong>注意：</strong>
            <ul style={{ paddingLeft: 20, marginTop: 4 }}>
              <li>TRPG 模式下 MCP 和 SKILL 工具不生效</li>
              <li>API 请求体高级设置在 TRPG 模式下同样生效</li>
              <li>iframe 状态保持，切换到其他功能再切回不会丢失网页状态</li>
            </ul>
          </div>
          <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Switch
              checked={dismissThisSession}
              onChange={setDismissThisSession}
              size="small"
            />
            <span style={{ fontSize: 13, color: 'var(--luzzy-on-surface-variant)' }}>
              本次不再提示
            </span>
          </div>
        </div>
      </Modal>

      {/* 代理配置弹窗 */}
      <Modal
        open={showProxyConfig}
        onCancel={() => setShowProxyConfig(false)}
        title="TRPG 代理配置"
        width="90%"
        centered
        footer={[
          <Button key="close" onClick={() => setShowProxyConfig(false)}>
            关闭
          </Button>,
          <Button
            key="push"
            type="primary"
            onClick={() => {
              pushApiConfigToNative();
              message.success('配置已推送到代理服务器');
            }}
          >
            重新推送配置
          </Button>,
        ]}
      >
        <div className={styles.proxyConfig}>
          <div className={styles.proxyInfo}>
            <div className={styles.proxyField}>
              <span className={styles.proxyLabel}>代理地址</span>
              <span className={styles.proxyValue}>http://localhost:18527/v1</span>
            </div>
            <div className={styles.proxyField}>
              <span className={styles.proxyLabel}>API 地址</span>
              <span className={styles.proxyValue}>{settings.apiUrl || '未配置'}</span>
            </div>
            <div className={styles.proxyField}>
              <span className={styles.proxyLabel}>API Key</span>
              <span className={styles.proxyValue}>
                {settings.apiKey ? `${settings.apiKey.slice(0, 8)}****` : '未配置'}
              </span>
            </div>
            <div className={styles.proxyField}>
              <span className={styles.proxyLabel}>模型名</span>
              <span className={styles.proxyValue}>{settings.modelName || '未配置'}</span>
            </div>
            <div className={styles.proxyField}>
              <span className={styles.proxyLabel}>深度思考</span>
              <span className={styles.proxyValue}>
                {settings.enableThinking ? '已启用' : '未启用'}
              </span>
            </div>
          </div>
          <p style={{ fontSize: 13, color: 'var(--luzzy-on-surface-variant)', lineHeight: 1.6 }}>
            代理配置会自动推送到原生层。如果 TRPG 网页内请求异常，可点击「重新推送配置」。
          </p>
        </div>
      </Modal>
    </div>
  );
}
