# Documentation

The two READMEs come first: [`packages/wizard/README.md`](../packages/wizard/README.md) is the
user guide for the CLI, and [`content/shell/README.md`](../content/shell/README.md) is the README that
ships inside the app you get. What follows is the material that did not fit in either.

- [Architecture](architecture.md) — how the CLI, the vendored packages and the app relate, and
  where the token boundary is.
- [Configuration](configuration.md) — every environment variable and every CLI flag, in one place.
- [Deployment](deployment.md) — who is allowed to reach the app, picking a host, and the
  rules that hold whichever you pick. Docker and sub-path serving are in
  [the app's own README](../content/shell/README.md#production).
- [Modules](modules.md) — what each of the fourteen modules gives you, and what a module is
  made of.
- [Apps](apps.md) — the `--app` presets: what an app preset is, the overlay trust model, and
  where the catalog lives.
- [Troubleshooting](troubleshooting.md) — the errors this stack actually produces, and the
  limits worth knowing before you hit them.
