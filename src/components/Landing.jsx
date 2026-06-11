import React, { useState } from 'react'

export default function Landing({ onHost, onMember }) {
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [err, setErr] = useState('')

  function handleJoin() {
    const trimmedName = name.trim()
    if (!trimmedName) { setErr('請先輸入你的名稱'); return }
    const trimmedCode = code.trim().toUpperCase()
    if (!/^[A-Z0-9]{6}$/.test(trimmedCode)) {
      setErr('請輸入有效的 6 位房間碼（英文字母或數字）')
      return
    }
    sessionStorage.setItem('sympo_name', trimmedName)
    setErr('')
    onMember(trimmedCode)
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center px-4">
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-bold text-white mb-2 tracking-wide">思辨共讀</h1>
        <p className="text-slate-400 text-lg">SympoRead — 深度閱讀，共同思辨</p>
      </div>

      <div className="w-full max-w-md space-y-6">
        <button
          onClick={onHost}
          className="w-full py-4 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl transition-colors text-lg shadow-lg shadow-violet-900/40"
        >
          我是主持人
          <span className="block text-sm font-normal text-violet-200 mt-1">建立共讀房間，上傳文章並生成思辨問題</span>
        </button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-700" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-slate-900 px-4 text-slate-500 text-sm">或</span>
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl p-6 space-y-4">
          <h2 className="text-white font-semibold text-lg">加入共讀房間</h2>
          <div className="space-y-1">
            <label className="text-slate-400 text-sm">你的名稱</label>
            <input
              type="text"
              maxLength={20}
              value={name}
              onChange={e => { setName(e.target.value); setErr('') }}
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
              placeholder="在這裡輸入您的名字"
              className="w-full bg-slate-700 text-white placeholder-slate-500 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-slate-400 text-sm">房間碼</label>
            <input
              type="text"
              maxLength={6}
              value={code}
              onChange={e => { setCode(e.target.value.toUpperCase()); setErr('') }}
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
              placeholder="輸入 6 位房間碼"
              className="w-full bg-slate-700 text-white placeholder-slate-500 rounded-lg px-4 py-3 text-center text-xl tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          {err && <p className="text-red-400 text-sm">{err}</p>}
          <button
            onClick={handleJoin}
            className="w-full py-3 bg-teal-600 hover:bg-teal-500 text-white font-semibold rounded-xl transition-colors"
          >
            進入房間
          </button>
        </div>
      </div>
    </div>
  )
}
