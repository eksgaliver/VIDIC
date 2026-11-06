---
name: shadcn-react-expert
description: Engineering standards for shadcn/ui components, Radix UI primitives, Tailwind CSS styling, and essential React libraries. Use when designing, building, or refining client interfaces.
---

# shadcn/ui & React Ecosystem Guidelines

Standar implementasi antarmuka berbasis shadcn/ui, Tailwind CSS, dan ekosistem React modern.

## 1. Komponen shadcn/ui & Tailwind CSS

- **Komposisi Primitif Radix UI**:
  - Gunakan komponen dari `@/components/ui/*` yang di-generate via CLI shadcn (`bunx --bun shadcn@latest add <component>`).
  - Jangan memodifikasi styling inline secara sembarangan; manfaatkan `className` dengan utilitas `cn()` (`clsx` + `tailwind-merge`).
- **Desain Bebas Slop & Cliché**:
  - Hindari pola AI-slop: border radius seragam di semua elemen tanpa hierarki, bayangan abu-abu lembut repetitif di setiap card, atau warna aksen terracotta/warm cream standar.
  - Tentukan token warna kontras jelas, ritme visual yang seimbang, dan font sans/serif yang berkarakter.

## 2. Pengelolaan State: Server vs Client

- **Server State dengan TanStack Query**:
  - Gunakan `@tanstack/react-query` untuk semua data fetching, caching, invalidasi, dan background refetch.
  - Gabungkan dengan Eden Treaty:
    ```typescript
    import { useQuery } from '@tanstack/react-query'
    import { eden } from '@/lib/api'

    export function useUsers() {
      return useQuery({
        queryKey: ['users'],
        queryFn: async () => {
          const { data, error } = await eden.users.get()
          if (error) throw error
          return data
        }
      })
    }
    ```
- **Client State dengan Zustand**:
  - Gunakan Zustand untuk global UI state (tema, sidebar collapse, modal state, filter kompleks) tanpa boilerplate context provider:
    ```typescript
    import { create } from 'zustand'

    type UIStore = {
      sidebarOpen: boolean
      toggleSidebar: () => void
    }

    export const useUIStore = create<UIStore>((set) => ({
      sidebarOpen: true,
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen }))
    }))
    ```

## 3. Form & Validasi (React Hook Form + Zod)

- Selalu pasangkan `react-hook-form` dengan Zod resolver:
  ```tsx
  import { useForm } from 'react-hook-form'
  import { zodResolver } from '@hookform/resolvers/zod'
  import { z } from 'zod'
  import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
  import { Input } from '@/components/ui/input'
  import { Button } from '@/components/ui/button'

  const userSchema = z.object({
    name: z.string().min(2, 'Nama minimal 2 karakter'),
    email: z.string().email('Format email tidak valid')
  })

  export function UserForm({ onSubmit }: { onSubmit: (data: z.infer<typeof userSchema>) => void }) {
    const form = useForm<z.infer<typeof userSchema>>({
      resolver: zodResolver(userSchema),
      defaultValues: { name: '', email: '' }
    })

    return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nama Lengkap</FormLabel>
                <FormControl><Input placeholder="John Doe" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit">Simpan</Button>
        </form>
      </Form>
    )
  }
  ```

## 4. Tabel Kompleks (@tanstack/react-table)

- Gunakan pola tabel headless dari TanStack Table yang dibungkus oleh komponen Table dari shadcn/ui (`<Table>`, `<TableHeader>`, `<TableRow>`, `<TableCell>`).
- Pisahkan definisi kolom (`columns.tsx`) dari render komponen tabel (`data-table.tsx`).

