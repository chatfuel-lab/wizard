import { IconCheck, IconWarning } from '../../icons';
import { DEFAULT_EDIT_ERROR, type CellEditState } from '../../lib/data/tableEdit';
import { Spinner } from '../../primitives/Spinner';

/** The pending / saved / failed glyph that trails an editable cell's value. */
export function CellStatus({ state }: { state: CellEditState | undefined }) {
  if (state === undefined || state.status === 'idle') return null;
  if (state.status === 'pending') return <Spinner size={12} className="shrink-0" />;
  if (state.status === 'saved') {
    return (
      <span className="shrink-0 text-success">
        <IconCheck size={12} />
        <span className="sr-only">Saved</span>
      </span>
    );
  }
  /* The message is the only record that this write failed — nothing
     server-side kept one, and there is no field history to look it up in. */
  const message = state.message ?? DEFAULT_EDIT_ERROR;
  return (
    <span className="shrink-0 text-danger" title={message}>
      <IconWarning size={12} />
      <span className="sr-only">{message}</span>
    </span>
  );
}
