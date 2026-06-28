import { useEffect, useState } from 'react';
import type { Inquiry } from '../lib/api';

export const PIPELINE_STATUSES = ['New', 'Contacted', 'Qualified', 'Booked', 'Closed'] as const;
export type PipelineStatus = (typeof PIPELINE_STATUSES)[number];

const STATUS_STYLE: Record<string, { bg: string; border: string; color: string }> = {
  New: { bg: 'rgba(96,165,250,0.12)', border: 'rgba(96,165,250,0.35)', color: '#93c5fd' },
  Contacted: { bg: 'rgba(197,162,111,0.12)', border: 'rgba(197,162,111,0.35)', color: 'var(--wf-gold)' },
  Qualified: { bg: 'rgba(168,85,247,0.12)', border: 'rgba(168,85,247,0.35)', color: '#c4b5fd' },
  Booked: { bg: 'rgba(52,211,153,0.12)', border: 'rgba(52,211,153,0.35)', color: '#6ee7b7' },
  Closed: { bg: 'rgba(161,161,170,0.12)', border: 'rgba(161,161,170,0.3)', color: '#a1a1aa' },
};

export function statusStyle(status: string) {
  return STATUS_STYLE[status] || STATUS_STYLE.New;
}

type StatusSelectProps = {
  value: string;
  disabled?: boolean;
  onChange: (status: string) => void;
};

export function InquiryStatusSelect({ value, disabled, onChange }: StatusSelectProps) {
  const style = statusStyle(value);
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className="wf-input-dark wf-input-compact wf-status-select"
      style={{
        minWidth: 118,
        fontSize: '0.8rem',
        fontWeight: 600,
        background: style.bg,
        borderColor: style.border,
        color: style.color,
      }}
    >
      {PIPELINE_STATUSES.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  );
}

type NotesFieldProps = {
  inquiry: Inquiry;
  disabled?: boolean;
  onSave: (inq: Inquiry, notes: string) => Promise<void>;
};

export function InquiryNotesField({ inquiry, disabled, onSave }: NotesFieldProps) {
  const [value, setValue] = useState(inquiry.notes || '');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'dirty'>('idle');

  useEffect(() => {
    setValue(inquiry.notes || '');
    setSaveState('idle');
  }, [inquiry.id, inquiry.notes]);

  const isDirty = (value.trim() || null) !== (inquiry.notes || null);

  async function save() {
    if (!isDirty) return;
    setSaveState('saving');
    try {
      await onSave(inquiry, value);
      setSaveState('saved');
      window.setTimeout(() => setSaveState('idle'), 2000);
    } catch {
      setSaveState('dirty');
    }
  }

  return (
    <div className="wf-notes-field">
      <textarea
        value={value}
        disabled={disabled}
        rows={2}
        placeholder="Internal notes — team only"
        className="wf-input-dark wf-notes-inline"
        onChange={(e) => {
          setValue(e.target.value);
          setSaveState('dirty');
        }}
        onBlur={() => void save()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            void save();
          }
        }}
      />
      <div className="wf-notes-field-footer">
        {saveState === 'saving' ? (
          <span className="wf-notes-hint">Saving…</span>
        ) : saveState === 'saved' ? (
          <span className="wf-notes-hint wf-notes-hint--saved">Saved</span>
        ) : isDirty ? (
          <button type="button" className="wf-notes-save-btn" disabled={disabled} onClick={() => void save()}>
            Save note
          </button>
        ) : (
          <span className="wf-notes-hint">Autosaves on blur</span>
        )}
      </div>
    </div>
  );
}
