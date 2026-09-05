import {I18nProvider} from "../i18n/I18nProvider";
import "../styles/global.css";
import {AppShell} from "./AppShell";

export function App() {
  return <I18nProvider><AppShell /></I18nProvider>;
}
