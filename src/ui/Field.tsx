import {useEffect, useId, useState, type InputHTMLAttributes, type PropsWithChildren, type SelectHTMLAttributes} from "react";
import {HelpTip} from "./HelpTip";

type FieldProps = PropsWithChildren<{
  label: string;
  hint?: string;
  help?: string;
  helpLabel?: string;
  htmlFor?: string;
  className?: string;
}>;

export function Field({label, hint, help, helpLabel = "More information", htmlFor, className = "", children}: FieldProps) {
  return (
    <div className={`field ${className}`.trim()}>
      <div className="field__label">
        <span className="field__label-main">
          <label htmlFor={htmlFor}>{label}</label>
          {help ? <HelpTip text={help} label={helpLabel} /> : null}
        </span>
        {hint ? <span className="field__hint">{hint}</span> : null}
      </div>
      {children}
    </div>
  );
}

type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "id"> & {
  label: string;
  hint?: string;
};

export function TextField({label, hint, ...props}: TextFieldProps) {
  const id = useId();
  return (
    <Field label={label} hint={hint} htmlFor={id}>
      <input id={id} className="input" {...props} />
    </Field>
  );
}

type SelectFieldProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "id"> & {
  label: string;
  hint?: string;
};

export function SelectField({label, hint, children, ...props}: SelectFieldProps) {
  const id = useId();
  return (
    <Field label={label} hint={hint} htmlFor={id}>
      <select id={id} className="select" {...props}>{children}</select>
    </Field>
  );
}

export function CheckboxField({label, checked, disabled, onChange}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  const id = useId();
  return (
    <label className={`checkbox ${disabled ? "checkbox--disabled" : ""}`} htmlFor={id}>
      <input id={id} type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.currentTarget.checked)} />
      <span>{label}</span>
    </label>
  );
}

type NumberFieldProps = {
  id?: string;
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  scale?: number;
  unit?: string;
  help?: string;
  helpLabel?: string;
  className?: string;
  onChange: (value: number) => void;
};

export function NumberField({
  id,
  label,
  value,
  min,
  max,
  step,
  scale = 1,
  unit,
  help,
  helpLabel,
  className,
  onChange,
}: NumberFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const displayedValue = Number((value * scale).toFixed(4));

  return (
    <Field label={label} help={help} helpLabel={helpLabel} htmlFor={inputId} className={className}>
      <div className="input-with-unit">
        <input
          id={inputId}
          type="number"
          value={displayedValue}
          min={min === undefined ? undefined : min * scale}
          max={max === undefined ? undefined : max * scale}
          step={step === undefined ? undefined : step * scale}
          onChange={(event) => {
            if (event.currentTarget.value.trim() === "") return;
            const parsed = Number(event.currentTarget.value);
            if (Number.isFinite(parsed)) onChange(parsed / scale);
          }}
        />
        {unit ? <span className="input-with-unit__suffix" aria-hidden="true">{unit}</span> : null}
      </div>
    </Field>
  );
}

type ColorFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
};

export function ColorField({id, label, value, onChange}: ColorFieldProps) {
  const normalizedValue = normalizeHex(value) ?? "#000000";
  const [draft, setDraft] = useState(normalizedValue.toUpperCase());

  useEffect(() => {
    setDraft(normalizedValue.toUpperCase());
  }, [normalizedValue]);

  const commitDraft = () => {
    const nextValue = normalizeHex(draft);
    if (nextValue) {
      setDraft(nextValue.toUpperCase());
      onChange(nextValue);
      return;
    }
    setDraft(normalizedValue.toUpperCase());
  };

  return (
    <Field label={label} htmlFor={id}>
      <div className="color-control">
        <input
          id={id}
          className="color-control__swatch"
          type="color"
          value={normalizedValue}
          onChange={(event) => onChange(event.currentTarget.value)}
        />
        <input
          className="color-control__hex"
          aria-label={`${label} HEX`}
          type="text"
          inputMode="text"
          maxLength={7}
          spellCheck={false}
          value={draft}
          onChange={(event) => setDraft(event.currentTarget.value)}
          onBlur={commitDraft}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
            if (event.key === "Escape") {
              setDraft(normalizedValue.toUpperCase());
              event.currentTarget.blur();
            }
          }}
        />
      </div>
    </Field>
  );
}

function normalizeHex(value: string): string | null {
  const normalized = value.trim();
  return /^#[0-9a-f]{6}$/i.test(normalized) ? normalized.toLowerCase() : null;
}
