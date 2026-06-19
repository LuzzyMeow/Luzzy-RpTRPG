import { useRef, useEffect, useState, useMemo, type KeyboardEvent } from 'react';
import { createStyles } from 'antd-style';
import { Markdown } from '@lobehub/ui';
import {
  Modal,
  message,
  Input,
  Empty,
  Dropdown,
  Drawer,
  Collapse,
  Tag,
  Tooltip,
} from 'antd';
import type { MenuProps } from 'antd';
import { useChatStore } from '@/store/useChatStore';
import { useCharacterStore } from '@/store/useCharacterStore';
import type { ChatMessage, Character, ToolCall, MemoryRecall } from '@/types';

const useStyles = createStyles(({ css }) => ({
  page: css`
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    position: relative;
    background: var(--luzzy-background);
  `,
  // ===== 角色背景层 =====
  charBackground: css`
    position: absolute;
    inset: -16px;
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    pointer-events: none;
    z-index: 0;
    filter: blur(8px) saturate(1.2);
    opacity: 0.25;
    transition: opacity 0.5s ease;
  `,
  // ===== 角色卡选择栏（玻璃顶栏） =====
  charBar: css`
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: var(--luzzy-spacing-sm);
    padding: var(--luzzy-spacing-xs) var(--luzzy-spacing-md);
    background: var(--luzzy-glass-bg-strong);
    backdrop-filter: blur(var(--luzzy-glass-blur-strong)) saturate(200%);
    -webkit-backdrop-filter: blur(var(--luzzy-glass-blur-strong)) saturate(200%);
    border-bottom: var(--luzzy-glass-border-width) solid var(--luzzy-glass-border-color);
    box-shadow: var(--luzzy-glass-shadow);
    min-height: 52px;
    position: relative;
    z-index: 10;
  `,
  charBtn: css`
    flex: 1;
    display: flex;
    align-items: center;
    gap: var(--luzzy-spacing-sm);
    min-height: 40px;
    padding: 6px 10px;
    border-radius: var(--luzzy-radius-full);
    background: var(--luzzy-glass-bg-subtle);
    backdrop-filter: blur(var(--luzzy-glass-blur-subtle)) saturate(150%);
    -webkit-backdrop-filter: blur(var(--luzzy-glass-blur-subtle)) saturate(150%);
    border: var(--luzzy-glass-border-width) solid var(--luzzy-glass-border-color);
    box-shadow: var(--luzzy-glass-inset-shadow);
    cursor: pointer;
    transition: all var(--luzzy-transition);

    &:active {
      transform: scale(0.98);
      background: var(--luzzy-glass-bg);
    }
  `,
  charAvatar: css`
    width: 32px;
    height: 32px;
    border-radius: var(--luzzy-radius-full);
    background: var(--luzzy-primary-container);
    color: var(--luzzy-on-primary-container);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: 700;
    flex-shrink: 0;
    overflow: hidden;
    box-shadow: var(--luzzy-glass-inset-shadow);

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  `,
  charName: css`
    flex: 1;
    font-size: 14px;
    font-weight: 600;
    color: var(--luzzy-on-surface);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-align: left;
  `,
  charChevron: css`
    flex-shrink: 0;
    color: var(--luzzy-on-surface-variant);
    transition: transform var(--luzzy-transition);
  `,
  contextInfo: css`
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border-radius: var(--luzzy-radius-full);
    background: var(--luzzy-glass-bg-subtle);
    backdrop-filter: blur(var(--luzzy-glass-blur-subtle)) saturate(150%);
    -webkit-backdrop-filter: blur(var(--luzzy-glass-blur-subtle)) saturate(150%);
    border: var(--luzzy-glass-border-width) solid var(--luzzy-glass-border-color);
    font-size: 11px;
    font-weight: 600;
    color: var(--luzzy-on-surface-variant);
  `,
  contextInfoNumber: css`
    color: var(--luzzy-primary);
    font-weight: 700;
  `,
  clearCharBtn: css`
    flex-shrink: 0;
    width: 36px;
    height: 36px;
    border-radius: var(--luzzy-radius-full);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--luzzy-on-surface-variant);
    background: var(--luzzy-glass-bg-subtle);
    backdrop-filter: blur(var(--luzzy-glass-blur-subtle)) saturate(150%);
    -webkit-backdrop-filter: blur(var(--luzzy-glass-blur-subtle)) saturate(150%);
    border: var(--luzzy-glass-border-width) solid var(--luzzy-glass-border-color);
    cursor: pointer;
    transition: all var(--luzzy-transition);

    &:active {
      transform: scale(0.92);
      color: var(--luzzy-error);
    }
  `,
  // ===== 消息列表 =====
  messageList: css`
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding: var(--luzzy-spacing-md) var(--luzzy-spacing-sm) 0;
    -webkit-overflow-scrolling: touch;
    position: relative;
    z-index: 1;
  `,
  messageRow: css`
    display: flex;
    margin-bottom: var(--luzzy-spacing-md);
    gap: var(--luzzy-spacing-sm);

    &.user {
      flex-direction: row-reverse;
    }
  `,
  messageAvatar: css`
    flex-shrink: 0;
    width: 36px;
    height: 36px;
    border-radius: var(--luzzy-radius-full);
    overflow: hidden;
    background: var(--luzzy-primary-container);
    color: var(--luzzy-on-primary-container);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    font-weight: 700;
    box-shadow: var(--luzzy-glass-shadow);

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  `,
  messageContent: css`
    display: flex;
    flex-direction: column;
    min-width: 0;
    max-width: 85%;

    &.user {
      align-items: flex-end;
    }
  `,
  messageNameTag: css`
    font-size: 11px;
    font-weight: 600;
    color: var(--luzzy-on-surface-variant);
    padding: 2px 8px;
    border-radius: var(--luzzy-radius-sm);
    background: var(--luzzy-glass-bg-subtle);
    backdrop-filter: blur(var(--luzzy-glass-blur-subtle)) saturate(150%);
    -webkit-backdrop-filter: blur(var(--luzzy-glass-blur-subtle)) saturate(150%);
    border: var(--luzzy-glass-border-width) solid var(--luzzy-glass-border-color);
    margin-bottom: 4px;
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  bubble: css`
    padding: 12px 16px;
    border-radius: var(--luzzy-radius-lg);
    font-size: 15px;
    line-height: 1.65;
    word-break: break-word;
    overflow-wrap: anywhere;
    position: relative;
    box-shadow: var(--luzzy-glass-shadow), var(--luzzy-glass-inset-shadow);

    &.assistant {
      background: var(--luzzy-glass-bg);
      backdrop-filter: blur(var(--luzzy-glass-blur)) saturate(180%);
      -webkit-backdrop-filter: blur(var(--luzzy-glass-blur)) saturate(180%);
      border: var(--luzzy-glass-border-width) solid var(--luzzy-glass-border-color);
      color: var(--luzzy-on-surface);
      border-top-left-radius: 4px;
    }

    &.user {
      background: var(--luzzy-primary);
      color: var(--luzzy-on-primary);
      border-top-right-radius: 4px;
      box-shadow: var(--luzzy-glass-shadow);
    }

    &.error {
      background: var(--luzzy-error-container);
      color: var(--luzzy-on-error-container);
      border: var(--luzzy-glass-border-width) solid var(--luzzy-error);
    }
  `,
  // 消息操作按钮
  msgActions: css`
    flex-shrink: 0;
    display: flex;
    align-items: flex-end;
    align-self: flex-start;
  `,
  msgActionBtn: css`
    width: 30px;
    height: 30px;
    border-radius: var(--luzzy-radius-full);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--luzzy-on-surface-variant);
    background: var(--luzzy-glass-bg-subtle);
    backdrop-filter: blur(var(--luzzy-glass-blur-subtle)) saturate(150%);
    -webkit-backdrop-filter: blur(var(--luzzy-glass-blur-subtle)) saturate(150%);
    border: var(--luzzy-glass-border-width) solid var(--luzzy-glass-border-color);
    cursor: pointer;
    transition: all var(--luzzy-transition);

    &:active {
      transform: scale(0.92);
      background: var(--luzzy-glass-bg);
    }
  `,
  // ===== 思考链（玻璃卡片） =====
  thinkingChain: css`
    margin-bottom: 10px;
    border-radius: var(--luzzy-radius-md);
    overflow: hidden;
    background: var(--luzzy-glass-bg-subtle);
    backdrop-filter: blur(var(--luzzy-glass-blur-subtle)) saturate(150%);
    -webkit-backdrop-filter: blur(var(--luzzy-glass-blur-subtle)) saturate(150%);
    border: var(--luzzy-glass-border-width) solid var(--luzzy-glass-border-color);

    .ant-collapse-header {
      padding: 8px 12px !important;
      font-size: 13px;
      font-weight: 600;
      color: var(--luzzy-on-surface-variant);
      align-items: center !important;
    }

    .ant-collapse-content-box {
      padding: 8px 12px !important;
      font-size: 13px;
      color: var(--luzzy-on-surface-variant);
      max-height: 300px;
      overflow-y: auto;
    }
  `,
  // ===== 工具调用卡片 =====
  toolCallCard: css`
    margin-bottom: 8px;
    padding: 10px 12px;
    border-radius: var(--luzzy-radius-md);
    background: var(--luzzy-glass-bg-subtle);
    backdrop-filter: blur(var(--luzzy-glass-blur-subtle)) saturate(150%);
    -webkit-backdrop-filter: blur(var(--luzzy-glass-blur-subtle)) saturate(150%);
    border: var(--luzzy-glass-border-width) solid var(--luzzy-glass-border-color);
    border-left: 3px solid var(--luzzy-primary);
    font-size: 13px;
    color: var(--luzzy-on-surface);
    box-shadow: var(--luzzy-glass-shadow);

    &.error {
      border-left-color: var(--luzzy-error);
    }

    &.running {
      border-left-color: var(--luzzy-tertiary);
      animation: luzzy-glass-fade-in 0.3s ease;
    }
  `,
  toolCallHeader: css`
    display: flex;
    align-items: center;
    gap: 6px;
    font-weight: 600;
    margin-bottom: 4px;
  `,
  toolCallStatus: css`
    display: inline-flex;
    align-items: center;
    gap: 3px;
    font-size: 11px;
    font-weight: 600;
    padding: 2px 6px;
    border-radius: var(--luzzy-radius-full);

    &.completed {
      color: var(--luzzy-tertiary);
      background: rgba(77, 218, 220, 0.12);
    }

    &.error {
      color: var(--luzzy-error);
      background: rgba(211, 47, 47, 0.12);
    }

    &.running {
      color: var(--luzzy-primary);
      background: rgba(0, 106, 107, 0.12);
    }
  `,
  toolCallQuery: css`
    font-size: 12px;
    color: var(--luzzy-on-surface-variant);
    margin-top: 4px;
    word-break: break-word;
  `,
  toolCallReason: css`
    font-size: 12px;
    color: var(--luzzy-on-surface-variant);
    font-style: italic;
    margin-top: 2px;
  `,
  toolCallResult: css`
    margin-top: 8px;
    padding: 8px 10px;
    border-radius: var(--luzzy-radius-sm);
    background: var(--luzzy-glass-bg-subtle);
    border: var(--luzzy-glass-border-width) solid var(--luzzy-glass-border-color);
    font-size: 12px;
    max-height: 200px;
    overflow-y: auto;
  `,
  // ===== 记忆召回卡片 =====
  memoryRecallCard: css`
    margin-bottom: 8px;
    padding: 10px 12px;
    border-radius: var(--luzzy-radius-md);
    background: var(--luzzy-glass-bg-subtle);
    backdrop-filter: blur(var(--luzzy-glass-blur-subtle)) saturate(150%);
    -webkit-backdrop-filter: blur(var(--luzzy-glass-blur-subtle)) saturate(150%);
    border: var(--luzzy-glass-border-width) solid var(--luzzy-glass-border-color);
    border-left: 3px solid var(--luzzy-tertiary);
    font-size: 13px;
    color: var(--luzzy-on-surface);
    box-shadow: var(--luzzy-glass-shadow);
  `,
  memoryRecallHeader: css`
    display: flex;
    align-items: center;
    gap: 6px;
    font-weight: 600;
    margin-bottom: 6px;
    color: var(--luzzy-on-surface-variant);
  `,
  memoryRecallItem: css`
    padding: 6px 8px;
    margin-bottom: 4px;
    border-radius: var(--luzzy-radius-sm);
    background: var(--luzzy-glass-bg-subtle);
    border: var(--luzzy-glass-border-width) solid var(--luzzy-glass-border-color);
    font-size: 12px;
  `,
  memoryRecallMeta: css`
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    margin-bottom: 4px;
  `,
  // ===== 生成耗时 =====
  generationTime: css`
    font-size: 10px;
    color: var(--luzzy-on-surface-variant);
    opacity: 0.7;
    margin-top: 4px;
    text-align: right;
  `,
  emptyState: css`
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
    font-size: 18px;
    font-weight: 600;
    color: var(--luzzy-on-surface);
  `,
  emptyDesc: css`
    font-size: 14px;
    line-height: 1.6;
  `,
  // ===== 输入区（玻璃底栏） =====
  inputArea: css`
    flex-shrink: 0;
    padding: var(--luzzy-spacing-sm) var(--luzzy-spacing-md)
      calc(var(--luzzy-spacing-sm) + var(--luzzy-safe-area-bottom));
    background: var(--luzzy-glass-bg-strong);
    backdrop-filter: blur(var(--luzzy-glass-blur-strong)) saturate(200%);
    -webkit-backdrop-filter: blur(var(--luzzy-glass-blur-strong)) saturate(200%);
    border-top: var(--luzzy-glass-border-width) solid var(--luzzy-glass-border-color);
    box-shadow: var(--luzzy-glass-shadow);
    display: flex;
    align-items: flex-end;
    gap: var(--luzzy-spacing-sm);
    position: relative;
    z-index: 10;
  `,
  textarea: css`
    flex: 1;
    min-height: 40px;
    max-height: 120px;
    padding: 10px 14px;
    border-radius: var(--luzzy-radius-full);
    border: var(--luzzy-glass-border-width) solid var(--luzzy-glass-border-color);
    background: var(--luzzy-glass-bg-subtle);
    backdrop-filter: blur(var(--luzzy-glass-blur-subtle)) saturate(150%);
    -webkit-backdrop-filter: blur(var(--luzzy-glass-blur-subtle)) saturate(150%);
    color: var(--luzzy-on-surface);
    font-size: 15px;
    line-height: 1.4;
    resize: none;
    outline: none;
    font-family: inherit;
    transition: all var(--luzzy-transition);
    box-shadow: var(--luzzy-glass-inset-shadow);

    &:focus {
      border-color: var(--luzzy-primary);
      background: var(--luzzy-glass-bg);
    }

    &::placeholder {
      color: var(--luzzy-outline);
    }
  `,
  sendBtn: css`
    flex-shrink: 0;
    width: 40px;
    height: 40px;
    border-radius: var(--luzzy-radius-full);
    background: var(--luzzy-primary);
    color: var(--luzzy-on-primary);
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    cursor: pointer;
    transition: all var(--luzzy-transition);
    box-shadow: var(--luzzy-glass-shadow);

    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    &:not(:disabled):active {
      transform: scale(0.92);
      background: var(--luzzy-primary-active);
    }
  `,
  stopBtn: css`
    flex-shrink: 0;
    width: 40px;
    height: 40px;
    border-radius: var(--luzzy-radius-full);
    background: var(--luzzy-error);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    cursor: pointer;
    box-shadow: var(--luzzy-glass-shadow);

    &:active {
      transform: scale(0.92);
    }
  `,
  loadingDots: css`
    display: inline-flex;
    gap: 4px;
    padding: 4px 0;

    span {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--luzzy-on-surface-variant);
      animation: luzzy-bounce 1.4s infinite ease-in-out both;
    }

    span:nth-child(1) {
      animation-delay: -0.32s;
    }
    span:nth-child(2) {
      animation-delay: -0.16s;
    }

    @keyframes luzzy-bounce {
      0%,
      80%,
      100% {
        transform: scale(0);
      }
      40% {
        transform: scale(1);
      }
    }
  `,
  // ===== 角色选择弹窗列表 =====
  charModalList: css`
    max-height: 60vh;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: var(--luzzy-spacing-xs);
  `,
  charModalItem: css`
    display: flex;
    align-items: center;
    gap: var(--luzzy-spacing-sm);
    padding: var(--luzzy-spacing-sm);
    border-radius: var(--luzzy-radius-md);
    background: var(--luzzy-glass-bg-subtle);
    backdrop-filter: blur(var(--luzzy-glass-blur-subtle)) saturate(150%);
    -webkit-backdrop-filter: blur(var(--luzzy-glass-blur-subtle)) saturate(150%);
    border: 2px solid transparent;
    cursor: pointer;
    min-height: 44px;
    width: 100%;
    text-align: left;
    transition: all var(--luzzy-transition);

    &.active {
      border-color: var(--luzzy-primary);
      background: var(--luzzy-glass-bg);
    }

    &:active {
      transform: scale(0.98);
    }
  `,
  charModalInfo: css`
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  `,
  charModalName: css`
    font-size: 15px;
    font-weight: 600;
    color: var(--luzzy-on-surface);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  charModalDesc: css`
    font-size: 12px;
    color: var(--luzzy-on-surface-variant);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  // ===== 编辑消息弹窗 =====
  editTextarea: css`
    .ant-input {
      background: var(--luzzy-glass-bg-subtle) !important;
      backdrop-filter: blur(var(--luzzy-glass-blur-subtle)) saturate(150%);
      -webkit-backdrop-filter: blur(var(--luzzy-glass-blur-subtle)) saturate(150%);
      border-color: var(--luzzy-glass-border-color) !important;
      color: var(--luzzy-on-surface) !important;
      border-radius: var(--luzzy-radius-sm) !important;
    }
  `,
  // ===== 角色描述抽屉 =====
  descDrawerHeader: css`
    display: flex;
    align-items: center;
    gap: var(--luzzy-spacing-sm);
    padding-bottom: var(--luzzy-spacing-sm);
    border-bottom: var(--luzzy-glass-border-width) solid var(--luzzy-glass-border-color);
  `,
  descDrawerAvatar: css`
    width: 56px;
    height: 56px;
    border-radius: var(--luzzy-radius-md);
    overflow: hidden;
    background: var(--luzzy-primary-container);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 22px;
    font-weight: 700;
    color: var(--luzzy-on-primary-container);
    flex-shrink: 0;
    box-shadow: var(--luzzy-glass-shadow);

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  `,
  descDrawerInfo: css`
    flex: 1;
    min-width: 0;
  `,
  descDrawerName: css`
    font-size: 18px;
    font-weight: 700;
    color: var(--luzzy-on-surface);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  descDrawerStats: css`
    display: flex;
    gap: 8px;
    margin-top: 4px;
    font-size: 12px;
    color: var(--luzzy-on-surface-variant);
  `,
  descDrawerBody: css`
    padding: var(--luzzy-spacing-md) 0;
  `,
  descSection: css`
    margin-bottom: var(--luzzy-spacing-md);
  `,
  descSectionTitle: css`
    font-size: 13px;
    font-weight: 700;
    color: var(--luzzy-on-surface-variant);
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 6px;
  `,
  descSectionContent: css`
    padding: 12px;
    border-radius: var(--luzzy-radius-md);
    background: var(--luzzy-glass-bg-subtle);
    backdrop-filter: blur(var(--luzzy-glass-blur-subtle)) saturate(150%);
    -webkit-backdrop-filter: blur(var(--luzzy-glass-blur-subtle)) saturate(150%);
    border: var(--luzzy-glass-border-width) solid var(--luzzy-glass-border-color);
    font-size: 14px;
    line-height: 1.6;
    color: var(--luzzy-on-surface);
    max-height: 300px;
    overflow-y: auto;
  `,
}));

/** 工具调用状态文案映射 */
const TOOL_STATUS_LABEL: Record<ToolCall['status'], string> = {
  pending: '等待中',
  receiving: '接收中',
  queued: '排队中',
  running: '执行中',
  continuing: '续写中',
  completed: '已完成',
  error: '失败',
};

/** 工具调用状态 CSS 类名 */
const TOOL_STATUS_CLASS: Record<ToolCall['status'], string> = {
  pending: 'running',
  receiving: 'running',
  queued: 'running',
  running: 'running',
  continuing: 'running',
  completed: 'completed',
  error: 'error',
};

/** 估算文本 token 数（粗略：中文 1 字 ≈ 1 token，英文 4 字符 ≈ 1 token） */
const estimateTokens = (text: string): number => {
  if (!text) return 0;
  let count = 0;
  for (const ch of text) {
    if (/[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/.test(ch)) {
      count += 1;
    } else {
      count += 0.25;
    }
  }
  return Math.ceil(count);
};

export function ChatPage() {
  const { styles } = useStyles();
  const [messageApi, contextHolder] = message.useMessage();

  // ===== Chat Store =====
  const messages = useChatStore((s) => s.messages);
  const currentCharacter = useChatStore((s) => s.currentCharacter);
  const isGenerating = useChatStore((s) => s.isGenerating);
  const inputDraft = useChatStore((s) => s.inputDraft);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const stopGenerating = useChatStore((s) => s.stopGenerating);
  const setInputDraft = useChatStore((s) => s.setInputDraft);
  const setCurrentChatCharacter = useChatStore((s) => s.setCurrentCharacter);
  const loadChatHistory = useChatStore((s) => s.loadChatHistory);
  const clearMessages = useChatStore((s) => s.clearMessages);
  const editMessage = useChatStore((s) => s.editMessage);
  const deleteMessage = useChatStore((s) => s.deleteMessage);
  const regenerate = useChatStore((s) => s.regenerate);

  // ===== Character Store =====
  const characters = useCharacterStore((s) => s.characters);
  const loadCharacters = useCharacterStore((s) => s.loadCharacters);
  const setCurrentCharacterUuid = useCharacterStore((s) => s.setCurrentCharacter);

  // ===== 本地 UI 状态 =====
  const listRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const [charModalOpen, setCharModalOpen] = useState(false);
  const [editingMsg, setEditingMsg] = useState<ChatMessage | null>(null);
  const [editContent, setEditContent] = useState('');
  const [deletingMsgId, setDeletingMsgId] = useState<string | null>(null);
  const [descDrawerOpen, setDescDrawerOpen] = useState(false);

  /** 初次挂载加载角色卡列表 */
  useEffect(() => {
    void loadCharacters();
  }, [loadCharacters]);

  /** 滚动时判断是否贴近底部 */
  const handleScroll = (): void => {
    const el = listRef.current;
    if (!el) return;
    stickToBottomRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  /** 消息列表变化时，仅在贴近底部时自动滚动 */
  useEffect(() => {
    if (stickToBottomRef.current && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  /** 计算上下文总 token 估算值 */
  const totalContextTokens = useMemo(() => {
    return messages.reduce((sum, m) => {
      return sum + estimateTokens(m.content || '') + estimateTokens(m.cot || '');
    }, 0);
  }, [messages]);

  /** 计算聊天楼层数（用户+助手消息对） */
  const chatFloors = useMemo(() => {
    return Math.floor(messages.filter((m) => !m.loading).length / 2);
  }, [messages]);

  /** 发送消息 */
  const handleSend = (): void => {
    if (!inputDraft.trim() || isGenerating) return;
    void sendMessage(inputDraft);
  };

  /** 回车发送（Shift+Enter 换行） */
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  /** 获取角色卡首字母用于头像占位 */
  const getInitial = (name: string): string => {
    if (!name) return '?';
    return name.charAt(0).toUpperCase();
  };

  /** 打开角色选择弹窗 */
  const handleOpenCharModal = (): void => {
    setCharModalOpen(true);
  };

  /** 打开角色描述抽屉 */
  const handleOpenDescDrawer = (): void => {
    if (currentCharacter) {
      setDescDrawerOpen(true);
    }
  };

  /** 选择角色卡 */
  const handleSelectCharacter = (character: Character): void => {
    setCurrentCharacterUuid(character.uuid);
    setCurrentChatCharacter(character);
    void loadChatHistory(character.uuid)
      .then(() => {
        messageApi.success(`已切换到 ${character.name}`);
      })
      .catch((e) => {
        messageApi.error(e instanceof Error ? e.message : '加载聊天记录失败');
      });
    setCharModalOpen(false);
  };

  /** 清除当前角色卡（回到无角色状态） */
  const handleClearCharacter = (): void => {
    setCurrentCharacterUuid(null);
    setCurrentChatCharacter(null);
    clearMessages();
    messageApi.info('已清除当前角色');
  };

  /** 复制消息内容到剪贴板 */
  const handleCopyMessage = async (msg: ChatMessage): Promise<void> => {
    const text = msg.content;
    if (!text) {
      messageApi.warning('消息内容为空');
      return;
    }
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        messageApi.success('已复制到剪贴板');
        return;
      } catch {
        // 降级方案
      }
    }
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      messageApi.success('已复制到剪贴板');
    } catch {
      messageApi.error('复制失败');
    }
    document.body.removeChild(textarea);
  };

  /** 打开编辑消息弹窗 */
  const handleOpenEdit = (msg: ChatMessage): void => {
    setEditingMsg(msg);
    setEditContent(msg.content);
  };

  /** 保存编辑后的消息 */
  const handleSaveEdit = (): void => {
    if (!editingMsg) return;
    if (!editContent.trim()) {
      messageApi.warning('消息内容不能为空');
      return;
    }
    editMessage(editingMsg.id, editContent.trim());
    messageApi.success('消息已更新');
    setEditingMsg(null);
    setEditContent('');
  };

  /** 确认删除消息 */
  const handleConfirmDelete = (): void => {
    if (!deletingMsgId) return;
    deleteMessage(deletingMsgId);
    messageApi.success('消息已删除');
    setDeletingMsgId(null);
  };

  /** 重新生成（仅对 assistant 消息） */
  const handleRegenerate = (): void => {
    if (isGenerating) {
      messageApi.warning('正在生成中，请稍候');
      return;
    }
    void regenerate();
  };

  /** 构建消息操作菜单项 */
  const buildMessageMenuItems = (msg: ChatMessage): MenuProps['items'] => {
    const items: NonNullable<MenuProps['items']> = [
      {
        key: 'copy',
        label: '复制',
        onClick: () => void handleCopyMessage(msg),
      },
    ];

    if (!msg.loading) {
      items.push({
        key: 'edit',
        label: '编辑',
        onClick: () => handleOpenEdit(msg),
      });
    }

    if (!msg.loading) {
      items.push({
        key: 'delete',
        label: '删除',
        danger: true,
        onClick: () => setDeletingMsgId(msg.id),
      });
    }

    if (msg.role === 'assistant' && !msg.loading && !isGenerating) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg && lastMsg.id === msg.id) {
        items.push({ type: 'divider' });
        items.push({
          key: 'regenerate',
          label: '重新生成',
          onClick: handleRegenerate,
        });
      }
    }

    return items;
  };

  /** 渲染工具调用卡片 */
  const renderToolCall = (tc: ToolCall): React.ReactNode => {
    const statusClass = TOOL_STATUS_CLASS[tc.status] || 'running';
    return (
      <div
        key={tc.id}
        className={`${styles.toolCallCard} ${statusClass === 'error' ? 'error' : ''} ${statusClass === 'running' ? 'running' : ''}`}
      >
        <div className={styles.toolCallHeader}>
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
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
          </svg>
          <span>{tc.callLabel}</span>
          <span className={`${styles.toolCallStatus} ${statusClass}`}>
            {TOOL_STATUS_LABEL[tc.status]}
          </span>
        </div>
        {tc.query && <div className={styles.toolCallQuery}>查询: {tc.query}</div>}
        {tc.reason && (
          <div className={styles.toolCallReason}>原因: {tc.reason}</div>
        )}
        {tc.error && (
          <div className={styles.toolCallQuery} style={{ color: 'var(--luzzy-error)' }}>
            错误: {tc.error}
          </div>
        )}
        {tc.result && (
          <details>
            <summary style={{ cursor: 'pointer', fontSize: 12, color: 'var(--luzzy-primary)' }}>
              查看结果
            </summary>
            <div className={styles.toolCallResult}>
              <Markdown>{tc.result}</Markdown>
            </div>
          </details>
        )}
      </div>
    );
  };

  /** 渲染记忆召回卡片 */
  const renderMemoryRecalls = (recalls: MemoryRecall[]): React.ReactNode => {
    return (
      <div className={styles.memoryRecallCard}>
        <div className={styles.memoryRecallHeader}>
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
            <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <span>自动召回的记忆分片</span>
        </div>
        {recalls.map((mem) => (
          <div key={mem.id} className={styles.memoryRecallItem}>
            <div className={styles.memoryRecallMeta}>
              <Tag color="blue" style={{ fontSize: 10, margin: 0 }}>
                第 {mem.turn || '?'} 轮
              </Tag>
              <Tag color="default" style={{ fontSize: 10, margin: 0 }}>
                相似度{' '}
                {Number.isFinite(mem.score)
                  ? (mem.score * 100).toFixed(1) + '%'
                  : 'unknown'}
              </Tag>
            </div>
            <p
              style={{
                fontSize: 12,
                color: 'var(--luzzy-on-surface)',
                lineHeight: 1.5,
                whiteSpace: 'pre-wrap',
                margin: 0,
              }}
            >
              {mem.content}
            </p>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={styles.page}>
      {contextHolder}

      {/* ===== 角色背景层 ===== */}
      {currentCharacter?.avatar && (
        <div
          className={styles.charBackground}
          style={{ backgroundImage: `url(${currentCharacter.avatar})` }}
        />
      )}

      {/* ===== 角色卡选择栏（玻璃顶栏） ===== */}
      <div className={styles.charBar}>
        <button
          type="button"
          className={styles.charBtn}
          onClick={handleOpenCharModal}
        >
          {currentCharacter ? (
            <>
              <div className={styles.charAvatar}>
                {currentCharacter.avatar ? (
                  <img
                    src={currentCharacter.avatar}
                    alt={currentCharacter.name}
                  />
                ) : (
                  getInitial(currentCharacter.name)
                )}
              </div>
              <span className={styles.charName}>{currentCharacter.name}</span>
            </>
          ) : (
            <>
              <div className={styles.charAvatar}>?</div>
              <span className={styles.charName}>选择角色卡...</span>
            </>
          )}
          <span className={styles.charChevron}>
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
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </span>
        </button>

        {/* 上下文信息指示器 */}
        {currentCharacter && messages.length > 0 && (
          <Tooltip title={`楼层数: ${chatFloors} · 估算 Token: ${totalContextTokens.toLocaleString()}`}>
            <div className={styles.contextInfo}>
              <span className={styles.contextInfoNumber}>{chatFloors}</span>
              <span>楼</span>
              <span style={{ opacity: 0.4 }}>·</span>
              <span className={styles.contextInfoNumber}>
                {totalContextTokens.toLocaleString()}
              </span>
              <span>字</span>
            </div>
          </Tooltip>
        )}

        {/* 角色描述按钮 */}
        {currentCharacter && (
          <Tooltip title="角色卡详情">
            <button
              type="button"
              className={styles.clearCharBtn}
              onClick={handleOpenDescDrawer}
              aria-label="角色卡详情"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            </button>
          </Tooltip>
        )}

        {/* 清除角色按钮 */}
        {currentCharacter && (
          <Tooltip title="清除角色">
            <button
              type="button"
              className={styles.clearCharBtn}
              onClick={handleClearCharacter}
              aria-label="清除角色"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </Tooltip>
        )}
      </div>

      {/* ===== 消息列表 ===== */}
      <div
        ref={listRef}
        className={styles.messageList}
        onScroll={handleScroll}
      >
        {messages.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyTitle}>
              {currentCharacter ? '开始一段新对话' : '请先选择角色卡'}
            </div>
            <div className={styles.emptyDesc}>
              {currentCharacter
                ? '在下方输入消息，与角色开启你的扮演旅程'
                : '点击上方角色栏，选择一个角色卡开始对话'}
            </div>
          </div>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`${styles.messageRow} ${m.role}`}>
              {/* 头像 */}
              <div className={styles.messageAvatar}>
                {m.role === 'user' ? (
                  currentCharacter?.avatar ? (
                    <div
                      style={{
                        background:
                          'linear-gradient(135deg, var(--luzzy-primary), var(--luzzy-tertiary))',
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                      }}
                    >
                      U
                    </div>
                  ) : (
                    'U'
                  )
                ) : currentCharacter?.avatar ? (
                  <img
                    src={currentCharacter.avatar}
                    alt={currentCharacter.name}
                  />
                ) : (
                  getInitial(currentCharacter?.name || 'AI')
                )}
              </div>

              {/* 消息内容 */}
              <div className={`${styles.messageContent} ${m.role}`}>
                {/* 名称标签 */}
                <div className={styles.messageNameTag}>
                  {m.role === 'user'
                    ? '我'
                    : currentCharacter?.name || 'AI'}
                </div>

                {/* 气泡 */}
                <div
                  className={`${styles.bubble} ${m.role} ${m.error ? 'error' : ''}`}
                >
                  {/* 思考链（Collapse 玻璃卡片） */}
                  {m.cot && (
                    <Collapse
                      className={styles.thinkingChain}
                      size="small"
                      items={[
                        {
                          key: 'cot',
                          label: '思考过程',
                          children: <Markdown>{m.cot}</Markdown>,
                        },
                      ]}
                    />
                  )}

                  {/* 记忆召回 */}
                  {m.memoryRecalls && m.memoryRecalls.length > 0 &&
                    renderMemoryRecalls(m.memoryRecalls)}

                  {/* 工具调用 */}
                  {m.toolCalls && m.toolCalls.length > 0 && (
                    <div>
                      {m.toolCalls.map((tc) => renderToolCall(tc))}
                    </div>
                  )}

                  {/* 消息正文 */}
                  {m.loading && !m.content ? (
                    <div className={styles.loadingDots}>
                      <span />
                      <span />
                      <span />
                    </div>
                  ) : m.content ? (
                    m.role === 'user' ? (
                      <div>{m.content}</div>
                    ) : (
                      <Markdown>{m.content}</Markdown>
                    )
                  ) : null}

                  {/* 错误信息 */}
                  {m.error && (
                    <div style={{ color: 'var(--luzzy-error)', fontSize: 13 }}>
                      {m.error}
                    </div>
                  )}
                </div>

                {/* 生成耗时 */}
                {m.role === 'assistant' && !m.loading && m.generationTime && (
                  <div className={styles.generationTime}>
                    耗时 {(m.generationTime / 1000).toFixed(1)}s
                  </div>
                )}
              </div>

              {/* 消息操作菜单 */}
              {!m.loading && (
                <div className={styles.msgActions}>
                  <Dropdown
                    menu={{ items: buildMessageMenuItems(m) }}
                    trigger={['click']}
                    placement={m.role === 'user' ? 'topRight' : 'topLeft'}
                  >
                    <button
                      type="button"
                      className={styles.msgActionBtn}
                      aria-label="消息操作"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <circle cx="12" cy="5" r="2" />
                        <circle cx="12" cy="12" r="2" />
                        <circle cx="12" cy="19" r="2" />
                      </svg>
                    </button>
                  </Dropdown>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* ===== 输入区（玻璃底栏） ===== */}
      <div className={styles.inputArea}>
        <textarea
          className={styles.textarea}
          value={inputDraft}
          onChange={(e) => setInputDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={currentCharacter ? '输入消息...' : '请先选择角色卡'}
          rows={1}
          disabled={isGenerating}
        />
        {isGenerating ? (
          <button
            type="button"
            className={styles.stopBtn}
            onClick={stopGenerating}
            aria-label="停止生成"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          </button>
        ) : (
          <button
            type="button"
            className={styles.sendBtn}
            onClick={handleSend}
            disabled={!inputDraft.trim() || !currentCharacter}
            aria-label="发送"
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
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
          </button>
        )}
      </div>

      {/* ===== 角色选择弹窗 ===== */}
      <Modal
        open={charModalOpen}
        title="选择角色卡"
        onCancel={() => setCharModalOpen(false)}
        footer={null}
        width="90%"
      >
        {characters.length === 0 ? (
          <Empty description="还没有角色卡，请先到角色页面创建或导入" />
        ) : (
          <div className={styles.charModalList}>
            {characters.map((character) => (
              <button
                key={character.uuid}
                type="button"
                className={`${styles.charModalItem} ${
                  currentCharacter?.uuid === character.uuid ? 'active' : ''
                }`}
                onClick={() => handleSelectCharacter(character)}
              >
                <div className={styles.charAvatar}>
                  {character.avatar ? (
                    <img src={character.avatar} alt={character.name} />
                  ) : (
                    getInitial(character.name)
                  )}
                </div>
                <div className={styles.charModalInfo}>
                  <span className={styles.charModalName}>{character.name}</span>
                  <span className={styles.charModalDesc}>
                    {character.description || '暂无描述'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </Modal>

      {/* ===== 编辑消息弹窗 ===== */}
      <Modal
        open={!!editingMsg}
        title="编辑消息"
        onOk={handleSaveEdit}
        onCancel={() => {
          setEditingMsg(null);
          setEditContent('');
        }}
        okText="保存"
        cancelText="取消"
        width="90%"
        destroyOnClose
      >
        <div className={styles.editTextarea}>
          <Input.TextArea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            placeholder="编辑消息内容..."
            rows={6}
            autoFocus
          />
        </div>
      </Modal>

      {/* ===== 删除确认弹窗 ===== */}
      <Modal
        open={!!deletingMsgId}
        title="确认删除"
        onOk={handleConfirmDelete}
        onCancel={() => setDeletingMsgId(null)}
        okText="删除"
        cancelText="取消"
        okButtonProps={{ danger: true }}
      >
        <p>确定要删除这条消息吗？此操作不可撤销。</p>
      </Modal>

      {/* ===== 角色描述抽屉 ===== */}
      <Drawer
        title={null}
        open={descDrawerOpen}
        onClose={() => setDescDrawerOpen(false)}
        placement="right"
        width="85%"
        styles={{
          header: { display: 'none' },
          content: {
            background: 'var(--luzzy-glass-bg-strong)',
            backdropFilter: 'blur(var(--luzzy-glass-blur-strong)) saturate(200%)',
            WebkitBackdropFilter:
              'blur(var(--luzzy-glass-blur-strong)) saturate(200%)',
          },
        }}
      >
        {currentCharacter && (
          <div>
            {/* 抽屉头部 */}
            <div className={styles.descDrawerHeader}>
              <div className={styles.descDrawerAvatar}>
                {currentCharacter.avatar ? (
                  <img
                    src={currentCharacter.avatar}
                    alt={currentCharacter.name}
                  />
                ) : (
                  getInitial(currentCharacter.name)
                )}
              </div>
              <div className={styles.descDrawerInfo}>
                <div className={styles.descDrawerName}>
                  {currentCharacter.name}
                </div>
                <div className={styles.descDrawerStats}>
                  <span>
                    <strong style={{ color: 'var(--luzzy-primary)' }}>
                      {chatFloors}
                    </strong>{' '}
                    楼
                  </span>
                  <span style={{ opacity: 0.4 }}>|</span>
                  <span>
                    <strong style={{ color: 'var(--luzzy-primary)' }}>
                      {totalContextTokens.toLocaleString()}
                    </strong>{' '}
                    字
                  </span>
                </div>
              </div>
            </div>

            {/* 抽屉内容 */}
            <div className={styles.descDrawerBody}>
              {currentCharacter.description && (
                <div className={styles.descSection}>
                  <div className={styles.descSectionTitle}>
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
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                    角色简介
                  </div>
                  <div className={styles.descSectionContent}>
                    <Markdown>{currentCharacter.description}</Markdown>
                  </div>
                </div>
              )}

              {currentCharacter.personality && (
                <div className={styles.descSection}>
                  <div className={styles.descSectionTitle}>
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
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    性格特征
                  </div>
                  <div className={styles.descSectionContent}>
                    <Markdown>{currentCharacter.personality}</Markdown>
                  </div>
                </div>
              )}

              {currentCharacter.scenario && (
                <div className={styles.descSection}>
                  <div className={styles.descSectionTitle}>
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
                      <path d="M12 2L2 7l10 5 10-5-10-5z" />
                      <path d="M2 17l10 5 10-5" />
                      <path d="M2 12l10 5 10-5" />
                    </svg>
                    场景设定
                  </div>
                  <div className={styles.descSectionContent}>
                    <Markdown>{currentCharacter.scenario}</Markdown>
                  </div>
                </div>
              )}

              {currentCharacter.firstMessage && (
                <div className={styles.descSection}>
                  <div className={styles.descSectionTitle}>
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
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    开场白
                  </div>
                  <div className={styles.descSectionContent}>
                    <Markdown>{currentCharacter.firstMessage}</Markdown>
                  </div>
                </div>
              )}

              {currentCharacter.tags && currentCharacter.tags.length > 0 && (
                <div className={styles.descSection}>
                  <div className={styles.descSectionTitle}>
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
                      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                      <line x1="7" y1="7" x2="7.01" y2="7" />
                    </svg>
                    标签
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {currentCharacter.tags.map((tag, i) => (
                      <Tag key={i} color="blue">
                        {tag}
                      </Tag>
                    ))}
                  </div>
                </div>
              )}

              {currentCharacter.creator && (
                <div className={styles.descSection}>
                  <div className={styles.descSectionTitle}>
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
                      <path d="M12 2v6m0 0l3-3m-3 3L9 5m-7 7h6m0 0l-3 3m3-3l3 3m7-3h6m-6 0l3 3m-3-3l-3 3" />
                    </svg>
                    创作者
                  </div>
                  <div className={styles.descSectionContent}>
                    {currentCharacter.creator}
                    {currentCharacter.characterVersion &&
                      ` · v${currentCharacter.characterVersion}`}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
