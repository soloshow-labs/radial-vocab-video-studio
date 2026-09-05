import {useId, useRef, useState, type KeyboardEvent} from "react";

type HelpTipProps = {
  text: string;
  label: string;
};

export type TooltipAlignment = "start" | "center" | "end";

const TOOLTIP_WIDTH = 210;
const PANEL_GUTTER = 8;

export function resolveTooltipAlignment(
  triggerCenterX: number,
  panelLeft: number,
  panelRight: number,
  tooltipWidth = TOOLTIP_WIDTH,
): TooltipAlignment {
  const halfWidth = tooltipWidth / 2;
  if (triggerCenterX - halfWidth < panelLeft + PANEL_GUTTER) return "start";
  if (triggerCenterX + halfWidth > panelRight - PANEL_GUTTER) return "end";
  return "center";
}

export function HelpTip({text, label}: HelpTipProps) {
  const [open, setOpen] = useState(false);
  const [alignment, setAlignment] = useState<TooltipAlignment>("center");
  const rootRef = useRef<HTMLSpanElement>(null);
  const tooltipId = useId();
  const updateAlignment = () => {
    const root = rootRef.current;
    const panel = root?.closest<HTMLElement>(".inspector-body");
    if (!root || !panel) return;

    const triggerRect = root.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    setAlignment(resolveTooltipAlignment(
      triggerRect.left + triggerRect.width / 2,
      panelRect.left,
      panelRect.right,
    ));
  };
  const closeOnEscape = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== "Escape") return;
    setOpen(false);
    event.currentTarget.blur();
  };

  return (
    <span
      className={`help-tip help-tip--${alignment}`}
      data-open={open || undefined}
      onMouseEnter={updateAlignment}
      ref={rootRef}
    >
      <button
        className="help-tip__trigger"
        type="button"
        aria-label={label}
        aria-describedby={tooltipId}
        aria-expanded={open}
        onClick={() => {
          updateAlignment();
          setOpen((current) => !current);
        }}
        onFocus={updateAlignment}
        onKeyDown={closeOnEscape}
        onBlur={() => setOpen(false)}
      >
        ?
      </button>
      <span className="help-tip__content" id={tooltipId} role="tooltip">{text}</span>
    </span>
  );
}
