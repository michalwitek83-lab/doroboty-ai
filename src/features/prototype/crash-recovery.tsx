import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { downloadText } from "./download";
import { STORAGE_KEY } from "./storage";
import { reportError } from "@/lib/analytics";

/** Temporary public support address (decision 2026-11-11, docs/tasks/production-readiness-fixes.md). */
export const SUPPORT_EMAIL = "support@doroboty.ai";

export function SupportContact() {
  return (
    <p>
      Problem z działaniem demo? Napisz na{" "}
      <a className="underline" href={`mailto:${SUPPORT_EMAIL}`}>
        {SUPPORT_EMAIL}
      </a>
      . Podaj adres strony i opisz, co działo się przed błędem. Nie wysyłaj danych osobowych ani
      pliku z danymi scenariusza.
    </p>
  );
}

function readRawSave() {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function CrashScreen({ onRetry }: { onRetry: () => void }) {
  const [confirmReset, setConfirmReset] = useState(false);
  const [message, setMessage] = useState("");
  const raw = readRawSave();
  const title = useRef<HTMLHeadingElement>(null);
  // Wait one frame: the shell focuses <main> after a route change, which runs after this effect.
  useEffect(() => {
    const frame = requestAnimationFrame(() => title.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, []);
  // Keep keyboard focus on the surviving control when the reset confirmation opens or closes.
  const resetButton = useRef<HTMLButtonElement>(null);
  const confirmButton = useRef<HTMLButtonElement>(null);
  const toggled = useRef(false);
  useEffect(() => {
    if (!toggled.current) return;
    (confirmReset ? confirmButton : resetButton).current?.focus();
  }, [confirmReset]);
  function toggleReset(open: boolean) {
    toggled.current = true;
    setConfirmReset(open);
  }
  function resetScenario() {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      setMessage("Nie udało się usunąć zapisu. Wyczyść dane witryny w ustawieniach przeglądarki.");
      return;
    }
    window.location.hash = "#/";
    window.location.reload();
  }
  return (
    <section className="prototype-section crash-recovery" aria-labelledby="crash-title">
      <div className="prototype-panel prototype-form">
        <h1 id="crash-title" ref={title} tabIndex={-1} className="outline-none">
          Coś poszło nie tak
        </h1>
        <p>
          Tego widoku nie udało się wyświetlić. Dane zapisane w tej przeglądarce nie zostały
          usunięte. Spróbuj ponownie albo przejdź do innej strony.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button onClick={onRetry}>Spróbuj ponownie</Button>
          {raw !== null && (
            <Button
              variant="outline"
              onClick={() => downloadText("doroboty-zapis-do-odzyskania.txt", raw, "text/plain")}
            >
              Pobierz zapisane dane
            </Button>
          )}
          {!confirmReset && (
            <Button ref={resetButton} variant="outline" onClick={() => toggleReset(true)}>
              Resetuj scenariusz
            </Button>
          )}
        </div>
        {confirmReset && (
          <div className="crash-reset" role="group" aria-labelledby="crash-reset-title">
            <p id="crash-reset-title">
              Reset usunie wszystkie zmiany zapisane w tej przeglądarce i przywróci scenariusz
              początkowy. Jeśli chcesz je zachować, najpierw pobierz dane.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button ref={confirmButton} variant="destructive" onClick={resetScenario}>
                Potwierdź reset
              </Button>
              <Button variant="outline" onClick={() => toggleReset(false)}>
                Anuluj
              </Button>
            </div>
          </div>
        )}
        {message && (
          <p className="error-message" role="alert">
            {message}
          </p>
        )}
        <SupportContact />
      </div>
    </section>
  );
}

interface Props {
  children: ReactNode;
  /** Changing this value (e.g. the route path) clears a caught error. */
  resetKey?: string;
}
interface CrashState {
  failed: boolean;
  key?: string;
}

/**
 * Render error boundary. It shows local recovery actions instead of a blank page and reports the
 * caught error to PostHog error tracking on the published site (nothing is sent locally or in tests).
 */
export class CrashRecovery extends Component<Props, CrashState> {
  state: CrashState = { failed: false, key: this.props.resetKey };
  static getDerivedStateFromError(): Partial<CrashState> {
    return { failed: true };
  }
  static getDerivedStateFromProps(props: Props, state: CrashState): Partial<CrashState> | null {
    return props.resetKey !== state.key ? { failed: false, key: props.resetKey } : null;
  }
  componentDidCatch(error: Error) {
    reportError(error, "crash-recovery");
  }
  render() {
    if (this.state.failed) return <CrashScreen onRetry={() => this.setState({ failed: false })} />;
    return this.props.children;
  }
}
