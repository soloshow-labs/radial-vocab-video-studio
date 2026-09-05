import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe, expect, it} from "vitest";
import {createDefaultProject} from "../../src/domain/project";
import {I18nProvider} from "../../src/i18n/I18nProvider";
import {PreviewPanel} from "../../src/preview/PreviewPanel";

describe("preview panel", () => {
  it("toggles the safe area and seeks the preview", async () => {
    const user = userEvent.setup();
    render(
      <I18nProvider>
        <PreviewPanel project={createDefaultProject()} />
      </I18nProvider>,
    );

    expect(screen.queryByTestId("safe-area")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", {name: "安全区"}));
    expect(screen.getByTestId("safe-area")).toBeInTheDocument();

    const seek = screen.getByRole("slider", {name: "预览时间"});
    await user.click(seek);
    expect(seek).toBeInTheDocument();
  });
});
