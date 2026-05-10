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
