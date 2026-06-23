import { useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getSectorStory } from '../api'
import { StatusMessage } from '../components/StatusMessage'
import { useAuth } from '../context/AuthContext'
import type { SectorStory, SectorStoryStage } from '../types'

const colorClasses: Record<string, string> = {
  emerald: 'from-emerald-700 to-lime-400',
  cyan: 'from-cyan-700 to-sky-300',
  violet: 'from-violet-700 to-fuchsia-400',
  amber: 'from-amber-600 to-yellow-300',
  rose: 'from-rose-700 to-pink-300',
  slate: 'from-slate-800 to-slate-400',
}

function getColorClass(colorToken: string) {
  return colorClasses[colorToken] ?? 'from-emerald-700 to-cyan-300'
}

export function StoryPage() {
  const { id } = useParams()
  const { token } = useAuth()
  const [story, setStory] = useState<SectorStory | null>(null)
  const [activeOrder, setActiveOrder] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const stageRefs = useRef<Array<HTMLElement | null>>([])

  useEffect(() => {
    if (!token || !id) return

    const controller = new AbortController()
    const currentToken = token
    const currentId = id

    async function loadStory() {
      setLoading(true)
      setError('')

      try {
        const response = await getSectorStory(currentToken, currentId, controller.signal)
        setStory(response)
        setActiveOrder(response.stages[0]?.order ?? 0)
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setError(err instanceof Error ? err.message : 'No se pudo cargar la historia')
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    loadStory()

    return () => {
      controller.abort()
    }
  }, [id, token])

  useEffect(() => {
    if (!story) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((first, second) => second.intersectionRatio - first.intersectionRatio)[0]

        if (visible) {
          setActiveOrder(Number((visible.target as HTMLElement).dataset.order ?? 0))
        }
      },
      { threshold: [0.35, 0.55, 0.75] },
    )

    for (const element of stageRefs.current) {
      if (element) observer.observe(element)
    }

    return () => {
      observer.disconnect()
    }
  }, [story])

  const activeStage = useMemo(
    () => story?.stages.find((stage) => stage.order === activeOrder) ?? story?.stages[0],
    [activeOrder, story],
  )

  function focusStage(order: number) {
    const element = stageRefs.current[order]
    element?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    element?.focus()
  }

  function handleStageKey(event: KeyboardEvent<HTMLElement>, order: number) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      focusStage(Math.min(order + 1, 7))
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      focusStage(Math.max(order - 1, 0))
    }
  }

  if (loading) {
    return <StatusMessage title="Cargando historia" text="Consultando etapas del sector." />
  }

  if (error) {
    return <StatusMessage title="No se pudo cargar" text={error} />
  }

  if (!story || !activeStage) {
    return <StatusMessage title="Sin historia" text="Este sector no tiene etapas disponibles." />
  }

  const progress = Math.round(((activeOrder + 1) / story.stages.length) * 100)

  return (
    <section className="story-shell">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
            Sector Story Engine
          </p>
          <h2 className="text-2xl font-bold">{story.sector.name}</h2>
          <p className="text-sm text-stone-600">{story.sector.climate}</p>
        </div>
        <Link
          to="/sectors"
          className="rounded-md border border-stone-300 px-4 py-2 text-sm font-semibold"
        >
          Volver a sectores
        </Link>
      </div>

      <div className="story-progress" aria-label={`Progreso ${progress}%`}>
        <div style={{ width: `${progress}%` }} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <aside className="story-visual-wrap">
          <StoryVisual stage={activeStage} progress={progress} />
        </aside>

        <div className="space-y-6">
          {story.stages.map((stage, index) => (
            <StageCard
              key={stage.id}
              stage={stage}
              active={stage.order === activeOrder}
              setRef={(element) => {
                stageRefs.current[index] = element
              }}
              onFocus={() => setActiveOrder(stage.order)}
              onKeyDown={(event) => handleStageKey(event, stage.order)}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

function StoryVisual({ stage, progress }: { stage: SectorStoryStage; progress: number }) {
  return (
    <div className={`story-visual bg-gradient-to-br ${getColorClass(stage.colorToken)}`}>
      <div className="story-grid" />
      <div className="story-core">
        <p className="text-xs font-semibold uppercase tracking-wide">{stage.assetKey}</p>
        <h3 className="mt-2 text-2xl font-bold">{stage.title}</h3>
        <p className="mt-1 text-sm opacity-85">{stage.dominantEvent}</p>
      </div>
      <div className="story-meter-panel">
        <VisualMetric label="Estabilidad" value={stage.metrics.stability} />
        <VisualMetric label="Energia" value={stage.metrics.energy} />
        <VisualMetric label="Alertas" value={Math.min(stage.metrics.alerts * 10, 100)} />
      </div>
      <p className="story-progress-number">{progress}%</p>
    </div>
  )
}

function VisualMetric({ label, value }: { label: string; value: number }) {
  const safeValue = Math.max(0, Math.min(value, 100))

  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span>{label}</span>
        <span>{safeValue}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/25">
        <div className="h-full rounded-full bg-white" style={{ width: `${safeValue}%` }} />
      </div>
    </div>
  )
}

function StageCard({
  stage,
  active,
  setRef,
  onFocus,
  onKeyDown,
}: {
  stage: SectorStoryStage
  active: boolean
  setRef: (element: HTMLElement | null) => void
  onFocus: () => void
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void
}) {
  return (
    <article
      ref={setRef}
      data-order={stage.order}
      tabIndex={0}
      onFocus={onFocus}
      onKeyDown={onKeyDown}
      className={`story-stage rounded-md border bg-white p-6 outline-none ${
        active ? 'border-emerald-700 shadow-sm' : 'border-stone-200'
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
        Etapa {stage.order + 1} / 8
      </p>
      <h3 className="mt-2 text-xl font-bold">{stage.title}</h3>
      <p className="mt-3 text-stone-700">{stage.narrative}</p>
      <div className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
        <StoryMetric label="Evento" value={stage.dominantEvent} />
        <StoryMetric label="Alertas" value={String(stage.metrics.alerts)} />
        <StoryMetric label="Progreso" value={`${Math.round(stage.progress * 100)}%`} />
      </div>
    </article>
  )
}

function StoryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-stone-500">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  )
}
