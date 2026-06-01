import React, { useState, useEffect } from 'react'
import { auth, signInAnonymously, onAuthStateChanged } from './firebase'
import Landing from './components/Landing'
import HostView from './components/HostView'
import MemberView from './components/MemberView'

export default function App() {
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [view, setView] = useState('landing') // 'landing' | 'host' | 'member'
  const [roomCode, setRoomCode] = useState('')

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u)
        setAuthLoading(false)
      } else {
        try {
          await signInAnonymously(auth)
        } catch (e) {
          console.error('Auth error:', e)
          setAuthLoading(false)
        }
      }
    })
    return unsub
  }, [])

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-slate-400 text-lg animate-pulse">正在初始化...</div>
      </div>
    )
  }

  if (view === 'host') return <HostView user={user} onBack={() => setView('landing')} />
  if (view === 'member') return (
    <MemberView
      user={user}
      initialRoomCode={roomCode}
      onBack={() => { setRoomCode(''); setView('landing') }}
    />
  )

  return (
    <Landing
      onHost={() => setView('host')}
      onMember={(code) => { setRoomCode(code); setView('member') }}
    />
  )
}
