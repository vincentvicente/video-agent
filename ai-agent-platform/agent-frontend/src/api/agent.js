import axios from 'axios'

const API_BASE = 'http://localhost:8080/api'

export function streamChat(conversationId, message, onToken, onToolStart, onToolEnd, onReactStep, onDone, onError) {
  const response = fetch(`${API_BASE}/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ conversationId, message })
  })

  response.then(async (res) => {
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
          const data = line.slice(5).trim()
          if (data) onToken(data)
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
