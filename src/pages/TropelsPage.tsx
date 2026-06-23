import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getSectors, getTropels } from '../api'
import { useAuth } from '../context/AuthContext'
import type {
  PaginatedTropels,
  Sector,
  SortDirection,
  Species,
  Tropel,
  TropelFilters,
  TropelOrderField,
  TropelSort,
  VitalState,
} from '../types'

const speciesOptions: Species[] = ['BLOBITO', 'CHISPA', 'GRUNON', 'DORMILON', 'GLITCHY']
const vitalStateOptions: VitalState[] = ['ESTABLE', 'HAMBRIENTO', 'AGITADO', 'MUTANDO', 'CRITICO']
const sizeOptions = [10, 20, 50]
const orderFields: { value: TropelOrderField; label: string }[] = [
  { value: 'name', label: 'Nombre' },
  { value: 'species', label: 'Especie' },
  { value: 'vitalState', label: 'Estado' },
  { value: 'sector', label: 'Sector' },
  { value: 'energyLevel', label: 'Energia' },
  { value: 'chaosIndex', label: 'Caos' },
  { value: 'updatedAt', label: 'Actualizado' },
]

function readPage(value: string | null) {
  const page = Number(value)
  return Number.isInteger(page) && page >= 0 ? page : 0
}

function readSize(value: string | null) {
  const size = Number(value)
  return sizeOptions.includes(size) ? size : 20
}

function readOrderBy(value: string | null, legacySort: string | null): TropelOrderField {
  if (orderFields.some((field) => field.value === value)) return value as TropelOrderField
  if (legacySort === 'name,asc') return 'name'
  if (legacySort === 'chaosIndex,desc') return 'chaosIndex'
  return 'updatedAt'
}

function readOrderDir(value: string | null, legacySort: string | null): SortDirection {
  if (value === 'asc' || value === 'desc') return value
  if (legacySort === 'name,asc') return 'asc'
  return 'desc'
}

function getServerSort(orderBy: TropelOrderField, orderDir: SortDirection): TropelSort {
  if (orderBy === 'name' && orderDir === 'asc') return 'name,asc'
  if (orderBy === 'chaosIndex' && orderDir === 'desc') return 'chaosIndex,desc'
  if (orderBy === 'updatedAt' && orderDir === 'desc') return 'updatedAt,desc'
  return 'updatedAt,desc'
}

function compareText(first: string, second: string, direction: SortDirection) {
  const result = first.localeCompare(second)
  return direction === 'asc' ? result : -result
}

function compareNumber(first: number, second: number, direction: SortDirection) {
  const result = first - second
  return direction === 'asc' ? result : -result
}

function compareDate(first: string, second: string, direction: SortDirection) {
  const result = new Date(first).getTime() - new Date(second).getTime()
  return direction === 'asc' ? result : -result
}

function sortTropels(items: Tropel[], orderBy: TropelOrderField, orderDir: SortDirection) {
  return [...items].sort((first, second) => {
    if (orderBy === 'name') return compareText(first.name, second.name, orderDir)
    if (orderBy === 'species') return compareText(first.species, second.species, orderDir)
    if (orderBy === 'vitalState') return compareText(first.vitalState, second.vitalState, orderDir)
    if (orderBy === 'sector') return compareText(first.sector.name, second.sector.name, orderDir)
    if (orderBy === 'energyLevel') return compareNumber(first.energyLevel, second.energyLevel, orderDir)
    if (orderBy === 'chaosIndex') return compareNumber(first.chaosIndex, second.chaosIndex, orderDir)
    return compareDate(first.updatedAt, second.updatedAt, orderDir)
  })
}

function cleanParams(filters: TropelFilters) {
  const params = new URLSearchParams()

  if (filters.page > 0) params.set('page', String(filters.page))
  if (filters.size !== 20) params.set('size', String(filters.size))
  if (filters.orderBy !== 'updatedAt') params.set('orderBy', filters.orderBy)
  if (filters.orderDir !== 'desc') params.set('orderDir', filters.orderDir)
  if (filters.species) params.set('species', filters.species)
  if (filters.vitalState) params.set('vitalState', filters.vitalState)
  if (filters.sectorId) params.set('sectorId', filters.sectorId)
  if (filters.q) params.set('q', filters.q)

  return params
}

export function TropelsPage() {
  const { token } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [sectors, setSectors] = useState<Sector[]>([])
  const [data, setData] = useState<PaginatedTropels | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchText, setSearchText] = useState(searchParams.get('q') ?? '')

  const filters = useMemo<TropelFilters>(
    () => ({
      page: readPage(searchParams.get('page')),
      size: readSize(searchParams.get('size')),
      species: searchParams.get('species') ?? '',
      vitalState: searchParams.get('vitalState') ?? '',
      sectorId: searchParams.get('sectorId') ?? '',
      q: searchParams.get('q') ?? '',
      orderBy: readOrderBy(searchParams.get('orderBy'), searchParams.get('sort')),
      orderDir: readOrderDir(searchParams.get('orderDir'), searchParams.get('sort')),
      sort: getServerSort(
        readOrderBy(searchParams.get('orderBy'), searchParams.get('sort')),
        readOrderDir(searchParams.get('orderDir'), searchParams.get('sort')),
      ),
    }),
    [searchParams],
  )

  useEffect(() => {
    setSearchText(filters.q ?? '')
  }, [filters.q])

  useEffect(() => {
    if (!token) return

    const controller = new AbortController()
    const currentToken = token

    async function loadSectors() {
      try {
        const response = await getSectors(currentToken, controller.signal)
        setSectors(response.items)
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
      }
    }

    loadSectors()

    return () => {
      controller.abort()
    }
  }, [token])

  useEffect(() => {
    if (!token) return

    const controller = new AbortController()
    const currentToken = token

    async function loadTropels() {
      setLoading(true)
      setError('')

      try {
        const response = await getTropels(currentToken, filters, controller.signal)
        setData(response)
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setError(err instanceof Error ? err.message : 'No se pudieron cargar los Tropeles')
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    loadTropels()

    return () => {
      controller.abort()
    }
  }, [filters, token])

  function updateFilters(nextValues: Partial<TropelFilters>) {
    const nextFilters = {
      ...filters,
      ...nextValues,
      page: nextValues.page ?? 0,
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

  const currentPage = data?.currentPage ?? filters.page
  const totalPages = data?.totalPages ?? 0
  const visibleTropels = useMemo(
    () => sortTropels(data?.content ?? [], filters.orderBy, filters.orderDir),
    [data, filters.orderBy, filters.orderDir],
  )

  function updateOrder(orderBy: TropelOrderField) {
    const orderDir = filters.orderBy === orderBy && filters.orderDir === 'asc' ? 'desc' : 'asc'
    updateFilters({
      orderBy,
      orderDir,
      sort: getServerSort(orderBy, orderDir),
    })
  }

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold">Atlas de Tropeles</h2>
        <p className="text-sm text-stone-600">
          Filtros, busqueda, ordenamiento y paginacion sincronizados con la URL.
        </p>
      </div>

      <form
        onSubmit={handleSearch}
        className="grid gap-3 rounded-md border border-stone-200 bg-white p-4 md:grid-cols-6"
      >
        <label className="md:col-span-2">
          <span className="text-sm font-medium">Busqueda</span>
          <input
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 outline-none focus:border-emerald-700"
            placeholder="Nombre o guardian"
            maxLength={80}
          />
        </label>

        <label>
          <span className="text-sm font-medium">Especie</span>
          <select
            value={filters.species}
            onChange={(event) => updateFilters({ species: event.target.value })}
            className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 outline-none focus:border-emerald-700"
          >
            <option value="">Todas</option>
            {speciesOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="text-sm font-medium">Estado</span>
          <select
            value={filters.vitalState}
            onChange={(event) => updateFilters({ vitalState: event.target.value })}
            className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 outline-none focus:border-emerald-700"
          >
            <option value="">Todos</option>
            {vitalStateOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="text-sm font-medium">Sector</span>
          <select
            value={filters.sectorId}
            onChange={(event) => updateFilters({ sectorId: event.target.value })}
            className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 outline-none focus:border-emerald-700"
          >
            <option value="">Todos</option>
            {sectors.map((sector) => (
              <option key={sector.id} value={sector.id}>
                {sector.sectorCode}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-end gap-2 md:col-span-6">
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
          <select
            aria-label="Cantidad por pagina"
            value={filters.size}
            onChange={(event) => updateFilters({ size: Number(event.target.value) })}
            className="ml-auto rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-emerald-700"
          >
            {sizeOptions.map((size) => (
              <option key={size} value={size}>
                {size} por pagina
              </option>
            ))}
          </select>
        </div>
      </form>

      <div className="min-h-[520px] rounded-md border border-stone-200 bg-white">
        <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3">
          <p className="text-sm text-stone-600">
            {data ? `${data.totalElements} resultados` : 'Esperando resultados'}
          </p>
          {loading && <p className="text-sm font-medium text-emerald-700">Cargando...</p>}
        </div>

        {error && (
          <div className="m-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {!error && data?.content.length === 0 && (
          <div className="grid min-h-[420px] place-items-center px-4 text-center">
            <div>
              <h3 className="font-semibold">Sin resultados</h3>
              <p className="mt-1 text-sm text-stone-600">Prueba quitando algun filtro.</p>
            </div>
          </div>
        )}

        {!error && data && data.content.length > 0 && (
          <div>
            <div className="hidden grid-cols-[1.3fr_1fr_1fr_1fr] gap-3 border-b border-stone-200 bg-stone-50 px-4 py-3 text-left text-xs font-semibold uppercase text-stone-500 md:grid">
              <SortHeader
                label="Nombre"
                field="name"
                orderBy={filters.orderBy}
                orderDir={filters.orderDir}
                onClick={updateOrder}
              />
              <SortHeader
                label="Especie"
                field="species"
                orderBy={filters.orderBy}
                orderDir={filters.orderDir}
                onClick={updateOrder}
              />
              <SortHeader
                label="Estado"
                field="vitalState"
                orderBy={filters.orderBy}
                orderDir={filters.orderDir}
                onClick={updateOrder}
              />
              <SortHeader
                label="Sector"
                field="sector"
                orderBy={filters.orderBy}
                orderDir={filters.orderDir}
                onClick={updateOrder}
              />
              <div className="col-span-4 grid gap-2 sm:grid-cols-4">
                <SortHeader
                  label="Energia"
                  field="energyLevel"
                  orderBy={filters.orderBy}
                  orderDir={filters.orderDir}
                  onClick={updateOrder}
                />
                <SortHeader
                  label="Caos"
                  field="chaosIndex"
                  orderBy={filters.orderBy}
                  orderDir={filters.orderDir}
                  onClick={updateOrder}
                />
                <SortHeader
                  label="Actualizado"
                  field="updatedAt"
                  orderBy={filters.orderBy}
                  orderDir={filters.orderDir}
                  onClick={updateOrder}
                />
              </div>
            </div>

            <div className="flex gap-2 overflow-x-auto border-b border-stone-200 px-4 py-3 md:hidden">
              {orderFields.map((button) => (
                <button
                  key={button.value}
                  type="button"
                  onClick={() => updateOrder(button.value)}
                  className={`whitespace-nowrap rounded-md border px-3 py-2 text-sm font-semibold ${
                    filters.orderBy === button.value
                      ? 'border-emerald-700 bg-emerald-700 text-white'
                      : 'border-stone-300 text-stone-700'
                  }`}
                >
                  {button.label} {filters.orderBy === button.value ? (filters.orderDir === 'asc' ? '↑' : '↓') : ''}
                </button>
              ))}
            </div>

            <div className="divide-y divide-stone-100">
            {visibleTropels.map((tropel) => (
              <article
                key={tropel.id}
                className="grid gap-3 px-4 py-4 md:grid-cols-[1.3fr_1fr_1fr_1fr]"
              >
                <div>
                  <h3 className="font-semibold">{tropel.name}</h3>
                  <p className="text-sm text-stone-600">{tropel.guardianName}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-stone-500">Especie</p>
                  <p className="text-sm">{tropel.species}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-stone-500">Estado</p>
                  <p className="text-sm">{tropel.vitalState}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-stone-500">Sector</p>
                  <p className="text-sm">{tropel.sector.name}</p>
                </div>
                <div className="md:col-span-4">
                  <div className="grid gap-2 sm:grid-cols-4">
                    <Meter label="Energia" value={tropel.energyLevel} />
                    <Meter label="Caos" value={tropel.chaosIndex} />
                    <div>
                      <p className="text-xs font-semibold uppercase text-stone-500">Mutacion</p>
                      <p className="text-sm">{tropel.mutationStage}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase text-stone-500">Actualizado</p>
                      <p className="text-sm">{new Date(tropel.updatedAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              </article>
            ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 rounded-md border border-stone-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-stone-600">
          Pagina {totalPages === 0 ? 0 : currentPage + 1} de {totalPages}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={loading || currentPage <= 0}
            onClick={() => updateFilters({ page: currentPage - 1 })}
            className="rounded-md border border-stone-300 px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
          >
            Anterior
          </button>
          <button
            type="button"
            disabled={loading || totalPages === 0 || currentPage >= totalPages - 1}
            onClick={() => updateFilters({ page: currentPage + 1 })}
            className="rounded-md border border-stone-300 px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
          >
            Siguiente
          </button>
        </div>
      </div>
    </section>
  )
}

function SortHeader({
  label,
  field,
  orderBy,
  orderDir,
  onClick,
}: {
  label: string
  field: TropelOrderField
  orderBy: TropelOrderField
  orderDir: SortDirection
  onClick: (field: TropelOrderField) => void
}) {
  const active = orderBy === field

  return (
    <button
      type="button"
      onClick={() => onClick(field)}
      className={`inline-flex items-center gap-1 text-left text-xs font-semibold uppercase ${
        active ? 'text-emerald-700' : 'text-stone-500 hover:text-stone-900'
      }`}
    >
      <span>{label}</span>
      <span aria-hidden="true">{active ? (orderDir === 'asc' ? '↑' : '↓') : '↕'}</span>
    </button>
  )
}

function Meter({ label, value }: { label: string; value: number }) {
  const safeValue = Math.max(0, Math.min(value, 100))

  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-stone-500">
        <span>{label}</span>
        <span>{safeValue}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-stone-100">
        <div className="h-full rounded-full bg-emerald-600" style={{ width: `${safeValue}%` }} />
      </div>
    </div>
  )
}
