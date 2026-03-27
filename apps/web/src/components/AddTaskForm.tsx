import { useState } from 'react';
import { supportedManualTaskTypes } from '../lib/taskConfig';
import type { NewTaskInput, TaskType } from '../lib/types';

interface AddTaskFormProps {
  error?: string | null;
  loading?: boolean;
  onAdd: (input: NewTaskInput) => Promise<boolean>;
}

const defaultInput: NewTaskInput = {
  title: '',
  description: '',
  type: 'seo_audit',
  impact: 6,
  effort: 6,
  confidence: 5,
  goal_fit: 6,
  owner_type: 'agent',
};

export function AddTaskForm({ error, loading, onAdd }: AddTaskFormProps) {
  const [input, setInput] = useState<NewTaskInput>(defaultInput);

  return (
    <details className="rail-card rail-details add-task-shell">
      <summary className="rail-details-summary">
        <div>
          <p className="eyebrow">Founder override</p>
          <h2>Queue manual work</h2>
          <p className="panel-copy">Add work the founder cares about. Northstar will still score it, prioritize it, and decide whether to pick it up or defer it.</p>
        </div>
      </summary>

      <form
        className="add-task-form"
        onSubmit={async (event) => {
          event.preventDefault();
          const added = await onAdd({
            ...input,
            description: input.description?.trim() ?? '',
          });
          if (added) {
            setInput(defaultInput);
          }
        }}
      >
        <label>
          Title
          <input
            disabled={loading}
            value={input.title}
            onChange={(event) => setInput({ ...input, title: event.target.value })}
            placeholder="Add a task Northstar should score"
            required
          />
        </label>

        <label>
          Founder context <span className="field-optional">Optional</span>
          <textarea
            disabled={loading}
            value={input.description ?? ''}
            onChange={(event) => setInput({ ...input, description: event.target.value })}
            rows={4}
            placeholder="Add constraints, context, or why this matters right now."
          />
        </label>

        <div className="form-grid">
          <label>
            Type
            <select
              disabled={loading}
              value={input.type}
              onChange={(event) => setInput({ ...input, type: event.target.value as TaskType })}
            >
              {supportedManualTaskTypes.map((type) => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </label>

          <label>
            Owner
            <select
              disabled={loading}
              value={input.owner_type}
              onChange={(event) => setInput({ ...input, owner_type: event.target.value as NewTaskInput['owner_type'] })}
            >
              <option value="agent">Agent</option>
              <option value="human">Human</option>
              <option value="user">User</option>
            </select>
          </label>
        </div>

        <div className="score-grid">
          <label>
            Impact
            <input
              disabled={loading}
              type="number"
              min={1}
              max={10}
              value={input.impact}
              onChange={(event) => setInput({ ...input, impact: Number(event.target.value) })}
            />
          </label>
          <label>
            Effort
            <input
              disabled={loading}
              type="number"
              min={1}
              max={10}
              value={input.effort}
              onChange={(event) => setInput({ ...input, effort: Number(event.target.value) })}
            />
          </label>
          <label>
            Confidence
            <input
              disabled={loading}
              type="number"
              min={1}
              max={10}
              value={input.confidence}
              onChange={(event) => setInput({ ...input, confidence: Number(event.target.value) })}
            />
          </label>
          <label>
            Goal fit
            <input
              disabled={loading}
              type="number"
              min={1}
              max={10}
              value={input.goal_fit}
              onChange={(event) => setInput({ ...input, goal_fit: Number(event.target.value) })}
            />
          </label>
        </div>

        <p className="hint">Manual work enters the same operating model: rationale, priority score, owner, and board placement.</p>
        {error ? <p className="form-error">{error}</p> : null}

        <button className="primary-button" type="submit" disabled={loading}>
          {loading ? 'Adding to board...' : 'Add to inbox'}
        </button>
      </form>
    </details>
  );
}
