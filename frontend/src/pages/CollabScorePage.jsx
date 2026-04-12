import { useCallback } from 'react';
import { 
  Trophy, 
  Star, 
  Zap, 
  Users, 
  MessageSquare, 
  Video, 
  Handshake, 
  TrendingUp, 
  Award, 
  Medal,
  ChevronRight,
  Target
} from 'lucide-react';
import api from '../lib/api';
import useApiResource from '../hooks/useApiResource';
import useRealtimeRefresh from '../hooks/useRealtimeRefresh';
import DataStatePanel from '../components/DataStatePanel';

const CollabScorePage = () => {
  const loadScoreData = useCallback(async () => {
    const [scoreRes, boardRes] = await Promise.all([
      api.get('/api/collab-score/me'),
      api.get('/api/collab-score/leaderboard')
    ]);
    return { me: scoreRes.data, leaderboard: boardRes.data };
  }, []);

  const { data, loading, error, reload } = useApiResource(loadScoreData, [loadScoreData]);

  useRealtimeRefresh({
    channels: ['dashboard', 'community'],
    onRefresh: reload,
    enabled: Boolean(localStorage.getItem('token')),
  });

  if (loading || error || !data) {
    return (
      <div className="premium-grid-base">
        <div style={{ gridColumn: 'span 12' }}>
          <DataStatePanel loading={loading} error={error} onRetry={reload} loadingLabel="Calculating your impact score..." />
        </div>
      </div>
    );
  }

  const { me, leaderboard } = data;

  return (
    <div className="premium-grid-base cs-container">
      <header className="cs-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent)', marginBottom: '8px' }}>
            <Zap size={16} fill="var(--accent)" />
            <span className="premium-text-meta" style={{ letterSpacing: '0.1em' }}>Contribution Stats</span>
          </div>
          <h1 className="premium-text-hero">Collab Score</h1>
          <p className="premium-text-body subdued">Your impact on the CampusIQ community, visualized.</p>
        </div>
        <div className="premium-card" style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--accent-gradient)', borderColor: 'transparent' }}>
          <div style={{ background: 'rgba(255,255,255,0.2)', width: 48, height: 48, borderRadius: '12px', display: 'grid', placeItems: 'center' }}>
            <Trophy size={24} color="#fff" />
          </div>
          <div style={{ color: '#fff' }}>
            <div style={{ fontSize: '12px', opacity: 0.8, fontWeight: 600 }}>CAMPUS RANK</div>
            <div style={{ fontSize: '24px', fontWeight: 800 }}>{me.rank}</div>
          </div>
        </div>
      </header>

      {/* Stats Breakdown */}
      <div className="cs-stats-grid">
        <section className="premium-card" style={{ gridColumn: 'span 2', padding: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <h2 className="premium-text-h2" style={{ margin: 0, fontSize: '48px' }}>{me.collabScore}</h2>
            <p className="premium-text-meta" style={{ margin: 0, fontSize: '14px', letterSpacing: '0.1em' }}>TOTAL COLLAB POINTS</p>
            <div style={{ marginTop: '24px', display: 'flex', gap: '8px' }}>
              <span className="premium-chip" style={{ background: 'rgba(46,230,166,0.1)', color: 'var(--accent)' }}>+45 this week</span>
            </div>
          </div>
          <Target size={120} style={{ position: 'absolute', right: '-20px', bottom: '-20px', opacity: 0.05, transform: 'rotate(-15deg)' }} />
          <TrendingUp size={48} style={{ color: 'var(--accent)', opacity: 0.8 }} />
        </section>

        <div className="premium-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ width: 40, height: 40, borderRadius: '10px', background: 'rgba(96,165,250,0.1)', color: '#60a5fa', display: 'grid', placeItems: 'center' }}>
            <MessageSquare size={20} />
          </div>
          <h3 className="premium-text-h3" style={{ margin: 0 }}>{me.breakdown.doubtsSolved}</h3>
          <p className="premium-text-meta" style={{ margin: 0 }}>Doubts Solved</p>
        </div>

        <div className="premium-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ width: 40, height: 40, borderRadius: '10px', background: 'rgba(167,139,250,0.1)', color: '#a78bfa', display: 'grid', placeItems: 'center' }}>
            <Video size={20} />
          </div>
          <h3 className="premium-text-h3" style={{ margin: 0 }}>{me.breakdown.sessionsHosted}</h3>
          <p className="premium-text-meta" style={{ margin: 0 }}>Live Sessions Hosted</p>
        </div>

        <div className="premium-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ width: 40, height: 40, borderRadius: '10px', background: 'rgba(46,230,166,0.1)', color: 'var(--accent)', display: 'grid', placeItems: 'center' }}>
            <Handshake size={20} />
          </div>
          <h3 className="premium-text-h3" style={{ margin: 0 }}>{me.breakdown.teamsFormed}</h3>
          <p className="premium-text-meta" style={{ margin: 0 }}>Teams Formed</p>
        </div>

        <div className="premium-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ width: 40, height: 40, borderRadius: '10px', background: 'rgba(251,191,36,0.1)', color: '#fbbf24', display: 'grid', placeItems: 'center' }}>
            <Award size={20} />
          </div>
          <h3 className="premium-text-h3" style={{ margin: 0 }}>8</h3>
          <p className="premium-text-meta" style={{ margin: 0 }}>Endorsements</p>
        </div>
      </div>

      {/* Leaderboard */}
      <aside className="cs-leaderboard-sidebar">
        <section className="premium-card" style={{ height: '100%', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="premium-text-h3" style={{ margin: 0, fontSize: '18px' }}>Weekly Top 10</h3>
            <Medal size={20} style={{ color: 'var(--gold)' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {leaderboard.map((user, i) => (
              <div key={user.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '12px', background: i === 0 ? 'rgba(212,175,55,0.08)' : 'rgba(255,255,255,0.02)', border: i === 0 ? '1px solid rgba(212,175,55,0.2)' : '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize: '14px', fontWeight: 800, width: '20px', color: i < 3 ? 'var(--gold)' : 'var(--muted)' }}>
                  {i + 1}
                </div>
                <div style={{ width: 36, height: 36, borderRadius: '8px', background: 'var(--accent-gradient)', display: 'grid', placeItems: 'center', fontSize: '12px', fontWeight: 700 }}>
                  {user.name?.[0] || 'U'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: 600 }}>{user.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{user.collabScore} pts</div>
                </div>
                {i < 3 && <Star size={14} fill="var(--gold)" color="var(--gold)" />}
              </div>
            ))}
          </div>

          <button className="premium-button-secondary" style={{ width: '100%', marginTop: 'auto', padding: '12px' }}>
            View Full Leaderboard <ChevronRight size={16} />
          </button>
        </section>
      </aside>
    </div>
  );
};

export default CollabScorePage;
