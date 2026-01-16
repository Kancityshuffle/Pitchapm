import { useEffect, useMemo, useRef, useState } from 'react';

const personas = [
  {
    id: 'growth',
    label: 'Growth PM',
    focus: 'activation, conversion, and retention loops'
  },
  {
    id: 'core',
    label: 'Core Product PM',
    focus: 'daily usage, clarity, and customer trust'
  },
  {
    id: 'new',
    label: 'New Product PM',
    focus: '0-1, Path to MVP, massive market size'
  },
  
];

const outcomes = [
  {
    id: 'speed',
    label: 'Close more deals',
    metric: 'deals closed'
  },
  {
    id: 'precision',
    label: 'Increase Deal Size',
    metric: 'average contract value'
  },
  {
    id: 'coverage',
    label: 'Keep a Customer',
    metric: 'renewal rate'
  }
];

const archetypes = [
  {
    id: 'data-revenue',
    label: 'Data & Revenue',
    // note: 'They are data-obsessed and care about ARR above all else.'
  },
  {
    id: 'ux-quality',
    label: 'User Experience',
    // note: 'They care about the user experience and hate technical debt or clunky UI.'
  },
  {
    id: 'vision-strategy',
    label: 'Long Term Scalability',
    // note: 'They care about long-term strategy and building scalable features.'
  }
];

const fallbackOpeners = [
  'This is a direct, low-scope lever with real upside.',
  'This is a focused, high-signal feature request.',
  'This is a pragmatic move with measurable impact.'
];

const fallbackAsks = [
  'If you agree, I can send a 1-pager and we can run a quick smoke test.',
  'We can test this with a small cohort and review the lift together.',
  'Happy to put a one-pager together and run a lightweight pilot.'
];

const pick = (list) => list[Math.floor(Math.random() * list.length)];

const clampText = (text) => text.trim().replace(/\s+/g, ' ');

const buildFallback = ({ feature, persona, personaNote, outcome, length }) => {
  const personaLabel = persona ? personas.find((item) => item.id === persona)?.label : '';
  const outcomeLabel = outcome ? outcomes.find((item) => item.id === outcome)?.label : '';
  const safeFeature = clampText(feature || 'this feature');
  const personality = personaNote ? clampText(personaNote) : '';

  const sentence1 = `${pick(fallbackOpeners)} ${safeFeature} directly supports ${outcomeLabel.toLowerCase()}.`;
  const sentence2 = personaLabel
    ? `It is framed for a ${personaLabel}${personality ? ` who is ${personality}` : ''}.`
    : `It is framed for the PM${personality ? ` who is ${personality}` : ''}.`;
  const sentence3 = pick(fallbackAsks);

  if (length === 'ultra') {
    return [sentence1, sentence3].join(' ');
  }

  return [sentence1, sentence2, sentence3].join(' ');
};

export default function App() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    feature: '',
    problem: '',
    personaArchetype: 'data-revenue',
    persona: 'growth',
    personaNote: 'They are data-obsessed and care about ARR above all else.',
    outcome: 'speed',
    evidence: '',
    length: 'short'
  });
  const [drafts, setDrafts] = useState([]);
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [imageDataUrl, setImageDataUrl] = useState('');
  const [imageName, setImageName] = useState('');
  const featureInputRef = useRef(null);
  const problemInputRef = useRef(null);

  useEffect(() => {
    if (step === 0 && featureInputRef.current) {
      featureInputRef.current.focus();
    }
    if (step === 1 && problemInputRef.current) {
      problemInputRef.current.focus();
    }
  }, [step]);

  const progressLabel = useMemo(() => {
    const labels = ['Feature', 'Problem', 'PM context', 'Outcome', 'Argument'];
    return labels[step] || 'Argument';
  }, [step]);

  const updateForm = (patch) => setForm((prev) => ({ ...prev, ...patch }));

  const canContinue = useMemo(() => {
    if (step === 0) return form.feature.trim().length > 2;
    if (step === 1) return form.problem.trim().length > 2;
    if (step === 2) return form.personaArchetype.trim().length > 0;
    if (step === 3) return form.outcome.trim().length > 0;
    return true;
  }, [step, form]);

  const requestDrafts = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...form,
          imageDataUrl,
          imageName
        })
      });

      if (!response.ok) {
        throw new Error('API error');
      }

      const data = await response.json();
      if (Array.isArray(data.variants) && data.variants.length > 0) {
        setDrafts([data.variants[0]]);
      } else {
        throw new Error('No variants returned');
      }
    } catch (err) {
      setDrafts([buildFallback(form)]);
      setError('LLM unavailable. Showing local fallback copy.');
    } finally {
      setIsLoading(false);
    }
  };

  const goNext = async () => {
    if (!canContinue) return;
    if (step < 3) {
      setStep((prev) => prev + 1);
      return;
    }

    await requestDrafts();
    setStep(4);
    setCopied(false);
  };

  const goBack = () => setStep((prev) => Math.max(prev - 1, 0));

  const regenerate = async () => {
    await requestDrafts();
    setCopied(false);
  };

  const copyDraft = async () => {
    const text = drafts[0] || '';
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (error) {
      setCopied(false);
    }
  };

  const onImageChange = (event) => {
    setError('');
    const file = event.target.files?.[0];
    if (!file) {
      setImageDataUrl('');
      setImageName('');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file.');
      return;
    }

    const maxBytes = 2 * 1024 * 1024;
    if (file.size > maxBytes) {
      setError('Image too large. Please use a file under 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImageDataUrl(reader.result);
      setImageName(file.name);
    };
    reader.onerror = () => {
      setError('Could not read the image file.');
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="app">
      <header className="hero">
        <div>
          <p className="eyebrow">The PM Whisperer</p>
          <h1>Sick and tired of "it's on the roadmap"?</h1>
          <p className="subhead">
            Enter a feature you want built. Answer a few questions. Get a pitch that will convince the most meticulous PM or your money back*.
          </p>
        </div>
        {/* <div className="hero-card">
          <p className="hero-label">Live preview</p>
          <p className="hero-text">
            {form.feature
              ? `A ${form.feature} feature gives the PM a crisp lens on the slice they care about.`
              : 'A feature that makes decisions faster and clearer.'}
          </p>
        </div> */}
      </header>

      <main className="panel">
        <div className="panel-left">
          {step === 0 && (
            <section className="step">
              <div className="step-header">
                <h2>What feature do you want built?</h2>
                <span className="step-count">Step 1 of 5</span>
              </div>
              <p className="step-copy">
              What is it? What do you want it to do?
              </p>
              <textarea
                className="text-area feature-input"
                value={form.feature}
                onChange={(event) => updateForm({ feature: event.target.value })}
                placeholder="Just start typing."
                rows={3}
                ref={featureInputRef}
              />
              <label className="toggle">
                <span>Feature image (optional)</span>
                <input
                  className="file-input"
                  type="file"
                  accept="image/*"
                  onChange={onImageChange}
                  id="feature-image"
                />

                <label className="file-button" htmlFor="feature-image">
                  {imageName ? 'Change image' : 'Choose image'}
                </label>
                {imageName && <p className="file-meta">{imageName}</p>}
              </label>
            </section>
          )}

          {step === 1 && (
            <section className="step">
              <div className="step-header">
                <h2>What problem does it solve?</h2>
                <span className="step-count">Step 2 of 5</span>
              </div>
              <p className="step-copy">
                What's the problem the user or customer has? Be specific about the pain.
              </p>
              <textarea
                className="text-area"
                value={form.problem}
                onChange={(event) => updateForm({ problem: event.target.value })}
                placeholder="e.g. users have to press three buttons to send a single invoice"
                rows={3}
                ref={problemInputRef}
              />
            </section>
          )}

          {step === 2 && (
            <section className="step">
              <div className="step-header">
                <h2>What does the PM care about?</h2>
                <span className="step-count">Step 3 of 5</span>
              </div>
              <p className="step-copy">
              
              </p>
              <div className="card-grid">
                {archetypes.map((item) => (
                  <button
                    key={item.id}
                    className={
                      form.personaArchetype === item.id ? 'card card-active' : 'card'
                    }
                    onClick={() => updateForm({ personaArchetype: item.id, personaNote: item.note })}
                    type="button"
                  >
                    <span className="card-title">{item.label}</span>
                    <span className="card-body">{item.note}</span>
                  </button>
                ))}
              </div>
              <textarea
                className="text-area"
                value={form.personaNote}
                onChange={(event) => updateForm({ personaNote: event.target.value })}
                placeholder="Optional: feel free to give me more background on the PM."
                rows={3}
              />
              {/* <p className="step-copy">What's their role?</p>
              <div className="card-grid">
                {personas.map((item) => (
                  <button
                    key={item.id}
                    className={
                      form.persona === item.id ? 'card card-active' : 'card'
                    }
                    onClick={() => updateForm({ persona: item.id })}
                  >
                    <span className="card-title">{item.label}</span>
                    <span className="card-body">{item.focus}</span>
                  </button>
                ))}
              </div> */}
          
            </section>
          )}

          {step === 3 && (
            <section className="step">
              <div className="step-header">
                <h2>How does this help us win?</h2>
                <span className="step-count">Step 4 of 5</span>
              </div>
              
              <div className="card-grid">
                {outcomes.map((item) => (
                  <button
                    key={item.id}
                    className={
                      form.outcome === item.id ? 'card card-active' : 'card'
                    }
                    onClick={() => updateForm({ outcome: item.id })}
                  >
                    <span className="card-title">{item.label}</span>
                    {/* <span className="card-body">Metric: {item.metric}</span> */}
                  </button>
                ))}
              </div>
              <label className="toggle">
                {/* <span>Proof point (optional)</span> */}
                <h2>Who specifically is asking for it?</h2> 
                <textarea
                  className="text-area"
                  value={form.evidence}
                  onChange={(event) => updateForm({ evidence: event.target.value })}
                  placeholder="e.g., Jane Doe (Procurement), Acme Corp (Pays $50k/yr), 4 similar customer requests."
                  rows={3}
                />
              </label>
            </section>
          )}

          {step === 4 && (
            <section className="step">
              <div className="step-header">
                <h2>Your Personalized PM argument</h2>
                <span className="step-count">Step 5 of 5</span>
              </div>
              <p className="step-copy">
Like a good sales pitch, the more personalized the better.              </p>
              <div className="drafts">
                <div className="quote-output quote-output-editable">
                  <span className="quote-mark">“</span>
                  <textarea
                    className="quote-textarea"
                    value={drafts[0] || ''}
                    onChange={(event) => setDrafts([event.target.value])}
                    rows={6}
                  />
                  <span className="quote-mark">”</span>
                </div>
              </div>
              <div className="actions">
                <button className="primary primary-copy" onClick={copyDraft}>
                  {copied ? 'Copied' : 'Copy text'}
                </button>
              </div>
              {error && <p className="error">{error}</p>}
              
            </section>
          )}

          <div className="nav">
            {step > 0 && step < 4 && (
              <button className="ghost" onClick={goBack}>
                Back
              </button>
            )}
            {step < 4 && (
              <button className="primary" onClick={goNext} disabled={!canContinue || isLoading}>
                {step < 3 ? 'Next' : isLoading ? 'Generating...' : 'Generate argument'}
              </button>
            )}
            {step === 4 && (
              <a
                
                href="#"
                onClick={(event) => {
                  event.preventDefault();
                  setStep(0);
                }}
              >
                Get another feature argument
              </a>
            )}
          </div>
        </div>

        {/* <aside className="panel-right">
          <div className="summary">
            <h3>Inputs</h3>
            <div className="summary-row">
              <span>Feature</span>
              <strong>{form.feature || 'Not set'}</strong>
            </div>
            <div className="summary-row">
              <span>Problem</span>
              <strong>{form.problem || 'Not set'}</strong>
            </div>
            <div className="summary-row">
              <span>Persona</span>
              <strong>
                {personas.find((item) => item.id === form.persona)?.label || 'Not set'}
              </strong>
            </div>
            <div className="summary-row">
              <span>Sales outcome</span>
              <strong>
                {outcomes.find((item) => item.id === form.outcome)?.label || 'Not set'}
              </strong>
            </div>
            <div className="summary-row">
              <span>Evidence</span>
              <strong>{form.evidence ? 'Provided' : 'None'}</strong>
            </div>
            <div className="summary-row">
              <span>Image</span>
              <strong>{imageName ? 'Attached' : 'None'}</strong>
            </div>
            <div className="summary-row">
              <span>Length</span>
              <strong>{lengths.find((item) => item.id === form.length)?.label}</strong>
            </div>
          </div> */}

          {/* <div className="summary note">
            <h3>Why this works</h3>
            <p>
              It ties the feature to a concrete sales result, keeps the framing crisp, and proposes
              a safe, measurable next step.
            </p>
          </div> */}
        {/* </aside> */}
      </main>
      <p className="footer-joke">* This product is free so...yea.</p>
      <a
        href="https://arkweaver.com"
        target="_blank"
        rel="noopener noreferrer"
        className="powered-by"
      >
        <span>Powered by</span>
        <img
          src="/arkweaver_transparent_logo.png"
          alt="Arkweaver logo"
          className="powered-by-logo"
        />
      </a>
    </div>
  );
}
