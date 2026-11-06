---
name: react-intelligent
description: Advanced React patterns, React 19 features (useActionState, useOptimistic, use hook), state architecture, and rendering performance. Use when writing, debugging, or reviewing React components.
---

# React Intelligent

Modern React engineering practices, state discipline, and component architecture.

## 1. Modern React 19 Primitives

- **Form Actions & Transitions**:
  Use `useActionState` to handle async mutations, pending states, and returned data without manual `setIsLoading(true)` / `try/catch` boilerplate:
  ```tsx
  import { useActionState } from 'react'

  function ItemForm({ action }) {
    const [state, formAction, isPending] = useActionState(action, null)
    return (
      <form action={formAction}>
        <input name="name" required />
        <button type="submit" disabled={isPending}>
          {isPending ? 'Saving...' : 'Save'}
        </button>
        {state?.error && <p role="alert">{state.error}</p>}
      </form>
    )
  }
  ```
- **Optimistic Updates**:
  Use `useOptimistic` to show instantaneous client updates before the server responds:
  ```tsx
  const [optimisticItems, setOptimisticItems] = useOptimistic(
    items,
    (current, newItem) => [...current, newItem]
  )
  ```
- **The `use()` API**:
  Use `use(Promise)` to unwrap async promises directly inside components wrapped in Suspense, or `use(Context)` to read context conditionally.
- **Ref as Prop**:
  In React 19, `ref` is a standard prop on function components—do not wrap with `forwardRef` unless maintaining legacy compatibility.

## 2. State Modeling & Architecture

- **Derive, Do Not Duplicate**:
  Never put state that can be computed from props or existing state into a `useState` + `useEffect`. Calculate it inline during render.
- **Single Source of Truth**:
  - URL state (search params) for filter, search, page numbers, tabs, modal IDs.
  - Server state for fetched entities.
  - Local state (`useState`) strictly for ephemeral UI (open/closed dropdown, input focus).
- **Avoid State Synchronization in Effects**:
  Do not use `useEffect` to copy props into state. If a component must reset its state when an ID changes, use a `key` prop at the call site (`<Profile key={userId} />`).

## 3. Render Purity & Performance

- **Pure Components**:
  Rendering must never produce side effects. Do not mutate objects, call APIs, or manipulate external DOM during render.
- **Selective Memoization**:
  Do not blindly wrap every primitive calculation in `useMemo` or every handler in `useCallback`. Use them when passing callbacks to heavy, memoized child trees (`React.memo`) or as dependencies to effects.
- **Component Decomposition**:
  Break large monolithic components into focused, single-responsibility units. Keep leaf components dumb and presentational.

