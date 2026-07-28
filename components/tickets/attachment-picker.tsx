'use client'

import { Download, FileText, Upload, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { cn } from '@/lib/utils'

const MAX_FILES = 5
const MAX_SIZE_MB = 10
const ACCEPT = 'image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.log,.zip'

export interface PickedAttachment {
  file: File
  /** Object URL — solo para previsualizar imágenes en el cliente. */
  previewUrl: string | null
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface UseAttachmentsArgs {
  value: PickedAttachment[]
  onChange: (files: PickedAttachment[]) => void
}

/**
 * Lógica compartida de adjuntos: input oculto, validación y borrado.
 * Permite componer la UI libremente (zona de arrastre o botón compacto).
 */
export function useAttachments({ value, onChange }: UseAttachmentsArgs) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)

  // Liberar los object URLs al desmontar para no fugar memoria.
  useEffect(() => {
    return () => {
      value.forEach((a) => a.previewUrl && URL.revokeObjectURL(a.previewUrl))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function addFiles(fileList: FileList | null) {
    if (!fileList?.length) return
    setError(null)

    const incoming = Array.from(fileList)

    if (value.length + incoming.length > MAX_FILES) {
      setError(`Máximo ${MAX_FILES} archivos.`)
      return
    }

    const tooBig = incoming.find((f) => f.size > MAX_SIZE_MB * 1024 * 1024)
    if (tooBig) {
      setError(`"${tooBig.name}" supera los ${MAX_SIZE_MB} MB.`)
      return
    }

    onChange([
      ...value,
      ...incoming.map((file) => ({
        file,
        previewUrl: file.type.startsWith('image/')
          ? URL.createObjectURL(file)
          : null,
      })),
    ])

    if (inputRef.current) inputRef.current.value = ''
  }

  function removeAt(index: number) {
    const target = value[index]
    if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl)
    onChange(value.filter((_, i) => i !== index))
    setError(null)
  }

  const hiddenInput = (
    <input
      ref={inputRef}
      type="file"
      multiple
      accept={ACCEPT}
      className="hidden"
      onChange={(e) => addFiles(e.target.files)}
    />
  )

  return {
    hiddenInput,
    open: () => inputRef.current?.click(),
    addFiles,
    removeAt,
    error,
    isFull: value.length >= MAX_FILES,
    maxFiles: MAX_FILES,
    maxSizeMb: MAX_SIZE_MB,
  }
}

/** Lista de archivos seleccionados, con miniatura y botón de quitar. */
export function AttachmentList({
  value,
  onRemove,
  disabled,
  className,
}: {
  value: PickedAttachment[]
  onRemove: (index: number) => void
  disabled?: boolean
  className?: string
}) {
  if (value.length === 0) return null

  return (
    <ul className={cn('grid grid-cols-1 gap-2 sm:grid-cols-2', className)}>
      {value.map((att, i) => (
        <li
          key={`${att.file.name}-${i}`}
          className="bg-muted/40 flex items-center gap-3 rounded-md border p-2"
        >
          <div className="bg-background flex size-10 shrink-0 items-center justify-center overflow-hidden rounded">
            {att.previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={att.previewUrl}
                alt={att.file.name}
                className="size-full object-cover"
              />
            ) : (
              <FileText className="text-muted-foreground size-5" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium">{att.file.name}</p>
            <p className="text-muted-foreground text-[11px]">
              {formatSize(att.file.size)}
            </p>
          </div>

          <button
            type="button"
            onClick={() => onRemove(i)}
            disabled={disabled}
            aria-label={`Quitar ${att.file.name}`}
            className="text-muted-foreground hover:text-foreground hover:bg-background rounded p-1 transition-colors"
          >
            <X className="size-4" />
          </button>
        </li>
      ))}
    </ul>
  )
}

/** Zona de arrastrar y soltar — usada al crear un ticket. */
export function AttachmentDropzone({
  value,
  onChange,
  disabled,
  className,
}: {
  value: PickedAttachment[]
  onChange: (files: PickedAttachment[]) => void
  disabled?: boolean
  className?: string
}) {
  const { hiddenInput, open, addFiles, removeAt, error, maxSizeMb } =
    useAttachments({ value, onChange })
  const [isDragging, setIsDragging] = useState(false)

  return (
    <div className={cn('space-y-3', className)}>
      {hiddenInput}

      <button
        type="button"
        disabled={disabled}
        onClick={open}
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setIsDragging(false)
          addFiles(e.dataTransfer.files)
        }}
        className={cn(
          'flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-6 py-8 text-center transition-colors',
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-muted-foreground/50 hover:bg-muted/30',
        )}
      >
        <Upload className="text-muted-foreground size-5" aria-hidden />
        <span className="text-sm font-medium">
          Arrastra archivos aquí o haz clic para buscar
        </span>
        <span className="text-muted-foreground text-xs">
          Imágenes, PDF, Word, Excel o texto · máximo {maxSizeMb} MB por archivo
        </span>
      </button>

      {error && <p className="text-destructive text-xs">{error}</p>}

      <AttachmentList value={value} onRemove={removeAt} disabled={disabled} />
    </div>
  )
}

// ── Enviar al servidor ──────────────────────────────────────────────────────

/** Convierte un File a base64 (sin el prefijo data:). */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = String(reader.result)
      resolve(result.slice(result.indexOf(',') + 1))
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export interface AttachmentUpload {
  fileName: string
  mimeType: string
  fileSize: number
  data: string
}

/** Convierte los archivos elegidos al formato que esperan las server actions. */
export async function attachmentsToUpload(
  items: PickedAttachment[],
): Promise<AttachmentUpload[]> {
  return Promise.all(
    items.map(async (a) => ({
      fileName: a.file.name,
      mimeType: a.file.type || 'application/octet-stream',
      fileSize: a.file.size,
      data: await fileToBase64(a.file),
    })),
  )
}

// ── Mostrar adjuntos ya guardados ───────────────────────────────────────────

export interface SavedAttachment {
  id: string
  fileName: string
  fileSize: number
  mimeType: string
  url: string
}

/** Muestra adjuntos guardados: imágenes en miniatura, archivos como descarga. */
export function AttachmentView({
  items,
  className,
}: {
  items: SavedAttachment[]
  className?: string
}) {
  if (!items.length) return null

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {items.map((a) =>
        a.mimeType.startsWith('image/') ? (
          <a
            key={a.id}
            href={a.url}
            target="_blank"
            rel="noreferrer"
            title={a.fileName}
            className="block overflow-hidden rounded-md border"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={a.url}
              alt={a.fileName}
              className="max-h-44 max-w-55 object-cover"
            />
          </a>
        ) : (
          <a
            key={a.id}
            href={a.url}
            download={a.fileName}
            className="bg-muted/40 hover:bg-muted flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors"
          >
            <FileText className="text-muted-foreground size-4 shrink-0" />
            <span className="max-w-45 truncate">{a.fileName}</span>
            <span className="text-muted-foreground text-[11px]">
              {formatSize(a.fileSize)}
            </span>
            <Download className="text-muted-foreground size-3.5 shrink-0" />
          </a>
        ),
      )}
    </div>
  )
}
