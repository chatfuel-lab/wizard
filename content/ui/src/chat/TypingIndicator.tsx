/** Purely presentational animated dots; visibility/timeout is the caller's job. */
export function TypingIndicator() {
  return (
    <div className="flex items-center">
      <span className="flex items-center gap-1 rounded-bubble rounded-bl-sm border border-border bg-bubble-in px-3 py-2.5">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-faint [animation-delay:0ms]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-faint [animation-delay:150ms]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-faint [animation-delay:300ms]" />
      </span>
    </div>
  );
}
