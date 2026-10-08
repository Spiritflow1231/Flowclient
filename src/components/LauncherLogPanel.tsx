import { useState } from 'react';
import { ChevronDown, ChevronUp, CircleAlert, ScrollText, X } from 'lucide-react';
import type { LauncherLogEntry, LauncherState } from '../types';

export function LauncherLogPanel({ state, entries, onClear, onStop }: {
  state: LauncherState;
  entries: LauncherLogEntry[];
  onClear: () => void;
  onStop: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  if (!entries.length && state.phase === 'ready') return null;
  return (
    <aside className={`launcher-log-panel ${expanded ? 'is-expanded' : ''}`} aria-label="Minecraft launcher log">
      <header className="launcher-log-header">
        <button className="launcher-log-toggle" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded}>
          {state.phase === 'error' ? <CircleAlert size={15} /> : <ScrollText size={15} />}
          <strong>{state.phase === 'running' ? 'Minecraft Running' : state.phase === 'ready' ? 'Launcher log' : state.phase[0].toUpperCase() + state.phase.slice(1)}</strong>
          <span>{state.message}</span>
          {state.processId && <code>PID {state.processId}</code>}
          {expanded ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
        </button>
        {state.phase === 'running' && <button className="launcher-stop-button" onClick={onStop}>Stop Minecraft</button>}
        <button className="launcher-log-clear" onClick={onClear} aria-label="Clear launcher log"><X size={14} /></button>
      </header>
      {expanded && <div className="launcher-log-entries" role="log" aria-live="polite">{entries.slice(-100).map((entry) => <div className={`launcher-log-entry ${entry.error ? 'is-error' : ''}`} key={entry.id}><span>{entry.phase.toUpperCase()}</span><p>{entry.message}</p></div>)}</div>}
    </aside>
  );
}
