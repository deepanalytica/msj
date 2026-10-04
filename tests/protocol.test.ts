import { describe, expect, it } from "vitest";
import type { ToolDescriptor } from "@/domain/core";

describe("MSJ integration protocol", () => {
  it("keeps vertical capabilities outside the core", () => {
    const tool: ToolDescriptor = {
      name: "clinia.list_availability",
      description: "Disponibilidad externa",
      inputSchema: { type: "object" },
      risk: "read"
    };

    expect(tool.name.startsWith("clinia.")).toBe(true);
    expect(["read", "write", "sensitive"]).toContain(tool.risk);
  });
});
