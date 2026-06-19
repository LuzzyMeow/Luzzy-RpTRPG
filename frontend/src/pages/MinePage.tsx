/**
 * MinePage ——「我的」页面
 *
 * 将原 SettingsPage（API / 供应商 / 模型模式 / 用户档案 / 外观 / 关于）
 * 与 MorePage（记忆 / 预设 / 世界书 / 正则 / UI 模板 / 关于）合并为单一可滚动页面。
 *
 * 设计：液态玻璃（glassmorphism）+ antd Collapse 折叠面板。
 * 持久化：设置类走 zustand store；列表类（预设 / 世界书 / 正则 / UI 模板 / 记忆 / 生成参数）
 *         通过 getItem/setItem 直接读写 IndexedDB。
 */
import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { createStyles } from 'antd-style';
import {
  Collapse,
  Input,
  Switch,
  Select,
  Button,
  Divider,
  Modal,
  message,
  Tag,
  Slider,
} from 'antd';
import { Markdown } from '@lobehub/ui';
import { v4 as uuidv4 } from 'uuid';
import { useSettingsStore } from '@/store/useSettingsStore';
import { parseModelName } from '@/services/providerService';
import { getItem, setItem, getAllKeys } from '@/services/storage';
import { BUILTIN_PRESET_DEFAULTS, BUILTIN_PRESET_NAME_SET } from '@/services/presetContent';
import type {
  ApiProvider,
  ThemeMode,
  Preset,
  WorldInfoEntry,
  RegexScript,
  UiTemplate,
  MemorySettings,
  GlobalMemory,
  VectorMemoryShard,
} from '@/types';

// ============================================================================
// 样式
// ============================================================================

const useStyles = createStyles(({ css }) => ({
  page: css`
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  `,
  scroll: css`
    flex: 1;
    overflow-y: auto;
    padding: var(--luzzy-spacing-md);
    -webkit-overflow-scrolling: touch;
  `,
  header: css`
    padding: var(--luzzy-spacing-sm) var(--luzzy-spacing-xs) var(--luzzy-spacing-md);
  `,
  headerTitle: css`
    font-size: 22px;
    font-weight: 700;
    color: var(--luzzy-on-surface);
    letter-spacing: 1px;
  `,
  headerSub: css`
    font-size: 12px;
    color: var(--luzzy-on-surface-variant);
    margin-top: 4px;
  `,
  collapse: css`
    background: transparent !important;
    border: none !important;
  `,
  glassPanel: css`
    background: var(--luzzy-glass-bg) !important;
    backdrop-filter: blur(var(--luzzy-glass-blur)) saturate(180%);
    -webkit-backdrop-filter: blur(var(--luzzy-glass-blur)) saturate(180%);
    border: 1px solid var(--luzzy-glass-border-color) !important;
    border-radius: var(--luzzy-radius-md) !important;
    box-shadow: var(--luzzy-glass-shadow);
    margin-bottom: var(--luzzy-spacing-md);
    overflow: hidden;

    & > .ant-collapse-header {
      background: transparent !important;
      align-items: center !important;
      padding: 14px 16px !important;
    }
    & > .ant-collapse-content {
      background: transparent !important;
      border-top: 1px solid var(--luzzy-outline-variant);
    }
    .ant-collapse-content-box {
      padding: var(--luzzy-spacing-md) !important;
    }
  `,
  panelLabel: css`
    display: flex;
    align-items: center;
    gap: var(--luzzy-spacing-sm);
    flex: 1;
    min-width: 0;
  `,
  panelIndex: css`
    width: 24px;
    height: 24px;
    border-radius: var(--luzzy-radius-full);
    background: var(--luzzy-primary-container);
    color: var(--luzzy-on-primary-container);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 700;
    flex-shrink: 0;
  `,
  panelTitle: css`
    font-size: 15px;
    font-weight: 600;
    color: var(--luzzy-on-surface);
  `,
  panelDesc: css`
    font-size: 11px;
    color: var(--luzzy-on-surface-variant);
    line-height: 1.3;
  `,
  group: css`
    background: var(--luzzy-glass-bg-subtle);
    border: 1px solid var(--luzzy-glass-border-color);
    border-radius: var(--luzzy-radius-sm);
    overflow: hidden;
    margin-bottom: var(--luzzy-spacing-sm);
  `,
  subGroupTitle: css`
    font-size: 12px;
    font-weight: 600;
    color: var(--luzzy-primary);
    margin: var(--luzzy-spacing-sm) 0 var(--luzzy-spacing-xs);
    padding-left: var(--luzzy-spacing-xs);
    letter-spacing: 0.3px;
  `,
  row: css`
    display: flex;
    flex-direction: column;
    gap: var(--luzzy-spacing-xs);
    padding: var(--luzzy-spacing-md);
    border-bottom: 1px solid var(--luzzy-outline-variant);

    &:last-child {
      border-bottom: none;
    }
  `,
  rowInline: css`
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: var(--luzzy-spacing-md);
    min-height: 44px;
  `,
  label: css`
    font-size: 14px;
    color: var(--luzzy-on-surface);
    font-weight: 500;
  `,
  desc: css`
    font-size: 12px;
    color: var(--luzzy-on-surface-variant);
    line-height: 1.4;
  `,
  input: css`
    .ant-input,
    .ant-input-affix-wrapper,
    .ant-input-password,
    .ant-select .ant-select-selector,
    .ant-input-number {
      background: var(--luzzy-glass-bg-strong) !important;
      border-color: var(--luzzy-outline-variant) !important;
      color: var(--luzzy-on-surface) !important;
      border-radius: var(--luzzy-radius-sm) !important;
      min-height: 44px;
    }

    .ant-select {
      width: 100%;
      min-height: 44px;
    }
  `,
  textarea: css`
    .ant-input {
      background: var(--luzzy-glass-bg-strong) !important;
      border-color: var(--luzzy-outline-variant) !important;
      color: var(--luzzy-on-surface) !important;
      border-radius: var(--luzzy-radius-sm) !important;
      min-height: 80px;
      font-family: 'JetBrains Mono', 'Fira Code', Consolas, monospace;
      font-size: 13px;
    }
  `,
  errorText: css`
    color: var(--luzzy-error);
    font-size: 12px;
    margin-top: 4px;
  `,
  hint: css`
    color: var(--luzzy-on-surface-variant);
    font-size: 12px;
    line-height: 1.5;
    padding: var(--luzzy-spacing-sm);
    background: var(--luzzy-glass-bg-subtle);
    border-radius: var(--luzzy-radius-sm);
  `,
  cardItem: css`
    background: var(--luzzy-glass-bg-strong);
    border: 1px solid var(--luzzy-glass-border-color);
    border-radius: var(--luzzy-radius-sm);
    padding: var(--luzzy-spacing-sm) var(--luzzy-spacing-md);
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-bottom: var(--luzzy-spacing-xs);
  `,
  cardHeader: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--luzzy-spacing-sm);
    min-height: 36px;
  `,
  cardName: css`
    font-size: 14px;
    font-weight: 500;
    color: var(--luzzy-on-surface);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
    min-width: 0;
  `,
  cardActions: css`
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
  `,
  actionBtn: css`
    min-width: 32px;
    min-height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--luzzy-on-surface-variant);
    border-radius: var(--luzzy-radius-sm);
    background: transparent;
    border: none;
    cursor: pointer;

    &:active {
      background: var(--luzzy-surface-container);
    }
  `,
  empty: css`
    padding: var(--luzzy-spacing-md);
    text-align: center;
    color: var(--luzzy-on-surface-variant);
    font-size: 13px;
  `,
  modelModeGroup: css`
    display: flex;
    gap: var(--luzzy-spacing-xs);
  `,
  modelModeBtn: css`
    flex: 1;
    min-height: 44px;
    border-radius: var(--luzzy-radius-sm);
    border: 1px solid var(--luzzy-outline-variant);
    background: var(--luzzy-glass-bg-strong);
    color: var(--luzzy-on-surface);
    font-size: 13px;
    font-weight: 500;
    padding: 8px 12px;
    transition: all var(--luzzy-transition);
    cursor: pointer;

    &.active {
      background: var(--luzzy-primary);
      color: var(--luzzy-on-primary);
      border-color: var(--luzzy-primary);
    }
  `,
  providerItem: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--luzzy-spacing-sm) var(--luzzy-spacing-md);
    border-bottom: 1px solid var(--luzzy-outline-variant);
    min-height: 44px;
    gap: var(--luzzy-spacing-sm);

    &:last-child {
      border-bottom: none;
    }
  `,
  providerInfo: css`
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
    min-width: 0;
  `,
  providerName: css`
    font-size: 14px;
    color: var(--luzzy-on-surface);
    font-weight: 500;
  `,
  providerMeta: css`
    font-size: 12px;
    color: var(--luzzy-on-surface-variant);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  providerActions: css`
    display: flex;
    align-items: center;
    gap: var(--luzzy-spacing-xs);
    flex-shrink: 0;
  `,
  aboutText: css`
    color: var(--luzzy-on-surface-variant);
    font-size: 13px;
    line-height: 1.6;
    padding: var(--luzzy-spacing-md);
    background: var(--luzzy-glass-bg-subtle);
    border: 1px solid var(--luzzy-glass-border-color);
    border-radius: var(--luzzy-radius-md);
  `,
  brand: css`
    text-align: center;
    padding: var(--luzzy-spacing-lg) 0;
    color: var(--luzzy-on-surface-variant);
    font-size: 12px;
  `,
  brandName: css`
    font-size: 18px;
    font-weight: 700;
    color: var(--luzzy-primary);
    letter-spacing: 2px;
    margin-bottom: 4px;
  `,
  sliderRow: css`
    display: flex;
    align-items: center;
    gap: var(--luzzy-spacing-md);
  `,
  sliderValue: css`
    font-size: 13px;
    font-weight: 600;
    color: var(--luzzy-primary);
    min-width: 40px;
    text-align: right;
  `,
  shardItem: css`
    padding: var(--luzzy-spacing-sm);
    background: var(--luzzy-glass-bg-strong);
    border: 1px solid var(--luzzy-glass-border-color);
    border-radius: var(--luzzy-radius-sm);
    margin-bottom: 4px;
    font-size: 12px;
    color: var(--luzzy-on-surface-variant);
    line-height: 1.4;
  `,
  shardMeta: css`
    display: flex;
    gap: var(--luzzy-spacing-sm);
    margin-bottom: 2px;
    font-size: 11px;
  `,
}));

// ============================================================================
// 类型与常量
// ============================================================================

type ModelMode = 'quality' | 'balanced' | 'fast';
type PersonMode = 'first' | 'second' | 'third';

interface CustomProviderForm {
  id: string;
  name: string;
  apiUrl: string;
  /** 编辑模式下的原 ID（不可变） */
  editingId: string | null;
}

interface PresetForm {
  name: string;
  content: string;
}

interface WorldInfoForm {
  keys: string;
  content: string;
  enabled: boolean;
  constant: boolean;
  order: number;
  position: number;
  depth: number;
  probability: number;
}

interface RegexForm {
  name: string;
  findRegex: string;
  replaceString: string;
  enabled: boolean;
  placement: number;
  mode: number;
  depth: number;
}

interface UiTemplateForm {
  name: string;
  content: string;
  enabled: boolean;
}

interface GenerationParams {
  contextSize: number;
  temperature: number;
}

const MODEL_MODE_OPTIONS: Array<{ value: ModelMode; label: string; desc: string }> = [
  { value: 'quality', label: '高质量', desc: '最强推理' },
  { value: 'balanced', label: '均衡', desc: '速度平衡' },
  { value: 'fast', label: '快速', desc: '最快响应' },
];

const PERSON_OPTIONS: Array<{ value: PersonMode; label: string }> = [
  { value: 'first', label: '第一人称' },
  { value: 'second', label: '第二人称' },
  { value: 'third', label: '第三人称' },
];

const THEME_OPTIONS: Array<{ value: ThemeMode; label: string }> = [
  { value: 'light', label: '亮色' },
  { value: 'dark', label: '暗色' },
];

const DEFAULT_MEMORY_SETTINGS: MemorySettings = {
  enabled: false,
  embeddingModel: '',
  embeddingApiProviderId: '',
  maxMemories: 100,
  recallDepth: 10,
  vectorTopK: 5,
  similarityThreshold: 0.7,
  compressionEnabled: false,
  compressionKeepRecent: 10,
};

const DEFAULT_GENERATION_PARAMS: GenerationParams = {
  contextSize: 16384,
  temperature: 1.0,
};

/** 全局记忆在 IndexedDB 中的存储键（与 memoryService 保持一致） */
const GLOBAL_MEMORY_STORAGE_KEY = 'global_memory';
/** 生成参数在 IndexedDB 中的存储键 */
const GENERATION_PARAMS_STORAGE_KEY = 'generationParams';
/** 向量记忆分片存储键前缀（与 memoryService 保持一致） */
const VECTOR_MEMORY_STORAGE_KEY_PREFIX = 'vector_memory_';

// ============================================================================
// 主组件
// ============================================================================

export function MinePage() {
  const { styles } = useStyles();

  const items = [
    {
      key: 'api',
      label: <PanelLabel index={1} title="API 连接与服务" desc="供应商、密钥、模型与请求体" />,
      children: <ApiSection />,
      className: styles.glassPanel,
    },
    {
      key: 'gen',
      label: <PanelLabel index={2} title="生成参数" desc="上下文长度、温度与模型模式" />,
      children: <GenerationSection />,
      className: styles.glassPanel,
    },
    {
      key: 'memory',
      label: <PanelLabel index={3} title="记忆引擎" desc="向量记忆、全局记忆与压缩" />,
      children: <MemorySection />,
      className: styles.glassPanel,
    },
    {
      key: 'preset',
      label: <PanelLabel index={4} title="预设管理" desc="系统提示词模板" />,
      children: <PresetSection />,
      className: styles.glassPanel,
    },
    {
      key: 'world',
      label: <PanelLabel index={5} title="世界书" desc="关键词触发与常驻词条" />,
      children: <WorldInfoSection />,
      className: styles.glassPanel,
    },
    {
      key: 'regex',
      label: <PanelLabel index={6} title="正则脚本" desc="文本替换与处理" />,
      children: <RegexSection />,
      className: styles.glassPanel,
    },
    {
      key: 'ui',
      label: <PanelLabel index={7} title="UI 模板" desc="自定义消息渲染模板" />,
      children: <UiTemplateSection />,
      className: styles.glassPanel,
    },
    {
      key: 'profile',
      label: <PanelLabel index={8} title="用户档案" desc="多档案与叙事人称" />,
      children: <UserProfileSection />,
      className: styles.glassPanel,
    },
    {
      key: 'appearance',
      label: <PanelLabel index={9} title="外观" desc="亮色 / 暗色主题" />,
      children: <AppearanceSection />,
      className: styles.glassPanel,
    },
    {
      key: 'about',
      label: <PanelLabel index={10} title="关于 LUZZY" desc="应用信息与技术栈" />,
      children: <AboutSection />,
      className: styles.glassPanel,
    },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.scroll}>
        <div className={styles.header}>
          <div className={styles.headerTitle}>我的</div>
          <div className={styles.headerSub}>设置、记忆、预设与世界书</div>
        </div>
        <Collapse
          bordered={false}
          ghost
          items={items}
          className={styles.collapse}
          defaultActiveKey={['api']}
        />
        <Divider style={{ margin: '8px 0 16px' }} />
        <div className={styles.brand}>
          <div className={styles.brandName}>LUZZY</div>
          <div>版本 1.0.0</div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 面板标题
// ============================================================================

function PanelLabel({
  index,
  title,
  desc,
}: {
  index: number;
  title: string;
  desc?: string;
}) {
  const { styles } = useStyles();
  return (
    <div className={styles.panelLabel}>
      <span className={styles.panelIndex}>{index}</span>
      <span>
        <div className={styles.panelTitle}>{title}</div>
        {desc && <div className={styles.panelDesc}>{desc}</div>}
      </span>
    </div>
  );
}

// ============================================================================
// Section 1: API 连接与服务
// ============================================================================

function ApiSection() {
  const { styles } = useStyles();
  const [messageApi, contextHolder] = message.useMessage();
  const settings = useSettingsStore();

  const [providerModalOpen, setProviderModalOpen] = useState(false);
  const [providerForm, setProviderForm] = useState<CustomProviderForm>({
    id: '',
    name: '',
    apiUrl: '',
    editingId: null,
  });

  const requestBodyValidation = useMemo(
    () => settings.validateCustomRequestBody(),
    [settings.customRequestBody, settings.validateCustomRequestBody],
  );

  const modelValidation = useMemo(() => {
    if (!settings.modelName.trim()) return { valid: true, error: '' };
    const { providerId, modelName } = parseModelName(settings.modelName);
    if (!providerId) {
      return {
        valid: false,
        error: '模型名应包含供应商前缀，格式: <providerId>_<model_name>',
      };
    }
    if (!modelName) return { valid: false, error: '模型名不能为空' };
    if (!settings.getAllProviders().some((p) => p.id === providerId)) {
      return { valid: false, error: `供应商 "${providerId}" 不存在` };
    }
    return { valid: true, error: '' };
  }, [settings.modelName, settings.customApiProviders, settings.getAllProviders]);

  /** 模型快速选择候选项（来自三档模型槽 + 当前模型名，去重） */
  const modelOptions = useMemo(() => {
    const set = new Set<string>();
    [settings.qualityModel, settings.balancedModel, settings.fastModel, settings.modelName].forEach(
      (m) => {
        if (m && m.trim()) set.add(m.trim());
      },
    );
    return Array.from(set).map((m) => ({ value: m, label: m }));
  }, [settings.qualityModel, settings.balancedModel, settings.fastModel, settings.modelName]);

  const handleProviderChange = (providerId: string): void => {
    const provider = settings.getAllProviders().find((p) => p.id === providerId);
    if (provider) {
      settings.selectApiProvider(provider);
      messageApi.success(`已切换到 ${provider.name}`);
    }
  };

  const handleModelNameChange = (e: ChangeEvent<HTMLInputElement>): void => {
    settings.setModelName(e.target.value);
  };

  const handleOpenAddProvider = (): void => {
    setProviderForm({ id: '', name: '', apiUrl: '', editingId: null });
    setProviderModalOpen(true);
  };

  const handleOpenEditProvider = (provider: ApiProvider): void => {
    setProviderForm({ id: provider.id, name: provider.name, apiUrl: provider.apiUrl, editingId: provider.id });
    setProviderModalOpen(true);
  };

  const handleSaveProvider = (): void => {
    const { id, name, apiUrl, editingId } = providerForm;
    if (!name.trim()) {
      messageApi.error('供应商名称不能为空');
      return;
    }
    if (!apiUrl.trim()) {
      messageApi.error('API URL 不能为空');
      return;
    }
    try {
      new URL(apiUrl.trim());
    } catch {
      messageApi.error('API URL 格式无效');
      return;
    }

    if (editingId) {
      // 编辑：直接更新 customApiProviders（不触发 removeCustomProvider 的级联清理）
      useSettingsStore.setState((state) => {
        const customApiProviders = state.customApiProviders.map((p) =>
          p.id === editingId ? { ...p, name: name.trim(), apiUrl: apiUrl.trim() } : p,
        );
        const updates: Partial<ReturnType<typeof useSettingsStore.getState>> = { customApiProviders };
        if (state.apiProviderId === editingId) updates.apiUrl = apiUrl.trim();
        return updates;
      });
      messageApi.success('供应商已更新');
      setProviderModalOpen(false);
      return;
    }

    // 新增
    if (!id.trim()) {
      messageApi.error('供应商 ID 不能为空');
      return;
    }
    if (!/^[a-zA-Z]+$/.test(id.trim())) {
      messageApi.error('供应商 ID 只能包含英文字母');
      return;
    }
    try {
      settings.addCustomProvider({
        id: id.trim(),
        name: name.trim(),
        apiUrl: apiUrl.trim(),
        isBuiltin: false,
      });
      messageApi.success(`已添加供应商 ${name}`);
      setProviderModalOpen(false);
    } catch (e) {
      messageApi.error(e instanceof Error ? e.message : '添加失败');
    }
  };

  const handleRemoveProvider = (provider: ApiProvider): void => {
    if (provider.isBuiltin) {
      messageApi.warning('内置供应商不可删除');
      return;
    }
    settings.removeCustomProvider(provider.id);
    messageApi.success(`已删除供应商 ${provider.name}`);
  };

  /** 多供应商密钥：当前供应商走 setApiKey（同步到 key 槽），其余走 setProviderKey */
  const handleProviderKeyChange = (providerId: string, value: string): void => {
    if (providerId === settings.apiProviderId) {
      settings.setApiKey(value);
    } else {
      settings.setProviderKey(providerId, value);
    }
  };

  return (
    <div>
      {contextHolder}

      <div className={styles.group}>
        {/* 供应商选择 */}
        <div className={styles.row}>
          <label className={styles.label}>供应商</label>
          <span className={styles.desc}>切换后自动填充 URL 与 Key</span>
          <div className={styles.input}>
            <Select
              value={settings.apiProviderId}
              onChange={handleProviderChange}
              options={settings.getAllProviders().map((p) => ({
                value: p.id,
                label: p.isBuiltin ? `${p.name}（内置）` : p.name,
              }))}
              showSearch
              optionFilterProp="label"
              placeholder="选择供应商"
            />
          </div>
        </div>

        {/* API URL */}
        <div className={styles.row}>
          <label className={styles.label}>API URL</label>
          <span className={styles.desc}>OpenAI 兼容的 API 接口地址</span>
          <div className={styles.input}>
            <Input
              value={settings.apiUrl}
              onChange={(e) => settings.setApiUrl(e.target.value)}
              placeholder="https://api.example.com/v1"
              autoComplete="off"
              spellCheck={false}
            />
          </div>
        </div>

        {/* API Key */}
        <div className={styles.row}>
          <label className={styles.label}>API Key</label>
          <span className={styles.desc}>用于鉴权的密钥，仅存储在本地</span>
          <div className={styles.input}>
            <Input.Password
              value={settings.apiKey}
              onChange={(e) => settings.setApiKey(e.target.value)}
              placeholder="sk-..."
              autoComplete="off"
              spellCheck={false}
              visibilityToggle
            />
          </div>
        </div>

        {/* 模型名 */}
        <div className={styles.row}>
          <label className={styles.label}>模型名</label>
          <span className={styles.desc}>
            格式: <code>{`<providerId>_<model_name>`}</code>，例如 sta1n_glm-4.6
          </span>
          <div className={styles.input}>
            <Input
              value={settings.modelName}
              onChange={handleModelNameChange}
              placeholder="sta1n_glm-4.6"
              autoComplete="off"
              spellCheck={false}
              status={modelValidation.valid ? undefined : 'error'}
            />
          </div>
          {!modelValidation.valid && (
            <div className={styles.errorText}>{modelValidation.error}</div>
          )}
          {modelOptions.length > 0 && (
            <div className={styles.input}>
              <Select
                placeholder="快速选择已配置的模型"
                options={modelOptions}
                showSearch
                allowClear
                value={undefined}
                onChange={(value: string) => value && settings.setModelName(value)}
              />
            </div>
          )}
        </div>

        {/* 流式输出 */}
        <div className={`${styles.row} ${styles.rowInline}`}>
          <div>
            <div className={styles.label}>流式输出</div>
            <div className={styles.desc}>逐字返回生成内容</div>
          </div>
          <Switch checked={settings.stream} onChange={settings.setStream} />
        </div>

        {/* 深度思考 */}
        <div className={`${styles.row} ${styles.rowInline}`}>
          <div>
            <div className={styles.label}>深度思考</div>
            <div className={styles.desc}>启用思维链推理（如支持）</div>
          </div>
          <Switch checked={settings.enableThinking} onChange={settings.setEnableThinking} />
        </div>

        {/* 自定义请求体 */}
        <div className={styles.row}>
          <label className={styles.label}>自定义请求体</label>
          <span className={styles.desc}>
            JSON 格式，将合并到 API 请求中（model 与 messages 不可覆盖）
          </span>
          <div className={styles.textarea}>
            <Input.TextArea
              value={settings.customRequestBody}
              onChange={(e) => settings.setCustomRequestBody(e.target.value)}
              placeholder={'{\n  "temperature": 0.8,\n  "top_p": 0.9\n}'}
              autoComplete="off"
              spellCheck={false}
              rows={4}
              status={requestBodyValidation.valid ? undefined : 'error'}
            />
          </div>
          {!requestBodyValidation.valid && (
            <div className={styles.errorText}>{requestBodyValidation.error}</div>
          )}
        </div>
      </div>

      {/* 供应商管理 */}
      <div className={styles.subGroupTitle}>自定义供应商</div>
      <div className={styles.group}>
        {settings.customApiProviders.length === 0 ? (
          <div className={styles.empty}>暂无自定义供应商</div>
        ) : (
          settings.customApiProviders.map((provider) => (
            <div key={provider.id} className={styles.providerItem}>
              <div className={styles.providerInfo}>
                <span className={styles.providerName}>{provider.name}</span>
                <span className={styles.providerMeta}>
                  ID: {provider.id} · {provider.apiUrl}
                </span>
              </div>
              <div className={styles.providerActions}>
                <Button
                  htmlType="button"
                  size="small"
                  onClick={() => handleOpenEditProvider(provider)}
                >
                  编辑
                </Button>
                <Button
                  htmlType="button"
                  size="small"
                  danger
                  onClick={() => handleRemoveProvider(provider)}
                >
                  删除
                </Button>
              </div>
            </div>
          ))
        )}
        <div className={styles.row}>
          <Button
            htmlType="button"
            block
            onClick={handleOpenAddProvider}
            style={{ minHeight: 44 }}
          >
            + 添加自定义供应商
          </Button>
        </div>
      </div>

      {/* 多供应商密钥 */}
      <div className={styles.subGroupTitle}>各供应商 API Key</div>
      <div className={styles.group}>
        {settings.getAllProviders().map((provider) => (
          <div key={provider.id} className={styles.row}>
            <label className={styles.label}>
              {provider.name}
              {provider.isBuiltin && <Tag color="blue" style={{ marginLeft: 8, fontSize: 11 }}>内置</Tag>}
              {provider.id === settings.apiProviderId && (
                <Tag color="green" style={{ marginLeft: 8, fontSize: 11 }}>当前</Tag>
              )}
            </label>
            <div className={styles.input}>
              <Input.Password
                value={
                  provider.id === settings.apiProviderId
                    ? settings.apiKey
                    : settings.apiProviderKeys[provider.id] ?? ''
                }
                onChange={(e) => handleProviderKeyChange(provider.id, e.target.value)}
                placeholder="sk-..."
                autoComplete="off"
                spellCheck={false}
                visibilityToggle
              />
            </div>
          </div>
        ))}
      </div>

      <ProviderModal
        open={providerModalOpen}
        form={providerForm}
        onFormChange={setProviderForm}
        onOk={handleSaveProvider}
        onCancel={() => setProviderModalOpen(false)}
      />
    </div>
  );
}

/** 自定义供应商添加 / 编辑弹窗 */
interface ProviderModalProps {
  open: boolean;
  form: CustomProviderForm;
  onFormChange: (form: CustomProviderForm) => void;
  onOk: () => void;
  onCancel: () => void;
}

function ProviderModal({ open, form, onFormChange, onOk, onCancel }: ProviderModalProps) {
  const { styles } = useStyles();
  const isEdit = form.editingId !== null;

  return (
    <Modal
      open={open}
      title={isEdit ? '编辑自定义供应商' : '添加自定义供应商'}
      onOk={onOk}
      onCancel={onCancel}
      okText="保存"
      cancelText="取消"
      destroyOnClose
    >
      <div className={styles.input} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}>
            供应商 ID（仅英文字母，创建后不可修改）
          </label>
          <Input
            value={form.id}
            onChange={(e) => onFormChange({ ...form, id: e.target.value })}
            placeholder="例如: myapi"
            autoComplete="off"
            spellCheck={false}
            disabled={isEdit}
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}>
            供应商名称
          </label>
          <Input
            value={form.name}
            onChange={(e) => onFormChange({ ...form, name: e.target.value })}
            placeholder="例如: 我的 API"
            autoComplete="off"
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}>
            API URL
          </label>
          <Input
            value={form.apiUrl}
            onChange={(e) => onFormChange({ ...form, apiUrl: e.target.value })}
            placeholder="https://api.example.com/v1"
            autoComplete="off"
            spellCheck={false}
          />
        </div>
      </div>
    </Modal>
  );
}

// ============================================================================
// Section 2: 生成参数
// ============================================================================

function GenerationSection() {
  const { styles } = useStyles();
  const [messageApi, contextHolder] = message.useMessage();
  const settings = useSettingsStore();
  const [params, setParams] = useState<GenerationParams>(DEFAULT_GENERATION_PARAMS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void load();
  }, []);

  const load = async (): Promise<void> => {
    try {
      const data = await getItem<GenerationParams>('settings', GENERATION_PARAMS_STORAGE_KEY);
      if (data && typeof data.contextSize === 'number' && typeof data.temperature === 'number') {
        setParams(data);
      }
      setLoaded(true);
    } catch (e) {
      console.error('[GenerationSection] 加载失败:', e);
      setLoaded(true);
    }
  };

  const handleSave = async (): Promise<void> => {
    try {
      await setItem('settings', GENERATION_PARAMS_STORAGE_KEY, params);
      messageApi.success('生成参数已保存');
    } catch {
      messageApi.error('保存失败');
    }
  };

  const update = <K extends keyof GenerationParams>(key: K, value: GenerationParams[K]): void => {
    setParams((prev) => ({ ...prev, [key]: value }));
  };

  const handleModelModeChange = (mode: ModelMode): void => {
    settings.setModelMode(mode);
    if (settings.modelName) {
      if (mode === 'quality') settings.setQualityModel(settings.modelName);
      if (mode === 'balanced') settings.setBalancedModel(settings.modelName);
      if (mode === 'fast') settings.setFastModel(settings.modelName);
    }
  };

  const handleSelectModelMode = (mode: ModelMode): void => {
    const model =
      mode === 'quality'
        ? settings.qualityModel
        : mode === 'balanced'
          ? settings.balancedModel
          : settings.fastModel;
    if (model) {
      settings.setModelName(model);
      settings.setModelMode(mode);
      messageApi.success(
        `已切换到${mode === 'quality' ? '高质量' : mode === 'balanced' ? '均衡' : '快速'}模型`,
      );
    }
  };

  const currentModeModel =
    settings.modelMode === 'quality'
      ? settings.qualityModel
      : settings.modelMode === 'balanced'
        ? settings.balancedModel
        : settings.fastModel;

  return (
    <div>
      {contextHolder}

      <div className={styles.group}>
        <div className={styles.row}>
          <label className={styles.label}>上下文长度（tokens）</label>
          <span className={styles.desc}>参与生成的最大上下文 token 数</span>
          <div className={styles.input}>
            <Input
              type="number"
              min={1024}
              step={1024}
              value={params.contextSize}
              onChange={(e) => {
                const num = Number(e.target.value);
                update('contextSize', Number.isFinite(num) && num > 0 ? Math.round(num) : 1024);
              }}
              disabled={!loaded}
            />
          </div>
        </div>

        <div className={styles.row}>
          <label className={styles.label}>温度（Temperature）</label>
          <span className={styles.desc}>越高越随机，越低越确定（0 - 2）</span>
          <div className={styles.sliderRow}>
            <Slider
              min={0}
              max={2}
              step={0.05}
              value={params.temperature}
              onChange={(v) => update('temperature', typeof v === 'number' ? v : 1)}
              style={{ flex: 1 }}
              disabled={!loaded}
            />
            <span className={styles.sliderValue}>{params.temperature.toFixed(2)}</span>
          </div>
        </div>

        <div className={styles.row}>
          <Button htmlType="button" block onClick={() => void handleSave()} style={{ minHeight: 44 }}>
            保存生成参数
          </Button>
        </div>
      </div>

      {/* 模型模式 */}
      <div className={styles.subGroupTitle}>模型模式</div>
      <div className={styles.group}>
        <div className={styles.row}>
          <div className={styles.modelModeGroup}>
            {MODEL_MODE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`${styles.modelModeBtn} ${
                  settings.modelMode === opt.value ? 'active' : ''
                }`}
                onClick={() => handleModelModeChange(opt.value)}
              >
                <div>{opt.label}</div>
                <div style={{ fontSize: 11, opacity: 0.8 }}>{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>
        <div className={styles.row}>
          <label className={styles.label}>
            当前模式模型名（{MODEL_MODE_OPTIONS.find((o) => o.value === settings.modelMode)?.label}）
          </label>
          <span className={styles.desc}>点击下方按钮可快速切换到对应档位的模型</span>
          <div className={styles.input}>
            <Input
              value={currentModeModel}
              onChange={(e) => {
                const value = e.target.value;
                if (settings.modelMode === 'quality') settings.setQualityModel(value);
                if (settings.modelMode === 'balanced') settings.setBalancedModel(value);
                if (settings.modelMode === 'fast') settings.setFastModel(value);
              }}
              placeholder="sta1n_glm-4.6"
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            {MODEL_MODE_OPTIONS.map((opt) => {
              const model =
                opt.value === 'quality'
                  ? settings.qualityModel
                  : opt.value === 'balanced'
                    ? settings.balancedModel
                    : settings.fastModel;
              return (
                <Button
                  key={opt.value}
                  htmlType="button"
                  size="small"
                  disabled={!model}
                  onClick={() => handleSelectModelMode(opt.value)}
                  style={{ flex: 1, minHeight: 36 }}
                >
                  {opt.label}
                </Button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Section 3: 记忆引擎
// ============================================================================

function MemorySection() {
  const { styles } = useStyles();
  const [messageApi, contextHolder] = message.useMessage();
  const settings = useSettingsStore();
  const [memSettings, setMemSettings] = useState<MemorySettings>(DEFAULT_MEMORY_SETTINGS);
  const [globalDraft, setGlobalDraft] = useState('');
  const [globalEnabled, setGlobalEnabled] = useState(true);
  const [globalUpdatedAt, setGlobalUpdatedAt] = useState(0);
  const [shards, setShards] = useState<VectorMemoryShard[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void load();
  }, []);

  const load = async (): Promise<void> => {
    try {
      const [mem, global] = await Promise.all([
        getItem<MemorySettings>('settings', 'memorySettings'),
        getItem<GlobalMemory>('memory', GLOBAL_MEMORY_STORAGE_KEY),
      ]);
      if (mem) setMemSettings({ ...DEFAULT_MEMORY_SETTINGS, ...mem });
      if (global) {
        setGlobalDraft(global.content || '');
        setGlobalEnabled(!!global.content);
        setGlobalUpdatedAt(global.updatedAt || 0);
      }
      setLoaded(true);
      void loadShards();
    } catch (e) {
      console.error('[MemorySection] 加载失败:', e);
      setLoaded(true);
    }
  };

  const loadShards = async (): Promise<void> => {
    try {
      const keys = await getAllKeys('memory');
      const shardKeys = keys
        .map((k) => String(k))
        .filter((k) => k.startsWith(VECTOR_MEMORY_STORAGE_KEY_PREFIX));
      const all: VectorMemoryShard[] = [];
      for (const k of shardKeys) {
        const list = await getItem<VectorMemoryShard[]>('memory', k);
        if (Array.isArray(list)) all.push(...list);
      }
      all.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setShards(all.slice(0, 200));
    } catch (e) {
      console.error('[MemorySection] 加载分片失败:', e);
    }
  };

  const handleSaveSettings = async (): Promise<void> => {
    try {
      await setItem('settings', 'memorySettings', memSettings);
      messageApi.success('记忆设置已保存');
    } catch {
      messageApi.error('保存失败');
    }
  };

  const handleSaveGlobal = async (): Promise<void> => {
    try {
      const data: GlobalMemory = {
        content: globalEnabled ? globalDraft : '',
        updatedAt: Date.now(),
      };
      setGlobalUpdatedAt(data.updatedAt);
      await setItem('memory', GLOBAL_MEMORY_STORAGE_KEY, data);
      messageApi.success('全局记忆已保存');
    } catch {
      messageApi.error('保存失败');
    }
  };

  const updateField = <K extends keyof MemorySettings>(
    key: K,
    value: MemorySettings[K],
  ): void => {
    setMemSettings((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div>
      {contextHolder}

      <div className={styles.group}>
        <div className={`${styles.row} ${styles.rowInline}`}>
          <div>
            <div className={styles.label}>启用记忆系统</div>
            <div className={styles.desc}>自动提取与召回对话记忆</div>
          </div>
          <Switch
            checked={memSettings.enabled}
            onChange={(v) => updateField('enabled', v)}
            disabled={!loaded}
          />
        </div>

        <div className={styles.row}>
          <label className={styles.label}>嵌入模型名</label>
          <span className={styles.desc}>用于向量化的嵌入模型（格式: providerId_model_name）</span>
          <div className={styles.input}>
            <Input
              value={memSettings.embeddingModel}
              onChange={(e) => updateField('embeddingModel', e.target.value)}
              placeholder="sta1n_doubao-embedding-text-240715"
              autoComplete="off"
              spellCheck={false}
              disabled={!loaded}
            />
          </div>
        </div>

        <div className={styles.row}>
          <label className={styles.label}>嵌入 API 供应商</label>
          <span className={styles.desc}>为空则跟随聊天供应商</span>
          <div className={styles.input}>
            <Select
              value={memSettings.embeddingApiProviderId || ''}
              onChange={(v: string) => updateField('embeddingApiProviderId', v)}
              options={[
                { value: '', label: '跟随聊天供应商' },
                ...settings.getAllProviders().map((p) => ({
                  value: p.id,
                  label: p.isBuiltin ? `${p.name}（内置）` : p.name,
                })),
              ]}
              placeholder="选择嵌入供应商"
              disabled={!loaded}
            />
          </div>
        </div>

        <div className={styles.row}>
          <label className={styles.label}>最大记忆数量</label>
          <div className={styles.input}>
            <Input
              type="number"
              min={10}
              max={1000}
              value={memSettings.maxMemories}
              onChange={(e) => {
                const num = Number(e.target.value);
                updateField(
                  'maxMemories',
                  Number.isFinite(num) ? Math.max(10, Math.min(1000, Math.round(num))) : 100,
                );
              }}
              disabled={!loaded}
            />
          </div>
        </div>

        <div className={styles.row}>
          <label className={styles.label}>召回深度（最近 N 楼不召回）</label>
          <div className={styles.input}>
            <Input
              type="number"
              min={0}
              max={50}
              value={memSettings.recallDepth}
              onChange={(e) => {
                const num = Number(e.target.value);
                updateField(
                  'recallDepth',
                  Number.isFinite(num) ? Math.max(0, Math.min(50, Math.round(num))) : 10,
                );
              }}
              disabled={!loaded}
            />
          </div>
        </div>

        <div className={styles.row}>
          <label className={styles.label}>向量 TopK</label>
          <div className={styles.input}>
            <Input
              type="number"
              min={1}
              max={20}
              value={memSettings.vectorTopK}
              onChange={(e) => {
                const num = Number(e.target.value);
                updateField(
                  'vectorTopK',
                  Number.isFinite(num) ? Math.max(1, Math.min(20, Math.round(num))) : 5,
                );
              }}
              disabled={!loaded}
            />
          </div>
        </div>

        <div className={styles.row}>
          <label className={styles.label}>相似度阈值</label>
          <div className={styles.input}>
            <Input
              type="number"
              min={0}
              max={1}
              step={0.05}
              value={memSettings.similarityThreshold}
              onChange={(e) => {
                const num = Number(e.target.value);
                updateField(
                  'similarityThreshold',
                  Number.isFinite(num) ? Math.max(0, Math.min(1, num)) : 0.7,
                );
              }}
              disabled={!loaded}
            />
          </div>
        </div>

        <div className={`${styles.row} ${styles.rowInline}`}>
          <div>
            <div className={styles.label}>启用压缩</div>
            <div className={styles.desc}>有向量记忆覆盖时移除原始上下文</div>
          </div>
          <Switch
            checked={memSettings.compressionEnabled}
            onChange={(v) => updateField('compressionEnabled', v)}
            disabled={!loaded}
          />
        </div>

        {memSettings.compressionEnabled && (
          <div className={styles.row}>
            <label className={styles.label}>保留最近楼层数</label>
            <div className={styles.input}>
              <Input
                type="number"
                min={0}
                max={100}
                value={memSettings.compressionKeepRecent}
                onChange={(e) => {
                  const num = Number(e.target.value);
                  updateField(
                    'compressionKeepRecent',
                    Number.isFinite(num) ? Math.max(0, Math.min(100, Math.round(num))) : 10,
                  );
                }}
                disabled={!loaded}
              />
            </div>
          </div>
        )}

        <div className={styles.row}>
          <Button
            htmlType="button"
            block
            onClick={() => void handleSaveSettings()}
            style={{ minHeight: 44 }}
            disabled={!loaded}
          >
            保存记忆设置
          </Button>
        </div>
      </div>

      {/* 全局记忆 */}
      <div className={styles.subGroupTitle}>全局记忆（MEMORY.md）</div>
      <div className={styles.group}>
        <div className={`${styles.row} ${styles.rowInline}`}>
          <div>
            <div className={styles.label}>启用全局记忆注入</div>
            <div className={styles.desc}>关闭后将注入空内容（草稿仍保留在本地）</div>
          </div>
          <Switch
            checked={globalEnabled}
            onChange={setGlobalEnabled}
            disabled={!loaded}
          />
        </div>
        <div className={styles.row}>
          <span className={styles.desc}>全局记忆会注入到每次对话的系统提示词中</span>
          <div className={styles.textarea}>
            <Input.TextArea
              value={globalDraft}
              onChange={(e) => setGlobalDraft(e.target.value)}
              placeholder="输入全局记忆内容..."
              rows={6}
              autoComplete="off"
              spellCheck={false}
              disabled={!loaded || !globalEnabled}
            />
          </div>
          {globalUpdatedAt > 0 && (
            <span className={styles.hint}>最后更新: {new Date(globalUpdatedAt).toLocaleString()}</span>
          )}
        </div>
        <div className={styles.row}>
          <Button
            htmlType="button"
            block
            onClick={() => void handleSaveGlobal()}
            style={{ minHeight: 44 }}
            disabled={!loaded}
          >
            保存全局记忆
          </Button>
        </div>
      </div>

      {/* 向量记忆分片查看器 */}
      <div className={styles.subGroupTitle}>
        向量记忆分片（共 {shards.length} 条）
      </div>
      <div className={styles.group}>
        {shards.length === 0 ? (
          <div className={styles.empty}>暂无向量记忆分片</div>
        ) : (
          shards.map((shard) => (
            <div key={shard.id} className={styles.shardItem}>
              <div className={styles.shardMeta}>
                <Tag color="blue" style={{ fontSize: 10, margin: 0 }}>
                  turn {shard.turn}
                </Tag>
                <span>
                  {shard.createdAt ? new Date(shard.createdAt).toLocaleString() : ''}
                </span>
              </div>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
                {shard.content.slice(0, 100)}
                {shard.content.length > 100 ? '…' : ''}
              </span>
            </div>
          ))
        )}
        <div className={styles.row}>
          <Button
            htmlType="button"
            block
            onClick={() => void loadShards()}
            style={{ minHeight: 44 }}
          >
            刷新分片列表
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Section 4: 预设管理
// ============================================================================

function PresetSection() {
  const { styles } = useStyles();
  const [messageApi, contextHolder] = message.useMessage();
  const [presets, setPresets] = useState<Preset[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PresetForm>({ name: '', content: '' });
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    void loadPresets();
  }, []);

  const loadPresets = async (): Promise<void> => {
    try {
      const data = await getItem<Preset[]>('presets', 'presets');
      if (Array.isArray(data) && data.length > 0) {
        setPresets(data);
      } else {
        const now = Date.now();
        const builtin: Preset[] = BUILTIN_PRESET_DEFAULTS.map((p, i) => ({
          id: `builtin-${i}`,
          name: p.name,
          content: p.content,
          isBuiltin: true,
          createdAt: now,
          updatedAt: now,
        }));
        setPresets(builtin);
        await setItem('presets', 'presets', builtin);
      }
    } catch (e) {
      console.error('[PresetSection] 加载失败:', e);
    }
  };

  const savePresets = async (list: Preset[]): Promise<void> => {
    try {
      await setItem('presets', 'presets', list);
    } catch (e) {
      console.error('[PresetSection] 保存失败:', e);
      messageApi.error('保存失败');
      throw e;
    }
  };

  const handleOpenCreate = (): void => {
    setEditingId(null);
    setForm({ name: '', content: '' });
    setEditorOpen(true);
  };

  const handleOpenEdit = (preset: Preset): void => {
    setEditingId(preset.id);
    setForm({ name: preset.name, content: preset.content });
    setEditorOpen(true);
  };

  const handleSave = async (): Promise<void> => {
    if (!form.name.trim()) {
      messageApi.error('预设名称不能为空');
      return;
    }
    if (editingId) {
      const updated = presets.map((p) =>
        p.id === editingId
          ? { ...p, name: form.name.trim(), content: form.content, updatedAt: Date.now() }
          : p,
      );
      setPresets(updated);
      await savePresets(updated);
      messageApi.success('预设已更新');
    } else {
      const now = Date.now();
      const newPreset: Preset = {
        id: uuidv4(),
        name: form.name.trim(),
        content: form.content,
        isBuiltin: false,
        createdAt: now,
        updatedAt: now,
      };
      const updated = [...presets, newPreset];
      setPresets(updated);
      await savePresets(updated);
      messageApi.success('预设已创建');
    }
    setEditorOpen(false);
  };

  const handleConfirmDelete = async (): Promise<void> => {
    if (!deleteId) return;
    const target = presets.find((p) => p.id === deleteId);
    if (target?.isBuiltin && BUILTIN_PRESET_NAME_SET.has(target.name)) {
      messageApi.error('内置预设不可删除');
      setDeleteId(null);
      return;
    }
    const updated = presets.filter((p) => p.id !== deleteId);
    setPresets(updated);
    await savePresets(updated);
    messageApi.success('预设已删除');
    setDeleteId(null);
  };

  return (
    <div>
      {contextHolder}
      <div className={styles.group}>
        {presets.length === 0 ? (
          <div className={styles.empty}>暂无预设</div>
        ) : (
          presets.map((preset) => (
            <div key={preset.id} className={styles.cardItem}>
              <div className={styles.cardHeader}>
                <span className={styles.cardName}>{preset.name}</span>
                <div className={styles.cardActions}>
                  {preset.isBuiltin && (
                    <Tag color="blue" style={{ fontSize: 11, margin: 0 }}>
                      内置
                    </Tag>
                  )}
                  <button
                    type="button"
                    className={styles.actionBtn}
                    onClick={() => handleOpenEdit(preset)}
                    aria-label="编辑"
                  >
                    <EditIcon />
                  </button>
                  {(!preset.isBuiltin || !BUILTIN_PRESET_NAME_SET.has(preset.name)) && (
                    <button
                      type="button"
                      className={styles.actionBtn}
                      onClick={() => setDeleteId(preset.id)}
                      aria-label="删除"
                    >
                      <DeleteIcon />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        <div className={styles.row}>
          <Button htmlType="button" block onClick={handleOpenCreate} style={{ minHeight: 44 }}>
            + 新建预设
          </Button>
        </div>
      </div>

      <Modal
        open={editorOpen}
        title={editingId ? '编辑预设' : '新建预设'}
        onOk={() => void handleSave()}
        onCancel={() => setEditorOpen(false)}
        okText="保存"
        cancelText="取消"
        width="90%"
        destroyOnClose
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            maxHeight: '60vh',
            overflowY: 'auto',
          }}
        >
          <div>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}>
              预设名称 *
            </label>
            <div className={styles.input}>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="例如: 我的预设"
              />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}>
              预设内容
            </label>
            <div className={styles.textarea}>
              <Input.TextArea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder="预设的系统提示词内容..."
                rows={10}
                autoComplete="off"
                spellCheck={false}
              />
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!deleteId}
        title="确认删除"
        onOk={() => void handleConfirmDelete()}
        onCancel={() => setDeleteId(null)}
        okText="删除"
        cancelText="取消"
        okButtonProps={{ danger: true }}
      >
        <p>确定要删除这个预设吗？此操作不可撤销。</p>
      </Modal>
    </div>
  );
}

// ============================================================================
// Section 5: 世界书
// ============================================================================

function WorldInfoSection() {
  const { styles } = useStyles();
  const [messageApi, contextHolder] = message.useMessage();
  const [entries, setEntries] = useState<WorldInfoEntry[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<WorldInfoForm>({
    keys: '',
    content: '',
    enabled: true,
    constant: false,
    order: 100,
    position: 0,
    depth: 4,
    probability: 100,
  });
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    void loadEntries();
  }, []);

  const loadEntries = async (): Promise<void> => {
    try {
      const data = await getItem<WorldInfoEntry[]>('worldInfo', 'worldInfo');
      setEntries(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('[WorldInfoSection] 加载失败:', e);
    }
  };

  const saveEntries = async (list: WorldInfoEntry[]): Promise<void> => {
    try {
      await setItem('worldInfo', 'worldInfo', list);
    } catch (e) {
      console.error('[WorldInfoSection] 保存失败:', e);
      messageApi.error('保存失败');
      throw e;
    }
  };

  const handleOpenCreate = (): void => {
    setEditingId(null);
    setForm({
      keys: '',
      content: '',
      enabled: true,
      constant: false,
      order: 100,
      position: 0,
      depth: 4,
      probability: 100,
    });
    setEditorOpen(true);
  };

  const handleOpenEdit = (entry: WorldInfoEntry): void => {
    setEditingId(entry.id);
    setForm({
      keys: entry.keys.join(', '),
      content: entry.content,
      enabled: entry.enabled,
      constant: entry.constant,
      order: entry.order,
      position: entry.position,
      depth: entry.depth,
      probability: entry.probability,
    });
    setEditorOpen(true);
  };

  const handleSave = async (): Promise<void> => {
    if (!form.keys.trim()) {
      messageApi.error('关键词不能为空');
      return;
    }
    const keys = form.keys
      .split(/[,，]/)
      .map((k) => k.trim())
      .filter(Boolean);
    if (editingId) {
      const updated = entries.map((e) =>
        e.id === editingId
          ? {
              ...e,
              keys,
              content: form.content,
              enabled: form.enabled,
              constant: form.constant,
              order: form.order,
              position: form.position,
              depth: form.depth,
              probability: form.probability,
            }
          : e,
      );
      setEntries(updated);
      await saveEntries(updated);
      messageApi.success('世界书条目已更新');
    } else {
      const newEntry: WorldInfoEntry = {
        id: uuidv4(),
        keys,
        content: form.content,
        enabled: form.enabled,
        constant: form.constant,
        order: form.order,
        position: form.position,
        depth: form.depth,
        probability: form.probability,
      };
      const updated = [...entries, newEntry];
      setEntries(updated);
      await saveEntries(updated);
      messageApi.success('世界书条目已创建');
    }
    setEditorOpen(false);
  };

  const handleConfirmDelete = async (): Promise<void> => {
    if (!deleteId) return;
    const updated = entries.filter((e) => e.id !== deleteId);
    setEntries(updated);
    await saveEntries(updated);
    messageApi.success('世界书条目已删除');
    setDeleteId(null);
  };

  return (
    <div>
      {contextHolder}
      <div className={styles.group}>
        {entries.length === 0 ? (
          <div className={styles.empty}>暂无世界书条目</div>
        ) : (
          entries.map((entry) => (
            <div key={entry.id} className={styles.cardItem}>
              <div className={styles.cardHeader}>
                <span className={styles.cardName}>
                  {entry.keys.join(', ') || '(无关键词)'}
                </span>
                <div className={styles.cardActions}>
                  {entry.constant && (
                    <Tag color="purple" style={{ fontSize: 11, margin: 0 }}>
                      常驻
                    </Tag>
                  )}
                  {entry.enabled ? (
                    <Tag color="green" style={{ fontSize: 11, margin: 0 }}>
                      启用
                    </Tag>
                  ) : (
                    <Tag style={{ fontSize: 11, margin: 0 }}>禁用</Tag>
                  )}
                  <button
                    type="button"
                    className={styles.actionBtn}
                    onClick={() => handleOpenEdit(entry)}
                    aria-label="编辑"
                  >
                    <EditIcon />
                  </button>
                  <button
                    type="button"
                    className={styles.actionBtn}
                    onClick={() => setDeleteId(entry.id)}
                    aria-label="删除"
                  >
                    <DeleteIcon />
                  </button>
                </div>
              </div>
              {entry.content && (
                <span
                  className={styles.hint}
                  style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                >
                  {entry.content.slice(0, 60)}
                </span>
              )}
            </div>
          ))
        )}
        <div className={styles.row}>
          <Button htmlType="button" block onClick={handleOpenCreate} style={{ minHeight: 44 }}>
            + 新建条目
          </Button>
        </div>
      </div>

      <Modal
        open={editorOpen}
        title={editingId ? '编辑世界书条目' : '新建世界书条目'}
        onOk={() => void handleSave()}
        onCancel={() => setEditorOpen(false)}
        okText="保存"
        cancelText="取消"
        width="90%"
        destroyOnClose
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            maxHeight: '60vh',
            overflowY: 'auto',
          }}
        >
          <div>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}>
              关键词（逗号分隔）*
            </label>
            <div className={styles.input}>
              <Input
                value={form.keys}
                onChange={(e) => setForm({ ...form, keys: e.target.value })}
                placeholder="关键词1, 关键词2"
              />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}>
              内容
            </label>
            <div className={styles.textarea}>
              <Input.TextArea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder="条目内容..."
                rows={6}
              />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className={styles.label}>启用</span>
            <Switch
              checked={form.enabled}
              onChange={(v) => setForm({ ...form, enabled: v })}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className={styles.label}>常驻（无需关键词触发）</span>
            <Switch
              checked={form.constant}
              onChange={(v) => setForm({ ...form, constant: v })}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}>
              优先级（order）
            </label>
            <div className={styles.input}>
              <Input
                type="number"
                value={form.order}
                onChange={(e) => setForm({ ...form, order: Number(e.target.value) || 0 })}
              />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}>
              位置（position）
            </label>
            <div className={styles.input}>
              <Input
                type="number"
                value={form.position}
                onChange={(e) => setForm({ ...form, position: Number(e.target.value) || 0 })}
              />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}>
              深度（depth）
            </label>
            <div className={styles.input}>
              <Input
                type="number"
                value={form.depth}
                onChange={(e) => setForm({ ...form, depth: Number(e.target.value) || 0 })}
              />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}>
              触发概率（0-100）
            </label>
            <div className={styles.input}>
              <Input
                type="number"
                min={0}
                max={100}
                value={form.probability}
                onChange={(e) =>
                  setForm({
                    ...form,
                    probability: Math.max(0, Math.min(100, Number(e.target.value) || 0)),
                  })
                }
              />
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!deleteId}
        title="确认删除"
        onOk={() => void handleConfirmDelete()}
        onCancel={() => setDeleteId(null)}
        okText="删除"
        cancelText="取消"
        okButtonProps={{ danger: true }}
      >
        <p>确定要删除这个世界书条目吗？</p>
      </Modal>
    </div>
  );
}

// ============================================================================
// Section 6: 正则脚本
// ============================================================================

function RegexSection() {
  const { styles } = useStyles();
  const [messageApi, contextHolder] = message.useMessage();
  const [scripts, setScripts] = useState<RegexScript[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<RegexForm>({
    name: '',
    findRegex: '',
    replaceString: '',
    enabled: true,
    placement: 2,
    mode: 0,
    depth: 0,
  });
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    void loadScripts();
  }, []);

  const loadScripts = async (): Promise<void> => {
    try {
      const data = await getItem<RegexScript[]>('regexScripts', 'regexScripts');
      setScripts(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('[RegexSection] 加载失败:', e);
    }
  };

  const saveScripts = async (list: RegexScript[]): Promise<void> => {
    try {
      await setItem('regexScripts', 'regexScripts', list);
    } catch (e) {
      console.error('[RegexSection] 保存失败:', e);
      messageApi.error('保存失败');
      throw e;
    }
  };

  const handleOpenCreate = (): void => {
    setEditingId(null);
    setForm({
      name: '',
      findRegex: '',
      replaceString: '',
      enabled: true,
      placement: 2,
      mode: 0,
      depth: 0,
    });
    setEditorOpen(true);
  };

  const handleOpenEdit = (script: RegexScript): void => {
    setEditingId(script.id);
    setForm({
      name: script.name,
      findRegex: script.findRegex,
      replaceString: script.replaceString,
      enabled: script.enabled,
      placement: script.placement,
      mode: script.mode,
      depth: script.depth,
    });
    setEditorOpen(true);
  };

  const handleSave = async (): Promise<void> => {
    if (!form.name.trim()) {
      messageApi.error('脚本名称不能为空');
      return;
    }
    if (!form.findRegex.trim()) {
      messageApi.error('查找正则不能为空');
      return;
    }
    try {
      new RegExp(form.findRegex);
    } catch (e) {
      messageApi.error('正则表达式无效: ' + (e instanceof Error ? e.message : ''));
      return;
    }
    if (editingId) {
      const updated = scripts.map((s) =>
        s.id === editingId
          ? {
              ...s,
              name: form.name.trim(),
              findRegex: form.findRegex,
              replaceString: form.replaceString,
              enabled: form.enabled,
              placement: form.placement,
              mode: form.mode,
              depth: form.depth,
            }
          : s,
      );
      setScripts(updated);
      await saveScripts(updated);
      messageApi.success('正则脚本已更新');
    } else {
      const newScript: RegexScript = {
        id: uuidv4(),
        name: form.name.trim(),
        findRegex: form.findRegex,
        replaceString: form.replaceString,
        enabled: form.enabled,
        placement: form.placement,
        mode: form.mode,
        depth: form.depth,
      };
      const updated = [...scripts, newScript];
      setScripts(updated);
      await saveScripts(updated);
      messageApi.success('正则脚本已创建');
    }
    setEditorOpen(false);
  };

  const handleConfirmDelete = async (): Promise<void> => {
    if (!deleteId) return;
    const updated = scripts.filter((s) => s.id !== deleteId);
    setScripts(updated);
    await saveScripts(updated);
    messageApi.success('正则脚本已删除');
    setDeleteId(null);
  };

  return (
    <div>
      {contextHolder}
      <div className={styles.group}>
        {scripts.length === 0 ? (
          <div className={styles.empty}>暂无正则脚本</div>
        ) : (
          scripts.map((script) => (
            <div key={script.id} className={styles.cardItem}>
              <div className={styles.cardHeader}>
                <span className={styles.cardName}>{script.name}</span>
                <div className={styles.cardActions}>
                  {script.enabled ? (
                    <Tag color="green" style={{ fontSize: 11, margin: 0 }}>
                      启用
                    </Tag>
                  ) : (
                    <Tag style={{ fontSize: 11, margin: 0 }}>禁用</Tag>
                  )}
                  <button
                    type="button"
                    className={styles.actionBtn}
                    onClick={() => handleOpenEdit(script)}
                    aria-label="编辑"
                  >
                    <EditIcon />
                  </button>
                  <button
                    type="button"
                    className={styles.actionBtn}
                    onClick={() => setDeleteId(script.id)}
                    aria-label="删除"
                  >
                    <DeleteIcon />
                  </button>
                </div>
              </div>
              <span
                className={styles.hint}
                style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              >
                {script.findRegex}
              </span>
            </div>
          ))
        )}
        <div className={styles.row}>
          <Button htmlType="button" block onClick={handleOpenCreate} style={{ minHeight: 44 }}>
            + 新建正则脚本
          </Button>
        </div>
      </div>

      <Modal
        open={editorOpen}
        title={editingId ? '编辑正则脚本' : '新建正则脚本'}
        onOk={() => void handleSave()}
        onCancel={() => setEditorOpen(false)}
        okText="保存"
        cancelText="取消"
        width="90%"
        destroyOnClose
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            maxHeight: '60vh',
            overflowY: 'auto',
          }}
        >
          <div>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}>
              脚本名称 *
            </label>
            <div className={styles.input}>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="例如: 移除思考标签"
              />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}>
              查找正则 *
            </label>
            <div className={styles.input}>
              <Input
                value={form.findRegex}
                onChange={(e) => setForm({ ...form, findRegex: e.target.value })}
                placeholder="<think>.*?</think>"
                autoComplete="off"
                spellCheck={false}
              />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}>
              替换字符串
            </label>
            <div className={styles.textarea}>
              <Input.TextArea
                value={form.replaceString}
                onChange={(e) => setForm({ ...form, replaceString: e.target.value })}
                placeholder="替换为的内容（留空即删除匹配）"
                rows={3}
              />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className={styles.label}>启用</span>
            <Switch
              checked={form.enabled}
              onChange={(v) => setForm({ ...form, enabled: v })}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}>
              作用位置（1=用户, 2=AI, 3=全部）
            </label>
            <div className={styles.input}>
              <Input
                type="number"
                min={1}
                max={3}
                value={form.placement}
                onChange={(e) =>
                  setForm({
                    ...form,
                    placement: Math.max(1, Math.min(3, Number(e.target.value) || 2)),
                  })
                }
              />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}>
              模式（mode）
            </label>
            <div className={styles.input}>
              <Input
                type="number"
                value={form.mode}
                onChange={(e) => setForm({ ...form, mode: Number(e.target.value) || 0 })}
              />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}>
              深度（depth）
            </label>
            <div className={styles.input}>
              <Input
                type="number"
                value={form.depth}
                onChange={(e) => setForm({ ...form, depth: Number(e.target.value) || 0 })}
              />
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!deleteId}
        title="确认删除"
        onOk={() => void handleConfirmDelete()}
        onCancel={() => setDeleteId(null)}
        okText="删除"
        cancelText="取消"
        okButtonProps={{ danger: true }}
      >
        <p>确定要删除这个正则脚本吗？</p>
      </Modal>
    </div>
  );
}

// ============================================================================
// Section 7: UI 模板
// ============================================================================

function UiTemplateSection() {
  const { styles } = useStyles();
  const [messageApi, contextHolder] = message.useMessage();
  const [templates, setTemplates] = useState<UiTemplate[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<UiTemplateForm>({ name: '', content: '', enabled: true });
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    void loadTemplates();
  }, []);

  const loadTemplates = async (): Promise<void> => {
    try {
      const data = await getItem<UiTemplate[]>('uiTemplates', 'uiTemplates');
      setTemplates(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('[UiTemplateSection] 加载失败:', e);
    }
  };

  const saveTemplates = async (list: UiTemplate[]): Promise<void> => {
    try {
      await setItem('uiTemplates', 'uiTemplates', list);
    } catch (e) {
      console.error('[UiTemplateSection] 保存失败:', e);
      messageApi.error('保存失败');
      throw e;
    }
  };

  const handleOpenCreate = (): void => {
    setEditingId(null);
    setForm({ name: '', content: '', enabled: true });
    setEditorOpen(true);
  };

  const handleOpenEdit = (template: UiTemplate): void => {
    setEditingId(template.id);
    setForm({ name: template.name, content: template.content, enabled: template.enabled });
    setEditorOpen(true);
  };

  const handleSave = async (): Promise<void> => {
    if (!form.name.trim()) {
      messageApi.error('模板名称不能为空');
      return;
    }
    if (editingId) {
      const updated = templates.map((t) =>
        t.id === editingId
          ? { ...t, name: form.name.trim(), content: form.content, enabled: form.enabled }
          : t,
      );
      setTemplates(updated);
      await saveTemplates(updated);
      messageApi.success('UI 模板已更新');
    } else {
      const newTemplate: UiTemplate = {
        id: uuidv4(),
        name: form.name.trim(),
        content: form.content,
        enabled: form.enabled,
      };
      const updated = [...templates, newTemplate];
      setTemplates(updated);
      await saveTemplates(updated);
      messageApi.success('UI 模板已创建');
    }
    setEditorOpen(false);
  };

  const handleConfirmDelete = async (): Promise<void> => {
    if (!deleteId) return;
    const updated = templates.filter((t) => t.id !== deleteId);
    setTemplates(updated);
    await saveTemplates(updated);
    messageApi.success('UI 模板已删除');
    setDeleteId(null);
  };

  return (
    <div>
      {contextHolder}
      <div className={styles.group}>
        {templates.length === 0 ? (
          <div className={styles.empty}>暂无 UI 模板</div>
        ) : (
          templates.map((template) => (
            <div key={template.id} className={styles.cardItem}>
              <div className={styles.cardHeader}>
                <span className={styles.cardName}>{template.name}</span>
                <div className={styles.cardActions}>
                  {template.enabled ? (
                    <Tag color="green" style={{ fontSize: 11, margin: 0 }}>
                      启用
                    </Tag>
                  ) : (
                    <Tag style={{ fontSize: 11, margin: 0 }}>禁用</Tag>
                  )}
                  <button
                    type="button"
                    className={styles.actionBtn}
                    onClick={() => handleOpenEdit(template)}
                    aria-label="编辑"
                  >
                    <EditIcon />
                  </button>
                  <button
                    type="button"
                    className={styles.actionBtn}
                    onClick={() => setDeleteId(template.id)}
                    aria-label="删除"
                  >
                    <DeleteIcon />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
        <div className={styles.row}>
          <Button htmlType="button" block onClick={handleOpenCreate} style={{ minHeight: 44 }}>
            + 新建 UI 模板
          </Button>
        </div>
      </div>

      <Modal
        open={editorOpen}
        title={editingId ? '编辑 UI 模板' : '新建 UI 模板'}
        onOk={() => void handleSave()}
        onCancel={() => setEditorOpen(false)}
        okText="保存"
        cancelText="取消"
        width="90%"
        destroyOnClose
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            maxHeight: '60vh',
            overflowY: 'auto',
          }}
        >
          <div>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}>
              模板名称 *
            </label>
            <div className={styles.input}>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="例如: 自定义消息样式"
              />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}>
              模板内容
            </label>
            <div className={styles.textarea}>
              <Input.TextArea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder="模板内容（HTML/CSS/JS）..."
                rows={8}
                autoComplete="off"
                spellCheck={false}
              />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className={styles.label}>启用</span>
            <Switch
              checked={form.enabled}
              onChange={(v) => setForm({ ...form, enabled: v })}
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={!!deleteId}
        title="确认删除"
        onOk={() => void handleConfirmDelete()}
        onCancel={() => setDeleteId(null)}
        okText="删除"
        cancelText="取消"
        okButtonProps={{ danger: true }}
      >
        <p>确定要删除这个 UI 模板吗？</p>
      </Modal>
    </div>
  );
}

// ============================================================================
// Section 8: 用户档案
// ============================================================================

function UserProfileSection() {
  const { styles } = useStyles();
  const [messageApi, contextHolder] = message.useMessage();
  const settings = useSettingsStore();

  const handleUserChange = (
    field: 'name' | 'description' | 'person',
    value: string,
  ): void => {
    settings.setUser({ [field]: value } as Partial<typeof settings.user>);
  };

  const handleAddProfile = (): void => {
    settings.addProfile();
    messageApi.success('已新建并切换到新档案');
  };

  const handleSwitch = (uuid: string): void => {
    settings.switchProfile(uuid);
    messageApi.success('已切换档案');
  };

  const handleDelete = (uuid: string): void => {
    settings.removeProfile(uuid);
    messageApi.success('已删除档案');
  };

  return (
    <div>
      {contextHolder}

      {/* 当前档案编辑 */}
      <div className={styles.subGroupTitle}>当前档案</div>
      <div className={styles.group}>
        <div className={styles.row}>
          <label className={styles.label}>用户名</label>
          <span className={styles.desc}>在角色扮演中你的称呼</span>
          <div className={styles.input}>
            <Input
              value={settings.user.name}
              onChange={(e) => handleUserChange('name', e.target.value)}
              placeholder="你的名字"
              autoComplete="off"
            />
          </div>
        </div>
        <div className={styles.row}>
          <label className={styles.label}>用户描述</label>
          <span className={styles.desc}>你的人设、性格、外貌等描述（可选）</span>
          <div className={styles.textarea}>
            <Input.TextArea
              value={settings.user.description}
              onChange={(e) => handleUserChange('description', e.target.value)}
              placeholder="描述你自己..."
              autoComplete="off"
              rows={3}
            />
          </div>
        </div>
        <div className={styles.row}>
          <label className={styles.label}>人称视角</label>
          <span className={styles.desc}>对话中使用的叙事人称</span>
          <div className={styles.input}>
            <Select
              value={settings.user.person}
              onChange={(value: PersonMode) => handleUserChange('person', value)}
              options={PERSON_OPTIONS}
              placeholder="选择人称视角"
            />
          </div>
        </div>
      </div>

      {/* 档案列表 */}
      <div className={styles.subGroupTitle}>档案列表</div>
      <div className={styles.group}>
        {settings.userProfiles.length === 0 ? (
          <div className={styles.empty}>暂无已保存档案，点击下方新建</div>
        ) : (
          settings.userProfiles.map((profile) => {
            const isActive = settings.activeProfileId === profile.uuid;
            return (
              <div key={profile.uuid} className={styles.providerItem}>
                <div className={styles.providerInfo}>
                  <span className={styles.providerName}>
                    {profile.name || '(未命名)'}
                    {isActive && (
                      <Tag color="green" style={{ marginLeft: 8, fontSize: 11 }}>
                        当前
                      </Tag>
                    )}
                  </span>
                  <span className={styles.providerMeta}>
                    {PERSON_OPTIONS.find((o) => o.value === profile.person)?.label ?? '第二人称'}
                    {profile.description ? ` · ${profile.description.slice(0, 30)}` : ''}
                  </span>
                </div>
                <div className={styles.providerActions}>
                  <Button
                    htmlType="button"
                    size="small"
                    disabled={isActive}
                    onClick={() => handleSwitch(profile.uuid)}
                  >
                    切换
                  </Button>
                  <Button
                    htmlType="button"
                    size="small"
                    danger
                    onClick={() => handleDelete(profile.uuid)}
                  >
                    删除
                  </Button>
                </div>
              </div>
            );
          })
        )}
        <div className={styles.row}>
          <Button htmlType="button" block onClick={handleAddProfile} style={{ minHeight: 44 }}>
            + 新建档案
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Section 9: 外观
// ============================================================================

function AppearanceSection() {
  const { styles } = useStyles();
  const settings = useSettingsStore();

  const handleThemeChange = (theme: ThemeMode): void => {
    settings.setTheme(theme);
  };

  return (
    <div className={styles.group}>
      <div className={styles.row}>
        <label className={styles.label}>主题</label>
        <span className={styles.desc}>切换亮色 / 暗色主题</span>
        <div className={styles.input}>
          <Select
            value={settings.theme}
            onChange={handleThemeChange}
            options={THEME_OPTIONS}
          />
        </div>
      </div>
      <div className={`${styles.row} ${styles.rowInline}`}>
        <div>
          <div className={styles.label}>快速切换</div>
          <div className={styles.desc}>在亮色与暗色之间切换</div>
        </div>
        <Switch
          checked={settings.theme === 'dark'}
          onChange={(checked) => handleThemeChange(checked ? 'dark' : 'light')}
          checkedChildren="暗"
          unCheckedChildren="亮"
        />
      </div>
    </div>
  );
}

// ============================================================================
// Section 10: 关于 LUZZY
// ============================================================================

function AboutSection() {
  const { styles } = useStyles();
  return (
    <div>
      <div className={styles.aboutText}>
        <Markdown>
          {'**LUZZY** 是一个移动端角色扮演聊天应用，支持：\n\n- 🎭 **多供应商路由**：模型名格式 `<providerId>_<model_name>`，支持 OpenAI / DeepSeek / 火山方舟 / 智谱 / Moonshot / MiniMax 等\n- 💬 **流式输出**：逐字返回生成内容，支持思维链推理\n- 🧠 **记忆系统**：向量记忆检索 + 全局记忆 + 上下文压缩\n- 🛠️ **工具调用**：向量记忆 / 关键词搜索 / Web 搜索 / 世界书 / SKILL / MCP HTTP\n- 📚 **角色卡管理**：SillyTavern V1/V2 格式兼容，导入导出\n- 📖 **预设系统**：系统提示词模板管理\n- 🌍 **世界书**：关键词触发与常驻条目\n- 🔧 **正则脚本**：文本替换与处理\n- 🎨 **主题切换**：亮色 / 暗色 Material You 主题\n\n所有数据存储在本地 IndexedDB，不会上传到服务器。'}
        </Markdown>
      </div>

      <div className={styles.subGroupTitle}>技术栈</div>
      <div className={styles.aboutText}>
        <Markdown>
          {'- **前端**：React 19 + TypeScript + Vite\n- **UI**：Ant Design 6 + antd-style + @lobehub/ui\n- **状态**：Zustand（persist 中间件）\n- **存储**：IndexedDB（多 object store）\n- **路由**：React Router\n- **构建**：Vite + pnpm'}
        </Markdown>
      </div>

      <div className={styles.subGroupTitle}>链接</div>
      <div className={styles.aboutText}>
        <Markdown>
          {'- [GitHub](https://github.com/)\n- [Releases](https://github.com/releases)\n- 反馈与建议：在 GitHub Issues 提交'}
        </Markdown>
      </div>

      <Divider style={{ margin: '16px 0' }} />
      <div className={styles.brand}>
        <div className={styles.brandName}>LUZZY</div>
        <div>版本 1.0.0</div>
      </div>
    </div>
  );
}

// ============================================================================
// 通用图标
// ============================================================================

function EditIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}
