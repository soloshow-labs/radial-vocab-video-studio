import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe, expect, it} from "vitest";
import {HelpTip, resolveTooltipAlignment} from "../../src/ui/HelpTip";

describe("HelpTip", () => {
  it("opens an accessible tooltip when activated", async () => {
    const user = userEvent.setup();
    render(<HelpTip label="查看说明" text="使用百分比定位中心。" />);

    await user.click(screen.getByRole("button", {name: "查看说明"}));

    expect(screen.getByRole("tooltip")).toHaveTextContent("使用百分比定位中心。");
    expect(screen.getByRole("button", {name: "查看说明"})).toHaveAttribute("aria-expanded", "true");
  });

  it("places the bubble below its trigger so the inspector does not clip it", () => {
    const cssPath = resolve(process.cwd(), "src/styles/global.css");
    const css = readFileSync(cssPath, "utf8");
    const bubbleRule = css.match(/\.help-tip__content\s*\{([^}]*)\}/)?.[1] ?? "";
    const arrowRule = css.match(/\.help-tip__content::after\s*\{([^}]*)\}/)?.[1] ?? "";

    expect(bubbleRule).toMatch(/top:\s*calc\(100% \+ 7px\)/);
    expect(bubbleRule).not.toMatch(/\bbottom:/);
    expect(arrowRule).toMatch(/bottom:\s*100%/);
    expect(arrowRule).toMatch(/border-bottom-color:\s*#171717/);
  });

  it("keeps the bubble inside the inspector at both horizontal edges", () => {
    expect(resolveTooltipAlignment(250, 180, 587)).toBe("start");
    expect(resolveTooltipAlignment(385, 180, 587)).toBe("center");
    expect(resolveTooltipAlignment(500, 180, 587)).toBe("end");
  });
});
