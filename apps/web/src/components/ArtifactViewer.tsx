import type { Artifact } from '../lib/types';
import { formatDateTime } from '../lib/format';

interface ArtifactViewerProps {
  artifact: Artifact | null;
}

export function ArtifactViewer({ artifact }: ArtifactViewerProps) {
  if (!artifact) {
    return (
      <section className="panel artifact-panel">
        <p className="eyebrow">Artifact viewer</p>
        <h2>Generated blog brief</h2>
        <p>Select a brief from the board to review the draft here.</p>
      </section>
    );
  }

  return (
    <section className="panel artifact-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Artifact viewer</p>
          <h2>{artifact.title}</h2>
        </div>
        <span className={`pill subtle ${artifact.status}`}>{artifact.status.replace('_', ' ')}</span>
      </div>
      <p className="artifact-timestamp">Created {formatDateTime(artifact.createdAt)}</p>
      <pre className="artifact-content">{artifact.content}</pre>
    </section>
  );
}
