# Templates

## The catalog

`bot.whatsAppTemplates(first, after, before)` — the paging arguments are accepted and ignored;
the server answers every template the bot's number has, `hasNextPage: false`, `endCursor:
null`. No server-side filter. Each row: `id, name, status, language, category, header, body,
footer, buttons` and three support flags. For a campaign the flag that matters is
`IsSupportedInFlowbuilder` — a campaign is a flow — and the status that matters is `Approved`.
Every other status stays in the catalog with its badge: Pending, InAppeal, Rejected,
PendingDeletion, Deleted, Disabled, Paused, LimitExceeded, Archived. There is no rejection
reason in the API.

```graphql
query ($botID: BotID!) {
  bot(id: $botID) {
    whatsAppTemplates(first: 100) {
      edges {
        node {
          id
          name
          status
          language
          category
          IsSupportedInFlowbuilder
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
}
```

`sendableTemplates` in `lib/templatePreview.ts` is the composer's filter: `Approved` and
`IsSupportedInFlowbuilder`, nothing else. The catalog tab (`views/TemplatesView.tsx`) shows
every row regardless, and the picker searches `templateSearchTexts` — the name, the body,
the category, the language and a text header.

A template's text is not a string. Header, body and footer are lists of parts, each either
literal text or a named parameter (`"1"`, `"2"` — Meta's positional names) whose value is
itself a `TemplateStr` of text parts and attribute references. `lib/templatePreview.ts` renders
the parts to one string with unfilled parameters shown as `{{1}}`.

```graphql
fragment Text on WhatsAppTemplateComponentText {
  text {
    # plus __typename on every part
    ... on WhatsAppTemplateComponentTextPartText {
      text
    }
    ... on WhatsAppTemplateComponentTextPartParam {
      name
      value {
        parts {
          # plus __typename
          ... on TemplateStrText {
            text
          }
          ... on TemplateStrAttribute {
            attribute {
              name
            }
            errCode
          }
        }
      }
    }
  }
}
```

## A bot with no number

`bot.whatsAppTemplates` on a bot with no WhatsApp number connected answers a bare
`InternalServerError` from the template service — not an empty list. The module reads
`bot.contactScopes` first (`BroadcastBot`) and asks for the catalog only once a
`WhatsAppPhoneContactScope` is there; until then the campaign list, the catalog and the
composer's message step all show the connect state, with a way into the channels module
when the deployment has it. Nothing about the missing number is printed as an error.

## Nothing here writes a template

No mutation creates, edits, submits, syncs or deletes a Meta template. They are written in
WhatsApp Manager — `https://business.facebook.com/wa/manage/home/?waba_id=<WABA>&business_id=<FB
business>`, both ids from `bot.contactScopes → WhatsAppPhoneContactScope.phone.whatsAppBusinessAccount
{ id facebookBusiness { id } }` (`whatsAppManagerUrl` in `lib/waManager.ts`) — and read here.
`whatsAppEntitiesStartRefetch` asks the server to look at Meta sooner; it answers `true` at
once, and the catalog is re-read a few seconds later (`refetchFromMeta` in
`hooks/useWhatsAppTemplates.ts`, reachable from the catalog toolbar and from the palette).

## Filling one on a campaign

`whatsAppTemplateSetTemplate(blockElementID, templateID)` attaches a template to the payload
element; the answer is the whole block, whose element now carries `whatsAppTemplate` (a
`WhatsAppTemplateConfig`: the template's shape with a value on every parameter) and `errors`
naming every blank: `body_text_param_value_required` with `paramName: "1"`, and so on. A
template that is not Approved is never offered by the composer; should a draft carry one
anyway (picked elsewhere, or approval withdrawn), the module raises its own verdict
`TemplateNotAllowedForProcessing` on the message step — the server has no such code.

Setters, all keyed by the payload element id and all answering the block:
`whatsAppTemplateSet{Header,Body,Footer}TextParamValue(name, value)`,
`whatsAppTemplateSetHeader{Image,Video}File(fileID)`,
`whatsAppTemplateSetHeaderDocumentFile(fileID, fileName)`,
`whatsAppTemplateSetURLButtonTextParamValue(buttonID, name, value)`,
`whatsAppTemplateSetCopyCodeButtonCodeValue(buttonID, codeValue)`.
`whatsAppTemplateDeleteTemplate` clears it — kept as `BroadcastClearTemplate` for a host that
wants a "remove message" action; the shipped composer replaces a template rather than clearing it.

### The blanks, by key

`templateFields` in `lib/templatePreview.ts` walks a template's four components and answers
one field per blank, in reading order. Each field has a **key**, and the key is what the
form, the fill store and the error mapping agree on:

| Key | Blank | Setter |
|---|---|---|
| `header:<name>` — `header:1` | a text header's parameter | `whatsAppTemplateSetHeaderTextParamValue(name, value)` |
| `header:file` | an image, video or document header | `whatsAppTemplateSetHeaderImageFile` / `VideoFile` / `DocumentFile` after the upload |
| `body:<name>` — `body:1`, `body:2` | a body parameter | `whatsAppTemplateSetBodyTextParamValue(name, value)` |
| `footer:<name>` | a footer parameter | `whatsAppTemplateSetFooterTextParamValue(name, value)` |
| `button:<buttonID>:<name>` | a URL button's parameter | `whatsAppTemplateSetURLButtonTextParamValue(buttonID, name, value)` |
| `code:<buttonID>` | a copy-code button's code | `whatsAppTemplateSetCopyCodeButtonCodeValue(buttonID, codeValue)` |

`<name>` is the parameter's own name from the template (`"1"`, `"2"`), `<buttonID>` the
button's `id` from `WhatsAppTemplateURLButton` or `WhatsAppTemplateCopyCodeButton`. The same
`{{1}}` can appear twice in a body; it is one parameter and one field. The composer's fill
store (`lib/templateFillStore.ts`) keeps a draft value and an in-flight flag per key, and
`attachErrors` puts each server verdict beside its key — a
`WhatsAppTemplateParamValueRequiredError` is routed by its code's prefix (`header_`, `body_`,
`footer_`) plus `paramName`; a `WhatsAppTemplateURLButtonParamValueRequiredError` by
`buttonID` plus `paramName`; a header-file verdict (`header_image_required`,
`header_video_size_too_large`, …) to `header:file`. A verdict that names no field the form
has is printed above the form rather than dropped.

The form label for a key is `fieldLabel`: "Body {{1}}", "“Shop now” link {{1}}", "“Copy”
code", "Header image".

### Personalisation

A value is a string, and `{{Attribute name}}` inside it becomes a `TemplateStrAttribute` part
on the server — personalisation. Two things observed:

- `{{first name}}` on a WhatsApp campaign came back with `errCode:
  "AttributeIsNotAllowedForPlatform"` on the part: that attribute is Facebook's. Offer only
  `bot.botAttributes(platforms: [whatsapp])` names.
- `{{no such attr}}` was accepted with no error, and **a custom attribute of that name now
  exists on the bot**. Never let a free-typed name reach the value.

So the composer's "Insert field" picker (`hooks/useParamAttributes.ts`, over
`BroadcastAttributes`) inserts a catalog name at the caret and nothing else; free text in the
field stays free text, braces included. Reading back, `strText` renders an attribute part as
`{{name}}` again and `refusedAttributes` lists the parts whose `errCode` is set, which the
form prints as a problem beside the field.

```graphql
query ($botID: BotID!) {
  bot(id: $botID) {
    botAttributes(
      locale: En
      platforms: [whatsapp]
      attributeTypes: [system, custom]
      filters: []
      orderBy: { orderBy: ContactsCount, direction: Desc }
      first: 100
    ) {
      edges {
        node {
          botAttribute {
            name
            type
            dataType
          }
          usersCount
        }
      }
    }
  }
}
```

### Header media

Two steps: upload the file with the core skill's file upload
(`../chatfuel-core/references/files-tasks.md`; in the app, `client.uploadFile(botId, file,
'Image' | 'Video' | 'Document')`), then the matching `SetHeader*File` with the `File.id`.
Thrown refusals: `FileContentTypeNotSupported`, `FileTooBig`, and for documents
`FileNameTooLong`, `FileNameFormatNotSupported`. Limits Meta applies: image 4 MB JPEG/PNG,
video 15 MB MP4/3GP, document 15 MB PDF. Text budgets Meta applies: header 60 characters,
body 1024, a URL 2083, a copy code 15 — the server's verdicts (`copy_code_button_code_value_too_long`
and the `header_*_size_too_large` family) are the gate; the composer prints them and does not
pre-empt them.
