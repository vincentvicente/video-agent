import axios from 'axios'

const API_BASE = 'http://localhost:8080/api'

export function streamChat(conversationId, message, onToken, onToolStart, onToolEnd, onReactStep, onDone, onError) {
  fetch(`${API_BASE}/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ conversationId, message })
  }).then(async (res) => {
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) { onDone(); break }

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop()

      for (const line of lines) {
        if (line.startsWith('data:')) {
          const raw = line.slice(5).trim()
          if (!raw) continue

          try {
            const event = JSON.parse(raw)
            switch (event.type) {
              case 'token':
                onToken(event.data)
                break
              case 'tool_start':
                onToolStart(event.data)
                break
              case 'tool_end':
                onToolEnd(event.data)
                break
              case 'react_step':
                onReactStep(event.data)
                break
              case 'done':
                onDone()
                break
              case 'error':
                onError(new Error(event.data.message || 'Unknown error'))
                break
              default:
                // Unknown event type, treat as token if string
                if (typeof event.data === 'string') {
                  onToken(event.data)
                }
            }
          } catch (e) {
            // Not JSON, treat as plain text token
            onToken(raw)
          }
        }
      }
    }
  }).catch(onError)
}

export async function uploadDocument(file) {
  const formData = new FormData()
  formData.append('file', file)
  const res = await axios.post(`${API_BASE}/rag/upload`, formData)
  return res.data
}

export async function searchRag(query, topK = 5) {
  const res = await axios.get(`${API_BASE}/rag/search`, { params: { query, topK } })
  return res.data
}
