# Errors

Two channels, and a third on one field. The module speaks all three in `lib/errors.ts`.

## Verdicts — data on the element

`blockElements[].errors[]` on the entry point and on the template block, recomputed on every
write, snake_case, each with a `__typename` that says what it names:

| Code | On | Means |
|---|---|---|
| `template_required` | template element | no template picked |
| `TemplateNotAllowedForProcessing` | template element | the template is not Approved — the module's own verdict, raised from `whatsAppTemplate.status`, not a server code |
| `body_text_param_value_required` (`WhatsAppTemplateParamValueRequiredError`, `paramName`) | template element | a body blank is empty; `header_…` and `footer_…` twins |
| `…url_button…param_value_required` (`WhatsAppTemplateURLButtonParamValueRequiredError`, `buttonID`, `paramName`) | template element | a link's blank is empty |
| `header_image_required` / `_format_not_supported` / `_size_too_large`, video and document twins | template element | the header file |
| `copy_code_button_code_value_required` / `_too_long` | template element | a copy-code button |
| `quick_reply_button_connection_required` | template element | a quick-reply button with nothing to continue in |
| `segment_set_is_invalid` | entry point | see `segmentErrors[]` for the `FilterErrCode` |
| `start_time_cannot_be_in_past` | scheduled | the first send is behind now |
| `weekdays_are_empty` / `every_n_days_is_empty` / `certain_dates_are_empty` | scheduled | the repeat has no days |
| `connection_required` | entry point | not connected to a message block |
| `no_payload` | — | **the module's own**, made by `lib/campaign.ts` when the flow has no template block at all |

```graphql
fragment Verdicts on BlockElement {
  errors {
    # plus __typename, which says which member each verdict is
    code
    message
    ... on WhatsAppTemplateParamValueRequiredError {
      paramName
    }
    ... on WhatsAppTemplateURLButtonParamValueRequiredError {
      buttonID
      paramName
    }
  }
}
```

Arming refuses silently while any stands; the one-time send refuses out loud
(`ComponentHasValidationErrors`).

`problemText(code, paramName)` is the sentence for a code — unknown codes print as they came,
underscores as spaces, because a gate nobody can see is worse than an ugly one. `problemArea(code)`
says which composer step a verdict belongs to: `message` for every template and parameter
code, `audience` for `segment_set_is_invalid`, `schedule` for the four time codes, `campaign`
for the rest. The composer's stepper marks a step with a verdict, and the review step lists
every standing verdict under its step with a link to it.

## Verdicts — on a parameter part

The third channel is one field: `TemplateStrAttribute.errCode` on a parameter value's part.
`AttributeIsNotAllowedForPlatform` there means the `{{name}}` in the value is an attribute
WhatsApp contacts never carry (Facebook's `first name`, for instance). It is not in the
element's `errors`, it does not stop arming, and the message goes out with the reference
unresolved — so the composer reads it (`refusedAttributes` in `lib/templatePreview.ts`) and
prints it beside the field as a problem of its own.

## Refusals — thrown

Through the router a subgraph's code sits at `errors[0].extensions.errors[0].extensions.code`
under a top-level "Failed to fetch from Subgraph" message; the api-client's
`nestedErrorCodes` reads it, and `errorMessage(err)` turns it into a sentence. Codes met here:

| Code | When |
|---|---|
| `WhatsAppOneTimeBroadcastAlreadyStarted` | send or segment on a one-time campaign that has started — `isAlreadySent` names it, and the store treats a send that answers it as done |
| `ScopeNotConnectedToBot` | send or arm with no WhatsApp number connected |
| `ComponentHasValidationErrors` | send with verdicts standing |
| `FlowGroupCanNotBeDeleted` | not sent by this module — it never deletes a group |
| `FileContentTypeNotSupported`, `FileTooBig`, `FileNameTooLong`, `FileNameFormatNotSupported` | header media |
| `NotEnoughPermissions` | a role without Flows: Edit |
| `Unauthorized` | the token was rejected |

**Bare `InternalServerError`** is what the flow builder answers for everything it has not
registered as a named code: a time setter while armed, `everyNDays` above 1000, more than 500
dates, `bot.flow` or `deleteFlow` on an id that is gone, `blockDisableEntryPoint` on a one-time
entry point, and `WhatsAppTemplateBlock.stats`. The module pre-validates the first three,
re-reads on the next two, and never sends the last two.

## Where each lands on screen

- A verdict prints beside the control it names (`attachErrors` keys it — `references/templates.md`),
  or above the form when it names nothing the form has.
- A thrown refusal prints as an `Alert` at the top of the view that ran the mutation, or as
  a toast for a background action; the campaign list's `Alert` is dismissable and the row
  stays as the last read left it.
- A read that fails — the list, the catalog, the bot facts — prints an `Alert` with "Try
  again" in place of the table.
