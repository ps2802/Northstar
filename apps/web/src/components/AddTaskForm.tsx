import { useState } from 'react';
import { supportedManualTaskTypes } from '../lib/taskConfig';
import type { NewTaskInput, TaskType } from '../lib/types';

interface AddTaskFormProps {
  disabledReason?: string | null;
  error?: string | null;
  loading?: boolean;
  mutationsAllowed?: boolean;
  onAdd: (input: NewTaskInput) => Promise<boolean>;
}

const defaultInput: NewTaskInput = {
  title: '',
  description: '',
  type: 'blog_brief',
  impact: 6,
  effort: 6,
  confidence: 5,
  goal_fit: 6,
  owner_type: 'agent',
};

export function AddTaskForm({ disabledReason, error, loading, mutationsAllowed = true, onAdd }: AddTaskFormProps) {
  const [input, setInput] = useState<NewTaskInput>(defaultInput);
  const formDisabled = loading || !mutationsAllowed;
  const selectedTaskType = supportedManualTaskTypes.find((taskType) => taskType.value === input.type) ?? supportedManualTaskTypes[0];

  return (
    <details className="rail-card rail-details add-task-shell">
      <summary className="rail-details-summary">
        <div>
          <p className="eyebrow">Founder input</p>
          <h2>Queue planning work</h2>
          <p className="panel-copy">Only blog briefs can generate a live draft here. Other task types are planning-only placeholders for manual follow-through.</p>
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
            disabled={formDisabled}
            value={input.title}
            onChange={(event) => setInput({ ...input, title: event.target.value })}
            placeholder="Add a task the board should track"
            required
          />
        </label>

        <label>
          Founder context <span className="field-optional">Optional</span>
          <textarea
            disabled={formDisabled}
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
              disabled={formDisabled}
              value={input.type}
              onChange={(event) => setInput({ ...input, type: event.target.value as TaskType })}
            >
              {supportedManualTaskTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label} {type.availability === 'live' ? '(live draft path)' : '(planning only)'}
                </option>
              ))}
            </select>
          </label>

          <label>
            Owner
            <select
              disabled={formDisabled}
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
              disabled={formDisabled}
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
              disabled={formDisabled}
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
              disabled={formDisabled}
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
              disabled={formDisabled}
              type="number"
              min={1}
              max={10}
              value={input.goal_fit}
              onChange={(event) => setInput({ ...input, goal_fit: Number(event.target.value) })}
            />
          </label>
        </div>

        {!mutationsAllowed && disabledReason ? <p className="form-error">{disabledReason}</p> : null}
        {selectedTaskType.availability === 'live' ? (
          <p className="hint">This adds a blog brief task that can later generate a founder-review draft.</p>
        ) : (
          <p className="hint">This task type stays planning-only in the current founder UI. It can be prioritized and discussed, but not generated.</p>
        )}
        {error ? <p className="form-error">{error}</p> : null}

        <button className="primary-button" type="submit" disabled={formDisabled}>
          {loading ? 'Adding to board...' : selectedTaskType.availability === 'live' ? 'Add blog brief task' : 'Add planning task'}
        </button>
      </form>
    </details>
  );
}
