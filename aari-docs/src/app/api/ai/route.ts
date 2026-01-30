import { NextRequest, NextResponse } from 'next/server'

// AI Writing Assistant API
// Supports: Groq (primary), OpenAI (fallback)

const SYSTEM_PROMPT = `You are a helpful writing assistant. You help users improve their writing by following their specific instructions. 
- Be concise and direct
- Maintain the original tone and style unless asked to change it
- Return ONLY the improved text, no explanations or preamble
- Keep the same language as the input`

export async function POST(req: NextRequest) {
  try {
    const { text, action, customPrompt } = await req.json()

    if (!text) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 })
    }

    const prompt = getPromptForAction(action, text, customPrompt)

    // Try Groq first (faster and free tier available), then OpenAI
    const groqKey = process.env.GROQ_API_KEY
    const openaiKey = process.env.OPENAI_API_KEY

    if (groqKey) {
      const result = await callGroqAPI(groqKey, prompt)
      if (result) {
        return NextResponse.json({ result, provider: 'groq' })
      }
    }

    if (openaiKey) {
      const result = await callOpenAIAPI(openaiKey, prompt)
      if (result) {
        return NextResponse.json({ result, provider: 'openai' })
      }
    }

    // No API key - return mock response for demo
    return NextResponse.json({
      result: getMockResponse(text, action),
      mock: true,
    })

  } catch (error) {
    console.error('AI route error:', error)
    return NextResponse.json(
      { error: 'Failed to process AI request' },
      { status: 500 }
    )
  }
}

async function callGroqAPI(apiKey: string, prompt: string): Promise<string | null> {
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant', // Fast model, good for quick edits
        // Other options: 'llama-3.3-70b-versatile', 'mixtral-8x7b-32768'
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        max_tokens: 1024,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('Groq API error:', error)
      return null
    }

    const data = await response.json()
    return data.choices[0]?.message?.content?.trim() || null
  } catch (error) {
    console.error('Groq API call failed:', error)
    return null
  }
}

async function callOpenAIAPI(apiKey: string, prompt: string): Promise<string | null> {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        max_tokens: 1024,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('OpenAI API error:', error)
      return null
    }

    const data = await response.json()
    return data.choices[0]?.message?.content?.trim() || null
  } catch (error) {
    console.error('OpenAI API call failed:', error)
    return null
  }
}

function getPromptForAction(action: string, text: string, customPrompt?: string): string {
  switch (action) {
    case 'summarize':
      return `Summarize the following text in 1-2 concise sentences:\n\n"${text}"`

    case 'expand':
      return `Expand the following text with more detail and examples, making it about 2-3x longer while keeping the same meaning:\n\n"${text}"`

    case 'fix':
      return `Fix any grammar, spelling, and punctuation errors in the following text. Return the corrected version:\n\n"${text}"`

    case 'improve':
      return `Improve the following text to make it clearer, more professional, and more engaging:\n\n"${text}"`

    case 'simplify':
      return `Simplify the following text to make it easier to understand, using simpler words and shorter sentences:\n\n"${text}"`

    case 'formal':
      return `Rewrite the following text in a more formal, professional tone:\n\n"${text}"`

    case 'casual':
      return `Rewrite the following text in a more casual, friendly tone:\n\n"${text}"`

    case 'bullets':
      return `Convert the following text into clear bullet points:\n\n"${text}"`

    case 'translate':
      return `Translate the following text to English. If the text is already in English, return it as is. Only return the translated text, no explanations:\n\n"${text}"`

    case 'custom':
      return `${customPrompt}:\n\n"${text}"`

    default:
      return `Improve the following text:\n\n"${text}"`
  }
}

// Mock responses for demo without API key
function getMockResponse(text: string, action: string): string {
  switch (action) {
    case 'summarize':
      return `This text discusses ${text.split(' ').slice(0, 5).join(' ')}... [Demo - Add GROQ_API_KEY for real AI]`

    case 'expand':
      return `${text} Furthermore, this point highlights the importance of clear communication. Additionally, we should consider the broader context and implications of this statement.`

    case 'fix':
      let fixed = text.charAt(0).toUpperCase() + text.slice(1)
      if (!fixed.endsWith('.') && !fixed.endsWith('!') && !fixed.endsWith('?')) {
        fixed += '.'
      }
      return fixed

    case 'improve':
      return `${text} [Enhanced - Add GROQ_API_KEY for real AI]`

    case 'simplify':
      return text.split(',')[0] + '.'

    case 'formal':
      return `It should be noted that ${text.toLowerCase()}`

    case 'casual':
      return `So basically, ${text.toLowerCase()}`

    case 'bullets':
      return `• ${text.split('. ').join('\n• ')}`

    case 'translate':
      return `${text} [Translated - Add GROQ_API_KEY for real AI]`

    default:
      return text
  }
}