import { AttachmentTile } from '~ui';

export interface AudioBubbleProps {
  /** Null when the recording is gone: `FileStatus.Expired`, or never sent. */
  url: string | null;
  /**
   * Only set once `transcriptionStatus` is `finished` — see `transcriptOf` in
   * `lib/messagePayload.ts`. An in-progress or skipped transcription is an
   * empty string on the wire, not null.
   */
  transcript: string | null;
  /** "Voice message" — the kinds-table label. */
  label: string;
}

/** The player, the transcript under it, and a named tile when the file is gone. */
export function AudioBubble({ url, transcript, label }: AudioBubbleProps) {
  return (
    <div>
      {url ? (
        <audio controls src={url} className="max-w-full" />
      ) : (
        <AttachmentTile kind="audio" name={label} state="failed" error="Recording expired" />
      )}
      {transcript ? <div className="mt-1 text-sm italic opacity-80">“{transcript}”</div> : null}
    </div>
  );
}
