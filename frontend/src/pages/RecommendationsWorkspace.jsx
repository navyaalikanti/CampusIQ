import { useCallback } from 'react';
import { Sparkles, TrendingUp, Target, ArrowUpRight, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import useApiResource from '../hooks/useApiResource';
import useRealtimeRefresh from '../hooks/useRealtimeRefresh';
import DataStatePanel from '../components/DataStatePanel';

const RecommendationsWorkspace = () => {
  const loadRecommendations = useCallback(async () => {
    const response = await api.get('/recommendations');
    return response.data.recommendations || [];
  }, []);

  const { data, loading, error, reload } = useApiResource(loadRecommendations, [loadRecommendations]);

  useRealtimeRefresh({
    channels: ['dashboard', 'notifications'],
    onRefresh: reload,
    enabled: Boolean(localStorage.getItem('token')),
  });

  if (loading || error || !(data || []).length) {
    return (
      <div className="premium-grid-base">
        <div style={{ gridColumn: 'span 12' }}>
          <DataStatePanel
            loading={loading}
            error={error}
            empty={!loading && !error && !(data || []).length}
            onRetry={reload}
            loadingLabel="Synthesizing personalized nuggets..."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="premium-grid-base">
      <header className="flex-column gap-8 mb-32" style={{ gridColumn: 'span 12' }}>
        <div className="flex-row gap-8" style={{ color: 'var(--accent)' }}>
          <TrendingUp size={16} />
          <span className="premium-text-meta" style={{ letterSpacing: '0.1em', textTransform: 'uppercase' }}>Intelligence</span>
        </div>
        <h1 className="premium-text-hero">Recommendations</h1>
        <p className="premium-text-body subdued">Personalized study actions and opportunity signals mapped from your academic context.</p>
      </header>

      <div className="premium-grid-base" style={{ gridColumn: 'span 12', padding: 0 }}>
        {data.map((item) => (
          <article key={item.id} className="premium-card flex-column gap-24" style={{ gridColumn: 'span 4', display: 'flex' }}>
            <div className="flex-row justify-between items-start">
               <span className="premium-chip" style={{ background: 'rgba(46, 230, 166, 0.1)', color: 'var(--accent)' }}>
                 {item.matchScore}% SIGNAL MATCH
               </span>
               <div style={{ color: 'var(--muted)' }}><Sparkles size={18} /></div>
            </div>
            
            <div className="flex-column gap-8">
              <h3 className="premium-text-h3" style={{ margin: 0, minHeight: '48px' }}>{item.title}</h3>
              <p className="premium-text-meta" style={{ opacity: 0.6, fontSize: '13px' }}>{item.description}</p>
            </div>

            <div className="flex-column gap-12 mt-auto">
               <div className="flex-row gap-8 flex-wrap">
                  <span className="premium-chip-outline" style={{ fontSize: '10px' }}>{item.type}</span>
                  {(item.tags || []).slice(0, 2).map(tag => (
                    <span key={tag} className="premium-chip-outline" style={{ fontSize: '10px' }}>{tag}</span>
                  ))}
               </div>

               <Link to={item.ctaRoute} className="premium-button mt-12" style={{ textDecoration: 'none', textAlign: 'center' }}>
                  {item.ctaLabel}
                  <ArrowUpRight size={16} style={{marginLeft: 8}}/>
               </Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};

export default RecommendationsWorkspace;
