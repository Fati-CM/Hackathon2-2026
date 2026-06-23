import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getSignalsFeed } from '../api'
import { useAuth } from '../context/AuthContext'
import type { Severity, Signal, SignalFeedFilters, SignalStatus, SignalType } from '../types'

const signalTypes: SignalType[] = [
  'HAMBRE',
  'ABANDONO',
  'MUTACION',
  'FUGA',
  'CONFLICTO',
  'REPRODUCCION_MASIVA',
  'SENAL_CORRUPTA',
]
const severities: Severity[] = ['LEVE', 'MODERADO', 'GRAVE', 'CRITICO']
const statuses: SignalStatus[] = ['RECIBIDA', 'PROCESANDO', 'ATENDIDA']
const scrollKey = 'tropelcare_signals_scroll'

function appendUnique(current: Signal[], incoming: Signal[]) {
  const ids = new Set(current.map((signal) => signal.id))
  const next = [...current]

  for (const signal of incoming) {
    if (!ids.has(signal.id)) {
      ids.add(signal.id)
      next.push(signal)
    }
  }

  return next
}

function cleanParams(filters: SignalFeedFilters) {
  const params = new URLSearchParams()

  if (filters.signalType) params.set('signalType', filters.signalType)
  if (filters.severity) params.set('severity', filters.severity)
  if (filters.status) params.set('status', filters.status)
  if (filters.q) params.set('q', filters.q)

  return params
}

export function SignalsPage() {
  const { token } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [signals, setSignals] = useState<Signal[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [totalEstimate, setTotalEstimate] = useState(0)
  const [loadingFirstPage, setLoadingFirstPage] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [pageError, setPageError] = useState('')
  const [searchText, setSearchText] = useState(searchParams.get('q') ?? '')
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const inFlightRef = useRef(false)
  const activeKeyRef = useRef('')

  const filters = useMemo<SignalFeedFilters>(
    () => ({
      limit: 15,
      signalType: searchParams.get('signalType') ?? '',
      severity: searchParams.get('severity') ?? '',
      status: searchParams.get('status') ?? '',
      q: searchParams.get('q') ?? '',
    }),
    [searchParams],
  )

  const filterKey = useMemo(() => JSON.stringify(filters), [filters])

  useEffect(() => {
    setSearchText(filters.q ?? '')
  }, [filters.q])

  useEffect(() => {
    const saved = sessionStorage.getItem(scrollKey)

    if (saved) {
      window.setTimeout(() => {
        window.scrollTo({ top: Number(saved), behavior: 'auto' })
        sessionStorage.removeItem(scrollKey)
      }, 0)
    }
  }, [])

  useEffect(() => {
    if (!token) return

    const controller = new AbortController()
    const currentToken = token
    const currentKey = filterKey
    activeKeyRef.current = currentKey
    inFlightRef.current = true
    setSignals([])
    setNextCursor(null)
    setHasMore(true)
    setTotalEstimate(0)
    setError('')
    setPageError('')
    setLoadingFirstPage(true)

    async function loadFirstPage() {
      try {
        const response = await getSignalsFeed(currentToken, filters, null, controller.signal)

        if (activeKeyRef.current !== currentKey) return

        setSignals(appendUnique([], response.items))
        setNextCursor(response.nextCursor)
        setHasMore(response.hasMore)
        setTotalEstimate(response.totalEstimate)
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setError(err instanceof Error ? err.message : 'No se pudo cargar el feed')
      } finally {
        if (!controller.signal.aborted && activeKeyRef.current === currentKey) {
          inFlightRef.current = false
          setLoadingFirstPage(false)
        }
      }
    }

    loadFirstPage()

    return () => {
      controller.abort()
    }
  }, [filterKey, filters, token])

  const loadMore = useCallback(async () => {
    if (!token || !hasMore || !nextCursor || inFlightRef.current) return

    const currentKey = activeKeyRef.current
    inFlightRef.current = true
    setLoadingMore(true)
    setPageError('')

    try {
      const response = await getSignalsFeed(token, filters, nextCursor)

      if (activeKeyRef.current !== currentKey) return

      setSignals((current) => appendUnique(current, response.items))
      setNextCursor(response.nextCursor)
      setHasMore(response.hasMore)
      setTotalEstimate(response.totalEstimate)
    } catch (err) {
      if (activeKeyRef.current === currentKey) {
        setPageError(err instanceof Error ? err.message : 'No se pudo cargar la siguiente pagina')
      }
    } finally {
      if (activeKeyRef.current === currentKey) {
        inFlightRef.current = false
        setLoadingMore(false)
      }
    }
  }, [filters, hasMore, nextCursor, token])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadMore()
        }
      },
      { rootMargin: '360px' },
    )

    observer.observe(sentinel)

    return () => {
      observer.disconnect()
    }
  }, [loadMore])

  function updateFilters(nextValues: Partial<SignalFeedFilters>) {
    const nextFilters = {
      ...filters,
      ...nextValues,
    }

    setSearchParams(cleanParams(nextFilters))
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    updateFilters({ q: searchText.trim() })
  }

  function handleClear() {
    setSearchText('')
    setSearchParams(new URLSearchParams())
  }

  function saveScroll() {
    sessionStorage.setItem(scrollKey, String(window.scrollY))
  }

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold">Feed de Senales</h2>
        <p className="text-sm text-stone-600">
          Cursor, filtros en URL, deduplicacion y carga automatica al final.
        </p>
      </div>

      <form
        onSubmit={handleSearch}
        className="grid gap-3 rounded-md border border-stone-200 bg-white p-4 md:grid-cols-5"
      >
        <label className="md:col-span-2">
          <span className="text-sm font-medium">Busqueda</span>
          <input
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 outline-none focus:border-emerald-700"
            placeholder="Contenido o Tropel"
            maxLength={80}
          />
        </label>

        <FilterSelect
          label="Tipo"
          value={filters.signalType ?? ''}
          options={signalTypes}
          onChange={(value) => updateFilters({ signalType: value })}
        />
        <FilterSelect
          label="Severidad"
          value={filters.severity ?? ''}
          options={severities}
          onChange={(value) => updateFilters({ severity: value })}
        />
        <FilterSelect
          label="Estado"
          value={filters.status ?? ''}
          options={statuses}
          onChange={(value) => updateFilters({ status: value })}
        />

        <div className="flex gap-2 md:col-span-5">
          <button
            type="submit"
            className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white"
          >
            Buscar
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="rounded-md border border-stone-300 px-4 py-2 text-sm font-semibold"
          >
            Limpiar
          </button>
        </div>
      </form>

      <div className="min-h-[620px] rounded-md border border-stone-200 bg-white">
        <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3">
          <p className="text-sm text-stone-600">
            {totalEstimate ? `${totalEstimate} senales estimadas` : 'Feed de senales'}
          </p>
          {(loadingFirstPage || loadingMore) && (
            <p className="text-sm font-medium text-emerald-700">Cargando...</p>
          )}
        </div>

        {error && (
          <div className="m-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {!error && loadingFirstPage && (
          <div className="grid min-h-[520px] place-items-center px-4 text-sm text-stone-600">
            Cargando primeras senales...
          </div>
        )}

        {!error && !loadingFirstPage && signals.length === 0 && (
          <div className="grid min-h-[520px] place-items-center px-4 text-center">
            <div>
              <h3 className="font-semibold">Sin resultados</h3>
              <p className="mt-1 text-sm text-stone-600">Prueba quitando algun filtro.</p>
            </div>
          </div>
        )}

        {!error && signals.length > 0 && (
          <div className="divide-y divide-stone-100">
            {signals.map((signal) => (
              <article key={signal.id} className="grid gap-3 px-4 py-4 md:grid-cols-[1fr_1fr_1fr_auto]">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{signal.tropel.name}</h3>
                    <span className="rounded-full bg-stone-100 px-2 py-1 text-xs font-semibold text-stone-600">
                      {signal.tropel.species}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-stone-600">{signal.rawContent}</p>
                </div>

                <SignalMeta label="Tipo" value={signal.signalType} />
                <div className="grid gap-2 sm:grid-cols-2">
                  <SignalMeta label="Severidad" value={signal.severity} />
                  <SignalMeta label="Estado" value={signal.status} />
                </div>

                <div className="flex items-start justify-between gap-3 md:block md:text-right">
                  <p className="text-xs text-stone-500">
                    {new Date(signal.createdAt).toLocaleString()}
                  </p>
                  <Link
                    to={`/signals/${signal.id}`}
                    onClick={saveScroll}
                    className="mt-2 inline-flex rounded-md border border-stone-300 px-3 py-2 text-sm font-semibold hover:bg-stone-100"
                  >
                    Ver detalle
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}

        {pageError && (
          <div className="m-4 flex flex-col gap-3 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between">
            <span>{pageError}</span>
            <button
              type="button"
              onClick={loadMore}
              className="rounded-md border border-red-300 px-3 py-2 font-semibold"
            >
              Reintentar
            </button>
          </div>
        )}

        {!loadingFirstPage && !hasMore && signals.length > 0 && (
          <p className="px-4 py-5 text-center text-sm text-stone-500">Fin de la lista</p>
        )}

        <div ref={sentinelRef} className="h-8" />
      </div>
    </section>
  )
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: string[]
  onChange: (value: string) => void
}) {
  return (
    <label>
      <span className="text-sm font-medium">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 outline-none focus:border-emerald-700"
      >
        <option value="">Todos</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  )
}

function SignalMeta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-stone-500">{label}</p>
      <p className="text-sm">{value}</p>
    </div>
  )
}
