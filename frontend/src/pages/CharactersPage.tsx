import { useEffect, useState, useRef, useMemo, type ChangeEvent } from 'react';
import { createStyles } from 'antd-style';
import { Input, Modal, message, Tag, Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import { useCharacterStore } from '@/store/useCharacterStore';
import { useChatStore } from '@/store/useChatStore';
import { getItem } from '@/services/storage';
import type { Character, ChatMessage } from '@/types';

// ============================================================================
// 样式定义
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
  searchWrap: css`
    margin-bottom: var(--luzzy-spacing-md);
  `,
  search: css`
    .ant-input-affix-wrapper,
    .ant-input {
      background: var(--luzzy-surface-container) !important;
      border-color: var(--luzzy-outline-variant) !important;
      color: var(--luzzy-on-surface) !important;
      border-radius: var(--luzzy-radius-full) !important;
      min-height: 44px;
    }
  `,
  toolbar: css`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--luzzy-spacing-md);
    gap: var(--luzzy-spacing-sm);
  `,
  count: css`
    font-size: 13px;
    color: var(--luzzy-on-surface-variant);
    flex-shrink: 0;
  `,
  toolbarActions: css`
    display: flex;
    gap: var(--luzzy-spacing-xs);
    flex-shrink: 0;
  `,
  iconBtn: css`
    min-width: 40px;
    min-height: 40px;
    border-radius: var(--luzzy-radius-full);
    background: var(--luzzy-surface-container);
    color: var(--luzzy-on-surface);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background var(--luzzy-transition);

    &:active {
      background: var(--luzzy-surface-container-high);
    }
  `,
  addBtn: css`
    padding: 8px 16px;
    min-height: 40px;
    border-radius: var(--luzzy-radius-full);
    background: var(--luzzy-primary);
    color: var(--luzzy-on-primary);
    font-size: 14px;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 4px;

    &:active {
      background: var(--luzzy-primary-active);
    }
  `,
  grid: css`
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--luzzy-spacing-md);
  `,
  card: css`
    position: relative;
    background: var(--luzzy-glass-bg);
    backdrop-filter: blur(var(--luzzy-glass-blur)) saturate(180%);
    -webkit-backdrop-filter: blur(var(--luzzy-glass-blur)) saturate(180%);
    border: var(--luzzy-glass-border-width) solid var(--luzzy-glass-border-color);
    border-radius: var(--luzzy-radius-md);
    padding: var(--luzzy-spacing-md);
    display: flex;
    flex-direction: column;
    gap: var(--luzzy-spacing-sm);
    transition: all var(--luzzy-transition);
    box-shadow: var(--luzzy-glass-shadow), var(--luzzy-glass-inset-shadow);
    overflow: hidden;

    &.active {
      border-color: var(--luzzy-primary);
    }

    &:active {
      background: var(--luzzy-glass-bg-strong);
    }
  `,
  cardHeader: css`
    display: flex;
    align-items: flex-start;
    gap: var(--luzzy-spacing-sm);
  `,
  avatar: css`
    width: 48px;
    height: 48px;
    border-radius: var(--luzzy-radius-full);
    background: var(--luzzy-primary-container);
    color: var(--luzzy-on-primary-container);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    font-weight: 700;
    flex-shrink: 0;
    overflow: hidden;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  `,
  cardInfo: css`
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  `,
  name: css`
    font-size: 15px;
    font-weight: 600;
    color: var(--luzzy-on-surface);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  creator: css`
    font-size: 11px;
    color: var(--luzzy-on-surface-variant);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  desc: css`
    font-size: 12px;
    color: var(--luzzy-on-surface-variant);
    line-height: 1.4;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    min-height: 33px;
  `,
  tags: css`
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  `,
  cardFooter: css`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 4px;
  `,
  favBtn: css`
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--luzzy-on-surface-variant);
    border-radius: var(--luzzy-radius-full);

    &.active {
      color: #ffa726;
    }

    &:active {
      background: var(--luzzy-surface-container-high);
    }
  `,
  cardActions: css`
    display: flex;
    gap: 4px;
  `,
  actionBtn: css`
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--luzzy-on-surface-variant);
    border-radius: var(--luzzy-radius-sm);

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
  emptyTitle: css`
    font-size: 16px;
    font-weight: 500;
    color: var(--luzzy-on-surface);
  `,
  emptyDesc: css`
    font-size: 13px;
    line-height: 1.5;
  `,
  fileInput: css`
    display: none;
  `,
  editorForm: css`
    display: flex;
    flex-direction: column;
    gap: 12px;
    max-height: 60vh;
    overflow-y: auto;

    .ant-input,
    .ant-input-affix-wrapper {
      background: var(--luzzy-surface-container-high) !important;
      border-color: var(--luzzy-outline-variant) !important;
      color: var(--luzzy-on-surface) !important;
      border-radius: var(--luzzy-radius-sm) !important;
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
  formHint: css`
    font-size: 11px;
    color: var(--luzzy-on-surface-variant);
  `,
  avatarUpload: css`
    display: flex;
    align-items: center;
    gap: 12px;
  `,
  avatarPreview: css`
    width: 72px;
    height: 72px;
    border-radius: var(--luzzy-radius-full);
    background: var(--luzzy-primary-container);
    color: var(--luzzy-on-primary-container);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28px;
    font-weight: 700;
    flex-shrink: 0;
    overflow: hidden;
    cursor: pointer;
    border: 2px dashed var(--luzzy-outline-variant);
    transition: border-color var(--luzzy-transition);

    &:active {
      border-color: var(--luzzy-primary);
    }

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  `,
  avatarActions: css`
    display: flex;
    flex-direction: column;
    gap: 4px;
  `,
  avatarBtn: css`
    padding: 4px 12px;
    font-size: 12px;
    border-radius: var(--luzzy-radius-sm);
    background: var(--luzzy-surface-container-high);
    color: var(--luzzy-on-surface);
    border: 1px solid var(--luzzy-outline-variant);

    &:active {
      background: var(--luzzy-surface-container-highest);
    }
  `,
  avatarBtnDanger: css`
    padding: 4px 12px;
    font-size: 12px;
    border-radius: var(--luzzy-radius-sm);
    background: transparent;
    color: var(--luzzy-error, #f44336);
    border: 1px solid var(--luzzy-outline-variant);

    &:active {
      background: var(--luzzy-surface-container-high);
    }
  `,
}));

// ============================================================================
// PNG tEXt chunk 辅助函数
// ============================================================================

/** CRC-32 查找表（PNG 使用 IEEE 802.3 多项式） */
const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

/** 计算 CRC-32 校验码 */
const crc32 = (bytes: Uint8Array): number => {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC32_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
};

/**
 * 创建 PNG tEXt chunk
 *
 * tEXt chunk 结构: length(4) + type(4) + keyword\0text + crc(4)
 */
const createTextChunk = (keyword: string, text: string): Uint8Array => {
  const keywordBytes = new TextEncoder().encode(keyword);
  const textBytes = new TextEncoder().encode(text);
  const dataLength = keywordBytes.length + 1 + textBytes.length;
  const chunk = new Uint8Array(8 + dataLength + 4);

  const dv = new DataView(chunk.buffer);
  dv.setUint32(0, dataLength);
  chunk[4] = 0x74; // t
  chunk[5] = 0x45; // E
  chunk[6] = 0x58; // X
  chunk[7] = 0x74; // t
  chunk.set(keywordBytes, 8);
  chunk[8 + keywordBytes.length] = 0;
  chunk.set(textBytes, 8 + keywordBytes.length + 1);
  const crc = crc32(chunk.subarray(4, 8 + dataLength));
  dv.setUint32(8 + dataLength, crc);

  return chunk;
};

/**
 * 在 PNG 的 IEND chunk 之前插入 tEXt chunk
 */
const injectTextChunk = (
  pngBytes: Uint8Array,
  keyword: string,
  text: string,
): Uint8Array => {
  const iendOffset = pngBytes.length - 12;
  const iendType = String.fromCharCode(
    pngBytes[iendOffset + 4],
    pngBytes[iendOffset + 5],
    pngBytes[iendOffset + 6],
    pngBytes[iendOffset + 7],
  );
  if (iendType !== 'IEND') {
    throw new Error('无效的 PNG 文件：未在末尾找到 IEND chunk');
  }

  const textChunk = createTextChunk(keyword, text);
  const result = new Uint8Array(pngBytes.length + textChunk.length);
  result.set(pngBytes.subarray(0, iendOffset), 0);
  result.set(textChunk, iendOffset);
  result.set(pngBytes.subarray(iendOffset), iendOffset + textChunk.length);
  return result;
};

/**
 * 从 PNG 文件中解析角色卡数据（SillyTavern V2 格式）
 *
 * PNG 角色卡将 JSON 数据存储在 tEXt chunk 中，
 * keyword 为 "chara"（V2）或 "ccv3"（V3），值为 base64 编码的 JSON 字符串。
 */
const extractPngCardData = async (
  file: File,
): Promise<Record<string, unknown> | null> => {
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  // 校验 PNG 签名: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] !== 0x89 ||
    bytes[1] !== 0x50 ||
    bytes[2] !== 0x4e ||
    bytes[3] !== 0x47
  ) {
    return null;
  }

  let offset = 8;
  while (offset < bytes.length) {
    const length =
      ((bytes[offset] << 24) |
        (bytes[offset + 1] << 16) |
        (bytes[offset + 2] << 8) |
        bytes[offset + 3]) >>>
      0;
    const type = String.fromCharCode(
      bytes[offset + 4],
      bytes[offset + 5],
      bytes[offset + 6],
      bytes[offset + 7],
    );
    offset += 8;

    if (type === 'tEXt') {
      const chunkData = bytes.slice(offset, offset + length);
      const nullPos = chunkData.indexOf(0);
      if (nullPos > 0) {
        const keyword = new TextDecoder().decode(chunkData.slice(0, nullPos));
        if (keyword === 'chara' || keyword === 'ccv3') {
          const base64Data = new TextDecoder().decode(
            chunkData.slice(nullPos + 1),
          );
          const jsonStr = base64ToUtf8(base64Data);
          return JSON.parse(jsonStr);
        }
      }
    }

    offset += length + 4;
  }

  return null;
};

// ============================================================================
// Base64 / UTF-8 编码辅助函数
// ============================================================================

/** 将 UTF-8 字符串编码为 Base64（安全处理非 ASCII 字符） */
const utf8ToBase64 = (str: string): string => {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

/** 将 Base64 解码为 UTF-8 字符串（安全处理非 ASCII 字符） */
const base64ToUtf8 = (base64: string): string => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder('utf-8').decode(bytes);
};

// ============================================================================
// 图片处理辅助函数
// ============================================================================

/** 获取角色名首字母用于头像占位 */
const getInitial = (name: string): string => {
  if (!name) return '?';
  return name.charAt(0).toUpperCase();
};

/**
 * 压缩图片为 base64 data URL
 *
 * @param file - 图片文件
 * @param maxWidth - 最大宽度（默认 300px）
 * @param quality - JPEG 质量（默认 0.7）
 */
const compressImage = (
  file: File,
  maxWidth = 300,
  quality = 0.7,
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas 不受支持'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => reject(new Error('图片加载失败'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsDataURL(file);
  });
};

/**
 * 将头像渲染为 PNG Blob（用于导出）
 *
 * 若无头像则绘制带渐变背景和首字母的占位图。
 */
const renderAvatarToPngBlob = (
  avatar: string | undefined,
  name: string,
  size = 400,
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('Canvas 不受支持'));
      return;
    }

    const drawPlaceholder = (): void => {
      const gradient = ctx.createLinearGradient(0, 0, size, size);
      gradient.addColorStop(0, '#4ddadc');
      gradient.addColorStop(1, '#6a6f6f');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${size / 2}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(getInitial(name), size / 2, size / 2);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('PNG 生成失败'));
        },
        'image/png',
      );
    };

    if (avatar) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, size, size);
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error('PNG 生成失败'));
          },
          'image/png',
        );
      };
      img.onerror = () => drawPlaceholder();
      img.src = avatar;
    } else {
      drawPlaceholder();
    }
  });
};

// ============================================================================
// 角色卡导出辅助函数
// ============================================================================

/** 将 Character 转换为 SillyTavern V2 格式 JSON 字符串 */
const characterToSillyTavernV2 = (character: Character): string => {
  const card = {
    spec: 'chara_card_v2',
    spec_version: '2.0',
    data: {
      name: character.name,
      description: character.description,
      personality: character.personality,
      scenario: character.scenario,
      first_mes: character.firstMessage,
      mes_example: character.mesExample,
      alternate_greetings: character.alternateGreetings,
      tags: character.tags,
      creator: character.creator,
      character_version: character.characterVersion,
    },
  };
  return JSON.stringify(card);
};

/** 下载 Blob 为文件 */
const downloadBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

/**
 * 导出角色卡为 PNG（内嵌 JSON）
 *
 * 将头像渲染到 canvas 生成 PNG，然后将 SillyTavern V2 格式 JSON
 * 以 base64 编码嵌入 tEXt chunk（keyword: "chara"）。
 */
const exportPngCharacter = async (character: Character): Promise<void> => {
  const blob = await renderAvatarToPngBlob(character.avatar, character.name);
  const arrayBuffer = await blob.arrayBuffer();
  const pngBytes = new Uint8Array(arrayBuffer);
  const json = characterToSillyTavernV2(character);
  const base64 = utf8ToBase64(json);
  const resultBytes = injectTextChunk(pngBytes, 'chara', base64);
  const resultBlob = new Blob([resultBytes.buffer as ArrayBuffer], {
    type: 'image/png',
  });
  downloadBlob(resultBlob, `${character.name || 'character'}.png`);
};

/** 导出角色卡的聊天记录为 JSON */
const exportChatHistory = async (character: Character): Promise<void> => {
  const history = await getItem<ChatMessage[]>('chatHistory', character.uuid);
  if (!history || history.length === 0) {
    throw new Error('没有聊天记录可导出');
  }

  const exportData = {
    character: {
      name: character.name,
      uuid: character.uuid,
      creator: character.creator,
    },
    exportedAt: Date.now(),
    messages: history.map((m) => ({
      role: m.role,
      content: m.content,
      createdAt: m.createdAt,
    })),
  };

  const json = JSON.stringify(exportData, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  downloadBlob(blob, `${character.name || 'character'}_chat.json`);
};

// ============================================================================
// 表单类型与辅助函数
// ============================================================================

/** 角色卡编辑表单状态 */
interface CharacterForm {
  name: string;
  avatar: string;
  description: string;
  personality: string;
  scenario: string;
  firstMessage: string;
  mesExample: string;
  alternateGreetings: string;
  tags: string;
  creator: string;
  characterVersion: string;
}

/** 将角色卡转换为表单数据 */
const characterToForm = (c: Character): CharacterForm => ({
  name: c.name,
  avatar: c.avatar ?? '',
  description: c.description,
  personality: c.personality,
  scenario: c.scenario,
  firstMessage: c.firstMessage,
  mesExample: c.mesExample,
  alternateGreetings: c.alternateGreetings.join('\n---\n'),
  tags: c.tags.join(', '),
  creator: c.creator,
  characterVersion: c.characterVersion,
});

/** 创建空表单 */
const createEmptyForm = (): CharacterForm => ({
  name: '',
  avatar: '',
  description: '',
  personality: '',
  scenario: '',
  firstMessage: '',
  mesExample: '',
  alternateGreetings: '',
  tags: '',
  creator: '',
  characterVersion: '1.0',
});

/** 将表单数据转换回角色卡部分字段 */
const formToPartial = (form: CharacterForm): Partial<Character> => ({
  name: form.name.trim() || '未命名角色',
  avatar: form.avatar.trim() || undefined,
  description: form.description,
  personality: form.personality,
  scenario: form.scenario,
  firstMessage: form.firstMessage,
  mesExample: form.mesExample,
  alternateGreetings: form.alternateGreetings
    .split('\n---\n')
    .map((s) => s.trim())
    .filter(Boolean),
  tags: form.tags
    .split(/[,，]/)
    .map((t) => t.trim())
    .filter(Boolean),
  creator: form.creator,
  characterVersion: form.characterVersion || '1.0',
});

// ============================================================================
// 主组件
// ============================================================================

export function CharactersPage() {
  const { styles } = useStyles();
  const [messageApi, contextHolder] = message.useMessage();

  const characters = useCharacterStore((s) => s.characters);
  const currentCharacterUuid = useCharacterStore((s) => s.currentCharacterUuid);
  const searchQuery = useCharacterStore((s) => s.searchQuery);
  const loadCharacters = useCharacterStore((s) => s.loadCharacters);
  const addCharacter = useCharacterStore((s) => s.addCharacter);
  const updateCharacter = useCharacterStore((s) => s.updateCharacter);
  const deleteCharacter = useCharacterStore((s) => s.deleteCharacter);
  const setCurrentCharacter = useCharacterStore((s) => s.setCurrentCharacter);
  const toggleFavorite = useCharacterStore((s) => s.toggleFavorite);
  const searchCharacters = useCharacterStore((s) => s.searchCharacters);
  const getFilteredCharacters = useCharacterStore((s) => s.getFilteredCharacters);
  const importCharacter = useCharacterStore((s) => s.importCharacter);
  const importCharacterFromCard = useCharacterStore(
    (s) => s.importCharacterFromCard,
  );
  const exportCharacter = useCharacterStore((s) => s.exportCharacter);

  const setCurrentChatCharacter = useChatStore((s) => s.setCurrentCharacter);
  const loadChatHistory = useChatStore((s) => s.loadChatHistory);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingUuid, setEditingUuid] = useState<string | null>(null);
  const [form, setForm] = useState<CharacterForm>(createEmptyForm());
  const [deleteUuid, setDeleteUuid] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void loadCharacters();
  }, [loadCharacters]);

  const filteredCharacters = useMemo(
    () => getFilteredCharacters(),
    [getFilteredCharacters, characters, searchQuery],
  );

  const handleSearch = (value: string): void => {
    searchCharacters(value);
  };

  const handleSelectCharacter = (character: Character): void => {
    setCurrentCharacter(character.uuid);
    setCurrentChatCharacter(character);
    void loadChatHistory(character.uuid).then(
      () => {
        messageApi.success(`已切换到 ${character.name}`);
      },
      (err: unknown) => {
        messageApi.error(
          err instanceof Error
            ? `切换失败: ${err.message}`
            : '切换角色时加载历史失败',
        );
      },
    );
  };

  const handleToggleFavorite = (character: Character): void => {
    void toggleFavorite(character.uuid);
  };

  const handleOpenCreate = (): void => {
    setEditingUuid(null);
    setForm(createEmptyForm());
    setEditorOpen(true);
  };

  const handleOpenEdit = (character: Character): void => {
    setEditingUuid(character.uuid);
    setForm(characterToForm(character));
    setEditorOpen(true);
  };

  const handleSave = (): void => {
    if (!form.name.trim()) {
      messageApi.error('角色名不能为空');
      return;
    }
    const partial = formToPartial(form);
    if (editingUuid) {
      void updateCharacter(editingUuid, partial).then(() => {
        messageApi.success('角色卡已更新');
        setEditorOpen(false);
      });
    } else {
      const now = Date.now();
      const newCharacter: Character = {
        id: '',
        uuid: '',
        name: '未命名角色',
        description: '',
        personality: '',
        scenario: '',
        firstMessage: '',
        mesExample: '',
        alternateGreetings: [],
        tags: [],
        creator: '',
        characterVersion: '1.0',
        createdAt: now,
        updatedAt: now,
        favorite: false,
        ...partial,
      };
      void addCharacter(newCharacter).then(() => {
        messageApi.success('角色卡已创建');
        setEditorOpen(false);
      });
    }
  };

  const handleConfirmDelete = (): void => {
    if (!deleteUuid) return;
    void deleteCharacter(deleteUuid).then(() => {
      messageApi.success('角色卡已删除');
      setDeleteUuid(null);
    });
  };

  const handleImportClick = (): void => {
    fileInputRef.current?.click();
  };

  /** 处理文件导入（支持 JSON 和 PNG） */
  const handleFileChange = async (
    e: ChangeEvent<HTMLInputElement>,
  ): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isPng =
      file.type === 'image/png' || file.name.toLowerCase().endsWith('.png');

    try {
      if (isPng) {
        const cardData = await extractPngCardData(file);
        if (!cardData) {
          messageApi.error('PNG 文件中未找到角色卡数据');
          return;
        }
        try {
          const avatarDataUrl = await compressImage(file, 300, 0.7);
          if (cardData && typeof cardData === 'object') {
            cardData.avatar = avatarDataUrl;
          }
        } catch {
          // 头像压缩失败，继续导入
        }
        await importCharacterFromCard(cardData);
        messageApi.success('角色卡导入成功');
      } else {
        const text = await file.text();
        await importCharacter(text);
        messageApi.success('角色卡导入成功');
      }
    } catch (err) {
      messageApi.error(err instanceof Error ? err.message : '导入失败');
    }

    e.target.value = '';
  };

  /** 处理头像上传 */
  const handleAvatarChange = async (
    e: ChangeEvent<HTMLInputElement>,
  ): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const dataUrl = await compressImage(file, 300, 0.7);
      setForm((prev) => ({ ...prev, avatar: dataUrl }));
    } catch (err) {
      messageApi.error(err instanceof Error ? err.message : '头像上传失败');
    }

    e.target.value = '';
  };

  /** 导出为 JSON */
  const handleExportJson = (character: Character): void => {
    try {
      const json = exportCharacter(character.uuid);
      const blob = new Blob([json], { type: 'application/json' });
      downloadBlob(blob, `${character.name || 'character'}.json`);
      messageApi.success('角色卡已导出为 JSON');
    } catch (err) {
      messageApi.error(err instanceof Error ? err.message : '导出失败');
    }
  };

  /** 导出为 PNG（内嵌 JSON） */
  const handleExportPng = async (character: Character): Promise<void> => {
    try {
      await exportPngCharacter(character);
      messageApi.success('角色卡已导出为 PNG');
    } catch (err) {
      messageApi.error(err instanceof Error ? err.message : 'PNG 导出失败');
    }
  };

  /** 导出聊天记录 */
  const handleExportChat = async (character: Character): Promise<void> => {
    try {
      await exportChatHistory(character);
      messageApi.success('聊天记录已导出');
    } catch (err) {
      messageApi.error(err instanceof Error ? err.message : '导出失败');
    }
  };

  /** 构建导出菜单项 */
  const buildExportMenuItems = (character: Character): MenuProps['items'] => [
    {
      key: 'png',
      label: '导出 PNG（含角色卡）',
      onClick: () => void handleExportPng(character),
    },
    {
      key: 'json',
      label: '导出 JSON',
      onClick: () => handleExportJson(character),
    },
    {
      key: 'chat',
      label: '导出聊天记录',
      onClick: () => void handleExportChat(character),
    },
  ];

  return (
    <div className={styles.page}>
      {contextHolder}
      <div className={styles.scroll}>
        {/* 搜索栏 */}
        <div className={styles.searchWrap}>
          <div className={styles.search}>
            <Input.Search
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="搜索角色名、描述或标签..."
              allowClear
              enterButton={false}
            />
          </div>
        </div>

        {/* 工具栏 */}
        <div className={styles.toolbar}>
          <span className={styles.count}>共 {characters.length} 个角色</span>
          <div className={styles.toolbarActions}>
            <button
              type="button"
              className={styles.iconBtn}
              onClick={handleImportClick}
              aria-label="导入角色卡"
              title="导入角色卡（支持 JSON / PNG）"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
              </svg>
            </button>
            <button
              type="button"
              className={styles.addBtn}
              onClick={handleOpenCreate}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
              新建
            </button>
          </div>
        </div>

        {/* 角色卡网格 */}
        {filteredCharacters.length === 0 ? (
          <div className={styles.empty}>
            {characters.length === 0 ? (
              <>
                <div className={styles.emptyTitle}>还没有角色卡</div>
                <div className={styles.emptyDesc}>
                  点击右上角"新建"创建你的第一个角色，<br />
                  或点击导入按钮从 JSON / PNG 文件导入
                </div>
              </>
            ) : (
              <>
                <div className={styles.emptyTitle}>未找到匹配的角色</div>
                <div className={styles.emptyDesc}>尝试更换搜索关键词</div>
              </>
            )}
          </div>
        ) : (
          <div className={styles.grid}>
            {filteredCharacters.map((character) => (
              <div
                key={character.uuid}
                className={`${styles.card} ${
                  currentCharacterUuid === character.uuid ? 'active' : ''
                }`}
                onClick={() => handleSelectCharacter(character)}
              >
                <div className={styles.cardHeader}>
                  <div className={styles.avatar}>
                    {character.avatar ? (
                      <img src={character.avatar} alt={character.name} />
                    ) : (
                      getInitial(character.name)
                    )}
                  </div>
                  <div className={styles.cardInfo}>
                    <span className={styles.name}>{character.name}</span>
                    {character.creator && (
                      <span className={styles.creator}>
                        by {character.creator}
                      </span>
                    )}
                  </div>
                </div>

                <div className={styles.desc}>
                  {character.description || '暂无描述'}
                </div>

                {character.tags.length > 0 && (
                  <div className={styles.tags}>
                    {character.tags.slice(0, 3).map((tag) => (
                      <Tag key={tag} style={{ fontSize: 11, margin: 0 }}>
                        {tag}
                      </Tag>
                    ))}
                    {character.tags.length > 3 && (
                      <Tag style={{ fontSize: 11, margin: 0 }}>
                        +{character.tags.length - 3}
                      </Tag>
                    )}
                  </div>
                )}

                <div className={styles.cardFooter}>
                  <button
                    type="button"
                    className={`${styles.favBtn} ${
                      character.favorite ? 'active' : ''
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleFavorite(character);
                    }}
                    aria-label="收藏"
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill={character.favorite ? 'currentColor' : 'none'}
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  </button>
                  <div className={styles.cardActions}>
                    <button
                      type="button"
                      className={styles.actionBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEdit(character);
                      }}
                      aria-label="编辑"
                      title="编辑"
                    >
                      <svg
                        width="16"
                        height="16"
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
                    </button>
                    <Dropdown
                      menu={{ items: buildExportMenuItems(character) }}
                      trigger={['click']}
                      placement="bottomRight"
                    >
                      <button
                        type="button"
                        className={styles.actionBtn}
                        onClick={(e) => e.stopPropagation()}
                        aria-label="导出"
                        title="导出"
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                        </svg>
                      </button>
                    </Dropdown>
                    <button
                      type="button"
                      className={styles.actionBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteUuid(character.uuid);
                      }}
                      aria-label="删除"
                      title="删除"
                    >
                      <svg
                        width="16"
                        height="16"
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
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 隐藏的文件输入（支持 JSON 和 PNG） */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json,.png,image/png"
          className={styles.fileInput}
          onChange={(e) => void handleFileChange(e)}
        />

        {/* 隐藏的头像上传输入 */}
        <input
          ref={avatarInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className={styles.fileInput}
          onChange={(e) => void handleAvatarChange(e)}
        />
      </div>

      {/* 编辑/新建弹窗 */}
      <Modal
        open={editorOpen}
        title={editingUuid ? '编辑角色卡' : '新建角色卡'}
        onOk={handleSave}
        onCancel={() => setEditorOpen(false)}
        okText="保存"
        cancelText="取消"
        width="90%"
        destroyOnClose
      >
        <div className={styles.editorForm}>
          {/* 头像上传 */}
          <div className={styles.formItem}>
            <label className={styles.formLabel}>头像</label>
            <div className={styles.avatarUpload}>
              <div
                className={styles.avatarPreview}
                onClick={() => avatarInputRef.current?.click()}
                role="button"
                tabIndex={0}
              >
                {form.avatar ? (
                  <img src={form.avatar} alt="头像预览" />
                ) : (
                  getInitial(form.name)
                )}
              </div>
              <div className={styles.avatarActions}>
                <button
                  type="button"
                  className={styles.avatarBtn}
                  onClick={() => avatarInputRef.current?.click()}
                >
                  上传头像
                </button>
                {form.avatar && (
                  <button
                    type="button"
                    className={styles.avatarBtnDanger}
                    onClick={() =>
                      setForm((prev) => ({ ...prev, avatar: '' }))
                    }
                  >
                    移除头像
                  </button>
                )}
              </div>
            </div>
            <span className={styles.formHint}>
              支持 JPG / PNG / WebP，将自动压缩至 300px 宽度
            </span>
          </div>

          <div className={styles.formItem}>
            <label className={styles.formLabel}>角色名 *</label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="角色名称"
            />
          </div>
          <div className={styles.formItem}>
            <label className={styles.formLabel}>描述</label>
            <Input.TextArea
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              placeholder="角色的简要描述"
              rows={2}
            />
          </div>
          <div className={styles.formItem}>
            <label className={styles.formLabel}>人设 / 性格</label>
            <Input.TextArea
              value={form.personality}
              onChange={(e) =>
                setForm({ ...form, personality: e.target.value })
              }
              placeholder="角色的性格特征、背景设定等"
              rows={3}
            />
          </div>
          <div className={styles.formItem}>
            <label className={styles.formLabel}>场景</label>
            <Input.TextArea
              value={form.scenario}
              onChange={(e) => setForm({ ...form, scenario: e.target.value })}
              placeholder="对话发生的场景描述"
              rows={2}
            />
          </div>
          <div className={styles.formItem}>
            <label className={styles.formLabel}>开场白</label>
            <Input.TextArea
              value={form.firstMessage}
              onChange={(e) =>
                setForm({ ...form, firstMessage: e.target.value })
              }
              placeholder="角色的第一条消息"
              rows={3}
            />
          </div>
          <div className={styles.formItem}>
            <label className={styles.formLabel}>对话示例</label>
            <Input.TextArea
              value={form.mesExample}
              onChange={(e) =>
                setForm({ ...form, mesExample: e.target.value })
              }
              placeholder={`<START>\n{{user}}: 你好\n{{char}}: 你好呀`}
              rows={4}
            />
          </div>
          <div className={styles.formItem}>
            <label className={styles.formLabel}>备选开场白（用 --- 分隔）</label>
            <Input.TextArea
              value={form.alternateGreetings}
              onChange={(e) =>
                setForm({ ...form, alternateGreetings: e.target.value })
              }
              placeholder="备选开场白1\n---\n备选开场白2"
              rows={3}
            />
          </div>
          <div className={styles.formItem}>
            <label className={styles.formLabel}>标签（逗号分隔）</label>
            <Input
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              placeholder="原创, 二次元, ..."
            />
          </div>
          <div className={styles.formItem}>
            <label className={styles.formLabel}>创作者</label>
            <Input
              value={form.creator}
              onChange={(e) => setForm({ ...form, creator: e.target.value })}
              placeholder="创作者名称"
            />
          </div>
          <div className={styles.formItem}>
            <label className={styles.formLabel}>版本号</label>
            <Input
              value={form.characterVersion}
              onChange={(e) =>
                setForm({ ...form, characterVersion: e.target.value })
              }
              placeholder="1.0"
            />
          </div>
        </div>
      </Modal>

      {/* 删除确认弹窗 */}
      <Modal
        open={!!deleteUuid}
        title="确认删除"
        onOk={handleConfirmDelete}
        onCancel={() => setDeleteUuid(null)}
        okText="删除"
        cancelText="取消"
        okButtonProps={{ danger: true }}
      >
        <p>确定要删除这个角色卡吗？此操作不可撤销，相关聊天记录也将被清除。</p>
      </Modal>
    </div>
  );
}
