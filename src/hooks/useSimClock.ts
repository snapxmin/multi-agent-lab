import { useCallback, useEffect, useRef, useState } from 'react'

export interface SimClock {
  t: number
  playing: boolean
  speed: number
  runId: number
  ended: boolean
  play: () => void
  pause: () => void
  toggle: () => void
  restart: () => void
  setSpeed: (s: number) => void
  seek: (v: number) => void
}

interface ClockOptions {
  loop?: boolean
  autoPlay?: boolean
  onLoop?: () => void
  onEnd?: () => void
}

const END_PAUSE = 1.8 // 播完停留再循环

export function useSimClock(duration: number, options: ClockOptions = {}): SimClock {
  const { loop = true, autoPlay = true, onLoop, onEnd } = options
  const [t, setT] = useState(0)
  const [playing, setPlaying] = useState(autoPlay)
  const [speed, setSpeed] = useState(1)
  const [runId, setRunId] = useState(0)
  const [ended, setEnded] = useState(false)

  const tRef = useRef(0)
  const playingRef = useRef(autoPlay)
  const speedRef = useRef(1)
  const durRef = useRef(duration)
  const endedRef = useRef(false)
  const cbRef = useRef({ onLoop, onEnd })
  durRef.current = duration
  cbRef.current = { onLoop, onEnd }
  speedRef.current = speed
  playingRef.current = playing

  useEffect(() => {
    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1)
      last = now
      if (playingRef.current && !endedRef.current) {
        let nt = tRef.current + dt * speedRef.current
        if (loop) {
          if (nt >= durRef.current + END_PAUSE) {
            nt = 0
            cbRef.current.onLoop?.()
          }
        } else if (nt >= durRef.current) {
          nt = durRef.current
          endedRef.current = true
          setEnded(true)
          cbRef.current.onEnd?.()
        }
        tRef.current = nt
        setT(nt)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [loop])

  const restart = useCallback(() => {
    tRef.current = 0
    endedRef.current = false
    setT(0)
    setEnded(false)
    setRunId((r) => r + 1)
    setPlaying(true)
  }, [])

  const seek = useCallback((v: number) => {
    tRef.current = v
    setT(v)
  }, [])

  return {
    t,
    playing,
    speed,
    runId,
    ended,
    play: () => setPlaying(true),
    pause: () => setPlaying(false),
    toggle: () => setPlaying((p) => !p),
    restart,
    setSpeed,
    seek,
  }
}
