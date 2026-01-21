import OpenAI from 'openai';

const buildPrompt = ({
  feature,
  problem,
  persona,
  personaNote,
  outcome,
  evidence,
  length,
  image
}) => `
You are an Elite Product Strategist who specializes in translating Sales requests into high-impact Product requirements. Your goal is to take raw feedback from a salesperson and turn it into a concrete, defensible argument for a PM.

### THE RAW SALES INPUTS
- **The Feature Idea:** ${feature} (This may be vague; your job is to make it concrete).
- **The Problem It Solves:** ${problem}
- **The Sales Goal:** "${outcome}" (Why the salesperson wants this).
- **The Proof Point:** ${evidence && evidence.trim().length > 0 ? evidence : 'No specific data provided.'}
${image ? "- **Visual/Screenshot Provided:** Use this to identify specific UI/UX gaps." : ""}

### THE TARGET AUDIENCE
- **PM Type:** ${persona}
- **PM Personality/Vibe:** ${personaNote}

### YOUR TRANSLATION STRATEGY
1. **Refine the Feature:** Don't just repeat what the salesperson said. Translate vague requests (e.g., "Make it better") into concrete product functionality (e.g., "Streamlining the API authentication flow").
2. **Bridge the Gap:** Explicitly connect the "${outcome}" (Sales) to the PM's internal goals (e.g., User Retention, Reducing Churn, or Acquisition).
3. **Product-First Language:** - Use terms like "reducing friction," "unblocking the funnel," or "mitigating churn risk."
   - Avoid "Sales-y" language like "The client really wants this" or "We need this to win." Instead, use "This addresses a recurring friction point identified in [Evidence]."
4. **Mirror Personality:** Use the "${personaNote}" to dictate the tone. If the PM is "No-nonsense/Data-driven," be clinical. If they are "User-centric," focus on the human pain point.
5. **The Soft Close:** Suggest a low-stakes next step (e.g., a brief technical scoping or a quick review of the evidence).

### CONSTRAINTS
- **Format:** Output ONLY a JSON object: {"variants": ["string"]}. 
- **Content:** Provide exactly ONE variant that is ready to copy and paste.
- **Structure:** Use bullet points for readability.
- **Opening:** The first line must start with "Feature Idea: " followed by a succinct description of the feature.
- **Specific askers:** If the Proof Point names a specific customer or user, explicitly include that in the output.
- **Success criteria:** Use the Problem statement to define what success looks like if the problem is solved.
- **Length:** Exactly ${length === 'ultra' ? '2-3' : '4-6'} sentences.

### THE TASK
Translate the salesperson's request into a professional, concrete, and high-conviction product argument.

### OUTPUT TEMPLATE (FOLLOW EXACTLY)
**Feature Idea:** <succinct description of the feature>

**Problem & Impact:** <tie the problem to PM impact; 1 sentence>
**Success Looks Like:** <define success based on the problem; 1 sentence>
**Evidence & Ask:** <include specific customer/user if mentioned; end with a low-stakes next step; 1 sentence>
`;

export const config = {
  runtime: 'nodejs'
};

const apiKey = process.env.OPENAI_API_KEY;
const client = apiKey ? new OpenAI({ apiKey }) : null;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  if (!client) {
    return res.status(500).json({ error: 'Missing OPENAI_API_KEY in environment.' });
  }

  const {
    feature,
    problem,
    persona,
    personaNote,
    outcome,
    evidence,
    length,
    imageDataUrl
  } = req.body || {};

  if (!feature || feature.trim().length < 3) {
    return res.status(400).json({ error: 'Feature is required.' });
  }

  try {
    const userContent = [
      {
        type: 'text',
        text: buildPrompt({
          feature,
          problem,
          persona,
          personaNote,
          outcome,
          evidence,
          length,
          image: Boolean(imageDataUrl)
        })
      }
    ];

    if (typeof imageDataUrl === 'string' && imageDataUrl.startsWith('data:image/')) {
      userContent.push({
        type: 'image_url',
        image_url: {
          url: imageDataUrl
        }
      });
    }

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You write concise, PM-friendly arguments for product proposals.'
        },
        {
          role: 'user',
          content: userContent
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7
    });

    const content = completion.choices?.[0]?.message?.content || '{}';
    const parsed = JSON.parse(content);
    const variants = Array.isArray(parsed.variants) ? parsed.variants : [];

    if (variants.length < 1) {
      return res.status(500).json({ error: 'No variants returned.' });
    }

    return res.json({ variants });
  } catch (error) {
    console.error('OpenAI error', error);
    return res.status(500).json({ error: 'Failed to generate argument.' });
  }
}
