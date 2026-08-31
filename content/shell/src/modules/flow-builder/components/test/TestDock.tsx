import { Button, FloatingDock, IconRefresh, TestChat, Tooltip, type Band, type FloatingDockSize } from '~ui';
import type { FlowTestApi } from '../../hooks/useFlowTest';
import { isNoStartingPoint, TEST_DOCK_INLINE_FROM } from '../../lib/testDock';
import type { FlowT } from '../../types';
import { PlatformGlyph } from '../PlatformGlyph';

export interface TestDockProps {
  flow: FlowT;
  test: FlowTestApi;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  size: FloatingDockSize;
  onSizeChange: (size: FloatingDockSize) => void;
  band: Band;
  /** Select a block on the canvas — the way out of "this flow has no starting point". */
  onSelectBlock: (blockId: string) => void;
}

/**
 * The Test dock: one preview conversation pinned to the flow on the canvas.
 *
 * It floats over the scene rather than taking a column, because the inspector
 * already has the right side and a canvas narrowed twice is no longer the thing
 * being edited. Collapsing keeps the session — the pill's dot is how a running
 * conversation says so.
 *
 * Nothing is explained on screen. There is nothing to explain: the flow IS what
 * answers here, unlike the automations panel, where a pinned automation answers
 * messages its own filters would have routed elsewhere.
 */
export function TestDock({ flow, test, open, onOpenChange, size, onSizeChange, band, onSelectBlock }: TestDockProps) {
  /* The flow has no starting point, so there is nothing to run — and the fix is
     on the canvas, one block away. Selecting one opens the inspector, where
     "Set as starting point" already lives. */
  const noStartingPoint = test.status === 'error' && isNoStartingPoint(test.error);
  const firstBlock = flow.blocks[0];

  return (
    <FloatingDock
      open={open}
      onOpenChange={onOpenChange}
      label="Test"
      active={test.session !== null}
      size={size}
      onSizeChange={onSizeChange}
      band={band}
      inlineFrom={TEST_DOCK_INLINE_FROM}
      title={
        <span className="flex min-w-0 items-center gap-1.5">
          <PlatformGlyph platform={flow.platform} />
          <span className="truncate text-sm font-semibold text-text">Test</span>
        </span>
      }
      actions={
        test.session ? (
          <Tooltip label="Restart the test — a fresh conversation">
            <Button
              iconOnly
              variant="ghost"
              size="sm"
              aria-label="Restart the test"
              onClick={test.restart}
              disabled={test.status === 'starting'}
            >
              <IconRefresh size={14} />
            </Button>
          </Tooltip>
        ) : null
      }
    >
      <TestChat
        status={test.status}
        rows={test.rows}
        typing={test.typing}
        restoring={test.restoring}
        error={test.error}
        threadError={test.threadError}
        threadLoading={test.threadLoading}
        threadKey={test.session?.conversationID ?? `idle:${flow.id}`}
        botName={flow.name}
        canSend={test.canSend}
        onSend={test.send}
        onStart={test.start}
        onAction={test.act}
        canStart
        emptyTitle={flow.name}
        errorAction={
          noStartingPoint && firstBlock ? (
            <Button variant="secondary" size="sm" onClick={() => onSelectBlock(firstBlock.id)}>
              Choose a starting point
            </Button>
          ) : null
        }
        compact
        disabledHint={test.ready ? (test.sendBlocked ?? undefined) : undefined}
      />
    </FloatingDock>
  );
}
