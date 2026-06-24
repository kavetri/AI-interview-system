// OpenRouter API Helper
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export const callOpenRouter = async (prompt, systemPrompt = '') => {
  try {
    const messages = [];
    
    if (systemPrompt) {
      messages.push({
        role: 'system',
        content: systemPrompt
      });
    }
    
    messages.push({
      role: 'user',
      content: prompt
    });

    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.REACT_APP_OPENROUTER_API_KEY}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'PERFEXA'
      },
      body: JSON.stringify({
        model: process.env.REACT_APP_MODEL_NAME || 'anthropic/claude-3.5-sonnet',
        messages: messages,
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('OpenRouter API Error:', error);
    throw error;
  }
};

// For streaming responses (optional)
export const callOpenRouterStream = async (prompt, onChunk, systemPrompt = '') => {
  try {
    const messages = [];
    
    if (systemPrompt) {
      messages.push({
        role: 'system',
        content: systemPrompt
      });
    }
    
    messages.push({
      role: 'user',
      content: prompt
    });

    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.REACT_APP_OPENROUTER_API_KEY}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'PERFEXA'
      },
      body: JSON.stringify({
        model: process.env.REACT_APP_MODEL_NAME || 'anthropic/claude-3.5-sonnet',
        messages: messages,
        temperature: 0.7,
        max_tokens: 2000,
        stream: true
      })
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(line => line.trim() !== '');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') return;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices[0]?.delta?.content;
            if (content && onChunk) {
              onChunk(content);
            }
          } catch (e) {
            console.error('Parse error:', e);
          }
        }
      }
    }
  } catch (error) {
    console.error('OpenRouter Streaming Error:', error);
    throw error;
  }
};
