import type {SVGProps} from "react";

type IconProps = SVGProps<SVGSVGElement>;

function IconBase({children, ...props}: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      {children}
    </svg>
  );
}

export function BrandMark(props: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 8.7V3.9M14.9 10.3l4.1-2.4M14.9 13.7l4.1 2.4M12 15.3v4.8M9.1 13.7 5 16.1M9.1 10.3 5 7.9" strokeWidth="1.4" />
      <circle cx="12" cy="12" r="3.2" fill="currentColor" stroke="none" />
      <circle cx="12" cy="2.7" r="1.35" fill="currentColor" stroke="none" />
      <circle cx="20.2" cy="7.4" r="1.35" fill="currentColor" stroke="none" />
      <circle cx="20.2" cy="16.6" r="1.35" fill="currentColor" stroke="none" />
      <circle cx="12" cy="21.3" r="1.35" fill="currentColor" stroke="none" />
      <circle cx="3.8" cy="16.6" r="1.35" fill="currentColor" stroke="none" />
      <circle cx="3.8" cy="7.4" r="1.35" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function ContentIcon(props: IconProps) {
  return <IconBase {...props}><path d="M5 4h10M5 8h7M5 12h10M5 16h6" /></IconBase>;
}

export function VideoIcon(props: IconProps) {
  return <IconBase {...props}><rect x="3" y="5" width="10" height="10" rx="1.5" /><path d="m13 8 4-2v8l-4-2" /></IconBase>;
}

export function LayoutIcon(props: IconProps) {
  return <IconBase {...props}><circle cx="10" cy="10" r="2.2" /><path d="M10 2v4M10 14v4M2 10h4M14 10h4M4.3 4.3l2.8 2.8M12.9 12.9l2.8 2.8" /></IconBase>;
}

export function StyleIcon(props: IconProps) {
  return <IconBase {...props}><path d="M4 15.5 11.8 3l4.2 4.2L3.5 15z" /><path d="m10.7 4.8 4.5 4.5M3.5 15 3 18l3-.5" /></IconBase>;
}

export function AudioIcon(props: IconProps) {
  return <IconBase {...props}><path d="M4 8v4h3l4 3V5L7 8zM14 7.2a4 4 0 0 1 0 5.6M16 5a7 7 0 0 1 0 10" /></IconBase>;
}

export function OutputIcon(props: IconProps) {
  return <IconBase {...props}><rect x="3" y="4" width="14" height="12" rx="2" /><path fill="currentColor" stroke="none" d="m8 7 5 3-5 3z" /></IconBase>;
}

export function PlayIcon(props: IconProps) {
  return <IconBase {...props}><path fill="currentColor" stroke="none" d="m7 5 8 5-8 5z" /></IconBase>;
}

export function PauseIcon(props: IconProps) {
  return <IconBase {...props}><path d="M7 5v10M13 5v10" /></IconBase>;
}

export function PlusIcon(props: IconProps) {
  return <IconBase {...props}><path d="M10 4v12M4 10h12" /></IconBase>;
}

export function TrashIcon(props: IconProps) {
  return <IconBase {...props}><path d="M4 6h12M8 3h4l1 3M6 6l1 11h6l1-11M9 9v5M11 9v5" /></IconBase>;
}

export function CheckIcon(props: IconProps) {
  return <IconBase {...props}><path d="m4 10 4 4 8-9" /></IconBase>;
}

export function GitHubIcon(props: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.61-3.37-1.18-3.37-1.18-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.89 1.53 2.34 1.09 2.91.83.09-.65.35-1.09.64-1.34-2.22-.25-4.56-1.11-4.56-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02A9.6 9.6 0 0 1 12 7c.85 0 1.71.11 2.51.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85V21c0 .27.18.58.69.48A10 10 0 0 0 12 2Z" />
    </svg>
  );
}
