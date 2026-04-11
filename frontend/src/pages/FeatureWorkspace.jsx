import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';

const FeatureWorkspace = ({ feature }) => {
  return (
    <section className="feature-workspace-page fade-in">
      <div className="feature-workspace-shell">
        <div className="feature-workspace-hero">
          <div className="eyebrow">
            <Sparkles size={15} />
            CampusIQ Module
          </div>
          <h1>{feature.title}</h1>
          <p>{feature.description}</p>
          <div className="feature-workspace-actions">
            <Link className="btn btn-secondary" to="/dashboard">
              <ArrowLeft size={16} />
              Back to Dashboard
            </Link>
            <button className="btn btn-primary" type="button">
              Launch Workflow <ArrowRight size={16} />
            </button>
          </div>
        </div>

        <div className="feature-workspace-grid">
          <article className="feature-workspace-card">
            <strong>Module Vision</strong>
            <p>{feature.summary}</p>
          </article>
          <article className="feature-workspace-card">
            <strong>Primary Metric</strong>
            <p>{feature.metric}</p>
          </article>
          <article className="feature-workspace-card feature-workspace-card-wide">
            <strong>Why it matters</strong>
            <p>
              This feature page is now routed and ready so judges can click through the ecosystem
              and understand CampusIQ as a complete academic operating system rather than a single
              isolated screen.
            </p>
          </article>
        </div>
      </div>
    </section>
  );
};

export default FeatureWorkspace;
