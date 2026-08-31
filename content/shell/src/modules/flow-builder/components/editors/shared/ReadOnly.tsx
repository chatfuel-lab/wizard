/** Labeled read-only value — for fields the schema exposes no setter for. */
export function ReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-medium text-text-muted">{label}</div>
      <div className="break-words text-sm text-text">{value}</div>
    </div>
  );
}
