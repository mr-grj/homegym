const keys: [string, string][] = [
  ['Space · Enter', 'Start · pause'],
  ['→  ←', 'Next · previous step'],
  ['↑  ↓', '+1 · −1 minute'],
  ['Esc', 'Stop and log'],
  ['T', 'Remaining ↔ elapsed'],
  ['S · V', 'Sound · voice'],
  ['F', 'Fullscreen'],
  ['E', 'Edit current routine'],
  ['H', 'History'],
  ['U', 'Undo'],
  ['M', 'Play · pause music'],
  ['[  ]', 'Previous · next track'],
  ['⌘V', 'Paste a YouTube link → music'],
  ['/', 'Focus the input'],
  ['⌘⏎ · ⌘⇧⏎', 'Editor: save · save as new'],
]

const quick: [string, string][] = [
  ['25m  ·  25', '25 minute countdown'],
  ['1:30  ·  90s', '90 second countdown'],
  ['1h 15m deep work', 'Labelled countdown'],
  ['⏎ on empty', 'Stopwatch'],
  ['ant…', 'Open a routine by name'],
]

const syntax = `# Title
## Block name ×2
Exercise 45s
> short note shown under the timer
~ Rest 15s`

export function Help() {
  return (
    <div className="help">
      <header className="sheet-head">
        <h2>Shortcuts</h2>
      </header>
      <div className="help-grid">
        <dl>
          {keys.map(([k, v]) => (
            <div key={k}>
              <dt>
                <kbd>{k}</kbd>
              </dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
        <div>
          <h4>Type a timer</h4>
          <dl>
            {quick.map(([k, v]) => (
              <div key={k}>
                <dt>
                  <kbd>{k}</kbd>
                </dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
          <h4>Routine format</h4>
          <pre>{syntax}</pre>
        </div>
      </div>
    </div>
  )
}
