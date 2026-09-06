import {I18nProvider} from "../i18n/I18nProvider";
import "../styles/global.css";
import {AppShell} from "./AppShell";

export function App({demoMode}: {demoMode?: boolean}) {
  return <I18nProvider><AppShell demoMode={demoMode} /></I18nProvider>;
}
