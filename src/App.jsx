import React, { useState, useEffect } from 'react'
import Landing from './components/Landing'
import HostView from './components/HostView'
import MemberView from './components/MemberView'

function genUserId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export default function App() {
  const [userId] = useState(() => {
    let id = sessionStorage.getItem('sympo_uid')
    if (!id) { id = genUserId(); sessionStorage.setItem('sympo_uid', id) }
    return id
  })
  const [view, setView] = useState('landing')
  const [roomCode, setRoomCode] = useState('')

  if (view === 'host') return <HostView userId={userId} onBack={() => setView('landing')} />
  if (view === 'member') return (
    <MemberView
      userId={userId}
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
