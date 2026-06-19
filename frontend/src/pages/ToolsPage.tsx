import { useEffect, useState, useRef } from 'react';
import { createStyles } from 'antd-style';
import {
  Input,
  Switch,
  Button,
  Modal,
  message,
  Empty,
  Tag,
  Divider,
  Tabs,
  Select,
  Tree,
  Collapse,
} from 'antd';
import type { TreeDataNode } from 'antd';
import { v4 as uuidv4 } from 'uuid';
import JSZip from 'jszip';
import type {
  ActiveTool,
  ActiveToolType,
  McpSubTool,
  SkillFileNode,
  GithubMirror,
  VectorMemoryShard,
  MemorySettings,
  ApiSettings,
  ApiProvider,
} from '@/types';
import { normalizeActiveTool, getActiveToolCallLabels } from '@/services/toolService';
import {
  parseMcpImportJson,
  initializeMcpServer,
  listMcpTools,
} from '@/services/mcpService';
import {
  getEmbedding,
  cosineSimilarity,
  getGlobalMemory,
  setGlobalMemory as persistGlobalMemory,
} from '@/services/memoryService';
import { getItem, setItem, getAllKeys } from '@/services/storage';
import { useSettingsStore, BUILTIN_PROVIDERS } from '@/store/useSettingsStore';

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
  section: css`
    margin-bottom: var(--luzzy-spacing-lg);
  `,
  sectionTitle: css`
    font-size: 13px;
    font-weight: 600;
    color: var(--luzzy-primary);
    margin-bottom: var(--luzzy-spacing-sm);
    padding-left: var(--luzzy-spacing-xs);
    letter-spacing: 0.3px;
  `,
  group: css`
    background: var(--luzzy-glass-bg);
    backdrop-filter: blur(var(--luzzy-glass-blur)) saturate(180%);
    -webkit-backdrop-filter: blur(var(--luzzy-glass-blur)) saturate(180%);
    border: var(--luzzy-glass-border-width) solid var(--luzzy-glass-border-color);
    border-radius: var(--luzzy-radius-md);
    box-shadow: var(--luzzy-glass-shadow), var(--luzzy-glass-inset-shadow);
    overflow: hidden;
  `,
  toolItem: css`
    display: flex;
    flex-direction: column;
    gap: var(--luzzy-spacing-xs);
    padding: var(--luzzy-spacing-md);
    border-bottom: 1px solid var(--luzzy-outline-variant);

    &:last-child {
      border-bottom: none;
    }
  `,
  toolHeader: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--luzzy-spacing-sm);
    min-height: 44px;
  `,
  toolInfo: css`
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  `,
  toolName: css`
    font-size: 15px;
    font-weight: 500;
    color: var(--luzzy-on-surface);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  toolDesc: css`
    font-size: 12px;
    color: var(--luzzy-on-surface-variant);
    line-height: 1.4;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  `,
  toolMeta: css`
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    align-items: center;
    margin-top: 2px;
  `,
  toolActions: css`
    display: flex;
    align-items: center;
    gap: var(--luzzy-spacing-xs);
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
      background: var(--luzzy-surface-container-high);
    }
  `,
  empty: css`
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--luzzy-spacing-sm);
    color: var(--luzzy-on-surface-variant);
    padding: var(--luzzy-spacing-xl);
    text-align: center;
  `,
  addRow: css`
    padding: var(--luzzy-spacing-md);
  `,
  importArea: css`
    padding: var(--luzzy-spacing-md);
    display: flex;
    flex-direction: column;
    gap: var(--luzzy-spacing-sm);
  `,
  textarea: css`
    .ant-input {
      background: var(--luzzy-surface-container-high) !important;
      border-color: var(--luzzy-outline-variant) !important;
      color: var(--luzzy-on-surface) !important;
      border-radius: var(--luzzy-radius-sm) !important;
      min-height: 80px;
      font-family: 'JetBrains Mono', 'Fira Code', Consolas, monospace;
      font-size: 12px;
    }
  `,
  input: css`
    .ant-input,
    .ant-input-affix-wrapper,
    .ant-select .ant-select-selector {
      background: var(--luzzy-surface-container-high) !important;
      border-color: var(--luzzy-outline-variant) !important;
      color: var(--luzzy-on-surface) !important;
      border-radius: var(--luzzy-radius-sm) !important;
      min-height: 44px;
    }
  `,
  formItem: css`
    display: flex;
    flex-direction: column;
    gap: 4px;
  `,
  formLabel: css`
    font-size: 13px;
    font-weight: 500;
    color: var(--luzzy-on-surface);
  `,
  hint: css`
    color: var(--luzzy-on-surface-variant);
    font-size: 12px;
    line-height: 1.5;
  `,
  loadingText: css`
    font-size: 12px;
    color: var(--luzzy-primary);
  `,
  row: css`
    display: flex;
    gap: var(--luzzy-spacing-sm);
    align-items: center;
  `,
  searchResult: css`
    padding: var(--luzzy-spacing-sm);
    border: 1px solid var(--luzzy-outline-variant);
    border-radius: var(--luzzy-radius-sm);
    margin-bottom: var(--luzzy-spacing-xs);
    background: var(--luzzy-surface-container);
  `,
  searchResultHeader: css`
    display: flex;
    gap: 4px;
    align-items: center;
    margin-bottom: 4px;
    flex-wrap: wrap;
  `,
  searchResultContent: css`
    font-size: 12px;
    color: var(--luzzy-on-surface-variant);
    line-height: 1.5;
    max-height: 120px;
    overflow-y: auto;
    white-space: pre-wrap;
    word-break: break-word;
  `,
  fileManagerBody: css`
    display: flex;
    flex-direction: column;
    gap: var(--luzzy-spacing-sm);
    max-height: 60vh;
  `,
  fileTreeContainer: css`
    border: 1px solid var(--luzzy-outline-variant);
    border-radius: var(--luzzy-radius-sm);
    padding: var(--luzzy-spacing-xs);
    max-height: 200px;
    overflow-y: auto;
    background: var(--luzzy-surface-container);
  `,
  fileEditorContainer: css`
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
  `,
  statRow: css`
    display: flex;
    gap: var(--luzzy-spacing-md);
    flex-wrap: wrap;
  `,
  statItem: css`
    display: flex;
    flex-direction: column;
    gap: 2px;
  `,
  statValue: css`
    font-size: 20px;
    font-weight: 600;
    color: var(--luzzy-primary);
  `,
  statLabel: css`
    font-size: 11px;
    color: var(--luzzy-on-surface-variant);
  `,
}));

// ============================================================================
// 常量
// ============================================================================

/** GitHub 镜像站列表（用于国内加速） */
const GITHUB_MIRRORS: GithubMirror[] = [
  { name: '直连', url: '' },
  { name: 'gh-proxy.com', url: 'https://gh-proxy.com/' },
  { name: 'github.moeyy.xyz', url: 'https://github.moeyy.xyz/' },
  { name: 'ghfast.top', url: 'https://ghfast.top/' },
];

/** 工具类型选项 */
const TOOL_TYPE_OPTIONS: Array<{ value: ActiveToolType; label: string }> = [
  { value: 'vector', label: '向量记忆' },
  { value: 'keyword', label: '关键词搜索' },
  { value: 'web', label: 'Web 搜索' },
  { value: 'world', label: '世界书' },
  { value: 'skill_readfile', label: 'SKILL 文件阅读' },
  { value: 'skill', label: 'SKILL 工具' },
  { value: 'mcp_http', label: 'MCP HTTP' },
];

/** 工具类型标签颜色映射 */
const TOOL_TYPE_COLOR: Record<ActiveToolType, string> = {
  vector: 'blue',
  keyword: 'cyan',
  web: 'green',
  world: 'purple',
  skill_readfile: 'orange',
  skill: 'gold',
  mcp_http: 'magenta',
};

/** 工具类型中文名映射 */
const TOOL_TYPE_LABEL: Record<ActiveToolType, string> = {
  vector: '向量记忆',
  keyword: '关键词搜索',
  web: 'Web 搜索',
  world: '世界书',
  skill_readfile: 'SKILL 文件阅读',
  skill: 'SKILL 工具',
  mcp_http: 'MCP HTTP',
};

/** 内置工具类型集合 */
const BUILTIN_TOOL_TYPES: ActiveToolType[] = ['vector', 'keyword', 'web', 'world', 'skill_readfile'];

/** IndexedDB 中工具列表的存储键 */
const ACTIVE_TOOLS_STORAGE_KEY = 'activeTools';

/** SKILL 文件存储键前缀（存储在 activeTools store 中，与工具列表分开） */
const SKILL_FILES_STORAGE_KEY_PREFIX = 'skillFiles_';

/** 全局记忆开关存储键 */
const GLOBAL_MEMORY_TOGGLES_STORAGE_KEY = 'globalMemoryToggles';

/** GitHub 导入最大文件数限制 */
const GITHUB_IMPORT_MAX_FILES = 100;

// ============================================================================
// 类型定义
// ============================================================================

/** 工具编辑表单状态 */
interface ToolForm {
  name: string;
  type: ActiveToolType;
  description: string;
  callName: string;
  resultCount: number;
  tavilyApiKey: string;
  worldInfoAccessMode: string;
  mcpServerUrl: string;
  mcpServerName: string;
  skillFileName: string;
  skillFileContent: string;
}

/** 向量搜索结果项 */
interface VectorSearchResultItem {
  shard: VectorMemoryShard;
  score: number;
}

/** 解析后的 GitHub URL */
interface ParsedGithubUrl {
  owner: string;
  repo: string;
  branch: string;
  subdir: string;
}

// ============================================================================
// 辅助函数
// ============================================================================

/** 创建空表单 */
const createEmptyForm = (): ToolForm => ({
  name: '',
  type: 'vector',
  description: '',
  callName: '',
  resultCount: 8,
  tavilyApiKey: '',
  worldInfoAccessMode: 'read',
  mcpServerUrl: '',
  mcpServerName: '',
  skillFileName: '',
  skillFileContent: '',
});

/** 将工具对象转换为表单数据 */
const toolToForm = (tool: ActiveTool): ToolForm => ({
  name: tool.name,
  type: tool.type,
  description: tool.description,
  callName: tool.callName,
  resultCount: tool.resultCount,
  tavilyApiKey: tool.tavilyApiKey ?? '',
  worldInfoAccessMode: tool.worldInfoAccessMode ?? 'read',
  mcpServerUrl: tool.mcpServerUrl ?? '',
  mcpServerName: tool.mcpServerName ?? '',
  skillFileName: tool.skillFileName ?? '',
  skillFileContent: tool.skillFileContent ?? '',
});

/** 根据工具类型获取默认 callName */
const getDefaultCallName = (type: ActiveToolType): string => {
  switch (type) {
    case 'vector':
      return 'tool_memory';
    case 'keyword':
      return 'tool_grep';
    case 'web':
      return 'tool_web';
    case 'world':
      return 'tool_world';
    case 'skill_readfile':
      return 'tool_skill_readfile';
    case 'skill':
      return 'tool_skill';
    case 'mcp_http':
      return 'tool_mcp';
    default:
      return 'tool_memory';
  }
};

/**
 * 解析 GitHub URL
 *
 * 支持格式：
 * - https://github.com/{owner}/{repo}
 * - https://github.com/{owner}/{repo}/tree/{branch}
 * - https://github.com/{owner}/{repo}/tree/{branch}/{subdir}
 */
const parseGithubUrl = (url: string): ParsedGithubUrl => {
  const cleanUrl = String(url || '').trim();
  if (!cleanUrl) throw new Error('GitHub URL 不能为空');

  const match = cleanUrl.match(
    /github\.com\/([^/]+)\/([^/?#]+?)(?:\/tree\/([^/?#]+)(?:\/(.+?))?(?:[/?#]|$))?(?:[/?#]|$)/,
  );
  if (!match) {
    throw new Error('无法解析 GitHub URL，请输入正确的仓库地址（如 https://github.com/owner/repo）');
  }

  return {
    owner: match[1],
    repo: match[2].replace(/\.git$/, ''),
    branch: match[3] || 'main',
    subdir: match[4] || '',
  };
};

/**
 * 从扁平的文件路径 -> 内容映射构建树形结构
 */
const buildFileTree = (files: Record<string, string>): SkillFileNode[] => {
  const root: SkillFileNode = {
    name: '',
    path: '',
    isDirectory: true,
    children: [],
  };

  const ensureDir = (node: SkillFileNode, parts: string[]): SkillFileNode => {
    let current = node;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (!current.children) current.children = [];
      let child = current.children.find((c) => c.name === part && c.isDirectory);
      if (!child) {
        child = {
          name: part,
          path: parts.slice(0, i + 1).join('/'),
          isDirectory: true,
          children: [],
        };
        current.children.push(child);
      }
      current = child;
    }
    return current;
  };

  Object.entries(files).forEach(([path, content]) => {
    const parts = path.split('/').filter(Boolean);
    if (parts.length === 0) return;
    const fileName = parts.pop()!;
    const parentDir = ensureDir(root, parts);
    if (!parentDir.children) parentDir.children = [];
    parentDir.children.push({
      name: fileName,
      path,
      isDirectory: false,
      content,
    });
  });

  const sortNode = (node: SkillFileNode): void => {
    if (node.children) {
      node.children.sort((a, b) => {
        if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      node.children.forEach(sortNode);
    }
  };
  sortNode(root);

  return root.children || [];
};

/**
 * 将 SkillFileNode[] 转换为 antd Tree 的 TreeDataNode[]
 */
const skillFileNodeToTreeData = (nodes: SkillFileNode[]): TreeDataNode[] => {
  return nodes.map((node) => ({
    key: node.path,
    title: node.name,
    isLeaf: !node.isDirectory,
    children: node.children ? skillFileNodeToTreeData(node.children) : undefined,
  }));
};

/**
 * 获取树中所有目录路径（用于展开）
 */
const getAllDirectoryPaths = (nodes: SkillFileNode[]): string[] => {
  const paths: string[] = [];
  const traverse = (list: SkillFileNode[]): void => {
    for (const node of list) {
      if (node.isDirectory) {
        paths.push(node.path);
        if (node.children) traverse(node.children);
      }
    }
  };
  traverse(nodes);
  return paths;
};

/**
 * 加载 SKILL 工具的文件列表
 */
const loadSkillFiles = async (toolId: string): Promise<Record<string, string>> => {
  const data = await getItem<Record<string, string>>(
    'activeTools',
    SKILL_FILES_STORAGE_KEY_PREFIX + toolId,
  );
  return data ?? {};
};

/**
 * 保存 SKILL 工具的文件列表
 */
const saveSkillFiles = async (toolId: string, files: Record<string, string>): Promise<void> => {
  await setItem('activeTools', SKILL_FILES_STORAGE_KEY_PREFIX + toolId, files);
};

// ============================================================================
// 主组件
// ============================================================================

export function ToolsPage() {
  const { styles } = useStyles();
  const [messageApi, contextHolder] = message.useMessage();

  // 工具列表状态
  const [tools, setTools] = useState<ActiveTool[]>([]);
  const [loading, setLoading] = useState(false);

  // 当前激活的 Tab
  const [activeTab, setActiveTab] = useState<string>('builtin');

  // 编辑弹窗状态
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ToolForm>(createEmptyForm());

  // 删除确认弹窗
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // MCP 导入状态
  const [mcpImportJson, setMcpImportJson] = useState('');
  const [mcpImporting, setMcpImporting] = useState(false);

  // GitHub 导入状态
  const [githubUrl, setGithubUrl] = useState('');
  const [githubMirror, setGithubMirror] = useState('');
  const [githubImporting, setGithubImporting] = useState(false);

  // ZIP 导入状态
  const [zipImporting, setZipImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 文件管理器状态
  const [fileManagerTool, setFileManagerTool] = useState<ActiveTool | null>(null);
  const [fileManagerFiles, setFileManagerFiles] = useState<Record<string, string>>({});
  const [fileManagerSelectedPath, setFileManagerSelectedPath] = useState<string | null>(null);
  const [fileManagerEditingContent, setFileManagerEditingContent] = useState('');
  const [fileManagerExpandedKeys, setFileManagerExpandedKeys] = useState<string[]>([]);
  const [newFileModalOpen, setNewFileModalOpen] = useState(false);
  const [newFilePath, setNewFilePath] = useState('');

  // 向量搜索状态
  const [vectorSearchQuery, setVectorSearchQuery] = useState('');
  const [vectorSearchTopK, setVectorSearchTopK] = useState(8);
  const [vectorSearchResults, setVectorSearchResults] = useState<VectorSearchResultItem[]>([]);
  const [vectorSearching, setVectorSearching] = useState(false);

  // 记忆召回状态
  const [globalMemoryContent, setGlobalMemoryContent] = useState('');
  const [globalMemorySaving, setGlobalMemorySaving] = useState(false);
  const [memoryStats, setMemoryStats] = useState({ shardCount: 0, totalChars: 0 });
  const [globalMemoryToggles, setGlobalMemoryToggles] = useState<Record<string, boolean>>({});

  /** 初次挂载加载工具列表 */
  useEffect(() => {
    void loadTools();
    void loadGlobalMemoryToggles();
  }, []);

  /** 切换到内置工具 Tab 时加载记忆数据 */
  useEffect(() => {
    if (activeTab === 'builtin') {
      void loadMemoryData();
    }
  }, [activeTab]);

  /** 从 IndexedDB 加载工具列表 */
  const loadTools = async (): Promise<void> => {
    setLoading(true);
    try {
      const data = await getItem<ActiveTool[]>('activeTools', ACTIVE_TOOLS_STORAGE_KEY);
      const list = Array.isArray(data) ? data.map(normalizeActiveTool) : [];
      setTools(list);
    } catch (e) {
      console.error('[ToolsPage] 加载工具列表失败:', e);
      messageApi.error('加载工具列表失败');
    } finally {
      setLoading(false);
    }
  };

  /** 保存工具列表到 IndexedDB */
  const saveTools = async (list: ActiveTool[]): Promise<void> => {
    try {
      await setItem('activeTools', ACTIVE_TOOLS_STORAGE_KEY, list);
    } catch (e) {
      console.error('[ToolsPage] 保存工具列表失败:', e);
      messageApi.error('保存工具列表失败');
      throw e;
    }
  };

  /** 加载全局记忆和向量记忆统计 */
  const loadMemoryData = async (): Promise<void> => {
    try {
      const globalMemory = await getGlobalMemory();
      setGlobalMemoryContent(globalMemory?.content ?? '');

      const allKeys = await getAllKeys('memory');
      const shardKeys = allKeys
        .map((k) => String(k))
        .filter((k) => k.startsWith('vector_memory_'));

      let shardCount = 0;
      let totalChars = 0;
      for (const key of shardKeys) {
        const shards = await getItem<VectorMemoryShard[]>('memory', key);
        if (Array.isArray(shards)) {
          shardCount += shards.length;
          totalChars += shards.reduce((sum, s) => sum + (s.content?.length ?? 0), 0);
        }
      }
      setMemoryStats({ shardCount, totalChars });
    } catch (e) {
      console.error('[ToolsPage] 加载记忆数据失败:', e);
    }
  };

  /** 加载全局记忆开关 */
  const loadGlobalMemoryToggles = async (): Promise<void> => {
    try {
      const data = await getItem<Record<string, boolean>>(
        'activeTools',
        GLOBAL_MEMORY_TOGGLES_STORAGE_KEY,
      );
      setGlobalMemoryToggles(data ?? {});
    } catch (e) {
      console.error('[ToolsPage] 加载全局记忆开关失败:', e);
    }
  };

  /** 切换工具启用状态 */
  const handleToggleEnabled = async (tool: ActiveTool): Promise<void> => {
    const prev = tools;
    const updated = tools.map((t) =>
      t.id === tool.id ? { ...t, enabled: !t.enabled } : t,
    );
    setTools(updated);
    try {
      await saveTools(updated);
    } catch {
      setTools(prev);
    }
  };

  /** 切换工具的全局记忆开关 */
  const handleToggleGlobalMemory = async (toolId: string, enabled: boolean): Promise<void> => {
    const prev = globalMemoryToggles;
    const updated = { ...globalMemoryToggles, [toolId]: enabled };
    setGlobalMemoryToggles(updated);
    try {
      await setItem('activeTools', GLOBAL_MEMORY_TOGGLES_STORAGE_KEY, updated);
    } catch {
      setGlobalMemoryToggles(prev);
    }
  };

  /** 打开新建弹窗 */
  const handleOpenCreate = (): void => {
    setEditingId(null);
    const emptyForm = createEmptyForm();
    emptyForm.callName = getDefaultCallName(emptyForm.type);
    setForm(emptyForm);
    setEditorOpen(true);
  };

  /** 打开编辑弹窗 */
  const handleOpenEdit = (tool: ActiveTool): void => {
    setEditingId(tool.id);
    setForm(toolToForm(tool));
    setEditorOpen(true);
  };

  /** 切换工具类型时自动填充默认 callName */
  const handleTypeChange = (type: ActiveToolType): void => {
    setForm((prev) => ({
      ...prev,
      type,
      callName: getDefaultCallName(type),
    }));
  };

  /** 保存工具（新建或更新） */
  const handleSave = async (): Promise<void> => {
    if (!form.name.trim()) {
      messageApi.error('工具名称不能为空');
      return;
    }
    if (!form.callName.trim()) {
      messageApi.error('调用名称不能为空');
      return;
    }

    let newList: ActiveTool[];
    if (editingId) {
      const existing = tools.find((t) => t.id === editingId);
      if (!existing) {
        messageApi.error('未找到要编辑的工具');
        return;
      }
      const updated: ActiveTool = normalizeActiveTool({
        ...existing,
        name: form.name.trim(),
        type: form.type,
        description: form.description,
        callName: form.callName.trim(),
        resultCount: form.resultCount,
        tavilyApiKey: form.type === 'web' ? form.tavilyApiKey : undefined,
        worldInfoAccessMode:
          form.type === 'world' ? form.worldInfoAccessMode : undefined,
        mcpServerUrl: form.type === 'mcp_http' ? form.mcpServerUrl : undefined,
        mcpServerName: form.type === 'mcp_http' ? form.mcpServerName : undefined,
        mcpTools: form.type === 'mcp_http' ? existing.mcpTools : undefined,
        skillFileName: form.type === 'skill' ? form.skillFileName : undefined,
        skillFileContent: form.type === 'skill' ? form.skillFileContent : undefined,
      });
      newList = tools.map((t) => (t.id === editingId ? updated : t));
    } else {
      const newTool: ActiveTool = normalizeActiveTool({
        id: uuidv4(),
        name: form.name.trim(),
        enabled: true,
        type: form.type,
        description: form.description,
        callName: form.callName.trim(),
        resultCount: form.resultCount,
        tavilyApiKey: form.type === 'web' ? form.tavilyApiKey : undefined,
        worldInfoAccessMode:
          form.type === 'world' ? form.worldInfoAccessMode : undefined,
        mcpServerUrl: form.type === 'mcp_http' ? form.mcpServerUrl : undefined,
        mcpServerName: form.type === 'mcp_http' ? form.mcpServerName : undefined,
        mcpTools: [],
        skillFileName: form.type === 'skill' ? form.skillFileName : undefined,
        skillFileContent: form.type === 'skill' ? form.skillFileContent : undefined,
      });
      newList = [...tools, newTool];
    }

    const prev = tools;
    setTools(newList);
    try {
      await saveTools(newList);
    } catch {
      setTools(prev);
      return;
    }
    messageApi.success(editingId ? '工具已更新' : '工具已创建');
    setEditorOpen(false);
  };

  /** 确认删除工具 */
  const handleConfirmDelete = async (): Promise<void> => {
    if (!deleteId) return;
    const prev = tools;
    const newList = tools.filter((t) => t.id !== deleteId);
    setTools(newList);
    try {
      await saveTools(newList);
    } catch {
      setTools(prev);
      return;
    }
    messageApi.success('工具已删除');
    setDeleteId(null);
  };

  /** 导入 MCP 工具 */
  const handleImportMcp = async (): Promise<void> => {
    const jsonText = mcpImportJson.trim();
    if (!jsonText) {
      messageApi.error('请输入 MCP 配置 JSON');
      return;
    }

    setMcpImporting(true);
    let hide: (() => void) | undefined;
    try {
      const config = parseMcpImportJson(jsonText);
      if (!config.url) {
        throw new Error('未能从 JSON 中解析出 MCP 服务器 URL');
      }

      hide = messageApi.loading('正在连接 MCP 服务器...');

      await initializeMcpServer(config.url, config.headers);

      const mcpTools: McpSubTool[] = await listMcpTools(config.url, undefined, config.headers);

      if (mcpTools.length === 0) {
        throw new Error('MCP 服务器未返回任何工具');
      }

      const serverName = config.name || config.url;
      const newTool: ActiveTool = normalizeActiveTool({
        id: uuidv4(),
        name: `MCP: ${serverName}`,
        enabled: true,
        type: 'mcp_http',
        description: `从 ${config.url} 导入的 MCP 工具，包含 ${mcpTools.length} 个子工具`,
        callName: `tool_mcp_${uuidv4().slice(-6)}`,
        mcpServerUrl: config.url,
        mcpServerName: serverName,
        mcpTools,
      });

      const newList = [...tools, newTool];
      setTools(newList);
      await saveTools(newList);

      hide();
      hide = undefined;
      messageApi.success(`已导入 MCP 工具 "${serverName}"，包含 ${mcpTools.length} 个子工具`);
      setMcpImportJson('');
    } catch (e) {
      if (hide) hide();
      messageApi.error(e instanceof Error ? e.message : 'MCP 导入失败');
    } finally {
      setMcpImporting(false);
    }
  };

  /** 从 GitHub 导入 SKILL */
  const handleImportGithub = async (): Promise<void> => {
    const url = githubUrl.trim();
    if (!url) {
      messageApi.error('请输入 GitHub 仓库 URL');
      return;
    }

    setGithubImporting(true);
    let hide: (() => void) | undefined;
    try {
      const parsed = parseGithubUrl(url);
      hide = messageApi.loading('正在从 GitHub 获取仓库内容...');

      const files: Record<string, string> = {};
      const prefix = parsed.subdir ? parsed.subdir + '/' : '';

      // 尝试通过 GitHub API 获取文件树
      let apiSuccess = false;
      try {
        const apiUrl = `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/git/trees/${parsed.branch}?recursive=1`;
        const apiResponse = await fetch(apiUrl);
        if (apiResponse.ok) {
          const apiData = (await apiResponse.json()) as {
            tree?: Array<{ path: string; type: string }>;
          };
          const tree = Array.isArray(apiData.tree) ? apiData.tree : [];

          const filePaths = tree
            .filter((item) => item.type === 'blob' && item.path.startsWith(prefix))
            .map((item) => item.path.slice(prefix.length))
            .filter((p) => p.length > 0)
            .slice(0, GITHUB_IMPORT_MAX_FILES);

          apiSuccess = filePaths.length > 0;

          // 下载每个文件
          for (const filePath of filePaths) {
            const fullPath = `${prefix}${filePath}`;
            const rawUrl = githubMirror
              ? `${githubMirror}https://raw.githubusercontent.com/${parsed.owner}/${parsed.repo}/${parsed.branch}/${fullPath}`
              : `https://raw.githubusercontent.com/${parsed.owner}/${parsed.repo}/${parsed.branch}/${fullPath}`;
            try {
              const fileResponse = await fetch(rawUrl);
              if (fileResponse.ok) {
                files[filePath] = await fileResponse.text();
              }
            } catch {
              // 跳过下载失败的文件
            }
          }
        }
      } catch {
        // API 失败，降级到直接获取 SKILL.md
      }

      // 如果 API 失败，尝试直接获取 SKILL.md
      if (!apiSuccess || Object.keys(files).length === 0) {
        const skillMdPath = `${prefix}SKILL.md`;
        const rawUrl = githubMirror
          ? `${githubMirror}https://raw.githubusercontent.com/${parsed.owner}/${parsed.repo}/${parsed.branch}/${skillMdPath}`
          : `https://raw.githubusercontent.com/${parsed.owner}/${parsed.repo}/${parsed.branch}/${skillMdPath}`;
        const fileResponse = await fetch(rawUrl);
        if (!fileResponse.ok) {
          throw new Error(
            `无法获取仓库内容（HTTP ${fileResponse.status}），请检查 URL、分支名或尝试使用镜像`,
          );
        }
        files['SKILL.md'] = await fileResponse.text();
      }

      // 查找 SKILL.md
      const skillMdKey = Object.keys(files).find(
        (k) => k.toLowerCase() === 'skill.md' || k.toLowerCase().endsWith('/skill.md'),
      );
      if (!skillMdKey) {
        throw new Error('仓库中未找到 SKILL.md 文件');
      }

      const skillContent = files[skillMdKey];
      const toolName = parsed.repo;

      const newTool: ActiveTool = normalizeActiveTool({
        id: uuidv4(),
        name: `SKILL: ${toolName}`,
        enabled: true,
        type: 'skill',
        description: `从 GitHub 导入: ${parsed.owner}/${parsed.repo}` +
          (parsed.subdir ? `/${parsed.subdir}` : ''),
        callName: `tool_skill_${uuidv4().slice(-6)}`,
        skillFileName: 'SKILL.md',
        skillFileContent: skillContent,
      });

      const newList = [...tools, newTool];
      setTools(newList);
      await saveTools(newList);
      await saveSkillFiles(newTool.id, files);

      hide();
      hide = undefined;
      messageApi.success(
        `已从 GitHub 导入 SKILL "${toolName}"，包含 ${Object.keys(files).length} 个文件`,
      );
      setGithubUrl('');
    } catch (e) {
      if (hide) hide();
      messageApi.error(e instanceof Error ? e.message : 'GitHub 导入失败');
    } finally {
      setGithubImporting(false);
    }
  };

  /** 从 ZIP 文件导入 SKILL */
  const handleImportZip = async (file: File): Promise<void> => {
    setZipImporting(true);
    let hide: (() => void) | undefined;
    try {
      hide = messageApi.loading('正在解析 ZIP 文件...');

      const zip = await JSZip.loadAsync(file);

      // 查找 SKILL.md（不区分大小写，优先选择路径最浅的）
      let skillMdPath: string | null = null;
      for (const path of Object.keys(zip.files)) {
        if (path.toLowerCase().endsWith('skill.md') && !zip.files[path].dir) {
          if (
            !skillMdPath ||
            path.split('/').length < skillMdPath.split('/').length
          ) {
            skillMdPath = path;
          }
        }
      }

      if (!skillMdPath) {
        throw new Error('ZIP 中未找到 SKILL.md');
      }

      // 提取基础目录
      const baseDir = skillMdPath.includes('/')
        ? skillMdPath.slice(0, skillMdPath.lastIndexOf('/') + 1)
        : '';

      // 提取所有文件（相对于基础目录）
      const files: Record<string, string> = {};
      for (const path of Object.keys(zip.files)) {
        if (zip.files[path].dir) continue;
        if (!path.startsWith(baseDir)) continue;

        const relativePath = path.slice(baseDir.length);
        if (!relativePath) continue;

        try {
          const content = await zip.files[path].async('text');
          files[relativePath] = content;
        } catch {
          // 跳过无法解码为文本的文件（二进制文件）
        }
      }

      const skillContent = files['SKILL.md'] || '';
      const toolName = file.name.replace(/\.zip$/i, '');

      const newTool: ActiveTool = normalizeActiveTool({
        id: uuidv4(),
        name: `SKILL: ${toolName}`,
        enabled: true,
        type: 'skill',
        description: `从 ZIP 导入: ${file.name}`,
        callName: `tool_skill_${uuidv4().slice(-6)}`,
        skillFileName: 'SKILL.md',
        skillFileContent: skillContent,
      });

      const newList = [...tools, newTool];
      setTools(newList);
      await saveTools(newList);
      await saveSkillFiles(newTool.id, files);

      hide();
      hide = undefined;
      messageApi.success(
        `已从 ZIP 导入 SKILL "${toolName}"，包含 ${Object.keys(files).length} 个文件`,
      );
    } catch (e) {
      if (hide) hide();
      messageApi.error(e instanceof Error ? e.message : 'ZIP 导入失败');
    } finally {
      setZipImporting(false);
    }
  };

  /** ZIP 文件选择处理 */
  const handleZipFileSelect = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (file) {
      void handleImportZip(file);
    }
    e.target.value = '';
  };

  /** 打开文件管理器 */
  const handleOpenFileManager = async (tool: ActiveTool): Promise<void> => {
    let files = await loadSkillFiles(tool.id);
    if (Object.keys(files).length === 0 && tool.skillFileContent) {
      files = {
        [tool.skillFileName || 'SKILL.md']: tool.skillFileContent,
      };
    }
    setFileManagerTool(tool);
    setFileManagerFiles(files);
    setFileManagerSelectedPath(null);
    setFileManagerEditingContent('');
    const tree = buildFileTree(files);
    setFileManagerExpandedKeys(getAllDirectoryPaths(tree));
  };

  /** 文件管理器中选择文件 */
  const handleFileSelect = (selectedKeys: React.Key[]): void => {
    const path = selectedKeys[0] ? String(selectedKeys[0]) : null;
    setFileManagerSelectedPath(path);
    if (path) {
      setFileManagerEditingContent(fileManagerFiles[path] || '');
    } else {
      setFileManagerEditingContent('');
    }
  };

  /** 文件管理器中编辑文件内容 */
  const handleFileContentChange = (content: string): void => {
    setFileManagerEditingContent(content);
    if (fileManagerSelectedPath) {
      setFileManagerFiles((prev) => ({
        ...prev,
        [fileManagerSelectedPath]: content,
      }));
    }
  };

  /** 创建新文件 */
  const handleCreateFile = (): void => {
    const path = newFilePath.trim();
    if (!path) {
      messageApi.error('文件路径不能为空');
      return;
    }
    const normalizedPath = path.replace(/^\/+/, '').replace(/\/+/g, '/');
    if (fileManagerFiles[normalizedPath] !== undefined) {
      messageApi.error('文件已存在');
      return;
    }
    setFileManagerFiles((prev) => ({
      ...prev,
      [normalizedPath]: '',
    }));
    setFileManagerSelectedPath(normalizedPath);
    setFileManagerEditingContent('');
    const tree = buildFileTree({ ...fileManagerFiles, [normalizedPath]: '' });
    setFileManagerExpandedKeys(getAllDirectoryPaths(tree));
    setNewFileModalOpen(false);
    setNewFilePath('');
    messageApi.success(`已创建文件: ${normalizedPath}`);
  };

  /** 删除文件 */
  const handleDeleteFile = (): void => {
    if (!fileManagerSelectedPath) {
      messageApi.error('请先选择要删除的文件');
      return;
    }
    const path = fileManagerSelectedPath;
    const updated = { ...fileManagerFiles };
    delete updated[path];
    setFileManagerFiles(updated);
    setFileManagerSelectedPath(null);
    setFileManagerEditingContent('');
    const tree = buildFileTree(updated);
    setFileManagerExpandedKeys(getAllDirectoryPaths(tree));
    messageApi.success(`已删除文件: ${path}`);
  };

  /** 保存文件管理器更改 */
  const handleSaveFileManager = async (): Promise<void> => {
    if (!fileManagerTool) return;

    const skillMdKey = Object.keys(fileManagerFiles).find(
      (k) => k.toLowerCase() === 'skill.md' || k.toLowerCase().endsWith('/skill.md'),
    );
    const skillContent = skillMdKey ? fileManagerFiles[skillMdKey] : '';

    const updatedTool = normalizeActiveTool({
      ...fileManagerTool,
      skillFileContent: skillContent,
      skillFileName: skillMdKey ? skillMdKey.split('/').pop() : fileManagerTool.skillFileName,
    });

    const newList = tools.map((t) => (t.id === fileManagerTool.id ? updatedTool : t));
    setTools(newList);
    try {
      await saveTools(newList);
      await saveSkillFiles(fileManagerTool.id, fileManagerFiles);
      messageApi.success('文件已保存');
      setFileManagerTool(null);
    } catch {
      messageApi.error('保存失败');
    }
  };

  /** 保存全局记忆 */
  const handleSaveGlobalMemory = async (): Promise<void> => {
    setGlobalMemorySaving(true);
    try {
      await persistGlobalMemory(globalMemoryContent);
      messageApi.success('全局记忆已保存');
    } catch (e) {
      messageApi.error(e instanceof Error ? e.message : '保存全局记忆失败');
    } finally {
      setGlobalMemorySaving(false);
    }
  };

  /** 执行向量搜索 */
  const handleVectorSearch = async (): Promise<void> => {
    const query = vectorSearchQuery.trim();
    if (!query) {
      messageApi.error('请输入搜索内容');
      return;
    }

    setVectorSearching(true);
    setVectorSearchResults([]);
    try {
      const settings = useSettingsStore.getState();
      const allProviders: ApiProvider[] = [...BUILTIN_PROVIDERS, ...settings.customApiProviders];
      const apiSettings: ApiSettings = {
        apiUrl: settings.apiUrl,
        apiKey: settings.apiKey,
        modelName: settings.modelName,
        stream: settings.stream,
        enableThinking: settings.enableThinking,
        customRequestBody: settings.customRequestBody,
      };

      const memorySettings = await getItem<MemorySettings>('settings', 'memorySettings');
      if (!memorySettings || !memorySettings.embeddingModel) {
        throw new Error('请先在设置中配置嵌入模型');
      }

      // 加载所有向量记忆分片
      const allKeys = await getAllKeys('memory');
      const shardKeys = allKeys
        .map((k) => String(k))
        .filter((k) => k.startsWith('vector_memory_'));

      let allShards: VectorMemoryShard[] = [];
      for (const key of shardKeys) {
        const shards = await getItem<VectorMemoryShard[]>('memory', key);
        if (Array.isArray(shards)) {
          allShards = allShards.concat(shards);
        }
      }

      if (allShards.length === 0) {
        throw new Error('没有可搜索的向量记忆分片');
      }

      // 获取查询的嵌入向量
      const queryVector = await getEmbedding(
        query,
        memorySettings,
        apiSettings,
        allProviders,
        settings.apiProviderKeys,
      );

      // 计算相似度并排序
      const scored = allShards
        .map((shard) => ({
          shard,
          score: cosineSimilarity(queryVector, shard.embedding),
        }))
        .filter((item) => Number.isFinite(item.score))
        .sort((a, b) => b.score - a.score)
        .slice(0, vectorSearchTopK);

      setVectorSearchResults(scored);
      messageApi.success(`找到 ${scored.length} 条匹配结果`);
    } catch (e) {
      messageApi.error(e instanceof Error ? e.message : '向量搜索失败');
    } finally {
      setVectorSearching(false);
    }
  };

  /** 获取工具调用标签文本 */
  const getCallLabelsText = (tool: ActiveTool): string => {
    const labels = getActiveToolCallLabels(tool);
    return `${labels.add} / ${labels.cover}`;
  };

  /** 渲染工具卡片 */
  const renderToolCard = (tool: ActiveTool): React.ReactNode => {
    return (
      <div key={tool.id} className={styles.toolItem}>
        <div className={styles.toolHeader}>
          <div className={styles.toolInfo}>
            <span className={styles.toolName}>{tool.name}</span>
            {tool.description && (
              <span className={styles.toolDesc}>{tool.description}</span>
            )}
            <div className={styles.toolMeta}>
              <Tag color={TOOL_TYPE_COLOR[tool.type]} style={{ fontSize: 11, margin: 0 }}>
                {TOOL_TYPE_LABEL[tool.type]}
              </Tag>
              {tool.enabled ? (
                <Tag color="green" style={{ fontSize: 11, margin: 0 }}>已启用</Tag>
              ) : (
                <Tag style={{ fontSize: 11, margin: 0 }}>已禁用</Tag>
              )}
            </div>
            <div className={styles.toolMeta}>
              <span className={styles.hint}>调用标签: {getCallLabelsText(tool)}</span>
            </div>
            {tool.type === 'mcp_http' && tool.mcpTools && tool.mcpTools.length > 0 && (
              <div className={styles.toolMeta}>
                <span className={styles.hint}>
                  子工具: {tool.mcpTools.map((t) => t.name).join(', ')}
                </span>
              </div>
            )}
            {tool.type === 'skill' && (
              <div className={styles.toolMeta}>
                <span className={styles.hint}>
                  主文件: {tool.skillFileName || 'SKILL.md'}
                </span>
              </div>
            )}
            {(tool.type === 'vector' || tool.type === 'keyword') && (
              <div className={styles.toolMeta}>
                <span className={styles.hint}>全局记忆:</span>
                <Switch
                  size="small"
                  checked={globalMemoryToggles[tool.id] ?? false}
                  onChange={(checked) => void handleToggleGlobalMemory(tool.id, checked)}
                />
              </div>
            )}
          </div>
          <div className={styles.toolActions}>
            <Switch
              checked={tool.enabled}
              onChange={() => void handleToggleEnabled(tool)}
              size="small"
            />
            {tool.type === 'skill' && (
              <button
                type="button"
                className={styles.actionBtn}
                onClick={() => void handleOpenFileManager(tool)}
                aria-label="文件管理"
                title="文件管理"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
              </button>
            )}
            <button
              type="button"
              className={styles.actionBtn}
              onClick={() => handleOpenEdit(tool)}
              aria-label="编辑"
              title="编辑"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
            <button
              type="button"
              className={styles.actionBtn}
              onClick={() => setDeleteId(tool.id)}
              aria-label="删除"
              title="删除"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  };

  // 按类型过滤工具
  const builtinTools = tools.filter((t) => BUILTIN_TOOL_TYPES.includes(t.type));
  const mcpTools = tools.filter((t) => t.type === 'mcp_http');
  const skillTools = tools.filter((t) => t.type === 'skill');

  // 文件管理器树形数据
  const fileManagerTree = buildFileTree(fileManagerFiles);
  const fileManagerTreeData = skillFileNodeToTreeData(fileManagerTree);

  return (
    <div className={styles.page}>
      {contextHolder}
      <div className={styles.scroll}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'builtin',
              label: '内置工具',
              children: (
                <>
                  {/* ===== 内置工具列表 ===== */}
                  <div className={styles.section}>
                    <div className={styles.sectionTitle}>内置工具列表</div>
                    <div className={styles.group}>
                      {builtinTools.length === 0 ? (
                        <div className={styles.empty}>
                          <Empty description={loading ? '加载中...' : '暂无内置工具'} />
                        </div>
                      ) : (
                        builtinTools.map(renderToolCard)
                      )}
                      <div className={styles.addRow}>
                        <Button
                          htmlType="button"
                          block
                          onClick={handleOpenCreate}
                          style={{ minHeight: 44 }}
                        >
                          + 添加内置工具
                        </Button>
                      </div>
                    </div>
                  </div>

                  <Divider style={{ margin: '8px 0' }} />

                  {/* ===== 记忆召回 ===== */}
                  <div className={styles.section}>
                    <div className={styles.sectionTitle}>记忆召回</div>
                    <div className={styles.group}>
                      <div className={styles.importArea}>
                        <div className={styles.statRow}>
                          <div className={styles.statItem}>
                            <span className={styles.statValue}>{memoryStats.shardCount}</span>
                            <span className={styles.statLabel}>记忆分片数</span>
                          </div>
                          <div className={styles.statItem}>
                            <span className={styles.statValue}>
                              {memoryStats.totalChars.toLocaleString()}
                            </span>
                            <span className={styles.statLabel}>总字符数</span>
                          </div>
                        </div>
                        <Divider style={{ margin: '4px 0' }} />
                        <div className={styles.formItem}>
                          <label className={styles.formLabel}>全局记忆 (MEMORY.md)</label>
                          <div className={styles.textarea}>
                            <Input.TextArea
                              value={globalMemoryContent}
                              onChange={(e) => setGlobalMemoryContent(e.target.value)}
                              placeholder="全局记忆内容，将在记忆召回时注入到上下文中..."
                              rows={6}
                              autoComplete="off"
                              spellCheck={false}
                            />
                          </div>
                        </div>
                        <Button
                          htmlType="button"
                          block
                          loading={globalMemorySaving}
                          onClick={() => void handleSaveGlobalMemory()}
                          style={{ minHeight: 44 }}
                        >
                          {globalMemorySaving ? '保存中...' : '保存全局记忆'}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <Divider style={{ margin: '8px 0' }} />

                  {/* ===== 向量搜索 ===== */}
                  <div className={styles.section}>
                    <div className={styles.sectionTitle}>向量记忆搜索</div>
                    <div className={styles.group}>
                      <div className={styles.importArea}>
                        <span className={styles.hint}>
                          输入查询内容，在所有向量记忆分片中搜索最相似的结果。需要先在设置中配置嵌入模型。
                        </span>
                        <div className={styles.input}>
                          <Input.TextArea
                            value={vectorSearchQuery}
                            onChange={(e) => setVectorSearchQuery(e.target.value)}
                            placeholder="输入搜索内容..."
                            rows={3}
                            autoComplete="off"
                            spellCheck={false}
                            disabled={vectorSearching}
                          />
                        </div>
                        <div className={styles.row}>
                          <span className={styles.hint}>返回数量:</span>
                          <Select
                            value={vectorSearchTopK}
                            onChange={(v) => setVectorSearchTopK(v)}
                            options={[5, 8, 10, 15, 20].map((n) => ({
                              value: n,
                              label: `Top ${n}`,
                            }))}
                            style={{ width: 120 }}
                          />
                          <Button
                            htmlType="button"
                            type="primary"
                            loading={vectorSearching}
                            onClick={() => void handleVectorSearch()}
                            style={{ minHeight: 44, flex: 1 }}
                          >
                            {vectorSearching ? '搜索中...' : '搜索'}
                          </Button>
                        </div>
                        {vectorSearchResults.length > 0 && (
                          <div>
                            <Divider style={{ margin: '4px 0' }} />
                            {vectorSearchResults.map((result, index) => (
                              <div key={index} className={styles.searchResult}>
                                <div className={styles.searchResultHeader}>
                                  <Tag color="blue">#{index + 1}</Tag>
                                  <Tag color="green">
                                    相似度: {(result.score * 100).toFixed(1)}%
                                  </Tag>
                                  <Tag>轮次: {result.shard.turn}</Tag>
                                </div>
                                <div className={styles.searchResultContent}>
                                  {result.shard.content}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              ),
            },
            {
              key: 'mcp',
              label: 'MCP 工具',
              children: (
                <>
                  {/* ===== MCP 工具列表 ===== */}
                  <div className={styles.section}>
                    <div className={styles.sectionTitle}>MCP 工具列表</div>
                    <div className={styles.group}>
                      {mcpTools.length === 0 ? (
                        <div className={styles.empty}>
                          <Empty description={loading ? '加载中...' : '暂无 MCP 工具'} />
                        </div>
                      ) : (
                        mcpTools.map(renderToolCard)
                      )}
                    </div>
                  </div>

                  <Divider style={{ margin: '8px 0' }} />

                  {/* ===== MCP 工具导入 ===== */}
                  <div className={styles.section}>
                    <div className={styles.sectionTitle}>MCP 工具导入</div>
                    <div className={styles.group}>
                      <div className={styles.importArea}>
                        <span className={styles.hint}>
                          粘贴 MCP 服务器配置 JSON（支持扁平格式或 mcpServers 嵌套格式），将自动连接服务器并导入工具列表。
                        </span>
                        <div className={styles.textarea}>
                          <Input.TextArea
                            value={mcpImportJson}
                            onChange={(e) => setMcpImportJson(e.target.value)}
                            placeholder={'{\n  "mcpServers": {\n    "example": {\n      "url": "https://mcp.example.com/sse"\n    }\n  }\n}'}
                            rows={6}
                            autoComplete="off"
                            spellCheck={false}
                            disabled={mcpImporting}
                          />
                        </div>
                        <Button
                          htmlType="button"
                          block
                          loading={mcpImporting}
                          onClick={() => void handleImportMcp()}
                          style={{ minHeight: 44 }}
                        >
                          {mcpImporting ? '导入中...' : '导入 MCP 工具'}
                        </Button>
                      </div>
                    </div>
                  </div>
                </>
              ),
            },
            {
              key: 'skill',
              label: 'SKILL',
              children: (
                <>
                  {/* ===== SKILL 工具列表 ===== */}
                  <div className={styles.section}>
                    <div className={styles.sectionTitle}>SKILL 工具列表</div>
                    <div className={styles.group}>
                      {skillTools.length === 0 ? (
                        <div className={styles.empty}>
                          <Empty description={loading ? '加载中...' : '暂无 SKILL 工具'} />
                        </div>
                      ) : (
                        skillTools.map(renderToolCard)
                      )}
                      <div className={styles.addRow}>
                        <Button
                          htmlType="button"
                          block
                          onClick={() => {
                            setEditingId(null);
                            const skillForm = createEmptyForm();
                            skillForm.type = 'skill';
                            skillForm.callName = getDefaultCallName('skill');
                            setForm(skillForm);
                            setEditorOpen(true);
                          }}
                          style={{ minHeight: 44 }}
                        >
                          + 新建 SKILL 工具
                        </Button>
                      </div>
                    </div>
                  </div>

                  <Divider style={{ margin: '8px 0' }} />

                  {/* ===== SKILL 导入 ===== */}
                  <div className={styles.section}>
                    <div className={styles.sectionTitle}>SKILL 导入</div>
                    <div className={styles.group}>
                      <Collapse
                        items={[
                          {
                            key: 'github',
                            label: 'GitHub 导入',
                            children: (
                              <div className={styles.importArea}>
                                <span className={styles.hint}>
                                  输入 GitHub 仓库 URL，支持子目录路径。国内用户可使用镜像加速。
                                </span>
                                <div className={styles.input}>
                                  <Input
                                    value={githubUrl}
                                    onChange={(e) => setGithubUrl(e.target.value)}
                                    placeholder="https://github.com/owner/repo 或 /tree/branch/subdir"
                                    autoComplete="off"
                                    spellCheck={false}
                                    disabled={githubImporting}
                                  />
                                </div>
                                <div className={styles.row}>
                                  <span className={styles.hint}>镜像:</span>
                                  <Select
                                    value={githubMirror}
                                    onChange={(v) => setGithubMirror(v)}
                                    options={GITHUB_MIRRORS.map((m) => ({
                                      value: m.url,
                                      label: m.name,
                                    }))}
                                    style={{ flex: 1 }}
                                  />
                                </div>
                                <Button
                                  htmlType="button"
                                  block
                                  loading={githubImporting}
                                  onClick={() => void handleImportGithub()}
                                  style={{ minHeight: 44 }}
                                >
                                  {githubImporting ? '导入中...' : '从 GitHub 导入'}
                                </Button>
                              </div>
                            ),
                          },
                          {
                            key: 'zip',
                            label: 'ZIP 导入',
                            children: (
                              <div className={styles.importArea}>
                                <span className={styles.hint}>
                                  选择包含 SKILL.md 的 ZIP 压缩包，将自动解压并导入所有文件。
                                </span>
                                <input
                                  ref={fileInputRef}
                                  type="file"
                                  accept=".zip"
                                  style={{ display: 'none' }}
                                  onChange={handleZipFileSelect}
                                />
                                <Button
                                  htmlType="button"
                                  block
                                  loading={zipImporting}
                                  onClick={() => fileInputRef.current?.click()}
                                  style={{ minHeight: 44 }}
                                >
                                  {zipImporting ? '导入中...' : '选择 ZIP 文件'}
                                </Button>
                              </div>
                            ),
                          },
                        ]}
                      />
                    </div>
                  </div>
                </>
              ),
            },
          ]}
        />
      </div>

      {/* 编辑/新建弹窗 */}
      <Modal
        open={editorOpen}
        title={editingId ? '编辑工具' : '新建工具'}
        onOk={() => void handleSave()}
        onCancel={() => setEditorOpen(false)}
        okText="保存"
        cancelText="取消"
        width="90%"
        destroyOnClose
      >
        <ToolEditorForm
          form={form}
          onFormChange={setForm}
          onTypeChange={handleTypeChange}
        />
      </Modal>

      {/* 删除确认弹窗 */}
      <Modal
        open={!!deleteId}
        title="确认删除"
        onOk={() => void handleConfirmDelete()}
        onCancel={() => setDeleteId(null)}
        okText="删除"
        cancelText="取消"
        okButtonProps={{ danger: true }}
      >
        <p>确定要删除这个工具吗？此操作不可撤销。</p>
      </Modal>

      {/* 文件管理器弹窗 */}
      <Modal
        open={!!fileManagerTool}
        title={fileManagerTool ? `文件管理: ${fileManagerTool.name}` : '文件管理'}
        onOk={() => void handleSaveFileManager()}
        onCancel={() => setFileManagerTool(null)}
        okText="保存"
        cancelText="关闭"
        width="90%"
        destroyOnClose
      >
        {fileManagerTool && (
          <div className={styles.fileManagerBody}>
            <div className={styles.row}>
              <Button
                size="small"
                onClick={() => {
                  setNewFilePath('');
                  setNewFileModalOpen(true);
                }}
              >
                + 新建文件
              </Button>
              <Button
                size="small"
                onClick={handleDeleteFile}
                disabled={!fileManagerSelectedPath}
              >
                删除文件
              </Button>
              <span className={styles.hint}>
                共 {Object.keys(fileManagerFiles).length} 个文件
              </span>
            </div>

            <div className={styles.fileTreeContainer}>
              {fileManagerTreeData.length > 0 ? (
                <Tree
                  treeData={fileManagerTreeData}
                  expandedKeys={fileManagerExpandedKeys}
                  onExpand={(keys) =>
                    setFileManagerExpandedKeys(keys.map((k) => String(k)))
                  }
                  onSelect={handleFileSelect}
                  selectedKeys={fileManagerSelectedPath ? [fileManagerSelectedPath] : []}
                  showLine
                  blockNode
                />
              ) : (
                <Empty description="暂无文件" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              )}
            </div>

            {fileManagerSelectedPath && (
              <div className={styles.fileEditorContainer}>
                <label className={styles.formLabel}>
                  编辑: {fileManagerSelectedPath}
                </label>
                <div className={styles.textarea}>
                  <Input.TextArea
                    value={fileManagerEditingContent}
                    onChange={(e) => handleFileContentChange(e.target.value)}
                    rows={10}
                    autoComplete="off"
                    spellCheck={false}
                    style={{
                      fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
                      fontSize: 12,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* 新建文件弹窗 */}
      <Modal
        open={newFileModalOpen}
        title="新建文件"
        onOk={handleCreateFile}
        onCancel={() => setNewFileModalOpen(false)}
        okText="创建"
        cancelText="取消"
      >
        <div className={styles.formItem}>
          <label className={styles.formLabel}>文件路径</label>
          <div className={styles.input}>
            <Input
              value={newFilePath}
              onChange={(e) => setNewFilePath(e.target.value)}
              placeholder="例如: folder/file.md 或 SKILL.md"
              autoComplete="off"
              onPressEnter={handleCreateFile}
            />
          </div>
          <span className={styles.hint}>
            输入文件路径，包含目录路径时会自动创建目录。
          </span>
        </div>
      </Modal>
    </div>
  );
}

// ============================================================================
// 工具编辑表单组件
// ============================================================================

interface ToolEditorFormProps {
  form: ToolForm;
  onFormChange: (form: ToolForm) => void;
  onTypeChange: (type: ActiveToolType) => void;
}

function ToolEditorForm({ form, onFormChange, onTypeChange }: ToolEditorFormProps) {
  const { styles } = useStyles();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: '60vh', overflowY: 'auto' }}>
      {/* 工具名称 */}
      <div className={styles.formItem}>
        <label className={styles.formLabel}>工具名称 *</label>
        <div className={styles.input}>
          <Input
            value={form.name}
            onChange={(e) => onFormChange({ ...form, name: e.target.value })}
            placeholder="例如: 向量记忆检索"
          />
        </div>
      </div>

      {/* 工具类型 */}
      <div className={styles.formItem}>
        <label className={styles.formLabel}>工具类型</label>
        <div className={styles.input}>
          <select
            value={form.type}
            onChange={(e) => onTypeChange(e.target.value as ActiveToolType)}
            style={{
              width: '100%',
              minHeight: 44,
              borderRadius: 'var(--luzzy-radius-sm)',
              border: '1px solid var(--luzzy-outline-variant)',
              background: 'var(--luzzy-surface-container-high)',
              color: 'var(--luzzy-on-surface)',
              padding: '8px 12px',
              fontSize: 14,
            }}
          >
            {TOOL_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 调用名称 */}
      <div className={styles.formItem}>
        <label className={styles.formLabel}>调用名称（callName）</label>
        <div className={styles.input}>
          <Input
            value={form.callName}
            onChange={(e) => onFormChange({ ...form, callName: e.target.value })}
            placeholder="tool_memory"
            autoComplete="off"
            spellCheck={false}
          />
        </div>
      </div>

      {/* 描述 */}
      <div className={styles.formItem}>
        <label className={styles.formLabel}>描述</label>
        <div className={styles.textarea}>
          <Input.TextArea
            value={form.description}
            onChange={(e) => onFormChange({ ...form, description: e.target.value })}
            placeholder="工具的功能描述"
            rows={2}
          />
        </div>
      </div>

      {/* 结果数量 */}
      <div className={styles.formItem}>
        <label className={styles.formLabel}>结果数量（8-12）</label>
        <div className={styles.input}>
          <Input
            type="number"
            min={8}
            max={12}
            value={form.resultCount}
            onChange={(e) => {
              const num = Number(e.target.value);
              onFormChange({ ...form, resultCount: Number.isFinite(num) ? Math.max(8, Math.min(12, Math.round(num))) : 8 });
            }}
          />
        </div>
      </div>

      {/* Web 工具特有字段 */}
      {form.type === 'web' && (
        <div className={styles.formItem}>
          <label className={styles.formLabel}>Tavily API Key</label>
          <div className={styles.input}>
            <Input.Password
              value={form.tavilyApiKey}
              onChange={(e) => onFormChange({ ...form, tavilyApiKey: e.target.value })}
              placeholder="tvly-..."
              autoComplete="off"
              visibilityToggle
            />
          </div>
        </div>
      )}

      {/* 世界书工具特有字段 */}
      {form.type === 'world' && (
        <div className={styles.formItem}>
          <label className={styles.formLabel}>世界书访问模式</label>
          <div className={styles.input}>
            <select
              value={form.worldInfoAccessMode}
              onChange={(e) => onFormChange({ ...form, worldInfoAccessMode: e.target.value })}
              style={{
                width: '100%',
                minHeight: 44,
                borderRadius: 'var(--luzzy-radius-sm)',
                border: '1px solid var(--luzzy-outline-variant)',
                background: 'var(--luzzy-surface-container-high)',
                color: 'var(--luzzy-on-surface)',
                padding: '8px 12px',
                fontSize: 14,
              }}
            >
              <option value="read">只读（read）</option>
              <option value="write">读写（write）</option>
            </select>
          </div>
        </div>
      )}

      {/* MCP 工具特有字段 */}
      {form.type === 'mcp_http' && (
        <>
          <div className={styles.formItem}>
            <label className={styles.formLabel}>MCP 服务器 URL</label>
            <div className={styles.input}>
              <Input
                value={form.mcpServerUrl}
                onChange={(e) => onFormChange({ ...form, mcpServerUrl: e.target.value })}
                placeholder="https://mcp.example.com/sse"
                autoComplete="off"
                spellCheck={false}
              />
            </div>
          </div>
          <div className={styles.formItem}>
            <label className={styles.formLabel}>MCP 服务器名称</label>
            <div className={styles.input}>
              <Input
                value={form.mcpServerName}
                onChange={(e) => onFormChange({ ...form, mcpServerName: e.target.value })}
                placeholder="example-server"
                autoComplete="off"
              />
            </div>
          </div>
        </>
      )}

      {/* SKILL 工具特有字段 */}
      {form.type === 'skill' && (
        <>
          <div className={styles.formItem}>
            <label className={styles.formLabel}>SKILL 文件名</label>
            <div className={styles.input}>
              <Input
                value={form.skillFileName}
                onChange={(e) => onFormChange({ ...form, skillFileName: e.target.value })}
                placeholder="my-skill.md"
                autoComplete="off"
              />
            </div>
          </div>
          <div className={styles.formItem}>
            <label className={styles.formLabel}>SKILL 文件内容</label>
            <div className={styles.textarea}>
              <Input.TextArea
                value={form.skillFileContent}
                onChange={(e) => onFormChange({ ...form, skillFileContent: e.target.value })}
                placeholder="SKILL 文件的完整内容..."
                rows={8}
                autoComplete="off"
                spellCheck={false}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
