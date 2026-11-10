import * as React from 'react'
import { HiOutlinePencil, HiOutlinePlus, HiOutlineTrash } from 'react-icons/hi'
import Dialog from '@/components/ui/Dialog'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import {
  Badge,
  Button,
  CheckboxField,
  DialogBody,
  DialogFooter,
  DialogHeading,
  EmptyState,
  Notice,
  Panel,
  PanelHeader,
  SelectField,
  TableSkeleton,
  TextAreaField,
  TextField
} from '@/components/base'
import { AttendanceStatusBadge } from './AttendanceStatusBadge'
import { ATTENDANCE_COLOR_PRESETS } from '@/utils/attendance'
import { cn } from '@/lib/utils'
import type { AttendanceStatusItem } from '@/@types/attendance'

export interface AttendanceStatusDraft {
  name: string
  code: string
  description: string
  color: string
  isPresent: boolean
  isPaid: boolean
  isAbsent: boolean
  sortOrder: number
  status: string
}

interface AttendanceStatusMasterProps {
  statuses: AttendanceStatusItem[]
  canManage: boolean
  isLoading: boolean
  onSubmit: (draft: AttendanceStatusDraft, target: AttendanceStatusItem | null) => Promise<string | null>
  onDelete: (target: AttendanceStatusItem) => Promise<string | null>
}

const EMPTY_DRAFT: AttendanceStatusDraft = {
  name: '',
  code: '',
  description: '',
  color: '#64748b',
  isPresent: false,
  isPaid: true,
  isAbsent: false,
  sortOrder: 100,
  status: 'active'
}

/** Kode slug yang sama dengan pembuat kode di sisi layanan shifting. */
function draftCodeFromName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40)
}

function toDraft(item: AttendanceStatusItem): AttendanceStatusDraft {
  return {
    name: item.name,
    code: item.code,
    description: item.description ?? '',
    color: item.color,
    isPresent: item.isPresent,
    isPaid: item.isPaid,
    isAbsent: item.isAbsent,
    sortOrder: item.sortOrder,
    status: item.status
  }
}

export function AttendanceStatusMaster({
  statuses,
  canManage,
  isLoading,
  onSubmit,
  onDelete
}: AttendanceStatusMasterProps) {
  const [editTarget, setEditTarget] = React.useState<AttendanceStatusItem | null>(null)
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [draft, setDraft] = React.useState<AttendanceStatusDraft>(EMPTY_DRAFT)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [dialogError, setDialogError] = React.useState<string | null>(null)

  const [deleteTarget, setDeleteTarget] = React.useState<AttendanceStatusItem | null>(null)
  const [deleteError, setDeleteError] = React.useState<string | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)

  const openCreate = () => {
    setEditTarget(null)
    setDraft(EMPTY_DRAFT)
    setDialogError(null)
    setIsDialogOpen(true)
  }

  const openEdit = (item: AttendanceStatusItem) => {
    setEditTarget(item)
    setDraft(toDraft(item))
    setDialogError(null)
    setIsDialogOpen(true)
  }

  const patch = (value: Partial<AttendanceStatusDraft>) =>
    setDraft((current) => ({ ...current, ...value }))

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (draft.name.trim().length < 2) {
      setDialogError('Nama status minimal dua karakter.')
      return
    }

    setIsSubmitting(true)
    const message = await onSubmit(
      { ...draft, name: draft.name.trim(), code: draft.code.trim(), description: draft.description.trim() },
      editTarget
    )
    setIsSubmitting(false)

    if (message) {
      setDialogError(message)
      return
    }
    setIsDialogOpen(false)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    const message = await onDelete(deleteTarget)
    setIsDeleting(false)

    if (message) {
      setDeleteError(message)
      return
    }
    setDeleteTarget(null)
    setDeleteError(null)
  }

  return (
    <>
      <Panel>
        <PanelHeader
          title="Status absensi"
          description="HRD menentukan sendiri daftar status yang dipakai perusahaan ini. Warna dan label tersimpan di basis data, bukan di kode."
          meta={isLoading ? undefined : `${statuses.length} status`}
          actions={
            <Button
              tone="primary"
              size="sm"
              disabled={!canManage}
              onClick={openCreate}
              icon={<HiOutlinePlus className="h-4 w-4" />}
            >
              Tambah status
            </Button>
          }
        />

        {!canManage ? (
          <div className="border-b border-line px-4 py-3 sm:px-5">
            <p className="text-xs text-ink-2">
              Hanya administrator perusahaan yang dapat mengubah master status absensi.
            </p>
          </div>
        ) : null}

        {isLoading ? (
          <TableSkeleton rows={5} columns={5} />
        ) : statuses.length === 0 ? (
          <EmptyState
            title="Belum ada status absensi"
            description="Status bawaan biasanya sudah tersemai otomatis. Bila daftar ini kosong, muat ulang halaman atau tambahkan status pertama secara manual."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse text-left text-[13px] 2xl:text-sm">
              <thead>
                <tr className="border-b border-line text-[11px] uppercase tracking-wide text-ink-3 2xl:text-xs">
                  <th className="px-4 py-2.5 font-semibold sm:px-5 2xl:px-7 2xl:py-3.5">Status</th>
                  <th className="px-4 py-2.5 font-semibold 2xl:py-3.5">Sifat</th>
                  <th className="px-4 py-2.5 font-semibold 2xl:py-3.5">Urutan</th>
                  <th className="px-4 py-2.5 font-semibold 2xl:py-3.5">Dipakai</th>
                  <th className="px-4 py-2.5 font-semibold 2xl:py-3.5">Keadaan</th>
                  <th className="px-4 py-2.5 text-right font-semibold sm:px-5 2xl:px-7 2xl:py-3.5">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {statuses.map((item) => (
                  <tr key={item.id} className="transition-colors hover:bg-surface-2">
                    <td className="px-4 py-3.5 align-top sm:px-5 2xl:px-7 2xl:py-4">
                      <div className="flex items-center gap-2">
                        <AttendanceStatusBadge status={item} />
                        <span className="font-mono text-[11px] text-ink-3">{item.code}</span>
                        {item.isSystem ? <Badge tone="accent">Sistem</Badge> : null}
                      </div>
                      {item.description ? (
                        <p className="mt-1 max-w-sm truncate text-xs text-ink-3">{item.description}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3.5 align-top 2xl:py-4">
                      <div className="flex flex-wrap gap-1">
                        {item.isPresent ? <Badge tone="success">Hadir</Badge> : null}
                        {item.isPaid ? <Badge>Dibayar</Badge> : <Badge tone="warning">Tidak dibayar</Badge>}
                        {item.isAbsent ? <Badge tone="danger">Alpa</Badge> : null}
                        {!item.isPresent && !item.isAbsent ? (
                          <span className="text-xs text-ink-3">Tanpa flag perilaku</span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 align-top tabular text-ink-2 2xl:py-4">{item.sortOrder}</td>
                    <td className="px-4 py-3.5 align-top 2xl:py-4">
                      <span className="tabular text-ink-2">{item.usageCount ?? 0} baris</span>
                    </td>
                    <td className="px-4 py-3.5 align-top 2xl:py-4">
                      {item.status === 'active' ? (
                        <Badge tone="success">Aktif</Badge>
                      ) : (
                        <Badge>Nonaktif</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right align-top sm:px-5 2xl:px-7 2xl:py-4">
                      <div className="inline-flex items-center gap-1">
                        <Button
                          size="iconSm"
                          tone="quiet"
                          disabled={!canManage}
                          onClick={() => openEdit(item)}
                          aria-label={`Ubah status ${item.name}`}
                          title="Ubah status"
                        >
                          <HiOutlinePencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="iconSm"
                          tone="quiet"
                          className="text-error hover:bg-error-subtle hover:text-error"
                          disabled={!canManage || item.isSystem}
                          onClick={() => {
                            setDeleteError(null)
                            setDeleteTarget(item)
                          }}
                          aria-label={`Hapus status ${item.name}`}
                          title={
                            item.isSystem
                              ? 'Status bawaan sistem tidak bisa dihapus, nonaktifkan saja'
                              : 'Hapus status'
                          }
                        >
                          <HiOutlineTrash className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Dialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onRequestClose={() => setIsDialogOpen(false)}
        width={560}
      >
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <DialogHeading
            title={editTarget ? `Ubah status ${editTarget.name}` : 'Tambah status absensi'}
            description="Status baru langsung tersedia di dropdown presensi tanpa migrasi basis data."
          />

          <DialogBody className="space-y-4 px-4 py-5 sm:px-5">
            {dialogError ? (
              <Notice tone="danger" title="Perubahan ditolak" onDismiss={() => setDialogError(null)}>
                {dialogError}
              </Notice>
            ) : null}

            <TextField
              label="Nama status"
              value={draft.name}
              onChange={(event) => patch({ name: event.target.value })}
              placeholder="Misal: Dinas Luar, Setengah Hari, WFH"
              required
            />

            <TextField
              label="Kode status (opsional)"
              mono
              value={draft.code}
              onChange={(event) => patch({ code: event.target.value })}
              placeholder={draftCodeFromName(draft.name) || 'dinas_luar'}
              hint="Dibuat otomatis dari nama bila dibiarkan kosong. Kode unik per perusahaan."
            />

            <div className="space-y-2">
              <span className="block text-xs font-semibold text-ink-2">Warna chip</span>
              <div className="flex flex-wrap items-center gap-2">
                {ATTENDANCE_COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => patch({ color: preset })}
                    aria-label={`Pilih warna ${preset}`}
                    aria-pressed={draft.color.toLowerCase() === preset}
                    className={cn(
                      'h-7 w-7 rounded-full border transition-transform button-press-feedback',
                      draft.color.toLowerCase() === preset
                        ? 'border-ink ring-2 ring-primary-line'
                        : 'border-line hover:scale-105'
                    )}
                    style={{ backgroundColor: preset }}
                  />
                ))}
                <input
                  type="color"
                  value={/^#[0-9a-fA-F]{6}$/.test(draft.color) ? draft.color : '#64748b'}
                  onChange={(event) => patch({ color: event.target.value })}
                  aria-label="Warna khusus"
                  className="h-7 w-10 cursor-pointer rounded border border-line bg-surface p-0.5"
                />
                <span className="font-mono text-[11px] text-ink-3">{draft.color}</span>
              </div>
            </div>

            <div className="space-y-2.5 rounded-control border border-line bg-surface p-3.5">
              <CheckboxField
                label="Dihitung hadir"
                hint="Dipakai saat presensi masuk memindahkan status dari Belum Diisi."
                checked={draft.isPresent}
                onChange={(event) => patch({ isPresent: event.target.checked })}
              />
              <CheckboxField
                label="Dihitung dibayar"
                hint="Disiapkan untuk perhitungan gaji tanpa mengubah skema lagi."
                checked={draft.isPaid}
                onChange={(event) => patch({ isPaid: event.target.checked })}
              />
              <CheckboxField
                label="Dihitung alpa"
                hint="Menandai ketidakhadiran tanpa keterangan pada rekap."
                checked={draft.isAbsent}
                onChange={(event) => patch({ isAbsent: event.target.checked })}
              />
            </div>

            <TextAreaField
              label="Deskripsi (opsional)"
              value={draft.description}
              onChange={(event) => patch({ description: event.target.value })}
              placeholder="Kapan status ini dipakai, dan siapa yang berwenang menetapkannya"
              rows={2}
            />

            <div className="grid gap-3 sm:grid-cols-2">
              <TextField
                label="Urutan tampil"
                type="number"
                mono
                value={String(draft.sortOrder)}
                onChange={(event) => patch({ sortOrder: Number(event.target.value) || 0 })}
                hint="Angka kecil tampil lebih dulu."
              />
              <SelectField
                label="Keadaan"
                value={draft.status}
                onChange={(event) => patch({ status: event.target.value })}
              >
                <option value="active">Aktif</option>
                <option value="inactive">Nonaktif</option>
              </SelectField>
            </div>

            <div className="flex items-center gap-2 rounded-control border border-line bg-surface-2 px-3 py-2.5">
              <span className="text-xs text-ink-2">Pratinjau:</span>
              <AttendanceStatusBadge
                status={{ name: draft.name.trim() || 'Nama status', color: draft.color }}
              />
            </div>
          </DialogBody>

          <DialogFooter>
            <Button type="button" onClick={() => setIsDialogOpen(false)}>
              Batal
            </Button>
            <Button type="submit" tone="primary" loading={isSubmitting}>
              {isSubmitting ? 'Menyimpan...' : editTarget ? 'Simpan perubahan' : 'Tambah status'}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        type="danger"
        title="Hapus status absensi"
        confirmText={isDeleting ? 'Menghapus...' : 'Ya, hapus'}
        cancelText="Batal"
        onClose={() => setDeleteTarget(null)}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      >
        {deleteError ? (
          <Notice tone="danger" title="Penghapusan ditolak" onDismiss={() => setDeleteError(null)}>
            {deleteError}
          </Notice>
        ) : (
          <p>
            Hapus status <strong className="font-semibold text-ink">{deleteTarget?.name}</strong>? Status
            yang sudah dipakai baris presensi tidak bisa dihapus, hanya bisa dinonaktifkan agar riwayat
            tetap utuh.
          </p>
        )}
      </ConfirmDialog>
    </>
  )
}
