import React, { useState, useRef, useCallback } from 'react'

export default function Landing({ onHost, onMember }) {
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [err, setErr] = useState('')
  const [spotlight, setSpotlight] = useState({ x: 50, y: 50, active: false })
  const rafRef = useRef(null)
  const bgRef = useRef(null)

  const handleMouseMove = useCallback((e) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      const rect = bgRef.current?.getBoundingClientRect()
      if (!rect) return
      const x = ((e.clientX - rect.left) / rect.width) * 100
      const y = ((e.clientY - rect.top) / rect.height) * 100
      setSpotlight({ x, y, active: true })
    })
  }, [])

  const handleMouseLeave = useCallback(() => {
    setSpotlight(s => ({ ...s, active: false }))
  }, [])

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

  const radius = 160
  const fadeWidth = 80
  const maskValue = spotlight.active
    ? `radial-gradient(circle at ${spotlight.x}% ${spotlight.y}%, transparent 0px, transparent ${radius}px, rgba(0,0,0,0.55) ${radius + fadeWidth * 0.4}px, rgba(0,0,0,0.88) ${radius + fadeWidth * 0.75}px, black ${radius + fadeWidth}px)`
    : 'none'

  return (
    <div className="relative min-h-screen overflow-hidden flex flex-col items-center justify-center px-4">

      {/* ── Bottom layer: bookshelf WITH books ── */}
      <div
        className="absolute inset-0 bg-center bg-cover"
        style={{ backgroundImage: 'url(/bg-books.jpg)' }}
      />

      {/* ── Top layer: empty dark shelves, masked by spotlight ── */}
      <div
        ref={bgRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="absolute inset-0 bg-center bg-cover cursor-none"
        style={{
          backgroundImage: 'url(/bg-empty.jpg)',
          WebkitMaskImage: maskValue,
          maskImage: maskValue,
          transition: spotlight.active ? 'none' : 'mask-image 1.2s ease, -webkit-mask-image 1.2s ease',
        }}
      />

      {/* ── Ambient dark vignette always on top of both layers ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 25%, rgba(0,0,0,0.45) 70%, rgba(0,0,0,0.72) 100%)',
        }}
      />

      {/* ── Custom cursor: flashlight glow ring ── */}
      {spotlight.active && (
        <div
          className="pointer-events-none fixed z-50"
          style={{ left: 0, top: 0, width: '100vw', height: '100vh' }}
        >
          <div
            style={{
              position: 'absolute',
              left: `calc(${spotlight.x}% - 18px)`,
              top: `calc(${spotlight.y}% - 18px)`,
              width: 36,
              height: 36,
              borderRadius: '50%',
              border: '2px solid rgba(255,220,120,0.55)',
              boxShadow: '0 0 12px 4px rgba(255,200,80,0.25), 0 0 32px 12px rgba(255,180,60,0.10)',
              pointerEvents: 'none',
            }}
          />
        </div>
      )}

      {/* ── UI content ── */}
      <div className="relative z-10 flex flex-col items-center w-full pointer-events-none">
        <div className="mb-10 text-center pointer-events-none select-none">
          <h1
            className="text-4xl font-bold mb-2 tracking-wide"
            style={{ color: '#f5e9d0', textShadow: '0 2px 24px rgba(0,0,0,0.8), 0 1px 4px rgba(0,0,0,0.9)' }}
          >
            思辨共讀
          </h1>
          <p
            className="text-lg"
            style={{ color: '#c9b99a', textShadow: '0 1px 8px rgba(0,0,0,0.9)' }}
          >
            SympoRead — 深度閱讀，共同思辨
          </p>
          <p style={{ color: '#7a6a55', textShadow: '0 1px 4px rgba(0,0,0,0.9)' }} className="text-sm mt-2">
            Made by William
          </p>
        </div>

        <div className="w-full max-w-md space-y-6 pointer-events-auto">
          <button
            onClick={onHost}
            className="w-full py-4 text-white font-semibold rounded-xl text-lg transition-all"
            style={{
              background: 'rgba(109,40,217,0.82)',
              backdropFilter: 'blur(12px)',
              boxShadow: '0 4px 32px rgba(109,40,217,0.35)',
              border: '1px solid rgba(167,139,250,0.25)',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(124,58,237,0.92)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(109,40,217,0.82)'}
          >
            我是主持人
            <span className="block text-sm font-normal mt-1" style={{ color: '#ddd6fe' }}>
              建立共讀房間，上傳文章並生成思辨問題
            </span>
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t" style={{ borderColor: 'rgba(255,255,255,0.12)' }} />
            </div>
            <div className="relative flex justify-center">
              <span
                className="px-4 text-sm"
                style={{ background: 'transparent', color: 'rgba(200,180,150,0.6)' }}
              >或</span>
            </div>
          </div>

          <div
            className="rounded-xl p-6 space-y-4"
            style={{
              background: 'rgba(15,23,42,0.72)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
            }}
          >
            <h2 className="font-semibold text-lg" style={{ color: '#f1e8d8' }}>加入共讀房間</h2>
            <div className="space-y-1">
              <label className="text-sm" style={{ color: '#a89880' }}>你的名稱</label>
              <input
                type="text"
                maxLength={20}
                value={name}
                onChange={e => { setName(e.target.value); setErr('') }}
                onKeyDown={e => e.key === 'Enter' && handleJoin()}
                placeholder="在這裡輸入您的名字"
                className="w-full rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-violet-400"
                style={{ background: 'rgba(255,255,255,0.08)', color: '#f5f0e8', caretColor: '#a78bfa' }}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm" style={{ color: '#a89880' }}>房間碼</label>
              <input
                type="text"
                maxLength={6}
                value={code}
                onChange={e => { setCode(e.target.value.toUpperCase()); setErr('') }}
                onKeyDown={e => e.key === 'Enter' && handleJoin()}
                placeholder="輸入 6 位房間碼"
                className="w-full rounded-lg px-4 py-3 text-center text-xl tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-violet-400"
                style={{ background: 'rgba(255,255,255,0.08)', color: '#f5f0e8', caretColor: '#a78bfa' }}
              />
            </div>
            {err && <p className="text-red-400 text-sm">{err}</p>}
            <button
              onClick={handleJoin}
              className="w-full py-3 text-white font-semibold rounded-xl transition-all"
              style={{
                background: 'rgba(13,148,136,0.80)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(45,212,191,0.2)',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(15,175,160,0.90)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(13,148,136,0.80)'}
            >
              進入房間
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
