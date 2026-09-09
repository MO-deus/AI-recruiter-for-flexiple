'use client';

import { useState, useCallback } from 'react';
import { Filters } from '@/types';

interface FiltersPanelProps {
  filters: Filters;
  rubric: string;
  onFiltersChange: (filters: Filters) => void;
  onRubricChange: (rubric: string) => void;
  onRunSearch: () => void;
  isLoading?: boolean;
  onNewSearch: () => void;
}

const COMPANY_TYPES = ['startup', 'scaleup', 'enterprise', 'agency'] as const;

export default function FiltersPanel({
  filters,
  rubric,
  onFiltersChange,
  onRubricChange,
  onRunSearch,
  isLoading = false,
  onNewSearch,
}: FiltersPanelProps) {
  const [newSkill, setNewSkill] = useState('');

  const addSkill = useCallback(() => {
    const skill = newSkill.trim();
    if (!skill) return;
    const existing = filters.skills ?? [];
    if (!existing.map((s) => s.toLowerCase()).includes(skill.toLowerCase())) {
      onFiltersChange({ ...filters, skills: [...existing, skill] });
    }
    setNewSkill('');
  }, [newSkill, filters, onFiltersChange]);

  const removeSkill = useCallback((skill: string) => {
    onFiltersChange({
      ...filters,
      skills: (filters.skills ?? []).filter((s) => s !== skill),
    });
  }, [filters, onFiltersChange]);

  const toggleCompanyType = useCallback((type: typeof COMPANY_TYPES[number]) => {
    const current = filters.companyTypes ?? [];
    const next = current.includes(type)
      ? current.filter((c) => c !== type)
      : [...current, type];
    onFiltersChange({ ...filters, companyTypes: next.length ? next : undefined });
  }, [filters, onFiltersChange]);

  return (
    <>
      {/* Header */}
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">⚡</div>
          AI Recruiter
        </div>
        <button
          id="new-search-btn"
          className="btn-secondary"
          onClick={onNewSearch}
          style={{ fontSize: 12, padding: '4px 10px' }}
        >
          New
        </button>
      </div>

      {/* Skills */}
      <div className="filters-section">
        <p className="section-label">Skills (any match)</p>
        <div className="chip-list">
          {(filters.skills ?? []).map((skill) => (
            <span key={skill} className="chip removable">
              {skill}
              <button
                id={`remove-skill-${skill}`}
                className="chip-remove"
                onClick={() => removeSkill(skill)}
                aria-label={`Remove ${skill}`}
              >
                ×
              </button>
            </span>
          ))}
          {(filters.skills ?? []).length === 0 && (
            <span className="text-muted">No skills filter</span>
          )}
        </div>
        <div className="chip-add-input">
          <input
            id="add-skill-input"
            type="text"
            className="inline-input"
            placeholder="Add skill…"
            value={newSkill}
            onChange={(e) => setNewSkill(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); addSkill(); }
            }}
          />
          <button
            id="add-skill-btn"
            className="btn-secondary"
            onClick={addSkill}
            style={{ padding: '6px 12px', fontSize: 13 }}
          >
            +
          </button>
        </div>
      </div>

      {/* Experience Range */}
      <div className="filters-section">
        <p className="section-label">Years Experience</p>
        <div className="range-inputs">
          <input
            id="min-years-input"
            type="number"
            className="inline-input"
            placeholder="Min"
            min={0}
            max={40}
            value={filters.minYearsExperience ?? ''}
            onChange={(e) => {
              const v = e.target.value === '' ? undefined : parseInt(e.target.value);
              onFiltersChange({ ...filters, minYearsExperience: v });
            }}
          />
          <span className="range-sep">–</span>
          <input
            id="max-years-input"
            type="number"
            className="inline-input"
            placeholder="Max"
            min={0}
            max={40}
            value={filters.maxYearsExperience ?? ''}
            onChange={(e) => {
              const v = e.target.value === '' ? undefined : parseInt(e.target.value);
              onFiltersChange({ ...filters, maxYearsExperience: v });
            }}
          />
          <span className="text-muted">yrs</span>
        </div>
      </div>

      {/* Location */}
      <div className="filters-section">
        <p className="section-label">Location</p>
        <input
          id="location-input"
          type="text"
          className="inline-input"
          placeholder="e.g. San Francisco, Remote…"
          value={filters.location ?? ''}
          onChange={(e) => onFiltersChange({ ...filters, location: e.target.value || undefined })}
        />
      </div>

      {/* Company Type */}
      <div className="filters-section">
        <p className="section-label">Company Type</p>
        <div className="company-type-toggles">
          {COMPANY_TYPES.map((type) => {
            const selected = (filters.companyTypes ?? []).includes(type);
            return (
              <button
                key={type}
                id={`company-type-${type}`}
                className={`company-chip-toggle ${selected ? 'selected' : ''}`}
                onClick={() => toggleCompanyType(type)}
              >
                {type}
              </button>
            );
          })}
        </div>
      </div>

      {/* Rubric */}
      <div className="filters-section" style={{ flex: 1 }}>
        <p className="section-label">Fit Rubric</p>
        <p className="text-muted" style={{ marginBottom: 'var(--space-2)', fontSize: 12 }}>
          Subjective criteria the LLM uses to score candidates
        </p>
        <textarea
          id="rubric-textarea"
          className="rubric-textarea"
          value={rubric}
          onChange={(e) => onRubricChange(e.target.value)}
          placeholder="Describe what a great fit looks like beyond the hard filters…"
          rows={5}
        />
      </div>

      {/* Run Search Button */}
      <button
        id="run-search-btn"
        className="btn-primary run-search-btn"
        onClick={onRunSearch}
        disabled={isLoading || !rubric.trim()}
      >
        {isLoading ? (
          <>
            <span className="step-icon spin" style={{ width: 16, height: 16, borderWidth: 2 }} />
            Searching…
          </>
        ) : (
          <>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            Run Search
          </>
        )}
      </button>
    </>
  );
}
