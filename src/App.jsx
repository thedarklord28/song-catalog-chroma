import React, { useState, useEffect } from 'react';
import dashboardPayload from './dashboard_data.json';

const FEATURES = ['danceability', 'energy', 'valence', 'acousticness', 'tempo_norm'];

const PASTEL_COLORS = {
  danceability: '#fed7aa',
  energy: '#fbcfe8',
  valence: '#d9f99d',
  acousticness: '#fef08a',
  tempo_norm: '#bfdbfe'
};

export default function App() {
  const [catalog, setCatalog] = useState([]);
  const [userProfiles, setUserProfiles] = useState([]);
  const [filterMetadata, setFilterMetadata] = useState({ genres: [], artists: [], decades: [] });

  // Multi-Attribute Selection Filters
  const [selectedSongId, setSelectedSongId] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('ALL');
  const [selectedArtist, setSelectedArtist] = useState('ALL');
  const [selectedDecade, setSelectedDecade] = useState('ALL');
  const [hoveredItem, setHoveredItem] = useState(null);

  useEffect(() => {
    if (dashboardPayload) {
      const songs = dashboardPayload.catalog || [];
      const profiles = dashboardPayload.user_profiles || [];
      const filters = dashboardPayload.available_filters || { genres: [], artists: [], decades: [] };

      setCatalog(songs);
      setUserProfiles(profiles);
      setFilterMetadata(filters);

      if (songs.length > 0) setSelectedSongId(songs[0].song_id);
      if (profiles.length > 0) setSelectedUserId(profiles[0].user_id);
    }
  }, []);

  // MULTI-COMBINATION METADATA INTERSECTION FILTERING (CATALOG)
  const filteredCatalog = catalog.filter(song => {
    const genreMatch = selectedGenre === 'ALL' || song.genre === selectedGenre;
    const artistMatch = selectedArtist === 'ALL' || song.artist.includes(selectedArtist);
    const decadeMatch = selectedDecade === 'ALL' || song.decade === selectedDecade;
    return genreMatch && artistMatch && decadeMatch;
  });

  const currentSong = catalog.find(s => s.song_id === selectedSongId);
  const currentUser = userProfiles.find(u => u.user_id === selectedUserId);
  const trackRecommendations = currentSong?.recommendations || [];
  const userRecommendations = currentUser?.personalized_recs || [];

  // FILTER RECOMMENDATIONS DYNAMICALLY AGAINST SELECTED METADATA
  const filterRecommendationItem = (rec) => {
    const songMeta = catalog.find(s => s.song_id === rec.song_id) || rec;
    const genreMatch = selectedGenre === 'ALL' || songMeta.genre === selectedGenre;
    const artistMatch = selectedArtist === 'ALL' || (songMeta.artist && songMeta.artist.includes(selectedArtist));
    const decadeMatch = selectedDecade === 'ALL' || songMeta.decade === selectedDecade;
    return genreMatch && artistMatch && decadeMatch;
  };

  const filteredTrackRecommendations = trackRecommendations.filter(filterRecommendationItem);
  const filteredUserRecommendations = userRecommendations.filter(filterRecommendationItem);

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>Acoustic Fingerprint Workspace</h1>
        <p style={styles.subtitle}>Multi-Attribute Query Engine (Genre + Decade + Artist Filters)</p>

        {/* Core Controls Dashboard Panel Grid */}
        <div style={styles.controlsGrid}>
          <div style={styles.controlBox}>
            <label style={styles.label}>Active Catalog Track:</label>
            <select value={selectedSongId} onChange={(e) => setSelectedSongId(e.target.value)} style={styles.dropdown}>
              {filteredCatalog.map(s => (
                <option key={s.song_id} value={s.song_id}>{s.title} — {s.artist}</option>
              ))}
              {filteredCatalog.length === 0 && <option>No matching tracks intersect</option>}
            </select>
          </div>

          <div style={styles.controlBox}>
            <label style={styles.label}>Target User Profile:</label>
            <select value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)} style={styles.dropdown}>
              {userProfiles.map(u => (
                <option key={u.user_id} value={u.user_id}>User Profile: {u.user_id}</option>
              ))}
            </select>
          </div>

          {/* DYNAMIC METADATA CONTROLS ROW */}
          <div style={styles.controlBox}>
            <label style={{ ...styles.label, color: '#0284c7' }}>Filter by Genre:</label>
            <select value={selectedGenre} onChange={(e) => setSelectedGenre(e.target.value)} style={{ ...styles.dropdown, borderColor: '#bae6fd' }}>
              <option value="ALL">ALL GENRES (Unconstrained)</option>
              {filterMetadata.genres.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>

          <div style={styles.controlBox}>
            <label style={{ ...styles.label, color: '#0284c7' }}>Filter by Decade:</label>
            <select value={selectedDecade} onChange={(e) => setSelectedDecade(e.target.value)} style={{ ...styles.dropdown, borderColor: '#bae6fd' }}>
              <option value="ALL">ALL DECADES (Unconstrained)</option>
              {filterMetadata.decades.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div style={styles.controlBox}>
            <label style={{ ...styles.label, color: '#0284c7' }}>Filter by Artist:</label>
            <select value={selectedArtist} onChange={(e) => setSelectedArtist(e.target.value)} style={{ ...styles.dropdown, borderColor: '#bae6fd' }}>
              <option value="ALL">ALL ARTISTS (Unconstrained)</option>
              {filterMetadata.artists.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        </div>
      </header>

      <div style={styles.grid}>
        {/* Cartesian Plotting Plane Canvas */}
        <div style={{ ...styles.card, ...styles.cardPink }}>
          <h2 style={styles.cardTitle}>Cartesian Coordinate Mapping (Plotted Nodes: {filteredCatalog.length})</h2>
          <div style={styles.plotContainer}>
            <div style={{ ...styles.axisLabel, bottom: '-1.5rem', right: 0 }}>Danceability →</div>
            <div style={{ ...styles.axisLabel, top: '-1.5rem', left: 0, transform: 'rotate(-90deg)', transformOrigin: 'left bottom' }}>Energy →</div>

            {/* Render ONLY nodes intersecting with metadata selections */}
            {filteredCatalog.map(s => (
              <button
                key={s.song_id}
                onClick={() => setSelectedSongId(s.song_id)}
                onMouseEnter={() => setHoveredItem({ type: 'song', name: s.title, x: s.danceability, y: s.energy })}
                onMouseLeave={() => setHoveredItem(null)}
                style={{
                  ...styles.plotPoint,
                  left: `${s.danceability * 100}%`,
                  bottom: `${s.energy * 100}%`,
                  backgroundColor: selectedSongId === s.song_id ? '#3b82f6' : '#93c5fd',
                  borderColor: selectedSongId === s.song_id ? '#1d4ed8' : '#60a5fa',
                  transform: selectedSongId === s.song_id ? 'translate(-50%, 50%) scale(1.3)' : 'translate(-50%, 50%)'
                }}
              />
            ))}

            {currentUser && (
              <div
                onMouseEnter={() => setHoveredItem({ type: 'user', name: `User ${currentUser.user_id} Taste Center`, x: currentUser.midpoint.danceability, y: currentUser.midpoint.energy })}
                onMouseLeave={() => setHoveredItem(null)}
                style={{
                  ...styles.userMidpointPoint,
                  left: `${currentUser.midpoint.danceability * 100}%`,
                  bottom: `${currentUser.midpoint.energy * 100}%`
                }}
              >
                ★
              </div>
            )}

            {hoveredItem && (
              <div style={{ ...styles.tooltip, left: `${hoveredItem.x * 100}%`, bottom: `${hoveredItem.y * 100 + 4}%` }}>
                <strong>{hoveredItem.name}</strong> ({hoveredItem.x.toFixed(2)}, {hoveredItem.y.toFixed(2)})
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Parameter Profiles Board */}
        <div style={{ ...styles.card, ...styles.cardBlue }}>
          <div style={styles.sectionSplit}>
            <div style={styles.infoDisplay}>
              <div style={styles.infoTitle}>{currentSong?.title || 'Select a Track'}</div>
              <div style={styles.infoArtist}>
                {currentSong?.artist} — Album: {currentSong?.album} | Year: <span style={{ color: '#0284c7' }}>{currentSong?.year} ({currentSong?.decade})</span>
              </div>
            </div>
            <div style={styles.fingerprintContainer}>
              {FEATURES.map(feat => {
                const val = currentSong ? currentSong[feat] : 0;
                return (
                  <div key={feat} style={styles.featureRow}>
                    <div style={styles.featureMeta}>
                      <span style={styles.featureName}>{feat.replace('_', ' ')}</span>
                      <span>{val.toFixed(2)}</span>
                    </div>
                    <div style={styles.barOuter}><div style={{ ...styles.barInner, width: `${val * 100}%`, backgroundColor: PASTEL_COLORS[feat] }} /></div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={styles.recWrapperGrid}>
            <div style={styles.recColumn}>
              <h3 style={styles.subSectionTitle}>Track Similarity Matches ({filteredTrackRecommendations.length})</h3>
              {filteredTrackRecommendations.length > 0 ? (
                filteredTrackRecommendations.map(rec => (
                  <div key={rec.song_id} style={styles.recItem}>
                    <strong>{rec.title}</strong><br />
                    <span style={styles.recSubtext}>Distance Error: {rec.distance}</span>
                  </div>
                ))
              ) : (
                <div style={styles.recSubtext}>No recommendations match current filter criteria.</div>
              )}
            </div>

            <div style={{ ...styles.recColumn, borderLeft: '1px dashed #f0edea', paddingLeft: '1rem' }}>
              <h3 style={styles.subSectionTitle}>User Taste Profile Recs ({filteredUserRecommendations.length})</h3>
              {filteredUserRecommendations.length > 0 ? (
                filteredUserRecommendations.map(rec => (
                  <div key={rec.song_id} style={{ ...styles.recItem, backgroundColor: '#fef2f2', borderColor: '#fee2e2' }}>
                    <strong>{rec.title}</strong><br />
                    <span style={styles.recSubtext}>Taste Offset: {rec.distance}</span>
                  </div>
                ))
              ) : (
                <div style={styles.recSubtext}>No user recommendations match current filter criteria.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { backgroundColor: '#fcfbfa', minHeight: '100vh', padding: '2rem', color: '#2d2a29' },
  header: { maxWidth: '1200px', margin: '0 auto 2rem auto' },
  title: { fontSize: '1.75rem', fontWeight: 500, marginBottom: '0.25rem' },
  subtitle: { color: '#7a7571', fontSize: '0.9rem', marginBottom: '1.5rem' },
  controlsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1.25rem' },
  controlBox: { display: 'flex', flexDirection: 'column', gap: '0.35rem' },
  label: { fontSize: '0.8rem', color: '#7a7571', fontWeight: 500 },
  dropdown: { padding: '0.5rem 1rem', border: '1px solid #f0edea', borderRadius: '8px', backgroundColor: '#ffffff', outline: 'none', cursor: 'pointer', fontFamily: 'inherit', width: '100%' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', maxWidth: '1200px', margin: '0 auto' },
  card: { backgroundColor: '#ffffff', border: '1px solid #f0edea', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 4px 20px rgba(235, 230, 225, 0.4)', position: 'relative', overflow: 'hidden' },
  cardPink: { borderTop: '4px solid #fbcfe8' },
  cardBlue: { borderTop: '4px solid #bae6fd' },
  cardTitle: { fontSize: '1.1rem', fontWeight: 500, marginBottom: '1rem' },
  plotContainer: { width: '100%', aspectRatio: '1/1', borderLeft: '2px solid #a8a29e', borderBottom: '2px solid #a8a29e', position: 'relative', backgroundImage: 'linear-gradient(#f0edea 1px, transparent 1px), linear-gradient(90deg, #f0edea 1px, transparent 1px)', backgroundSize: '10% 10%', marginTop: '1rem' },
  axisLabel: { position: 'absolute', fontSize: '0.75rem', color: '#7a7571' },
  plotPoint: { position: 'absolute', width: '10px', height: '10px', borderRadius: '50%', border: '1px solid #3b82f6', cursor: 'pointer', transition: 'all 0.2s ease', padding: 0 },
  userMidpointPoint: { position: 'absolute', fontSize: '1.5rem', color: '#ec4899', cursor: 'pointer', transform: 'translate(-50%, 45%)', zIndex: 12 },
  tooltip: { position: 'absolute', background: '#ffffff', border: '1px solid #f0edea', padding: '0.4rem', borderRadius: '6px', fontSize: '0.7rem', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', whiteSpace: 'nowrap', zIndex: 20, transform: 'translateX(-50%)' },
  sectionSplit: { paddingBottom: '1.25rem', borderBottom: '1px solid #f0edea', marginBottom: '1.25rem' },
  infoDisplay: { marginBottom: '1rem' },
  infoTitle: { fontSize: '1.2rem', fontWeight: 500 },
  infoArtist: { fontSize: '0.85rem', color: '#7a7571' },
  fingerprintContainer: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem 1.5rem' },
  featureRow: { display: 'flex', flexDirection: 'column', gap: '0.2rem' },
  featureMeta: { display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' },
  featureName: { textTransform: 'capitalize', fontWeight: 500 },
  barOuter: { width: '100%', height: '6px', backgroundColor: '#fcfbfa', border: '1px solid #f0edea', borderRadius: '3px', overflow: 'hidden' },
  barInner: { height: '100%', borderRadius: '2px', transition: 'width 0.4s ease' },
  recWrapperGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' },
  recColumn: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  subSectionTitle: { fontSize: '0.9rem', fontWeight: 500, color: '#2d2a29', marginBottom: '0.25rem' },
  recItem: { padding: '0.5rem', borderRadius: '6px', backgroundColor: '#fcfbfa', border: '1px solid #f0edea', fontSize: '0.8rem' },
  recSubtext: { color: '#7a7571', fontSize: '0.7rem' }
};