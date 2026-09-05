import {fireEvent, render, screen} from "@testing-library/react";
import {describe, expect, it, vi} from "vitest";
import {ColorField, NumberField} from "../../src/ui/Field";

describe("human-readable fields", () => {
  it("shows ratios as percentages while returning the stored ratio", () => {
    const onChange = vi.fn();
    render(<NumberField label="Ratio" value={0.24} scale={100} unit="%" onChange={onChange} />);

    const input = screen.getByLabelText("Ratio");
    expect(input).toHaveValue(24);
    fireEvent.change(input, {target: {value: "30"}});
    expect(onChange).toHaveBeenCalledWith(0.3);
  });

  it("lets people edit an exact hex color", () => {
    const onChange = vi.fn();
    render(<ColorField id="brand-color" label="Brand color" value="#ffd21a" onChange={onChange} />);

    const input = screen.getByLabelText("Brand color HEX");
    fireEvent.change(input, {target: {value: "#112233"}});
    fireEvent.blur(input);
    expect(onChange).toHaveBeenCalledWith("#112233");
  });
});
