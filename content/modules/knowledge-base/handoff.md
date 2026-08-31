### Knowledge Base (knowledge-base)

Everything your AI knows about the business, as one workspace: a rail of
knowledge sources beside the selected source's page. Route: `/knowledge-base`,
deep links `?source=overview|profile|instructions|faq|products|services|team|gaps`
(plus `item=`, `q=`, `import=`, `draft=`). Old `?tab=` links still work.

- **Overview** — a readiness score, the character budget broken down by source,
  and the list of what to fix, each item linking to the row that needs it.
- **Business profile** — name, contacts, address, how to pay, opening hours.
- **About the business** — the free-text half: how you work, what you do not do. Starter templates for five kinds of business.
- **FAQ** — search, reorder, bulk edit, import and export, duplicate detection.
- **Products** — photos, prices, availability, import and export.
- **Services** and **Team** — read-only here, edited in Bookings (if installed).
- **Gaps** — scan conversations the assistant handed to a human, grouped into
  the questions worth answering, one click to turn a group into an FAQ.

Two things worth knowing: the agent's name, language, greeting and emoji policy
are NOT here — they live in AI Automations. And nothing on this page is live:
there is no subscription for it, so it refetches after every write, on reconnect
and on Refresh.

First-task ideas:
1. Open **Overview** and fix the first blocker it names — a bot that has never
   been filled in has several.
2. Fill in the real business profile and watch the budget breakdown move on
   every save.
3. Run the **Gaps** scan on a bot with real traffic, then turn the top group into
   an FAQ — that loop is the reason the module exists.
4. Import your existing FAQ from a spreadsheet, or paste it in as text.
5. Add a photo to a catalog item — the first photo is the one the assistant
   sends, and photos can be reordered.
