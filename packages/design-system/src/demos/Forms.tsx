import { useRef, useState } from 'react';
import {
  Avatar,
  Button,
  Card,
  Checkbox,
  ChipInput,
  Combobox,
  DateField,
  Field,
  FileDrop,
  FilterRow,
  IconFile,
  IconImage,
  IconKanban,
  IconLayoutList,
  IconSparkles,
  Input,
  Label,
  RadioGroup,
  SegmentedControl,
  Select,
  Switch,
  Tag,
  Textarea,
} from '~ui';
import { Demo, Note, Row } from './shared';

const OWNERS = [
  { value: 'u1', label: 'Ada Lovelace', description: 'Admin' },
  { value: 'u2', label: 'Grace Hopper', description: 'Editor', keywords: ['navy', 'compiler'] },
  { value: 'u3', label: 'Alan Turing', description: 'Editor' },
  { value: 'u4', label: 'Katherine Johnson', description: 'Viewer' },
  { value: 'ai', label: 'Fuely AI', description: 'Automation', keywords: ['bot', 'assistant'] },
];

export function FormsSection() {
  const [fieldValue, setFieldValue] = useState('Support bot');
  const [selectValue, setSelectValue] = useState('whatsapp');
  const [switchOn, setSwitchOn] = useState(true);
  const [checked, setChecked] = useState<boolean | 'indeterminate'>('indeterminate');
  const [radio, setRadio] = useState('any');
  const [view, setView] = useState('board');
  const [density, setDensity] = useState('cozy');
  const [owner, setOwner] = useState<string | null>('u2');
  const [note, setNote] = useState('');
  const [closeDate, setCloseDate] = useState<string | null>(null);
  const [dropped, setDropped] = useState<string | null>(null);
  const tilePicker = useRef<(() => void) | null>(null);
  const [keywords, setKeywords] = useState<string[]>(['sale', 'promo', 'Black Friday']);
  const [refLinks, setRefLinks] = useState<string[]>(['spring-2026', 'ig-bio']);
  const [people, setPeople] = useState<string[]>(['Ada Lovelace', 'Grace Hopper']);

  return (
    <div className="space-y-4">
      <Demo name="Input · Field" tokens="bg-surface-sunken · border-border · focus-ring · danger validation">
        <div className="grid max-w-lg gap-2">
          <Input placeholder="Search contacts…" />
          <Input defaultValue="Filled value" />
          <Input placeholder="Disabled" disabled />
        </div>
        <div className="mt-4 max-w-lg space-y-3">
          <Field
            label="Bot name"
            value={fieldValue}
            onSave={async (next) => setFieldValue(next)}
            validate={(v) => (v.trim() ? null : 'Name is required')}
          />
        </div>
      </Demo>

      <Demo name="Label · Textarea" tokens="text-muted label · danger required marker · auto-grow">
        <div className="max-w-lg space-y-4">
          <div>
            <Label htmlFor="demo-note" required hint="Visible to your team only">
              Internal note
            </Label>
            <div className="mt-1">
              <Textarea
                id="demo-note"
                autoGrow
                rows={2}
                maxRows={8}
                maxLength={280}
                showCount
                value={note}
                placeholder="Type a few lines and watch it grow…"
                onChange={(event) => setNote(event.target.value)}
              />
            </div>
          </div>
          <Textarea rows={3} placeholder="Fixed height, resizable by the user" />
        </div>
      </Demo>

      <Demo name="Select · Switch" tokens="native select + color-scheme · bg-accent track · control-knob thumb">
        <Row label="Select">
          <Select
            value={selectValue}
            onChange={setSelectValue}
            options={[
              { value: 'whatsapp', label: 'WhatsApp' },
              { value: 'instagram', label: 'Instagram' },
              { value: 'messenger', label: 'Messenger' },
            ]}
          />
          <Select value="" onChange={() => {}} options={[]} placeholder="Empty" disabled />
        </Row>
        <Row label="Switch">
          <Switch checked={switchOn} onChange={setSwitchOn} label="AI replies" />
          <Switch checked={false} onChange={() => {}} label="Off" />
          <Switch checked disabled onChange={() => {}} label="Disabled" />
        </Row>
        <Row label="Label-less">
          {/* The settings-row shape: the name is the row's own text on the
              left, the switch sits at the right edge, and `aria-label` gives
              the control the name the visible text already spells out. */}
          <span className="flex w-56 items-center justify-between rounded-control border border-border px-3 py-2">
            <span className="text-sm text-text">Notifications</span>
            <Switch checked={switchOn} onChange={setSwitchOn} aria-label="Notifications" />
          </span>
        </Row>
        <Note>
          The text beside a switch is its accessible name and clicking it toggles — the track and the text share one{' '}
          <code className="font-mono text-micro">&lt;label&gt;</code>. When the name is already on screen elsewhere,
          pass <code className="font-mono text-micro">aria-label</code> instead.
        </Note>
      </Demo>

      <Demo name="Checkbox" tokens="bg-accent · IconMinus indeterminate · peer focus-ring">
        <Note>
          A real <code className="font-mono text-micro">&lt;input type=&quot;checkbox&quot;&gt;</code> under a drawn box
          — form participation, native indeterminate semantics and Space handling come free. onChange forwards the click
          event, because a table needs <code className="font-mono text-micro">shiftKey</code> to extend a range and
          React&apos;s change event does not carry modifiers.
        </Note>
        <Row>
          <Checkbox checked={checked} onChange={(next) => setChecked(next)} label="Select all" />
          <Checkbox checked onChange={() => {}} label="Checked" />
          <Checkbox checked={false} onChange={() => {}} label="Unchecked" />
          <Checkbox checked disabled onChange={() => {}} label="Disabled" />
        </Row>
      </Demo>

      <Demo name="RadioGroup" tokens="native radios · border-accent · ease-spring dot">
        <Note>
          No roving tabindex here: a radio group already is one Tab stop with arrow keys inside it, natively, in every
          browser.
        </Note>
        <div className="grid gap-6 sm:grid-cols-2">
          <RadioGroup
            legend="Assignee"
            value={radio}
            onChange={setRadio}
            options={[
              { value: 'any', label: 'Anyone' },
              { value: 'me', label: 'Me', description: 'Deals you own' },
              { value: 'unassigned', label: 'Unassigned' },
              { value: 'ai', label: 'Fuely AI', disabled: true },
            ]}
          />
          <RadioGroup
            legend="Orientation: horizontal"
            orientation="horizontal"
            value={radio}
            onChange={setRadio}
            options={[
              { value: 'any', label: 'Anyone' },
              { value: 'me', label: 'Me' },
              { value: 'unassigned', label: 'Unassigned' },
            ]}
          />
        </div>
      </Demo>

      <Demo name="SegmentedControl" tokens="surface-sunken track · surface-raised pill · transition-[left,width]">
        <Note>
          The selected state is one pill that slides, not a per-button background — switching reads as a single object
          moving instead of two things cross-fading.
        </Note>
        <Row label="views">
          <SegmentedControl
            aria-label="View"
            value={view}
            onChange={setView}
            options={[
              { value: 'board', label: 'Board', icon: <IconKanban size={14} /> },
              { value: 'table', label: 'Table', icon: <IconLayoutList size={14} /> },
              { value: 'forecast', label: 'Forecast', icon: <IconSparkles size={14} /> },
            ]}
          />
        </Row>
        <Row label="small">
          <SegmentedControl
            aria-label="Density"
            size="sm"
            value={density}
            onChange={setDensity}
            options={[
              { value: 'compact', label: 'Compact' },
              { value: 'cozy', label: 'Cozy' },
              { value: 'comfortable', label: 'Comfortable' },
            ]}
          />
        </Row>
        <Row label="icon only">
          <SegmentedControl
            aria-label="Layout"
            iconOnly
            value={view}
            onChange={setView}
            options={[
              { value: 'board', label: 'Board', icon: <IconKanban size={16} /> },
              { value: 'table', label: 'Table', icon: <IconLayoutList size={16} /> },
            ]}
          />
        </Row>
      </Demo>

      <Demo name="Combobox" tokens="aria-activedescendant · matchAnchorWidth · accent highlight">
        <Note>
          Focus never leaves the input; the highlighted row is marked with{' '}
          <code className="font-mono text-micro">aria-activedescendant</code>. Moving real focus onto the options would
          blur the input on every keystroke. Try typing <b>hop</b> or <b>navy</b> — the second matches a hidden keyword,
          so nothing is highlighted in the label.
        </Note>
        <div className="grid max-w-2xl gap-3 sm:grid-cols-2">
          <Combobox
            aria-label="Owner"
            value={owner}
            onChange={setOwner}
            options={OWNERS}
            clearable
            placeholder="Any owner"
          />
          <Combobox
            aria-label="Creatable"
            value={null}
            onChange={() => {}}
            options={OWNERS}
            onCreate={() => {}}
            placeholder="Type to create a tag…"
          />
          <Combobox aria-label="Loading" value={null} onChange={() => {}} options={[]} loading />
          <Combobox aria-label="Disabled" value={null} onChange={() => {}} options={[]} disabled />
        </div>
      </Demo>

      <GroupedComboboxDemo />

      <Demo name="DateField" tokens="native input[type=date] · DropdownMenu presets · Button iconOnly outline">
        <Note>
          No hand-rolled calendar. The native control brings locale formatting, the platform picker on mobile and
          keyboard stepping; the presets are the part it genuinely lacks. The presets button is{' '}
          <code>Button iconOnly variant=&quot;outline&quot;</code> — outline rather than ghost because it stands beside
          a bordered input at the same height, and a borderless square there reads as a stray icon. The Combobox&apos;s
          clear, the <code>MenuButton</code> and the ActionBar&apos;s clear are the ghost one; none of the four is a
          hand-rolled <code>&lt;button&gt;</code> any more.
        </Note>
        <Row label="close date">
          <DateField aria-label="Close date" value={closeDate} onChange={setCloseDate} />
          <span className="text-xs tabular-nums text-text-muted">{closeDate ?? 'not set'}</span>
        </Row>
        <Row label="no presets">
          <DateField aria-label="Plain" value={closeDate} onChange={setCloseDate} presets={false} />
        </Row>
      </Demo>

      <Demo name="FileDrop" tokens="border-dashed border-strong · accent-soft while over">
        <Note>
          Three ways in, because people arrive three ways: dragging from a folder, clicking because the drag did not
          register, and pasting a screenshot. It is a real <code className="font-mono">&lt;button&gt;</code>, so it is
          in the tab order and opens the picker on Enter and Space with no key handling of its own. The highlight is
          driven by a drag COUNTER, not a boolean: dragging over a child fires{' '}
          <code className="font-mono">dragleave</code> on the parent, and a boolean flickers off on every inner edge.
        </Note>
        <div className="grid max-w-2xl grid-cols-1 gap-4 @compact:grid-cols-2">
          <FileDrop
            label="Drop a CSV, or click to pick one"
            hint={dropped ? `Last: ${dropped}` : 'CSV, TSV, TXT or Markdown, up to 2 MB'}
            accept=".csv,.tsv,.txt,.md"
            icon={<IconFile size={20} />}
            onFiles={(files) => setDropped(files.map((file) => file.name).join(', '))}
          />
          <FileDrop
            label="Photos"
            hint="PNG or JPEG, up to 8"
            accept="image/*"
            multiple
            icon={<IconImage size={20} />}
            onFiles={() => {}}
          />
          <FileDrop label="Uploading" hint="Two of five done" busy onFiles={() => {}} />
          <FileDrop label="Read-only" hint="You do not have permission to upload here" disabled onFiles={() => {}} />
        </div>
        <Note>
          <code className="font-mono">layout=&quot;row&quot;</code> costs a control&apos;s height instead of a
          target&apos;s, for a zone standing among other controls rather than owning a page.{' '}
          <code className="font-mono">actions</code> turns it from a button into a region and hands the caller the file
          picker: a button cannot contain buttons, so where a zone needs controls of its own the whole surface stops
          being the click target and opening the picker becomes one control&apos;s job among them. Dropping and pasting
          still work across the whole surface.
        </Note>
        <div className="max-w-2xl">
          <FileDrop
            layout="row"
            label="Add a photo"
            accept="image/*"
            multiple
            icon={<IconImage size={20} />}
            onFiles={(files) => setDropped(files.map((file) => file.name).join(', '))}
            actions={(open) => (
              <>
                <Button variant="secondary" size="sm" onClick={open}>
                  Upload
                </Button>
                <Button variant="secondary" size="sm">
                  Paste URL
                </Button>
                <Button variant="secondary" size="sm">
                  Library
                </Button>
              </>
            )}
          />
        </div>
        <Note>
          <code className="font-mono">layout=&quot;tile&quot;</code> is the stacked shape with no width and no padding
          of its own, for a zone standing IN a strip of thumbnails rather than above one. The strip decides how big a
          slot is, so the caller sizes it and the zone fills that square exactly — which is what makes it read as one
          more slot in the row instead of a control parked beside it. <code className="font-mono">openRef</code> hands
          the picker out to a control somewhere else: a toolbar button and a drop tile are two doors into one action,
          and the alternative is a second hidden <code className="font-mono">&lt;input type=&quot;file&quot;&gt;</code>{' '}
          in the caller.
        </Note>
        <div className="flex items-start gap-3">
          <div className="h-36 w-36 shrink-0 overflow-hidden rounded-card border border-border bg-surface-sunken" />
          <FileDrop
            layout="tile"
            className="h-36 w-36 shrink-0"
            accept="image/*"
            openRef={tilePicker}
            icon={<IconImage size={20} />}
            label="Drag & drop"
            hint={
              <>
                or <span className="text-accent">select a file</span>
              </>
            }
            onFiles={(files) => setDropped(files.map((file) => file.name).join(', '))}
          />
          <Button variant="ghost" iconOnly aria-label="Upload a file" onClick={() => tilePicker.current?.()}>
            <IconImage />
          </Button>
        </div>
      </Demo>

      <Demo name="Textarea in a card" tokens="bare · fill · Card fill + footer">
        <Note>
          <code className="font-mono">bare</code> drops the box&apos;s own frame, because a bordered field inside a
          bordered card is two frames around one thing — the card then owns the focus signal with{' '}
          <code className="font-mono">focus-within:border-accent</code>, so there is one ring rather than a ring inside
          a ring. <code className="font-mono">fill</code> is the opposite question from{' '}
          <code className="font-mono">autoGrow</code>: it asks the layout how tall the box should be instead of the
          content, which is what a box filling a column wants. <code className="font-mono">Card fill</code> hands the
          card&apos;s spare height to its body and leaves the footer rule where it is.
        </Note>
        <div className="flex h-64 max-w-md">
          <Card
            fill
            padded={false}
            className="min-h-0 flex-1 transition-colors duration-fast ease-standard focus-within:border-accent"
            footer={
              <>
                <span className="min-w-0 flex-1" />
                <span className="shrink-0 text-micro tabular-nums text-text-faint">{note.length} / 2200</span>
              </>
            }
          >
            <Textarea
              bare
              fill
              value={note}
              onChange={(event) => setNote(event.target.value)}
              aria-label="Caption"
              placeholder="Write a caption"
              className="px-3.5 py-3 text-sm leading-relaxed"
            />
          </Card>
        </div>
      </Demo>

      <Demo
        name="ChipInput"
        tokens="surface-sunken chips · focus-within border-accent · text-danger message · motion-safe shake"
      >
        <Note>
          One Tab stop: the draft box. Enter or a comma commits; a paste with commas or newlines commits every piece,
          and an over-limit batch keeps the first that fit and says why the rest did not. ← from the caret&apos;s start
          (or Backspace on an empty draft) walks onto the chips, → past the last one comes back; Backspace / Delete on a
          chip removes it. A refused draft stays in the box to be fixed. Try pasting{' '}
          <code className="font-mono text-micro">summer, SALE, a keyword that is far too long, autumn, winter</code>{' '}
          into the first one.
        </Note>
        <div className="grid max-w-3xl gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="demo-keywords" hint="Up to 5, 12 characters each">
              Keywords
            </Label>
            <div className="mt-1">
              <ChipInput
                id="demo-keywords"
                aria-label="Keywords"
                value={keywords}
                onChange={setKeywords}
                maxItems={5}
                maxLength={12}
                placeholder="Add a keyword…"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="demo-ref-links" hint="No spaces — a ref link is a URL fragment">
              Ref links
            </Label>
            <div className="mt-1">
              <ChipInput
                id="demo-ref-links"
                aria-label="Ref links"
                value={refLinks}
                onChange={setRefLinks}
                chipTone="accent"
                normalize={(item) => item.trim().toLowerCase()}
                validate={(item) => (/\s/.test(item) ? 'No spaces in a ref link' : null)}
                placeholder="ref-link"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="demo-chips-invalid">Invalid</Label>
            <div className="mt-1">
              <ChipInput
                id="demo-chips-invalid"
                aria-label="Invalid"
                value={['one']}
                onChange={() => {}}
                invalid
                placeholder="The danger edge is the caller's; the message is too"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="demo-chips-disabled">Disabled</Label>
            <div className="mt-1">
              <ChipInput
                id="demo-chips-disabled"
                aria-label="Disabled"
                value={['sale', 'promo']}
                onChange={() => {}}
                disabled
              />
            </div>
          </div>
          <div>
            <Label htmlFor="demo-chips-people" hint="renderChip: an Avatar beside the name">
              People
            </Label>
            <div className="mt-1">
              <ChipInput
                id="demo-chips-people"
                aria-label="People"
                value={people}
                onChange={setPeople}
                renderChip={(name) => (
                  <span className="inline-flex items-center gap-1.5">
                    <Avatar name={name} size={16} />
                    {name}
                  </span>
                )}
                placeholder="Add a person…"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="demo-chips-sm">Small · read-only</Label>
            <div className="mt-1 space-y-2">
              <ChipInput
                id="demo-chips-sm"
                aria-label="Small"
                size="sm"
                value={keywords}
                onChange={setKeywords}
                maxItems={5}
                placeholder="sm"
              />
              <ChipInput aria-label="Read-only" size="sm" value={refLinks} onChange={() => {}} readOnly />
            </div>
          </div>
        </div>
      </Demo>

      <FilterRowDemo />
    </div>
  );
}

/**
 * The layout shell of one filter condition, with no filter semantics in it at
 * all. Drag the box narrower: the slots wrap, they do not shrink to unusable
 * widths, and the remove button stays with the row rather than floating off to
 * the right edge of a line it no longer belongs to.
 */
function FilterRowDemo() {
  const [width, setWidth] = useState(720);
  const [conditions, setConditions] = useState([
    { id: 'c1', field: 'city', operator: 'is', value: 'Berlin' },
    { id: 'c2', field: 'email', operator: 'contains', value: '@acme.com' },
    { id: 'c3', field: 'last_seen', operator: 'is set', value: null as string | null },
  ]);

  return (
    <Demo name="FilterRow" tokens="flex-wrap · basis-40/28/56 · layout only">
      <Note>
        Layout only — it knows nothing about operators, types or what a valid condition is. That separation is what
        keeps one row shared between the filter popover, the saved-view editor and the segment preview instead of three
        that drift. Wrapping is intrinsic rather than a breakpoint: a filter row appears in a 900px panel and in a 320px
        popover, and neither of those is the viewport. The third condition has no value slot, because &ldquo;is
        set&rdquo; takes nothing and an empty box beside it would look broken.
      </Note>
      <Row label="width">
        <input
          type="range"
          min={280}
          max={860}
          value={width}
          onChange={(event) => setWidth(Number(event.target.value))}
          aria-label="Container width"
          className="w-48"
        />
        <span className="tabular-nums text-xs text-text-muted">{width}px</span>
      </Row>
      <div
        style={{ width }}
        className="mt-3 space-y-2 overflow-hidden rounded-card border border-dashed border-border p-3"
      >
        {conditions.map((condition, index) => (
          <FilterRow
            key={condition.id}
            badge={
              index === 0 ? (
                <span className="w-10 text-right text-xs text-text-faint">Where</span>
              ) : (
                <span className="w-10 text-right text-xs font-medium text-accent">and</span>
              )
            }
            field={
              <Select
                aria-label="Field"
                value={condition.field}
                onChange={() => {}}
                className="w-full"
                options={[
                  { value: 'city', label: 'City' },
                  { value: 'email', label: 'Email' },
                  { value: 'last_seen', label: 'Last seen' },
                ]}
              />
            }
            operator={
              <Select
                aria-label="Operator"
                value={condition.operator}
                onChange={() => {}}
                className="w-full"
                options={[
                  { value: 'is', label: 'is' },
                  { value: 'contains', label: 'contains' },
                  { value: 'is set', label: 'is set' },
                ]}
              />
            }
            value={condition.value === null ? undefined : <Input aria-label="Value" defaultValue={condition.value} />}
            removeLabel={`Remove ${condition.field} condition`}
            onRemove={() => setConditions((prev) => prev.filter((each) => each.id !== condition.id))}
          />
        ))}
        {conditions.length === 0 ? (
          <p className="text-xs text-text-muted">Every contact matches — no conditions left.</p>
        ) : null}

        {/* The two remaining slots, on a row that carries both: `meta` for
            something the condition needs to SAY — here the count it matches —
            and `disabled` for a condition that is present but not currently in
            force, which greys the row and locks its remove button rather than
            hiding it. */}
        <FilterRow
          badge={<span className="w-10 text-right text-xs font-medium text-accent">and</span>}
          field={
            <Select
              aria-label="Field"
              value="tag"
              onChange={() => {}}
              className="w-full"
              options={[{ value: 'tag', label: 'Tag' }]}
            />
          }
          operator={
            <Select
              aria-label="Operator"
              value="is"
              onChange={() => {}}
              className="w-full"
              options={[{ value: 'is', label: 'is' }]}
            />
          }
          value={<Input aria-label="Value" defaultValue="VIP" disabled />}
          meta={<Tag tone="warning">byTag fails live</Tag>}
          disabled
          removeLabel="Remove tag condition"
          onRemove={() => {}}
        />
      </div>
    </Demo>
  );
}

/**
 * The attribute picker the contacts filter builder needs: a bot's custom
 * attributes and the record's own fields in one list, told apart.
 *
 * Grouping is a property of the OPTIONS, not a `sections` prop, because the
 * list is filtered — a section array would have to be rebuilt on every
 * keystroke, and a category the query emptied would leave its header standing
 * over nothing.
 */
function GroupedComboboxDemo() {
  const [field, setField] = useState<string | null>('city');

  return (
    <Demo name="Combobox · groups" tokens="role=group · aria-labelledby · text-micro uppercase header">
      <Note>
        Headers are outside the index the arrow keys walk: they cannot be highlighted, chosen or landed on, and{' '}
        <code className="font-mono text-micro">aria-activedescendant</code> still counts options only. Options that
        declare no group come first with no header of their own — inventing &ldquo;Other&rdquo; for them would name a
        category the caller did not. The header is not searched either: type <b>custom</b> and you get the attribute
        called <code className="font-mono text-micro">custom_score</code>, not everything filed under Custom fields.
        Type <b>plan</b> and the System fields header disappears with its options rather than standing over nothing.
      </Note>
      <div className="grid max-w-2xl gap-3 sm:grid-cols-2">
        <Combobox
          aria-label="Field"
          value={field}
          onChange={setField}
          placeholder="Pick a field…"
          options={[
            { value: 'name', label: 'Name' },
            { value: 'email', label: 'Email' },
            { value: 'city', label: 'City', group: 'Custom fields', description: '7 contacts' },
            { value: 'plan', label: 'Plan', group: 'Custom fields', description: '44 contacts' },
            {
              value: 'custom_score',
              label: 'custom_score',
              group: 'Custom fields',
              description: '12 contacts',
            },
            { value: 'last_seen', label: 'Last seen', group: 'System fields' },
            { value: 'locale', label: 'Locale', group: 'System fields' },
            {
              value: 'source',
              label: 'Source',
              group: 'System fields',
              disabled: true,
              description: 'Not filterable on this API',
            },
          ]}
        />
        <Combobox
          aria-label="Every option grouped"
          value={null}
          onChange={() => {}}
          placeholder="No ungrouped run…"
          options={[
            { value: 'wa', label: 'WhatsApp', group: 'Channels' },
            { value: 'ig', label: 'Instagram', group: 'Channels' },
            { value: 'de', label: 'Germany', group: 'Countries' },
            { value: 'uk', label: 'United Kingdom', group: 'Countries' },
          ]}
        />
      </div>
    </Demo>
  );
}
