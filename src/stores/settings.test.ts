import { describe, it, expect, vi, beforeEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useSettingsStore } from "./settings";
import type { Preset } from "../types/settings";

const mockInvoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({
  invoke: (cmd: string, args: Record<string, unknown>) => mockInvoke(cmd, args),
}));

describe("useSettingsStore", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    mockInvoke.mockReset();
  });

  it("initialize loads all settings including complex objects", async () => {
    const settingsStore = useSettingsStore();
    const mockSettings = {
      theme: "dark",
      fontSize: "16",
      compactMode: "true",
      notificationsEnabled: "false",
      chatOptions: JSON.stringify({ temperature: 0.5 }),
    };

    mockInvoke.mockResolvedValue(mockSettings);

    await settingsStore.initialize();

    expect(mockInvoke).toHaveBeenCalledWith("get_all_settings", undefined);
    expect(settingsStore.theme).toBe("dark");
    expect(settingsStore.fontSize).toBe(16);
    expect(settingsStore.compactMode).toBe(true);
    expect(settingsStore.notificationsEnabled).toBe(false);
    expect(settingsStore.chatOptions.temperature).toBe(0.5);
    // Should keep defaults for missing properties
    expect(settingsStore.chatOptions.top_p).toBe(0.9);
  });

  it("updateSetting calls invoke with JSON string for complex values", async () => {
    const settingsStore = useSettingsStore();

    mockInvoke.mockResolvedValue(null);

    await settingsStore.updateSetting("chatOptions", {
      ...settingsStore.chatOptions,
      temperature: 0.8,
    });

    expect(mockInvoke).toHaveBeenCalledWith("set_setting", {
      key: "chatOptions",
      value: JSON.stringify(settingsStore.chatOptions),
    });
    expect(settingsStore.chatOptions.temperature).toBe(0.8);
  });

  it("updateChatOptions merges options and saves", async () => {
    const settingsStore = useSettingsStore();
    settingsStore.chatOptions = {
      ...settingsStore.chatOptions,
      temperature: 0.7,
      top_p: 0.9,
    };

    mockInvoke.mockResolvedValue(null);

    await settingsStore.updateChatOptions({ temperature: 1.0 });

    expect(settingsStore.chatOptions.temperature).toBe(1.0);
    expect(settingsStore.chatOptions.top_p).toBe(0.9);
    expect(mockInvoke).toHaveBeenCalledWith("set_setting", {
      key: "chatOptions",
      value: JSON.stringify(settingsStore.chatOptions),
    });
  });

  it("updateChatOptions clears activePresetId", async () => {
    const settingsStore = useSettingsStore();
    settingsStore.activePresetId = "balanced";
    mockInvoke.mockResolvedValue(null);

    await settingsStore.updateChatOptions({ temperature: 0.5 });

    expect(settingsStore.activePresetId).toBe("");
    expect(mockInvoke).toHaveBeenCalledWith("set_setting", {
      key: "activePresetId",
      value: "",
    });
  });

  it("applyPreset sets chatOptions and activePresetId without clearing preset", async () => {
    const settingsStore = useSettingsStore();
    mockInvoke.mockResolvedValue(null);

    await settingsStore.applyPreset("creative");

    expect(settingsStore.activePresetId).toBe("creative");
    expect(settingsStore.chatOptions.temperature).toBe(1.0);
    expect(mockInvoke).toHaveBeenCalledWith("set_setting", {
      key: "activePresetId",
      value: "creative",
    });
  });

  it("applyPreset does nothing for unknown id", async () => {
    const settingsStore = useSettingsStore();
    mockInvoke.mockResolvedValue(null);

    await settingsStore.applyPreset("nonexistent");

    expect(settingsStore.activePresetId).toBe("");
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it("saveAsPreset creates user preset and sets it active", async () => {
    const settingsStore = useSettingsStore();
    mockInvoke.mockResolvedValue(null);
    const initialCount = settingsStore.presets.length;

    await settingsStore.saveAsPreset("My Preset");

    expect(settingsStore.presets).toHaveLength(initialCount + 1);
    const saved = settingsStore.presets.find((p) => p.name === "My Preset");
    expect(saved).toBeDefined();
    expect(saved?.isBuiltin).toBe(false);
    expect(settingsStore.activePresetId).toBe(saved?.id);
    expect(mockInvoke).toHaveBeenCalledWith("set_setting", {
      key: "userPresets",
      value: JSON.stringify([saved]),
    });
  });

  it("deletePreset removes user preset and clears activePresetId when it was active", async () => {
    const settingsStore = useSettingsStore();
    mockInvoke.mockResolvedValue(null);
    await settingsStore.saveAsPreset("Temp");
    const saved = settingsStore.presets.find((p) => p.name === "Temp")!;
    mockInvoke.mockClear();

    await settingsStore.deletePreset(saved.id);

    expect(
      settingsStore.presets.find((p) => p.id === saved.id),
    ).toBeUndefined();
    expect(settingsStore.activePresetId).toBe("");
  });

  it("deletePreset does not remove builtin presets", async () => {
    const settingsStore = useSettingsStore();
    mockInvoke.mockResolvedValue(null);
    const initialCount = settingsStore.presets.length;

    await settingsStore.deletePreset("creative");

    expect(settingsStore.presets).toHaveLength(initialCount);
  });

  it("initialize loads user presets and merges with builtins", async () => {
    const settingsStore = useSettingsStore();
    const userPreset: Preset = {
      id: "custom-1",
      name: "My Custom",
      isBuiltin: false,
      options: {
        temperature: 0.5,
        top_p: 0.8,
        top_k: 30,
        num_ctx: 4096,
        repeat_penalty: 1.05,
        repeat_last_n: 64,
      },
    };
    mockInvoke.mockResolvedValue({
      userPresets: JSON.stringify([userPreset]),
      activePresetId: "custom-1",
    });

    await settingsStore.initialize();

    expect(settingsStore.presets.some((p) => p.id === "creative")).toBe(true);
    expect(settingsStore.presets.some((p) => p.id === "custom-1")).toBe(true);
    expect(settingsStore.activePresetId).toBe("custom-1");
  });
});
