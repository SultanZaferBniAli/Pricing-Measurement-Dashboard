/** Who did it: Google photo (or initial) and name, with the email on hover. */
export function OwnerChip({ name, email, picture, compact }: { name?: string; email: string; picture?: string | null; compact?: boolean }) {
  const label = name || email.split("@")[0];
  return (
    <span className="flex min-w-0 items-center gap-2" title={email}>
      {picture ? (
        <img src={picture} alt="" referrerPolicy="no-referrer" className="h-6 w-6 shrink-0 rounded-full object-cover" />
      ) : (
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-active text-[10px] font-bold text-brand">
          {label.slice(0, 1).toUpperCase()}
        </span>
      )}
      {!compact && <span className="truncate text-xs text-ink-2">{label}</span>}
    </span>
  );
}
