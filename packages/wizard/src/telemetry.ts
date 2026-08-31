/** Not wired to a backend yet; the event vocabulary is fixed so wiring it later is a one-file change. */
export type TelemetryEvent =
  | 'wizard_started'
  | 'preflight_completed'
  | 'modules_selected'
  | 'token_validated'
  | 'workspace_selected'
  | 'scaffold_completed'
  | 'handoff_written'
  | 'wizard_completed'
  | 'wizard_failed';

export function capture(_event: TelemetryEvent, _props?: Record<string, unknown>): void {
  // intentionally empty
}
