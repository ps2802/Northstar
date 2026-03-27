import type { Artifact } from '../lib/types';
import { formatDateTime } from '../lib/format';

interface ArtifactViewerProps {
  artifact: Artifact | null;
  embedded?: boolean;
}

const isStandaloneHeading = (line: string, nextLine?: string) => {
  if (!nextLine) {
    return false;
  }

  if (!line.trim() || line.startsWith('- ') || /^\d+\.\s/.test(line)) {
    return false;
  }

  if (line.startsWith('#')) {
    return true;
  }

  return line.length <= 36 && !/[.!?:]$/.test(line);
};

const parseArtifact = (content: string) => {
  const lines = content.split('\n');
  const sections: Array<{ heading: string; lines: string[] }> = [];
  let title = 'Generated artifact';
  let current: { heading: string; lines: string[] } | null = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trimEnd();
    const nextLine = lines[index + 1]?.trim();

    if (!line) {
      if (current && current.lines[current.lines.length - 1] !== '') {
        current.lines.push('');
      }
      continue;
    }

    if (line.startsWith('# ')) {
      title = line.replace(/^#\s+/, '');
      continue;
    }

    if (line.startsWith('## ')) {
      if (current) {
        sections.push(current);
      }
      current = { heading: line.replace(/^##\s+/, ''), lines: [] };
      continue;
    }

    if (isStandaloneHeading(line, nextLine)) {
      if (current) {
        sections.push(current);
      }
      current = { heading: line.replace(/^#+\s*/, ''), lines: [] };
      continue;
    }

    if (!current) {
      current = { heading: 'Notes', lines: [] };
    }

    current.lines.push(line);
  }

  if (current) {
    sections.push(current);
  }

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

export function ArtifactViewer({ artifact, embedded }: ArtifactViewerProps) {
  if (!artifact) {
    if (embedded) {
      return null;
    }

    return (
      <section className="rail-card artifact-panel">
        <p className="eyebrow">Artifact review</p>
        <h2>No generated artifact selected</h2>
        <p className="panel-copy">Open a task with a draft artifact to review the output in context.</p>
      </section>
    );
  }

  const parsed = parseArtifact(artifact.content);

  return (
    <section className={`${embedded ? 'detail-card embedded-artifact-panel' : 'rail-card artifact-panel'}`}>
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Artifact review</p>
          <h2>{artifact.title}</h2>
        </div>
        <div className="artifact-meta-chips">
          {artifact.channel ? <span className="domain-badge">{artifact.channel}</span> : null}
          <span className="domain-badge">{artifact.type.replaceAll('_', ' ')}</span>
          <span className={`status-chip ${artifact.status}`}>{artifact.status.replace('_', ' ')}</span>
        </div>
      </div>

      <div className="artifact-hero">
        <div>
          <span className="artifact-label">{artifact.deliveryStage.replaceAll('_', ' ')}</span>
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
