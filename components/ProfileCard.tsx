'use client';

import { Profile, RankedProfile } from '@/types';

interface ProfileCardProps {
  rankedProfile: RankedProfile;
  profile: Profile;
  rank: number;
  filterSkills?: string[];
}

function getInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

function getScoreTier(score: number): 'high' | 'mid' | 'low' {
  if (score >= 75) return 'high';
  if (score >= 50) return 'mid';
  return 'low';
}

const COMPANY_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  startup: { bg: 'var(--accent-primary-dim)', text: 'var(--accent-primary-light)' },
  scaleup: { bg: 'var(--accent-secondary-dim)', text: 'var(--accent-secondary)' },
  enterprise: { bg: 'var(--bg-elevated)', text: 'var(--text-muted)' },
  agency: { bg: 'var(--accent-warning-dim)', text: 'var(--accent-warning)' },
};

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #6c63ff, #06b6d4)',
  'linear-gradient(135deg, #10b981, #06b6d4)',
  'linear-gradient(135deg, #f59e0b, #ef4444)',
  'linear-gradient(135deg, #8b5cf6, #ec4899)',
  'linear-gradient(135deg, #06b6d4, #6c63ff)',
];

export default function ProfileCard({
  rankedProfile,
  profile,
  rank,
  filterSkills = [],
}: ProfileCardProps) {
  const tier = getScoreTier(rankedProfile.score);
  const colors = COMPANY_TYPE_COLORS[profile.current_company_type] ?? COMPANY_TYPE_COLORS.enterprise;
  const avatarGradient = AVATAR_GRADIENTS[(rank - 1) % AVATAR_GRADIENTS.length];
  const filterSkillsLower = filterSkills.map((s) => s.toLowerCase());

  return (
    <div className="profile-card" id={`profile-card-${rankedProfile.profileId}`}>
      <div className="profile-card-header">
        {/* Rank */}
        <div style={{ position: 'absolute', top: 'var(--space-3)', right: 'var(--space-4)' }}>
          <span className="rank-badge">#{rank}</span>
        </div>

        {/* Avatar */}
        <div
          className="profile-avatar"
          style={{ background: avatarGradient }}
          aria-hidden="true"
        >
          {getInitials(profile.name)}
        </div>

        {/* Info */}
        <div className="profile-info">
          <div className="profile-name">{profile.name}</div>
          {/* current_title (v2 schema — was "title") */}
          <div className="profile-title">{profile.current_title}</div>
          <div className="profile-meta">
            <span className="profile-meta-item">
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <span
                style={{
                  padding: '1px 6px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 11,
                  fontWeight: 600,
                  background: colors.bg,
                  color: colors.text,
                }}
              >
                {profile.current_company}
              </span>
            </span>
            <span className="profile-meta-item">
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {profile.location}
            </span>
            <span className="profile-meta-item">
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {profile.years_experience} yrs exp
            </span>
            {profile.education && (
              <span className="profile-meta-item">
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                </svg>
                {profile.education}
              </span>
            )}
          </div>

          {/* Past companies — compact pill row */}
          {profile.past_companies && profile.past_companies.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', marginRight: 2 }}>Prev:</span>
              {profile.past_companies.slice(0, 3).map((pc, i) => {
                const pc_colors = COMPANY_TYPE_COLORS[pc.company_type] ?? COMPANY_TYPE_COLORS.enterprise;
                return (
                  <span
                    key={i}
                    style={{
                      fontSize: 10,
                      fontWeight: 500,
                      padding: '1px 5px',
                      borderRadius: 'var(--radius-sm)',
                      background: pc_colors.bg,
                      color: pc_colors.text,
                      border: `1px solid ${pc_colors.text}33`,
                    }}
                  >
                    {pc.company}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* Score Badge */}
        <div className={`score-badge ${tier}`}>
          <span className="score-number">{rankedProfile.score}</span>
          <span className="score-label">score</span>
        </div>
      </div>

      {/* Skills */}
      <div className="profile-skills">
        {profile.skills.map((skill) => {
          const isMatched = filterSkillsLower.some(
            (fs) => skill.toLowerCase().includes(fs) || fs.includes(skill.toLowerCase())
          );
          return (
            <span key={skill} className={`skill-chip ${isMatched ? 'matched' : ''}`}>
              {skill}
            </span>
          );
        })}
      </div>

      {/* LLM Explanation */}
      <div className="profile-explanation">
        {rankedProfile.explanation}
      </div>
    </div>
  );
}
