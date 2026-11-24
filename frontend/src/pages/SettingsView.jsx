import React, { useState } from 'react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Badge } from '../components/Badge';
import { Alert } from '../components/Alert';

export function SettingsView() {
  const [llmProvider, setLlmProvider] = useState('gemini');
  const [modelName, setModelName] = useState('gemini-1.5-flash');
  const [embeddingModel, setEmbeddingModel] = useState('all-MiniLM-L6-v2');
  const [saved, setSaved] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings & Model Configuration</h1>
          <p className="page-subtitle">Configure LLM providers, vector indexing settings, and API preferences</p>
        </div>
        <Button variant="primary" size="sm" onClick={handleSave}>
          Save Settings
        </Button>
      </div>

      {saved && (
        <Alert type="success" onClose={() => setSaved(false)}>
          Configuration preferences saved!
        </Alert>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* AI & LLM Settings */}
        <Card>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '1rem' }}>
            AI & LLM Model Provider
          </h3>

          <div className="form-group">
            <label className="form-label">Selected LLM Provider</label>
            <select
              className="form-select"
              value={llmProvider}
              onChange={(e) => setLlmProvider(e.target.value)}
            >
              <option value="gemini">Google Gemini (Gemini 1.5 Flash)</option>
              <option value="openai">OpenAI (GPT-4o Mini / GPT-4o)</option>
              <option value="anthropic">Anthropic (Claude 3.5 Sonnet)</option>
              <option value="ollama">Ollama (Local Llama 3 / Mistral)</option>
            </select>
            <span className="form-help">Configured via root .env as LLM_PROVIDER</span>
          </div>

          <Input
            label="Model Identifier"
            value={modelName}
            onChange={(e) => setModelName(e.target.value)}
            helperText="Specifies the model version invoked by the Python AI service"
          />

          <Input
            label="Embedding Model (Sentence Transformers)"
            value={embeddingModel}
            onChange={(e) => setEmbeddingModel(e.target.value)}
            helperText="Used by ChromaDB for dense semantic retrieval (default: all-MiniLM-L6-v2)"
          />
        </Card>

        {/* Storage & Environment Status */}
        <Card>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '1rem' }}>
            Environment & Microservice Status
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>Express API Gateway</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>http://localhost:5000</div>
              </div>
              <Badge variant="success">Configured</Badge>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>Python AI Microservice</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>http://localhost:8000</div>
              </div>
              <Badge variant="violet">FastAPI Ready</Badge>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>Vector Storage (ChromaDB)</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>./data/chroma</div>
              </div>
              <Badge variant="cyan">Phase 7</Badge>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default SettingsView;
