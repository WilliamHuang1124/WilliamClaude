import React, { useState, useEffect } from 'react'

function renderContent(text) {
  const parts = []
  const regex = /(\*\*(.+?)\*\*)|(==(.+?)==)/gs
  let last = 0
  let match
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push({ type: 'text', value: text.slice(last, match.index) })
    if (match[1]) parts.push({ type: 'bold', value: match[2] })
    if (match[3]) parts.push({ type: 'highlight', value: match[4] })
    last = match.index + match[0].length
  }
  if (last < text.length) parts.push({ type: 'text', value: text.slice(last) })

  return parts.map((p, i) => {
    if (p.type === 'bold') return <strong key={i} className="font-bold text-white text-xl leading-snug">{p.value}</strong>
    if (p.type === 'highlight') return (
      <mark key={i} style={{ backgroundColor: '#fef08a', color: '#1e293b' }} className="px-0.5 rounded">{p.value}</mark>
    )
    return p.value.split('\n').map((line, j, arr) => (
      <React.Fragment key={`${i}-${j}`}>{line}{j < arr.length - 1 && <br />}</React.Fragment>
    ))
  })
}

export default function MemberView({ userId, initialRoomCode, onBack }) {
  const [inputCode, setInputCode] = useState(initialRoomCode || '')
  const [err, setErr] = useState('')
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(!!initialRoomCode)
  const [userName, setUserName] = useState('')
  const [answers, setAnswers] = useState(['', ''])
  const [submitted, setSubmitted] = useState([false, false])
  const [submitting, setSubmitting] = useState([false, false])
  const [publishedAnswers, setPublishedAnswers] = useState([])

  async function loadRoom(code) {
    setLoading(true)
    setErr('')
    try {
      const res = await fetch(`/api/room/${code}`)
      if (!res.ok) { setErr('找不到該房間碼，請確認後再試'); setLoading(false); return }
      const data = await res.json()
      setSession(data)
    } catch (e) {
      setErr(`載入失敗：${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  function joinRoom() {
    const name = userName.trim()
    if (name.length < 1) { setErr('請先輸入你的名稱'); return }
    sessionStorage.setItem('sympo_name', name)
    setUserName(name)
    loadRoom(inputCode.trim().toUpperCase())
  }

  useEffect(() => { if (initialRoomCode) loadRoom(initialRoomCode) }, [initialRoomCode])

  useEffect(() => {
    if (!session) return
    fetch(`/api/room/${session.id}/answers`)
      .then(r => r.json())
      .then(data => {
        setPublishedAnswers(data.filter(a => a.isPublished).sort((a, b) => b.createdAt - a.createdAt))
      })

    const protocol = location.protocol === 'https:' ? 'wss' : 'ws'
    const ws = new WebSocket(`${protocol}://${location.host}/ws`)
    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'subscribe', roomCode: session.id }))
      ws.send(JSON.stringify({ type: 'join', roomCode: session.id, userId, userName }))
    }
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data)
      if (msg.type === 'answer_update' && msg.answer.roomCode === session.id) {
        setPublishedAnswers(prev => {
          const filtered = prev.filter(a => a.id !== msg.answer.id)
          if (msg.answer.isPublished) return [msg.answer, ...filtered].sort((a, b) => b.createdAt - a.createdAt)
          return filtered
        })
      }
    }
    return () => ws.close()
  }, [session])

  async function submitAnswer(qIndex) {
    const text = answers[qIndex].trim()
    if (text.length < 20) { setErr(`回答至少需要 20 字（目前 ${text.length} 字）`); return }
    if (text.length > 500) { setErr('回答不得超過 500 字'); return }
    setErr('')
    setSubmitting(s => { const n = [...s]; n[qIndex] = true; return n })
    try {
      const res = await fetch('/api/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode: session.id, userId, userName, questionIndex: qIndex, answerText: text }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setSubmitted(s => { const n = [...s]; n[qIndex] = true; return n })
    } catch (e) {
      setErr(`提交失敗：${e.message}`)
    } finally {
      setSubmitting(s => { const n = [...s]; n[qIndex] = false; return n })
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <p className="text-slate-400 animate-pulse">正在載入房間...</p>
    </div>
  )

  if (!session) return (
    <div className="min-h-screen bg-slate-900 text-slate-100 px-4 py-8 flex flex-col items-center justify-center">
      <div className="w-full max-w-sm space-y-4">
        <button onClick={onBack} className="text-slate-400 hover:text-white text-sm">← 返回</button>
        <h1 className="text-2xl font-bold text-white">加入共讀房間</h1>
        <div className="space-y-1">
          <label className="text-slate-400 text-sm">你的名稱</label>
          <input type="text" maxLength={20} value={userName}
            onChange={e => { setUserName(e.target.value); setErr('') }}
            placeholder="在這裡輸入您的名字"
            className="w-full bg-slate-800 text-white placeholder-slate-500 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-violet-500" />
        </div>
        <div className="space-y-1">
          <label className="text-slate-400 text-sm">房間碼</label>
          <input type="text" maxLength={6} value={inputCode}
            onChange={e => { setInputCode(e.target.value.toUpperCase()); setErr('') }}
            onKeyDown={e => e.key === 'Enter' && joinRoom()}
            placeholder="輸入 6 位房間碼"
            className="w-full bg-slate-800 text-white placeholder-slate-500 rounded-lg px-4 py-3 text-center text-2xl tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-violet-500" />
        </div>
        {err && <p className="text-red-400 text-sm">{err}</p>}
        <button onClick={joinRoom}
          className="w-full py-3 bg-teal-600 hover:bg-teal-500 text-white font-semibold rounded-xl transition-colors">
          進入房間
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <div className="bg-slate-800/60 border-b border-slate-700 px-4 py-2">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <span className="text-violet-400 text-xs font-mono tracking-widest">房間 {session.id}</span>
          <button onClick={onBack} className="text-slate-400 hover:text-white text-sm">← 離開</button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <h1 className="text-xl font-bold text-white mb-4">{session.title}</h1>

        <div className="flex flex-col lg:flex-row gap-6 items-start mb-8">
          <div className="flex-1 bg-slate-800 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-700">
              <h2 className="text-slate-300 font-semibold text-sm tracking-wide">共讀文章</h2>
            </div>
            <div className="text-slate-200 text-base leading-relaxed px-5 py-4">
              {renderContent(session.content)}
            </div>
          </div>

          <div className="w-full lg:w-96 shrink-0 space-y-4">
            {session.questions.map((q, i) => (
              <div key={i} className="bg-slate-800 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-700">
                  <p className="text-sm text-white">
                    <span className="text-violet-400 font-bold mr-2">Q{i + 1}.</span>{q}
                  </p>
                </div>
                {submitted[i] ? (
                  <div className="p-4 text-center">
                    <p className="text-teal-300 font-medium">✓ 回答已提交</p>
                    <p className="text-slate-400 text-sm mt-1">等待主持人審閱並公開至思想牆</p>
                  </div>
                ) : (
                  <div className="p-4 space-y-3">
                    <div className="relative">
                      <textarea value={answers[i]}
                        onChange={e => { const a = [...answers]; a[i] = e.target.value; setAnswers(a) }}
                        disabled={submitting[i]} rows={5}
                        placeholder="分享你的思考（20～500 字）..."
                        className="w-full bg-slate-700 text-white placeholder-slate-500 rounded-lg px-4 py-3 pb-7 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-y disabled:opacity-50" />
                      <span className={`absolute bottom-2 right-3 text-xs ${answers[i].length > 500 ? 'text-red-400' : 'text-slate-500'}`}>
                        {answers[i].length} / 500
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1 min-w-0">
                        <span className="text-slate-500 text-xs shrink-0">以</span>
                        <span className="text-violet-300 text-xs font-medium truncate">{userName}</span>
                        <span className="text-slate-500 text-xs shrink-0">提交</span>
                      </div>
                      <button onClick={() => submitAnswer(i)}
                        disabled={submitting[i] || answers[i].trim().length < 20}
                        className="px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors shrink-0">
                        {submitting[i] ? '提交中...' : '提交回答'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {err && <p className="text-red-400 text-sm">{err}</p>}
          </div>
        </div>

        <div>
          <h2 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
            <span className="text-teal-400">✦</span> 精選思想牆
            <span className="text-slate-500 text-sm font-normal">（{publishedAnswers.length} 則公開回答）</span>
          </h2>
          {publishedAnswers.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-sm">思想牆暫無內容，等待主持人精選優質回答</div>
          ) : (
            <div className="space-y-3">
              {publishedAnswers.map(a => (
                <div key={a.id} className="bg-slate-800 border border-teal-900 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-violet-400 text-xs font-mono">Q{a.questionIndex + 1}</span>
                    <span className="text-teal-400 text-sm">{a.userName}</span>
                  </div>
                  <p className="text-slate-200 text-sm leading-relaxed">{a.answerText}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
