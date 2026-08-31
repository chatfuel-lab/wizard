/* Building blocks for floating surfaces. Exported so a module can compose its
 * own anchored UI without re-solving positioning, focus or presence. */
export { useAnchoredPosition, type UseAnchoredPositionOptions } from './useAnchoredPosition';
export { useContainerBand } from './useContainerBand';
export { useElementSize, type ElementSize } from './useElementSize';
export { useControllableState } from './useControllableState';
/* Three modules had already written this button three ways, and two of them
 * leaked the reset timer. The fallback path matters for embeds: an iframe
 * without `clipboard-write` has the API and refuses every call to it. */
export {
  useCopyToClipboard,
  type UseCopyToClipboardOptions,
  type UseCopyToClipboardResult,
} from './useCopyToClipboard';
/** Viewport, not container — see the file header before reaching for it. */
export { useMediaQuery } from './useMediaQuery';
export { useDismiss, type UseDismissOptions } from './useDismiss';
export { useFocusTrap, type UseFocusTrapOptions } from './useFocusTrap';
export { useHotkeys, type UseHotkeysOptions } from './useHotkeys';
export { useTestChat, type TestChatApi, type TestChatTransport } from './useTestChat';
export { useLayer, type UseLayerResult } from './useLayer';
export { usePresence, type UsePresenceOptions, type UsePresenceResult } from './usePresence';
export { useRovingFocus, type UseRovingFocusOptions, type UseRovingFocusResult } from './useRovingFocus';
export { useScrollLock } from './useScrollLock';
export { useFocusReturn } from './useFocusReturn';
export { useUndoOffer, type UndoOfferApi, type UseUndoOfferOptions } from './useUndoOffer';
export { useStoredList, type KeyedTextStore, type StoredListState, type UseStoredListOptions } from './useStoredList';
export { useGates, type GatesState } from './useGates';
