/**
 * Structural error shape: element `errors` (BlockElementError) and the
 * segment-bearing types' `segmentErrors` (filterID + code) both fit.
 */
export interface DisplayError {
  code: string;
  message?: string | null;
  [key: string]: unknown;
}

/**
 * Validation is business STATE on the element, not a GraphQL error: every
 * mutation response carries recomputed `errors`, so this list re-renders on
 * each applyBlock. Locator fields (buttonID, headerID, …) point at the exact
 * sub-part to fix.
 */
export function ErrorList({ errors }: { errors: readonly DisplayError[] }) {
  if (errors.length === 0) return null;
  return (
    <div className="space-y-1.5">
      <div className="text-xs font-medium text-text-muted">Validation</div>
      {errors.map((error, index) => (
        <div
          key={`${error.code}-${index}`}
          className="rounded-lg border border-danger/30 bg-danger-soft px-2.5 py-1.5 text-xs"
        >
          <div className="font-medium text-danger">{error.message || error.code}</div>
          {error.message ? <div className="text-danger/80">{error.code}</div> : null}
          {locatorFor(error) ? <div className="text-danger/80">{locatorFor(error)}</div> : null}
        </div>
      ))}
    </div>
  );
}

function locatorFor(error: DisplayError): string | null {
  if ('buttonID' in error && 'paramName' in error) return `button ${error.buttonID} · param ${error.paramName}`;
  if ('buttonID' in error) return `button ${error.buttonID}`;
  if ('ruleID' in error) return `rule ${error.ruleID}`;
  if ('headerID' in error) return `header ${error.headerID}`;
  if ('urlParamID' in error) return `URL param ${error.urlParamID}`;
  if ('responseParsingRuleID' in error) return `parsing rule ${error.responseParsingRuleID}`;
  if ('entryID' in error) return `entry ${error.entryID}`;
  if ('paramName' in error) return `param ${error.paramName}`;
  // segmentErrors: an empty filterID means the whole segment is invalid.
  if ('filterID' in error) return error.filterID ? `audience filter (highlighted above)` : 'whole audience segment';
  return null;
}
