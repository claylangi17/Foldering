"use client"

import * as React from "react"

import type { ToastActionElement, ToastProps } from "@/components/ui/toast"

const TOAST_LIMIT = 5
const TOAST_REMOVE_DELAY = 1000

type ToastType = ToastProps & {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: ToastActionElement
}

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const

let count = 0

function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER
  return count.toString()
}

type ActionType = typeof actionTypes

type Action =
  | {
      type: ActionType["ADD_TOAST"]
      toast: ToastType
    }
  | {
      type: ActionType["UPDATE_TOAST"]
      toast: Partial<ToastType>
    }
  | {
      type: ActionType["DISMISS_TOAST"]
      toastId?: string
    }
  | {
      type: ActionType["REMOVE_TOAST"]
      toastId?: string
    }

interface State {
  toasts: ToastType[]
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case actionTypes.ADD_TOAST:
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      }

    case actionTypes.UPDATE_TOAST:
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      }

    case actionTypes.DISMISS_TOAST: {
      const { toastId } = action;

      if (toastId) {
        // Clear any existing removal timeout for this specific toast
        const existingTimeout = toastTimeouts.get(toastId);
        if (existingTimeout) {
          clearTimeout(existingTimeout);
        }
        // Schedule REMOVE_TOAST for this specific toast
        const newTimeout = setTimeout(() => {
          dispatch({ type: actionTypes.REMOVE_TOAST, toastId });
          toastTimeouts.delete(toastId); // Clean up from map after dispatching
        }, TOAST_REMOVE_DELAY);
        toastTimeouts.set(toastId, newTimeout);
      } else {
        // Dismiss all: iterate over all current toasts, mark them as open:false, 
        // and schedule their removal if they were open.
        state.toasts.forEach(t => {
          if (t.open) { // Process toasts that are currently open or were just added
            const existingTimeout = toastTimeouts.get(t.id);
            if (existingTimeout) {
              clearTimeout(existingTimeout);
            }
            const newTimeout = setTimeout(() => {
              dispatch({ type: actionTypes.REMOVE_TOAST, toastId: t.id });
              toastTimeouts.delete(t.id);
            }, TOAST_REMOVE_DELAY);
            toastTimeouts.set(t.id, newTimeout);
          }
        });
      }

      // Mark the toast(s) as not open. The actual removal from the array will happen
      // when REMOVE_TOAST is dispatched by the setTimeout.
      return {
        ...state,
        toasts: state.toasts.map((t) => {
          if (toastId === undefined) { // Dismiss all
            return { ...t, open: false };
          }
          if (t.id === toastId) { // Dismiss specific
            return { ...t, open: false };
          }
          return t;
        }),
      };
    }

    case actionTypes.REMOVE_TOAST:
      // Clear any timeout that might have been associated with this toast
      if (action.toastId) {
        const existingTimeout = toastTimeouts.get(action.toastId);
        if (existingTimeout) {
          clearTimeout(existingTimeout);
          toastTimeouts.delete(action.toastId);
        }
      }

      if (action.toastId === undefined) { // Remove all toasts
        // Clear all pending removal timeouts
        toastTimeouts.forEach(timeout => clearTimeout(timeout));
        toastTimeouts.clear();
        return {
          ...state,
          toasts: [],
        };
      }
      // Remove a specific toast
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      };
  }
}

const listeners: Array<(state: State) => void> = []

let memoryState: State = { toasts: [] }

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action)
  listeners.forEach((listener) => {
    listener(memoryState)
  })
}

type Toast = Omit<ToastType, "id">

function toast({ ...props }: Toast) {
  const id = genId()

  const update = (props: Toast) =>
    dispatch({
      type: actionTypes.UPDATE_TOAST,
      toast: { ...props, id },
    })
  const dismiss = () => dispatch({ type: actionTypes.DISMISS_TOAST, toastId: id })

  dispatch({
    type: actionTypes.ADD_TOAST,
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (open: boolean) => {
        if (!open) dismiss()
      },
    },
  })

  return {
    id: id,
    dismiss,
    update,
  }
}

function useToast() {
  const [state, setState] = React.useState<State>(memoryState)

  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, [state])

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: actionTypes.DISMISS_TOAST, toastId }),
  }
}

export { useToast, toast }
