import type { Artifact } from '../lib/types';
import { formatDateTime } from '../lib/format';

interface ArtifactViewerProps {
  artifact: Artifact | null;
}

const parseArtifact = (content: string) => {
  const lines = content.split('\n');
  const title = lines.find((line) => line.startsWith('# '))?.replace(/^#\s+/, '') ?? 'Generated artifact';
  const sections: Array<{ heading: string; lines: string[] }> = [];
  let current: { heading: string; lines: string[] } | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (!line) {
      if (current) current.lines.push('');
      continue;
    }

    if (line.startsWith('# ')) continue;

    if (line.startsWith('## ')) {
      if (current) sections.push(current);
      current = { heading: line.replace(/^##\s+/, ''), lines: [] };
      continue;
    }

    if (!current) {
      current = { heading: 'Notes', lines: [] };
    }
    current.lines.push(line);
  }

  if (current) sections.push(current);
  return { title, sections };
};

const renderSectionLines = (lines: string[]) => {
  const filtered = lines.filter(Boolean);
  const allBullets = filtered.length > 0 && filtered.every((line) => line.startsWith('- '));
  const allOrdered = filtered.length > 0 && filtered.every((line) => /^\d+\.\s/.test(line));

  if (allBullets) {
    return (
      <ul className="artifact-list">
        {filtered.map((line) => (
          <li key={line}>{line.replace(/^-\s+/, '')}</li>
        ))}
      </ul>
    );
  }

  if (allOrdered) {
    return (
      <ol className="artifact-ordered">
        {filtered.map((line) => (
          <li key={line}>{line.replace(/^\d+\.\s+/, '')}</li>
        ))}
      </ol>
    );
  }

  return (
    <div className="artifact-section-body">
      {filtered.map((line, index) => (
        <p key={`${line}-${index}`}>{line}</p>
      ))}
    </div>
  );
};

export function ArtifactViewer({ artifact }: ArtifactViewerProps) {
  if (!artifact) {
    return (
      <section className="panel artifact-panel">
        <p className="eyebrow">Brief viewer</p>
        <h2>No brief selected</h2>
        <p>Open a task from the board. If the agent produced a draft, it will appear here for your review before anything moves forward.</p>
      </section>
    );
  }

  const parsed = parseArtifact(artifact.content);

  return (
    <section className="panel artifact-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Artifact viewer</p>
          <h2>{artifact.title}</h2>
        </div>
        <span className={`pill subtle ${artifact.status}`}>{artifact.status.replace('_', ' ')}</span>
      </div>
      <div className="artifact-hero">
        <div>
          <span className="eyebrow">Founder review</span>
          <h3>{parsed.title}</h3>
        </div>
        <p className="artifact-timestamp">Created {formatDateTime(artifact.createdAt)}</p>
      </div>
      <div className="artifact-sections">
        {parsed.sections.map((section) => (
          <article key={section.heading} className="artifact-section">
            <h3>{section.heading}</h3>
            {renderSectionLines(section.lines)}
          </article>
        ))}
      </div>
    </section>
  );
}
