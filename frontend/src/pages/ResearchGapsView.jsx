import React, { useState, useEffect } from 'react';
import { useProjects } from '../context/ProjectContext';
import { gapsAPI } from '../services/api';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Alert } from '../components/Alert';
import { Button } from '../components/Button';

// Demonstrative seed gaps for initial walkthrough and offline education
const SEED_GAPS = [
  {
    id: 'gap_1',
    title: 'Context Length Scaling & Quadratic Memory Bottleneck in Self-Attention',
    category: 'Scalability & Efficiency',
    description: 'While Vaswani et al. demonstrate that self-attention removes sequential dependency, the O(n^2) memory footprint prevents processing long documents beyond a few thousand tokens without IO tiling.',
    supporting_papers: [
      { paper_title: 'Attention Is All You Need', page_reference: 'Section 4, Page 6' },
      { paper_title: 'FlashAttention', page_reference: 'Section 1, Page 2' }
    ],
    evidence: 'Authors state: "Self-attention layers in the Transformer require quadratic memory with sequence length, posing significant memory overhead on GPU VRAM."',
    why_worth_investigating: 'Enabling language models to handle entire books or code repositories requires sub-quadratic or linear attention with exact or near-exact bounds.',
    future_direction: 'Investigate state-space models (SSMs) and hybrid linear-attention architectures for continuous streaming inference.'
  },
  {
    id: 'gap_2',
    title: 'Pre-Training / Fine-Tuning Token Distribution Discrepancy',
    category: 'Methodological Discrepancy',
    description: 'The standard Masked Language Modeling (MLM) objective in BERT replaces tokens with [MASK], which never appears in real fine-tuning or inference text.',
    supporting_papers: [
      { paper_title: 'BERT Pre-training', page_reference: 'Section 3.1, Page 4' }
    ],
    evidence: 'Devlin et al. explicitly note: "A downside of MLM is that we create a mismatch between pre-training and fine-tuning, since the [MASK] token never appears during fine-tuning."',
    why_worth_investigating: 'Prevents optimal representation learning on edge distribution tokens and introduces artificial bias during generative tasks.',
    future_direction: 'Explore replaced-token detection (e.g. ELECTRA) or contrastive denoising objectives without explicit artificial mask tokens.'
  }
];

export function ResearchGapsView() {
  const { currentProject } = useProjects();
  const papers = currentProject?.papers || [];

  const [selectedPaperIds, setSelectedPaperIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [gaps, setGaps] = useState(SEED_GAPS);
  const [activeCategory, setActiveCategory] = useState('All');
  const [disclaimer, setDisclaimer] = useState(
    "A research gap suggested from this collection of papers represents a candidate/potential gap grounded in author-stated limitations. It should be cross-verified against broader literature before forming a thesis or definitive conclusion."
  );

  // Initialize selected papers to all available papers in the project
  useEffect(() => {
    if (papers.length > 0) {
      setSelectedPaperIds(papers.map((p) => p._id || p.id));
    }
  }, [papers]);

  const handleTogglePaper = (pid) => {
    setSelectedPaperIds((prev) =>
      prev.includes(pid) ? prev.filter((id) => id !== pid) : [...prev, pid]
    );
  };

  const handleSelectAll = () => {
    if (selectedPaperIds.length === papers.length) {
      setSelectedPaperIds([]);
    } else {
      setSelectedPaperIds(papers.map((p) => p._id || p.id));
    }
  };

  const handleAnalyzeGaps = async () => {
    if (!currentProject) {
      setError('Please select or create a project first.');
      return;
    }

    if (papers.length === 0) {
      setError('No papers uploaded in this project. Please upload research papers to analyze gaps.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await gapsAPI.analyze(currentProject._id, selectedPaperIds);
      const data = response.data || response;

      if (data.potential_gaps && Array.isArray(data.potential_gaps)) {
        setGaps(data.potential_gaps);
        if (data.methodology_disclaimer) {
          setDisclaimer(data.methodology_disclaimer);
        }
      } else {
        throw new Error('Invalid response structure received from research gap analyzer.');
      }
    } catch (err) {
      setError(err.message || 'Failed to analyze potential research gaps.');
    } finally {
      setLoading(false);
    }
  };

  // Derive unique categories for filtering
  const categories = ['All', ...new Set(gaps.map((g) => g.category || 'General').filter(Boolean))];

  const filteredGaps = activeCategory === 'All'
    ? gaps
    : gaps.filter((g) => g.category === activeCategory);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title">Potential Research Gap Analysis</h1>
          <p className="page-subtitle">
            Evidence-based research gap synthesis derived from author limitations, methodological trade-offs, and experimental discrepancies.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <Button
            variant="primary"
            onClick={handleAnalyzeGaps}
            disabled={loading || papers.length === 0}
          >
            {loading ? 'Synthesizing Gaps...' : '⚡ Analyze Potential Gaps'}
          </Button>
        </div>
      </div>

      {/* Mandatory Epistemic Grounding Disclaimer */}
      <Alert type="warning" title="Methodological Notice & Epistemic Boundary">
        {disclaimer}
      </Alert>

      {error && (
        <Alert type="error" title="Analysis Error" style={{ marginTop: '1rem' }}>
          {error}
        </Alert>
      )}

      {/* Paper Selection & Project Context Strip */}
      <Card style={{ marginTop: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Corpus Papers ({papers.length > 0 ? `${selectedPaperIds.length} of ${papers.length} selected` : 'Demo Papers'})
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Select which papers in this project to include in the potential gap analysis:
            </p>
          </div>
          {papers.length > 0 && (
            <Button variant="ghost" size="sm" onClick={handleSelectAll}>
              {selectedPaperIds.length === papers.length ? 'Deselect All' : 'Select All'}
            </Button>
          )}
        </div>

        {papers.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {papers.map((p) => {
              const pid = p._id || p.id;
              const isSelected = selectedPaperIds.includes(pid);
              return (
                <button
                  key={pid}
                  type="button"
                  onClick={() => handleTogglePaper(pid)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.35rem 0.75rem',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    border: isSelected ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                    background: isSelected ? 'rgba(59, 130, 246, 0.12)' : 'var(--bg-secondary)',
                    color: isSelected ? 'var(--accent-primary)' : 'var(--text-secondary)'
                  }}
                >
                  <span>{isSelected ? '✓' : '+'}</span>
                  <span>{p.title || 'Untitled Paper'}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
            No papers uploaded in this project yet. Displaying baseline architectural seed gaps from canonical literature.
          </div>
        )}
      </Card>

      {/* Category Filter Pills */}
      {categories.length > 1 && (
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              style={{
                padding: '0.35rem 0.85rem',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.82rem',
                fontWeight: activeCategory === cat ? 600 : 400,
                cursor: 'pointer',
                border: activeCategory === cat ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                background: activeCategory === cat ? 'var(--accent-primary)' : 'var(--bg-card)',
                color: activeCategory === cat ? '#ffffff' : 'var(--text-secondary)',
                transition: 'all 0.15s ease'
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Potential Gaps Cards List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {filteredGaps.map((gap, idx) => (
          <Card key={gap.id || idx} style={{ borderLeft: '4px solid var(--accent-secondary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-secondary)' }}>
                  GAP #{idx + 1}
                </span>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                  {gap.title}
                </h3>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                {gap.category && <Badge variant="blue">{gap.category}</Badge>}
                <Badge variant="violet">Candidate Gap</Badge>
              </div>
            </div>

            <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: 1.6 }}>
              {gap.description}
            </p>

            {/* Direct Literature Evidence Box */}
            <div
              style={{
                background: 'var(--bg-secondary)',
                padding: '1rem',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '1rem',
                fontSize: '0.85rem',
                border: '1px solid var(--border-color)'
              }}
            >
              <div style={{ color: 'var(--accent-cyan)', fontWeight: 600, marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span>📄</span>
                <span>Direct Evidence from Literature:</span>
              </div>
              <div style={{ fontStyle: 'italic', color: 'var(--text-primary)', lineHeight: 1.5, paddingLeft: '0.5rem', borderLeft: '2px solid var(--accent-cyan)' }}>
                "{gap.evidence}"
              </div>

              {gap.supporting_papers && gap.supporting_papers.length > 0 && (
                <div style={{ marginTop: '0.6rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <strong>Supporting Paper References: </strong>
                  {gap.supporting_papers.map((sp, i) => (
                    <span key={i} style={{ color: 'var(--text-secondary)' }}>
                      {sp.paper_title || sp.name}
                      {sp.page_reference ? ` [${sp.page_reference}]` : (sp.pages ? ` [${sp.pages}]` : '')}
                      {i < gap.supporting_papers.length - 1 ? '; ' : ''}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Why Worth Investigating & Future Direction Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', fontSize: '0.85rem' }}>
              <div
                style={{
                  background: 'rgba(59, 130, 246, 0.06)',
                  padding: '0.85rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--accent-primary-border)'
                }}
              >
                <div style={{ fontWeight: 600, color: 'var(--accent-primary)', marginBottom: '0.25rem' }}>
                  🎯 Why Worth Investigating (Research Motivation):
                </div>
                <p style={{ color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                  {gap.why_worth_investigating || gap.whyInvestigate}
                </p>
              </div>

              <div
                style={{
                  background: 'rgba(16, 185, 129, 0.06)',
                  padding: '0.85rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-success-border)'
                }}
              >
                <div style={{ fontWeight: 600, color: 'var(--color-success)', marginBottom: '0.25rem' }}>
                  🔬 Actionable Future Direction:
                </div>
                <p style={{ color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                  {gap.future_direction || gap.futureDirection}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default ResearchGapsView;
