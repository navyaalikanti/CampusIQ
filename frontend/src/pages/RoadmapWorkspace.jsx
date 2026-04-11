import { useCallback } from 'react';
import { Compass, Target, CheckCircle2, Circle, ArrowRight } from 'lucide-react';
import api from '../lib/api';
import useApiResource from '../hooks/useApiResource';
import DataStatePanel from '../components/DataStatePanel';

const RoadmapWorkspace = () => {
  const loadRoadmap = useCallback(async () => {
    const response = await api.get('/roadmap');
    return response.data.roadmap || [];
  }, []);

  const { data, loading, error, reload } = useApiResource(loadRoadmap, [loadRoadmap]);

  if (loading || error || !(data || []).length) {
    return (
      <div className="premium-grid-base">
        <div style={{ gridColumn: 'span 12' }}>
          <DataStatePanel
            loading={loading}
            error={error}
            empty={!loading && !error && !(data || []).length}
            onRetry={reload}
            loadingLabel="Tracing your academic trajectory..."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="premium-grid-base">
      <header className="flex-column gap-8 mb-32" style={{ gridColumn: 'span 12' }}>
        <div className="flex-row gap-8" style={{ color: 'var(--accent)' }}>
          <Compass size={16} />
          <span className="premium-text-meta" style={{ letterSpacing: '0.1em', textTransform: 'uppercase' }}>Navigation</span>
        </div>
        <h1 className="premium-text-hero">Career Roadmap</h1>
        <p className="premium-text-body subdued">Strategic study-to-career milestones synchronized with your campus performance.</p>
      </header>

      <div className="premium-grid-base" style={{ gridColumn: 'span 12', padding: 0 }}>
        {data.map((item, index) => (
          <article key={item.id} className="premium-card flex-column gap-24" style={{ gridColumn: 'span 4', display: 'flex' }}>
            <div className="flex-row justify-between items-center">
               <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--surface-2)', display: 'grid', placeItems: 'center', color: 'var(--accent)', border: '1px solid rgba(255,255,255,0.05)', fontSize: '12px', fontWeight: 'bold' }}>
                  {index + 1}
               </div>
               <span className="premium-chip-outline" style={{ fontSize: '10px' }}>{item.stage}</span>
            </div>
            
            <div className="flex-column gap-8">
              <h3 className="premium-text-h3" style={{ margin: 0, minHeight: '48px' }}>{item.title}</h3>
              <p className="premium-text-meta" style={{ opacity: 0.6, fontSize: '13px' }}>{item.description}</p>
            </div>

            <div className="flex-column gap-12 mt-auto">
               <div className="flex-row justify-between items-center premium-text-meta mb-4">
                  <span>Progress</span>
                  <strong style={{ color: 'var(--accent)' }}>{item.progress}%</strong>
               </div>
               <div className="premium-progress-track">
                  <div className="premium-progress-fill" style={{ width: `${item.progress}%` }} />
               </div>
               <div className="flex-row gap-8 mt-12">
                  <button className="premium-button" style={{ flex: 1 }}>
                     {item.progress === 100 ? 'Review Milestone' : 'Resume Track'}
                     <ArrowRight size={16} style={{marginLeft: 8}}/>
                  </button>
               </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};

export default RoadmapWorkspace;
