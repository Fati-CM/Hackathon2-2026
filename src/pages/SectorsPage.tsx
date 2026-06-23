import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSectors } from '../api'
import { StatusMessage } from '../components/StatusMessage'
import { useAuth } from '../context/AuthContext'
import type { Sector } from '../types'

type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => void) => void
}

export function SectorsPage() {
  const { token } = useAuth()
  const navigate = useNavigate()
  const [sectors, setSectors] = useState<Sector[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) return

    const controller = new AbortController()
    const currentToken = token

    async function loadSectors() {
      setLoading(true)
      setError('')

      try {
        const response = await getSectors(currentToken, controller.signal)
        setSectors(response.items)
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setError(err instanceof Error ? err.message : 'No se pudieron cargar los sectores')
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    loadSectors()

    return () => {
      controller.abort()
    }
  }, [token])

  function openStory(id: string) {
    const doc = document as ViewTransitionDocument

    if (doc.startViewTransition) {
      doc.startViewTransition(() => navigate(`/sectors/${id}/story`))
      return
    }

    navigate(`/sectors/${id}/story`)
  }

  if (loading) {
    return <StatusMessage title="Cargando sectores" text="Consultando sectores reales." />
  }

  if (error) {
    return <StatusMessage title="No se pudo cargar" text={error} />
  }

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold">Sectores</h2>
        <p className="text-sm text-stone-600">
          Resumen operativo para entrar al Sector Story Engine.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {sectors.map((sector) => (
          <article key={sector.id} className="rounded-md border border-stone-200 bg-white p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                  {sector.sectorCode}
                </p>
                <h3 className="mt-1 text-lg font-bold">{sector.name}</h3>
              </div>
              <span className="rounded-md bg-stone-100 px-2 py-1 text-xs font-semibold text-stone-600">
                {sector.climate}
              </span>
            </div>

            <div className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
              <SectorMetric label="Carga" value={`${sector.currentLoad}/${sector.capacity}`} />
              <SectorMetric label="Estabilidad" value={`${sector.stabilityLevel}%`} />
              <SectorMetric label="Clima" value={sector.climate.replace('_', ' ')} />
            </div>

            <button
              type="button"
              onClick={() => openStory(sector.id)}
              className="mt-5 w-full rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white"
            >
              Ver historia
            </button>
          </article>
        ))}
      </div>
    </section>
  )
}

function SectorMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-stone-500">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  )
}
