import express from 'express'
import { createServer } from 'http'
import { WebSocketServer } from 'ws'
import cors from 'cors'
import { fileURLToPath } from 'url'
import { join, dirname } from 'path'
import { Redis } from '@upstash/redis'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
const server = createServer(app)
const wss = new WebSocketServer({ server, path: '/ws' })

app.use(cors())
app.use(express.json())

const redis = (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
  ? new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN })
  : null

const memRooms = new Map()
const memAnswers = new Map()

const ROOM_TTL = 60 * 60 * 24 * 3

async function getRoom(code) {
  if (redis) return redis.get(`room:${code}`)
  return memRooms.get(code) ?? null
}

async function setRoom(code, room) {
  if (redis) return redis.set(`room:${code}`, room, { ex: ROOM_TTL })
  memRooms.set(code, room)
}

async function roomExists(code) {
  if (redis) return !!(await redis.exists(`room:${code}`))
  return memRooms.has(code)
}

async function saveAnswer(answer) {
  if (redis) {
    await redis.set(`answer:${answer.id}`, answer, { ex: ROOM_TTL })
    await redis.lpush(`answers:${answer.roomCode}`, answer.id)
    await redis.expire(`answers:${answer.roomCode}`, ROOM_TTL)
  } else {
    memAnswers.set(answer.id, answer)
  }
}

async function updateAnswer(answer) {
  if (redis) return redis.set(`answer:${answer.id}`, answer, { ex: ROOM_TTL })
  memAnswers.set(answer.id, answer)
}

async function getAnswer(id) {
  if (redis) return redis.get(`answer:${id}`)
  return memAnswers.get(id) ?? null
}

async function getRoomAnswers(code) {
  if (redis) {
    const ids = await redis.lrange(`answers:${code}`, 0, -1)
    if (!ids.length) return []
    const items = await Promise.all(ids.map(id => redis.get(`answer:${id}`)))
    return items.filter(Boolean)
  }
  return [...memAnswers.values()].filter(a => a.roomCode === code)
}

const roomSubscriptions = new Map()

function genCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

function genId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

function broadcast(roomCode, data) {
  const subs = roomSubscriptions.get(roomCode)
  if (!subs) return
  const msg = JSON.stringify(data)
  subs.forEach(ws => { if (ws.readyState === 1) ws.send(msg) })
}

wss.on('connection', (ws) => {
  let subscribedRoom = null

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString())
      if (msg.type === 'subscribe' && msg.roomCode) {
        subscribedRoom = msg.roomCode.toUpperCase()
        if (!roomSubscriptions.has(subscribedRoom)) roomSubscriptions.set(subscribedRoom, new Set())
        roomSubscriptions.get(subscribedRoom).add(ws)
      }
      if (msg.type === 'join' && msg.roomCode && msg.userName && msg.userId) {
        const code = msg.roomCode.toUpperCase()
        broadcast(code, { type: 'member_join', userId: msg.userId, userName: msg.userName })
      }
    } catch {}
  })

  ws.on('close', () => {
    if (subscribedRoom) {
      const subs = roomSubscriptions.get(subscribedRoom)
      if (subs) subs.delete(ws)
    }
  })
})

app.get('/api/room/:code', async (req, res) => {
  const code = req.params.code.toUpperCase()
  const room = await getRoom(code)
  if (!room) return res.status(404).json({ error: '找不到房間' })
  res.json(room)
})

app.post('/api/room', async (req, res) => {
  const { title, content, questions, hostId } = req.body
  if (!title || !content || !Array.isArray(questions) || questions.length < 2 || !hostId) {
    return res.status(400).json({ error: '缺少必要欄位' })
  }
  let code = genCode()
  while (await roomExists(code)) code = genCode()
  const room = { id: code, title, content, questions: questions.slice(0, 2), hostId, createdAt: Date.now() }
  await setRoom(code, room)
  res.json({ roomCode: code })
})

app.get('/api/room/:code/answers', async (req, res) => {
  const code = req.params.code.toUpperCase()
  const result = await getRoomAnswers(code)
  res.json(result)
})

app.post('/api/answer', async (req, res) => {
  const { roomCode, userId, userName, questionIndex, answerText } = req.body
  if (!roomCode || !userId || !userName || questionIndex === undefined || !answerText) {
    return res.status(400).json({ error: '缺少必要欄位' })
  }
  const code = roomCode.toUpperCase()
  if (!(await roomExists(code))) return res.status(404).json({ error: '房間不存在' })
  const id = genId()
  const answer = { id, roomCode: code, userId, userName, questionIndex, answerText, isPublished: false, createdAt: Date.now() }
  await saveAnswer(answer)
  broadcast(code, { type: 'answer_update', answer })
  res.json(answer)
})

app.patch('/api/answer/:id/publish', async (req, res) => {
  const answer = await getAnswer(req.params.id)
  if (!answer) return res.status(404).json({ error: '找不到回答' })
  answer.isPublished = req.body.isPublished ?? !answer.isPublished
  await updateAnswer(answer)
  broadcast(answer.roomCode, { type: 'answer_update', answer })
  res.json(answer)
})

app.post('/api/generate', async (req, res) => {
  const { content } = req.body
  if (!content) return res.status(400).json({ error: '缺少文章內容' })
  const key = process.env.GROQ_API_KEY
  if (!key) return res.status(500).json({ error: '伺服器未設定 GROQ_API_KEY' })

  const prompt = `你是一位優秀的讀書會引導師。請根據以下文章內容，設計 2 道能激發深度討論的開放性思辨問題。
要求：
1. 問題應能引導讀者反思、辯論或從不同角度思考
2. 避免是非題，鼓勵多元觀點
3. 以繁體中文回答
4. 只回傳 JSON 物件，格式為：{"questions": ["問題1", "問題2"]}

文章內容：
${content.slice(0, 3000)}`

  const model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'
  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.7,
      }),
    })
    if (!r.ok) {
      const detail = await r.text().catch(() => '')
      throw new Error(`Groq API ${r.status} (model=${model})${detail ? ': ' + detail.slice(0, 200) : ''}`)
    }
    const data = await r.json()
    const text = data?.choices?.[0]?.message?.content || ''
    const parsed = JSON.parse(text)
    const questions = Array.isArray(parsed) ? parsed : parsed.questions
    if (!Array.isArray(questions) || questions.length < 2) throw new Error('格式異常')
    res.json({ questions: questions.slice(0, 2) })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.use(express.static(join(__dirname, 'dist')))
app.get('*', (req, res) => res.sendFile(join(__dirname, 'dist', 'index.html')))

const PORT = process.env.PORT || 3000
server.listen(PORT, () => console.log(`SympoRead running on http://localhost:${PORT}`))
