import { useState } from 'react';
import type { NewTaskInput, TaskType } from '../lib/types';

const taskTypes: { value: TaskType; label: string }[] = [
  { value: 'seo_audit', label: 'SEO audit' },
  { value: 'keyword_cluster', label: 'Keyword cluster' },
  { value: 'meta_rewrite', label: 'Meta rewrite' },
  { value: 'blog_brief', label: 'Blog brief' },
  { value: 'linkedin_post_set', label: 'LinkedIn post set' },
  { value: 'x_post_set', label: 'X post set' },
  { value: 'homepage_copy_suggestion', label: 'Homepage copy suggestion' },
  { value: 'competitor_scan', label: 'Competitor scan' },
];

interface AddTaskFormProps {
  onAdd: (input: NewTaskInput) => void;
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

export function AddTaskForm({ onAdd }: AddTaskFormProps) {
  const [input, setInput] = useState<NewTaskInput>(defaultInput);

  return (
    <form
      className="panel add-task-form"
      onSubmit={(event) => {
        event.preventDefault();
        onAdd(input);
        setInput(defaultInput);
      }}
    >
      <div>
        <p className="eyebrow">Add task</p>
        <h2>Queue work the agent should evaluate</h2>
      </div>
      <label>
        Title
        <input value={input.title} onChange={(event) => setInput({ ...input, title: event.target.value })} required />
      </label>
      <label>
        Description
        <textarea value={input.description} onChange={(event) => setInput({ ...input, description: event.target.value })} rows={4} required />
      </label>
      <div className="form-grid">
        <label>
          Type
          <select value={input.type} onChange={(event) => setInput({ ...input, type: event.target.value as TaskType })}>
            {taskTypes.map((type) => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </label>
        <label>
          Owner
          <select value={input.owner_type} onChange={(event) => setInput({ ...input, owner_type: event.target.value as NewTaskInput['owner_type'] })}>
            <option value="agent">Agent</option>
            <option value="human">Human</option>
            <option value="user">User</option>
          </select>
        </label>
      </div>
      <div className="form-grid three-up">
        <label>
          Impact
          <input type="number" min={1} max={10} value={input.impact} onChange={(event) => setInput({ ...input, impact: Number(event.target.value) })} />
        </label>
        <label>
          Effort
          <input type="number" min={1} max={10} value={input.effort} onChange={(event) => setInput({ ...input, effort: Number(event.target.value) })} />
        </label>
        <label>
          Confidence
          <input type="number" min={1} max={10} value={input.confidence} onChange={(event) => setInput({ ...input, confidence: Number(event.target.value) })} />
        </label>
      </div>
      <label>
        Goal fit
        <input type="number" min={1} max={10} value={input.goal_fit} onChange={(event) => setInput({ ...input, goal_fit: Number(event.target.value) })} />
      </label>
      <button className="primary-button" type="submit">Add to inbox</button>
    </form>
  );
}
