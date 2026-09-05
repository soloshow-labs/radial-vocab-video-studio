import {act, renderHook} from "@testing-library/react";
import type {PropsWithChildren} from "react";
import {beforeEach, describe, expect, it} from "vitest";
import {I18nProvider, useI18n} from "../../src/i18n/I18nProvider";
import {catalogs, messageKeys, translate} from "../../src/i18n/messages";

describe("localization", () => {
  beforeEach(() => localStorage.clear());

  it("has a complete English value for every Chinese message key", () => {
    expect(Object.keys(catalogs["zh-CN"]).sort()).toEqual(Object.keys(catalogs["en-US"]).sort());
    expect(messageKeys.length).toBeGreaterThan(40);
  });

  it("defaults to Chinese and interpolates values", () => {
    const wrapper = ({children}: PropsWithChildren) => <I18nProvider>{children}</I18nProvider>;
    const {result} = renderHook(() => useI18n(), {wrapper});

    expect(result.current.locale).toBe("zh-CN");
    expect(result.current.t("words.count", {count: 6})).toBe("单词列表 · 6");
  });

  it("switches to English and persists the locale", () => {
    const wrapper = ({children}: PropsWithChildren) => <I18nProvider>{children}</I18nProvider>;
    const {result} = renderHook(() => useI18n(), {wrapper});

    act(() => result.current.setLocale("en-US"));

    expect(result.current.t("app.generate")).toBe("Generate video");
    expect(localStorage.getItem("radial-vocab.locale")).toBe("en-US");
  });

  it("returns the key for an unknown runtime message", () => {
    expect(translate("zh-CN", "missing.runtime.key" as never)).toBe("missing.runtime.key");
  });
});
