import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getSignal, updateSignalStatus } from '../api'
import { StatusMessage } from '../components/StatusMessage'
import { useAuth } from '../context/AuthContext'
import type { MutableSignalStatus, Signal } from '../types'

const updatedSignalKey = 'tropelcare_updated_signal'
const statusOptions: MutableSignalStatus[] = ['PROCESANDO', 'ATENDIDA']

export function SignalDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { token } = useAuth()
  const [signal, setSignal] = useState<Signal | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (!token || !id) return

    const controller = new AbortController()
    const currentToken = token
    const currentId = id

    async function loadSignal() {
      setLoading(true)
      setError('')

      try {
        const response = await getSignal(currentToken, currentId, controller.signal)
        setSignal(response)
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setError(err instanceof Error ? err.message : 'No se pudo cargar la senal')
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    loadSignal()

    return () => {
      controller.abort()
    }
  }, [id, token])

  async function handleStatusChange(status: MutableSignalStatus) {
    if (!token || !id || !signal) return

    setActionLoading(true)
    setActionError('')
    setSuccess('')

    try {
      const updated = await updateSignalStatus(token, id, status)
      setSignal(updated)
      sessionStorage.setItem(updatedSignalKey, JSON.stringify(updated))
      setSuccess(`Estado actualizado a ${updated.status}`)
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : 'No se pudo actualizar. Conservamos el estado anterior.',
      )
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return <StatusMessage title="Cargando senal" text="Consultando detalle real." />
  }

  if (error) {
    return <StatusMessage title="No se pudo cargar" text={error} />
  }

  if (!signal) {
    return <StatusMessage title="Sin datos" text="No encontramos esta senal." />
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
            Detalle de Senal
          </p>
          <h2 className="text-2xl font-bold">{signal.id}</h2>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-md border border-stone-300 px-4 py-2 text-sm font-semibold"
          >
            Volver
          </button>
          <Link
            to="/signals"
            className="rounded-md border border-stone-300 px-4 py-2 text-sm font-semibold"
          >
            Feed
          </Link>
        </div>
      </div>

      <article className="rounded-md border border-stone-200 bg-white p-5">
        <div className="grid gap-4 md:grid-cols-4">
          <DetailItem label="Tropel" value={`${signal.tropel.name} (${signal.tropel.species})`} />
          <DetailItem label="Tipo" value={signal.signalType} />
          <DetailItem label="Severidad" value={signal.severity} />
          <DetailItem label="Estado actual" value={signal.status} />
        </div>

        <div className="mt-5 rounded-md bg-stone-100 p-4">
          <p className="text-xs font-semibold uppercase text-stone-500">Contenido</p>
          <p className="mt-2 text-sm text-stone-700">{signal.rawContent}</p>
        </div>

        <div className="mt-5 grid gap-3 text-sm text-stone-600 sm:grid-cols-2">
          <p>Creada: {new Date(signal.createdAt).toLocaleString()}</p>
          <p>Actualizada: {new Date(signal.updatedAt).toLocaleString()}</p>
        </div>
      </article>

      <section className="rounded-md border border-stone-200 bg-white p-5">
        <h3 className="font-semibold">Atender senal</h3>
        <p className="mt-1 text-sm text-stone-600">
          El backend solo permite cambiar a PROCESANDO o ATENDIDA.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {statusOptions.map((status) => (
            <button
              key={status}
              type="button"
              disabled={actionLoading || signal.status === status}
              onClick={() => handleStatusChange(status)}
              className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-stone-400"
            >
              {actionLoading ? 'Guardando...' : `Marcar ${status}`}
            </button>
          ))}
        </div>

        {success && (
          <p className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {success}
          </p>
        )}

        {actionError && (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <p>{actionError}</p>
            <p className="mt-1">Puedes reintentar sin perder el estado anterior.</p>
          </div>
        )}
      </section>
    </section>
  )
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-stone-500">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  )
}
