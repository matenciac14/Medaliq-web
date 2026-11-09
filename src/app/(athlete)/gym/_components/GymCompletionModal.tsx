'use client'

import { useState } from 'react'
import SessionSummaryModal from './SessionSummaryModal'

interface GymCompletionModalProps {
  sessionId: string
}

export default function GymCompletionModal({ sessionId }: GymCompletionModalProps) {
  const [open, setOpen] = useState(true)

  if (!open) return null

  return <SessionSummaryModal sessionId={sessionId} onClose={() => setOpen(false)} />
}
