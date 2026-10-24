/**
 * The conversation with the pricing analyst. The first message carries the
 * scope (typed, pasted, or attached as RFP files); later ones ask for changes.
 */
import { useEffect, useRef, useState } from "react";
import { Loader2, Paperclip, Send, Sparkles, X } from "lucide-react";
import { ThinkingOrb } from "thinking-orbs";
import { Button, cx } from "./ui";
import { useT } from "../lib/i18n";
import type { ChatMessage } from "../lib/types";

export function AiChat({
  chat,
  running,
  hasSession,
  ready,
  onSend,
  onStop,
}: {
  chat: ChatMessage[];
  running: boolean;
  hasSession: boolean;
  ready: boolean;
  onSend: (text: string, files: File[]) => void;
  onStop: () => void;
}) {
  const { t } = useT();
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chat]);

  const canSend = ready && !running && (text.trim().length > 0 || files.length > 0);

  function submit() {
    if (!canSend) return;
    onSend(text.trim(), files);
    setText("");
    setFiles([]);
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div ref={listRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {chat.length === 0 && (
          <div className="rounded-card border border-brand/20 bg-active p-4 text-sm text-ink">
            <p className="flex items-center gap-2 font-semibold text-brand">
              <Sparkles size={15} /> {t("chatIntroTitle")}
            </p>
            <p className="mt-1.5 leading-relaxed text-ink-2">{t("chatIntroBody")}</p>
          </div>
        )}
        {chat.map((m) => (
          <div key={m.id} className={cx("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div
              className={cx(
                "max-w-[92%] rounded-card px-3.5 py-2.5 text-sm leading-relaxed",
                m.role === "user" ? "bg-brand text-on-brand" : "border border-line bg-surface text-ink"
              )}
            >
              {m.text ? (
                <p dir="auto" className="whitespace-pre-wrap break-words text-start">{m.text}</p>
              ) : m.pending ? (
                <span className="flex items-center gap-2 text-ink-2">
                  <ThinkingOrb state="composing" size={20} aria-label={t("chatWorking")} /> {t("chatWorking")}
                </span>
              ) : null}
              {m.attachments && m.attachments.length > 0 && (
                <p className={cx("mt-1.5 flex flex-wrap gap-1 text-[11px]", m.role === "user" ? "text-on-brand/80" : "text-ink-muted")}>
                  {m.attachments.map((a) => (
                    <span key={a} className="rounded-full border border-current/30 px-2 py-0.5">
                      <Paperclip size={10} className="me-1 inline" />
                      {a}
                    </span>
                  ))}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-line p-3">
        {files.length > 0 && (
          <ul className="mb-2 flex flex-wrap gap-1.5">
            {files.map((f, i) => (
              <li key={`${f.name}${i}`} className="flex items-center gap-1 rounded-full border border-line bg-raised px-2 py-0.5 text-[11px] text-ink-2">
                <Paperclip size={10} /> {f.name}
                <button onClick={() => setFiles((fs) => fs.filter((_, j) => j !== i))} aria-label={t("rfpRemoveFile")} className="ms-0.5 text-ink-muted hover:text-bad">
                  <X size={11} />
                </button>
              </li>
            ))}
          </ul>
        )}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
          }}
          rows={hasSession ? 2 : 5}
          placeholder={hasSession ? t("chatFollowUpPlaceholder") : t("chatScopePlaceholder")}
          disabled={!ready}
          className="block w-full resize-y rounded-lg border border-line bg-bg/50 px-3 py-2 text-sm leading-relaxed text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none disabled:opacity-60"
        />
        <div className="mt-2 flex items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".pdf,.docx,.pptx,.txt,.md,.csv,.xlsx,.xlsm,.png,.jpg,.jpeg,.webp,.gif,image/*"
            className="hidden"
            onChange={(e) => {
              setFiles((fs) => [...fs, ...Array.from(e.target.files ?? [])].slice(0, 10));
              e.target.value = "";
            }}
          />
          <Button type="button" variant="secondary" size="sm" onClick={() => inputRef.current?.click()} disabled={!ready || running}>
            <Paperclip size={14} /> {t("chatAttach")}
          </Button>
          <span className="hidden text-[11px] text-ink-muted sm:block">{t("chatFormats")}</span>
          <span className="flex-1" />
          {running ? (
            <Button type="button" variant="ghost" size="sm" onClick={onStop}>
              <X size={14} /> {t("chatStop")}
            </Button>
          ) : (
            <Button type="button" size="sm" onClick={submit} disabled={!canSend}>
              <Send size={14} /> {hasSession ? t("chatSend") : t("chatPrice")}
            </Button>
          )}
        </div>
        {!ready && <p className="mt-2 text-[11px] text-warn">{t("chatNotReady")}</p>}
      </div>
    </div>
  );
}
