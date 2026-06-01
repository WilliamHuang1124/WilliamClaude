import React, { useState, useEffect, useRef } from 'react'
import { db, APP_ID } from '../firebase'
import {
  doc, getDoc, collection, addDoc, onSnapshot,
} from 'firebase/firestore'

const ANONYMOUS_NAMES = [
  '深思的哲學家', '縝密的分析者', '銳利的批評者', '洞見的觀察者',
  '清醒的夢想家', '理性的詩人', '審慎的探索者', '敏銳的質疑者',
  '沉靜的智者', '勇敢的論辯者', '細膩的讀者', '遠見的思考者',
  '博學的旅者', '犀利的思考者', '溫柔的懷疑者', '熱忱的探問者',
]

function getRandomName() {
  return ANONYMOUS_NAMES[Math.floor(Math.random() * ANONYMOUS_NAMES.length)]
}

export default function MemberView({ user, initialRoomCode, onBack }) {
  const [inputCode, setInputCode] = useState(initialRoomCode || '')
  const [err, setErr] = useState('')
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(!!initialRoomCode)
  const [userName] = useState(() => getRandomName())
  const [answers, setAnswers] = useState(['', ''])
  const [submitted, setSubmitted] = useState([false, false])
  const [submitting, setSubmitting] = useState([false, false])
  const [publishedAnswers, setPublishedAnswers] = useState([])
  const [activeTab, setActiveTab] = useState(0)
  const answersColPath = `/artifacts/${APP_ID}/public/data/answers`

  async function loadRoom(code) {
    setLoading(true)
    setErr('')
    try {
      const snap = await getDoc(doc(db, `/artifacts/${APP_ID}/public/data/sessions/${code}`))
      if (!snap.exists()) { setErr('找不到該房間碼，請確認後再試'); setLoading(false); return }
      setSession({ id: snap.id, ...snap.data() })
    } catch (e) {
      setErr(`載入失敗：${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (initialRoomCode) loadRoom(initialRoomCode)
  }, [initialRoomCode])

  useEffect(() => {
    if (!session) return
    const unsub = onSnapshot(collection(db, answersColPath), (snap) => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      setPublishedAnswers(
        all
          .filter(a => a.roomCode === session.id && a.isPublished)
          .sort((a, b) => b.createdAt - a.createdAt)
      )
    })
    return unsub
  }, [session])

  async function submitAnswer(qIndex) {
    const text = answers[qIndex].trim()
    if (text.length < 20) { setErr(`回答至少需要 20 字（目前 ${text.length} 字）`); return }
    if (text.length > 500) { setErr('回答不得超過 500 字'); return }
    setErr('')
    setSubmitting(s => { const n = [...s]; n[qIndex] = true; return n })
    try {
      await addDoc(collection(db, answersColPath), {
        roomCode: session.id,
        userId: user.uid,
        userName,
        questionIndex: qIndex,
        answerText: text,
        isPublished: false,
        createdAt: Date.now(),
      })
      setSubmitted(s => { const n = [...s]; n[qIndex] = true; return n })
    } catch (e) {
      setErr(`提交失敗：${e.message}`)
    } finally {
      setSubmitting(s => { const n = [...s]; n[qIndex] = false; return n })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <p className="text-slate-400 animate-pulse">正在載入房間...</p>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 px-4 py-8 flex flex-col items-center justify-center">
        <div className="w-full max-w-sm space-y-4">
          <button onClick={onBack} className="text-slate-400 hover:text-white text-sm">← 返回</button>
          <h1 className="text-2xl font-bold text-white">加入共讀房間</h1>
          <input
            type="text"
            maxLength={6}
            value={inputCode}
            onChange={e => { setInputCode(e.target.value.toUpperCase()); setErr('') }}
            onKeyDown={e => e.key === 'Enter' && loadRoom(inputCode.trim().toUpperCase())}
            placeholder="輸入 6 位房間碼"
            className="w-full bg-slate-800 text-white placeholder-slate-500 rounded-lg px-4 py-3 text-center text-2xl tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
          {err && <p className="text-red-400 text-sm">{err}</p>}
          <button
            onClick={() => loadRoom(inputCode.trim().toUpperCase())}
            className="w-full py-3 bg-teal-600 hover:bg-teal-500 text-white font-semibold rounded-xl transition-colors"
          >
            進入房間
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 px-4 py-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-white">{session.title}</h1>
            <p className="text-slate-400 text-sm">你是：<span className="text-violet-300">{userName}</span></p>
          </div>
          <button onClick={onBack} className="text-slate-400 hover:text-white text-sm">← 離開</button>
        </div>

        <div className="bg-slate-800 rounded-xl p-5 mb-6">
          <h2 className="text-slate-300 font-semibold mb-3 text-sm uppercase tracking-wide">共讀文章</h2>
          <div className="text-slate-300 text-sm leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap">
            {session.content}
          </div>
        </div>

        <div className="mb-6">
          <div className="flex gap-2 mb-4">
            {session.questions.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveTab(i)}
                className={`flex-1 py-2 rounded-lg font-medium text-sm transition-colors ${
                  activeTab === i ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                問題 {i + 1} {submitted[i] && '✓'}
              </button>
            ))}
          </div>

          {session.questions.map((q, i) => (
            <div key={i} className={activeTab === i ? '' : 'hidden'}>
              <div className="bg-slate-800 rounded-xl p-5 mb-4">
                <span className="text-violet-400 font-bold mr-2">Q{i + 1}.</span>
                <span className="text-white">{q}</span>
              </div>

              {submitted[i] ? (
                <div className="bg-teal-900/40 border border-teal-700 rounded-xl p-4 text-center">
                  <p className="text-teal-300 font-medium">✓ 回答已提交</p>
                  <p className="text-slate-400 text-sm mt-1">等待主持人審閱並公開至思想牆</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <textarea
                    value={answers[i]}
                    onChange={e => {
                      const a = [...answers]
                      a[i] = e.target.value
                      setAnswers(a)
                    }}
                    disabled={submitting[i]}
                    rows={5}
                    placeholder={`分享你的思考（20～500 字）...`}
                    className="w-full bg-slate-800 text-white placeholder-slate-500 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-y disabled:opacity-50"
                  />
                  <div className="flex items-center justify-between">
                    <span className={`text-sm ${answers[i].length > 500 ? 'text-red-400' : 'text-slate-500'}`}>
                      {answers[i].length} / 500 字
                    </span>
                    <button
                      onClick={() => submitAnswer(i)}
                      disabled={submitting[i] || answers[i].trim().length < 20}
                      className="px-6 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
                    >
                      {submitting[i] ? '提交中...' : '提交回答'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {err && <p className="text-red-400 text-sm mt-2">{err}</p>}
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
