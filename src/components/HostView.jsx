import React, { useState, useEffect } from 'react'

const ANONYMOUS_NAMES = [
  '深思的哲學家', '縝密的分析者', '銳利的批評者', '洞見的觀察者',
  '清醒的夢想家', '理性的詩人', '審慎的探索者', '敏銳的質疑者',
  '沉靜的智者', '勇敢的論辯者', '細膩的讀者', '遠見的思考者',
]

function copyRoomCode(code) {
  try {
    const ta = document.createElement('textarea')
    ta.value = code
    ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0'
    document.body.appendChild(ta)
    ta.focus()
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
    return true
  } catch { return false }
}

export default function HostView({ userId, onBack }) {
  const [step, setStep] = useState('compose')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [generating, setGenerating] = useState(false)
  const [questions, setQuestions] = useState([])
  const [genError, setGenError] = useState('')
  const [roomCode, setRoomCode] = useState('')
  const [creating, setCreating] = useState(false)
  const [answers, setAnswers] = useState([])
  const [copied, setCopied] = useState(false)
  const [filterQ, setFilterQ] = useState(-1)

  async function generateQuestions() {
    if (!content.trim()) { setGenError('請先輸入共讀文章或書摘'); return }
    setGenerating(true)
    setGenError('')
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `${res.status}`)
      setQuestions(data.questions)
    } catch (e) {
      setGenError(`生成失敗：${e.message}`)
    } finally {
      setGenerating(false)
    }
  }

  async function createRoom() {
    if (!title.trim() || !content.trim() || questions.length < 2) return
    setCreating(true)
    try {
      const res = await fetch('/api/room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, questions, hostId: userId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setRoomCode(data.roomCode)
      setStep('room')
    } catch (e) {
      setGenError(`建立房間失敗：${e.message}`)
    } finally {
      setCreating(false)
    }
  }

  useEffect(() => {
    if (step !== 'room' || !roomCode) return
    fetch(`/api/room/${roomCode}/answers`)
      .then(r => r.json())
      .then(data => setAnswers(data.sort((a, b) => b.createdAt - a.createdAt)))

    const protocol = location.protocol === 'https:' ? 'wss' : 'ws'
    const ws = new WebSocket(`${protocol}://${location.host}/ws`)
    ws.onopen = () => ws.send(JSON.stringify({ type: 'subscribe', roomCode }))
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data)
      if (msg.type === 'answer_update') {
        setAnswers(prev => {
          const idx = prev.findIndex(a => a.id === msg.answer.id)
          if (idx >= 0) { const next = [...prev]; next[idx] = msg.answer; return next }
          return [msg.answer, ...prev]
        })
      }
    }
    return () => ws.close()
  }, [step, roomCode])

  async function togglePublish(answerId, current) {
    await fetch(`/api/answer/${answerId}/publish`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isPublished: !current }),
    })
  }

  function handleCopy() {
    if (copyRoomCode(roomCode)) { setCopied(true); setTimeout(() => setCopied(false), 2000) }
  }

  const displayAnswers = filterQ === -1 ? answers : answers.filter(a => a.questionIndex === filterQ)

  if (step === 'compose') {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <button onClick={onBack} className="text-slate-400 hover:text-white transition-colors">← 返回</button>
            <h1 className="text-2xl font-bold text-white">建立共讀房間</h1>
          </div>
          <div className="space-y-6">
            <div>
              <label className="block text-slate-300 mb-2 font-medium">讀書會主題 / 書名</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                placeholder="例：《人類大歷史》第三章讀書會"
                className="w-full bg-slate-800 text-white placeholder-slate-500 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
            <div>
              <label className="block text-slate-300 mb-2 font-medium">共讀文章 / 書摘段落</label>
              <textarea value={content} onChange={e => setContent(e.target.value)} rows={8}
                placeholder="貼上您的共讀文章或書摘（最多 3000 字用於問題生成）"
                className="w-full bg-slate-800 text-white placeholder-slate-500 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-y" />
              <p className="text-slate-500 text-sm mt-1">{content.length} 字</p>
            </div>
            {genError && <p className="text-red-400 text-sm">{genError}</p>}
            <button onClick={generateQuestions} disabled={generating}
              className="w-full py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors">
              {generating ? '生成中...' : '✦ 生成思辨問題'}
            </button>
            {questions.length === 2 && (
              <div className="bg-slate-800 rounded-xl p-5 space-y-4 border border-violet-800">
                <h2 className="text-violet-300 font-semibold">✦ AI 生成的思辨問題</h2>
                {questions.map((q, i) => (
                  <div key={i} className="bg-slate-700 rounded-lg p-4">
                    <span className="text-violet-400 font-bold mr-2">Q{i + 1}.</span>
                    <input type="text" value={q}
                      onChange={e => { const qs = [...questions]; qs[i] = e.target.value; setQuestions(qs) }}
                      className="bg-transparent text-white w-full focus:outline-none" />
                  </div>
                ))}
              </div>
            )}
            <button onClick={createRoom}
              disabled={creating || !title.trim() || !content.trim() || questions.length < 2}
              className="w-full py-4 bg-teal-600 hover:bg-teal-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl text-lg transition-colors">
              {creating ? '建立中...' : '建立共讀房間 →'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">{title}</h1>
            <p className="text-slate-400 text-sm mt-1">主持人看板</p>
          </div>
          <button onClick={onBack} className="text-slate-400 hover:text-white text-sm">← 返回首頁</button>
        </div>
        <div className="bg-slate-800 rounded-xl p-5 mb-8 border border-teal-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm mb-1">房間碼</p>
              <p className="text-4xl font-mono font-bold text-teal-300 tracking-widest">{roomCode}</p>
            </div>
            <button onClick={handleCopy}
              className="px-5 py-2 bg-teal-700 hover:bg-teal-600 text-white rounded-lg transition-colors font-medium">
              {copied ? '已複製 ✓' : '複製房間碼'}
            </button>
          </div>
        </div>
        <div className="bg-slate-800 rounded-xl p-5 mb-8">
          <h2 className="text-slate-300 font-semibold mb-3">思辨問題</h2>
          {questions.map((q, i) => (
            <div key={i} className="mb-2 text-slate-200">
              <span className="text-violet-400 font-bold mr-2">Q{i + 1}.</span>{q}
            </div>
          ))}
        </div>
        <div>
          <div className="flex items-center gap-4 mb-4">
            <h2 className="text-white font-semibold text-lg">成員回答</h2>
            <span className="text-slate-500 text-sm">共 {answers.length} 則</span>
            <div className="ml-auto flex gap-2">
              {[-1, 0, 1].map(q => (
                <button key={q} onClick={() => setFilterQ(q)}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${filterQ === q ? 'bg-violet-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
                  {q === -1 ? '全部' : `Q${q + 1}`}
                </button>
              ))}
            </div>
          </div>
          {displayAnswers.length === 0 ? (
            <div className="text-center py-12 text-slate-500">尚無回答，等候成員加入...</div>
          ) : (
            <div className="space-y-3">
              {displayAnswers.map(a => (
                <div key={a.id} className={`bg-slate-800 rounded-xl p-4 border transition-colors ${a.isPublished ? 'border-teal-700' : 'border-slate-700'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-violet-400 text-xs font-mono">Q{a.questionIndex + 1}</span>
                        <span className="text-slate-400 text-sm">{a.userName}</span>
                        {a.isPublished && <span className="px-2 py-0.5 bg-teal-900 text-teal-300 text-xs rounded-full">已公開</span>}
                      </div>
                      <p className="text-slate-200 text-sm leading-relaxed">{a.answerText}</p>
                    </div>
                    <button onClick={() => togglePublish(a.id, a.isPublished)}
                      className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${a.isPublished ? 'bg-slate-700 text-slate-300 hover:bg-red-900 hover:text-red-300' : 'bg-teal-700 text-teal-100 hover:bg-teal-600'}`}>
                      {a.isPublished ? '取消公開' : '公開至思想牆'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
