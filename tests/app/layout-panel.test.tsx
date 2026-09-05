import {render, screen} from "@testing-library/react";
import {describe, expect, it, vi} from "vitest";
import {createDefaultProject} from "../../src/domain/project";
import {LayoutPanel} from "../../src/features/layout/LayoutPanel";
import {I18nProvider} from "../../src/i18n/I18nProvider";

describe("layout panel", () => {
  it("shows the same unused direction that preview and rendering resolve", () => {
    const project = createDefaultProject();
    project.words.push({text: "roommate", meaningZh: "室友"});

    render(
      <I18nProvider>
        <LayoutPanel project={project} dispatch={vi.fn()} />
      </I18nProvider>,
    );

    expect(screen.getByLabelText("方向 7")).toHaveValue("w");
  });
});
