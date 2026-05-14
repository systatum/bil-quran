/**
 * IPC stands for inter-process communication. We are not actually
 * using "inter-process" in any sense of the word. But this placeholder
 * struct is created to easily facilitate us if we ever move to do
 * this as an Electron app, for example, or as any app where the frontend
 * and backend, loosely-speaking, are two different entities. Using this
 * early on prepared for that, either way.
 */
export interface IPCResponse<T> {
  succeed: boolean
  data?: T | undefined
  errors?: string[]
}

export function newIPCResponse<T>({
  succeed = true,
  data = undefined,
  errors = [],
}: {
  succeed?: boolean
  data?: T
  errors?: string[]
}): IPCResponse<T> {
  return {
    succeed,
    data,
    errors,
  }
}

/**
 * Creating IPC tailored for error response. Any error in IPC style
 * communication should not be immediately raised, because participating
 * entities can be of different process, or even different server. Error
 * should be communicated by data, and then acted on by the respective
 * listener.
 */
export function newErrIPCResponse<T>(errors: unknown) {
  let normalized: string[] = []

  if (errors instanceof Error) {
    console.error("IPCResponse error", errors)
    normalized.push(errors.message)
  } else if (Array.isArray(errors)) {
    normalized = errors
  } else {
    normalized.push(String(errors))
  }

  return newIPCResponse<T>({ succeed: false, errors: normalized })
}
