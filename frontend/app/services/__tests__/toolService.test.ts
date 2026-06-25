/**
 * v0.8.10 Bug 1: 工具调用 <tool_calls> 套壳格式解析测试
 *
 * 验证三种套壳格式解析：
 *   1. 无尖括号：<tool_calls>label:query</tool_calls>
 *   2. 有尖括号：<tool_calls><label:query></tool_calls>
 *   3. | 分隔多工具：<tool_calls>label1:q1|label2:q2</tool_calls>
 *
 * 同时验证无套壳的传统 <label:query> 格式仍兼容。
 */
import { describe, expect, it } from "vitest";
import {
  findPendingActiveToolCallInText,
  findPendingBuiltinToolCallInText,
} from "../toolService";
import type { ActiveTool, BuiltinToolConfig } from "~/types/luzzy";

// ============================================================================
// 测试用工具配置
// ============================================================================

// ActiveTool: callName 决定标签格式 → ${callName}_add / ${callName}_cover
const mockActiveTools: ActiveTool[] = [
  {
    id: "tool-1",
    name: "测试技能",
    enabled: true,
    callName: "my_skill", // 标签将为 my_skill_add / my_skill_cover
    type: "skill",
    description: "测试用 active 工具",
    resultCount: 8,
  } as ActiveTool,
];

// BuiltinToolConfig: callLabel = config.type（kebab-case）
const mockBuiltinConfigs: BuiltinToolConfig[] = [
  {
    type: "vector-memory",
    enabled: true,
    resultCount: 5,
    enabledForCharacters: [],
  } as BuiltinToolConfig,
  {
    type: "memory-recall",
    enabled: true,
    resultCount: 5,
    enabledForCharacters: [],
  } as BuiltinToolConfig,
];

// ============================================================================
// 测试用例
// ============================================================================

describe("v0.8.10 Bug 1 - 工具调用 <tool_calls> 套壳格式解析", () => {
  // -------------------------------------------------------------------------
  // Builtin 工具测试（vector-memory / memory-recall 等 kebab-case 标签）
  // -------------------------------------------------------------------------

  it("格式1: builtin 无尖括号 <tool_calls>vector-memory:query</tool_calls>", () => {
    const text = "<tool_calls>vector-memory:鹿溪 沐梓溪 对话 关系</tool_calls>";
    const result = findPendingBuiltinToolCallInText(text, mockBuiltinConfigs);
    expect(result).not.toBeNull();
    expect(result?.toolType).toBe("vector-memory");
    expect(result?.query).toBe("鹿溪 沐梓溪 对话 关系");
  });

  it("格式2: builtin 有尖括号 <tool_calls><vector-memory:query></tool_calls>", () => {
    const text = "<tool_calls><vector-memory:鹿溪 沐梓溪 对话 关系></tool_calls>";
    const result = findPendingBuiltinToolCallInText(text, mockBuiltinConfigs);
    expect(result).not.toBeNull();
    expect(result?.toolType).toBe("vector-memory");
    expect(result?.query).toBe("鹿溪 沐梓溪 对话 关系");
  });

  it("格式3: builtin | 分隔多工具 <tool_calls>a:q1|b:q2</tool_calls>", () => {
    const text = "<tool_calls>vector-memory:query1|memory-recall:query2</tool_calls>";
    const result = findPendingBuiltinToolCallInText(text, mockBuiltinConfigs);
    expect(result).not.toBeNull();
    expect(result?.toolType).toBe("vector-memory");
    expect(result?.query).toBe("query1");
  });

  it("格式4: builtin memory-recall 无尖括号套壳", () => {
    const text = "<tool_calls>memory-recall:鹿溪 沐梓溪 对话</tool_calls>";
    const result = findPendingBuiltinToolCallInText(text, mockBuiltinConfigs);
    expect(result).not.toBeNull();
    expect(result?.toolType).toBe("memory-recall");
    expect(result?.query).toBe("鹿溪 沐梓溪 对话");
  });

  // -------------------------------------------------------------------------
  // Active 工具测试（自定义 skill 工具，使用 _add / _cover 后缀）
  // -------------------------------------------------------------------------

  it("格式5: active 无尖括号 <tool_calls>my_skill_add:query</tool_calls>", () => {
    const text = "<tool_calls>my_skill_add:do something here</tool_calls>";
    const result = findPendingActiveToolCallInText(text, mockActiveTools);
    expect(result).not.toBeNull();
    expect(result?.callLabel).toBe("my_skill_add");
    expect(result?.query).toBe("do something here");
  });

  it("格式6: active 有尖括号 <tool_calls><my_skill_add:query></tool_calls>", () => {
    const text = "<tool_calls><my_skill_add:do something></tool_calls>";
    const result = findPendingActiveToolCallInText(text, mockActiveTools);
    expect(result).not.toBeNull();
    expect(result?.callLabel).toBe("my_skill_add");
    expect(result?.query).toBe("do something");
  });

  it("格式7: active cover 模式无尖括号套壳", () => {
    const text = "<tool_calls>my_skill_cover:cover query</tool_calls>";
    const result = findPendingActiveToolCallInText(text, mockActiveTools);
    expect(result).not.toBeNull();
    expect(result?.callLabel).toBe("my_skill_cover");
    expect(result?.query).toBe("cover query");
  });

  // -------------------------------------------------------------------------
  // 兼容性测试：无套壳的传统 <label:query> 格式
  // -------------------------------------------------------------------------

  it("格式8: builtin 无套壳传统 <vector-memory:query> 仍兼容", () => {
    const text = "<vector-memory:鹿溪 沐梓溪 对话 关系>";
    const result = findPendingBuiltinToolCallInText(text, mockBuiltinConfigs);
    expect(result).not.toBeNull();
    expect(result?.toolType).toBe("vector-memory");
    expect(result?.query).toBe("鹿溪 沐梓溪 对话 关系");
  });

  it("格式9: active 无套壳传统 <my_skill_add:query> 仍兼容", () => {
    const text = "<my_skill_add:do something>";
    const result = findPendingActiveToolCallInText(text, mockActiveTools);
    expect(result).not.toBeNull();
    expect(result?.callLabel).toBe("my_skill_add");
    expect(result?.query).toBe("do something");
  });

  // -------------------------------------------------------------------------
  // 边界情况测试
  // -------------------------------------------------------------------------

  it("格式10: 纯文本无工具调用返回 null", () => {
    const text = "这是普通文本，没有工具调用";
    const result = findPendingBuiltinToolCallInText(text, mockBuiltinConfigs);
    expect(result).toBeNull();
  });

  it("格式11: 空字符串返回 null", () => {
    const result = findPendingBuiltinToolCallInText("", mockBuiltinConfigs);
    expect(result).toBeNull();
  });

  it("格式12: 空套壳 <tool_calls></tool_calls> 返回 null", () => {
    const text = "<tool_calls></tool_calls>";
    const result = findPendingBuiltinToolCallInText(text, mockBuiltinConfigs);
    expect(result).toBeNull();
  });

  it("格式13: builtin | 分隔但都是未知工具返回 null", () => {
    const text = "<tool_calls>unknown-tool:q1|another-unknown:q2</tool_calls>";
    const result = findPendingBuiltinToolCallInText(text, mockBuiltinConfigs);
    expect(result).toBeNull();
  });
});
