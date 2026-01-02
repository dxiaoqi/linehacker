import { useState, useCallback } from "react"

export interface AIRequestError {
  message: string
  code?: string
  statusCode?: number
  retryable: boolean
}

export interface AIRequestState {
  isLoading: boolean
  error: AIRequestError | null
  data: any | null
}

export interface AIRequestOptions {
  onSuccess?: (data: any) => void
  onError?: (error: AIRequestError) => void
}

/**
 * Custom hook for making AI requests with built-in error handling and retry support
 */
export function useAIRequest() {
  const [state, setState] = useState<AIRequestState>({
    isLoading: false,
    error: null,
    data: null,
  })

  const [lastRequest, setLastRequest] = useState<{
    endpoint: string
    payload: any
    options?: AIRequestOptions
  } | null>(null)

  const makeRequest = useCallback(
    async (endpoint: string, payload: any, options?: AIRequestOptions) => {
      setState({ isLoading: true, error: null, data: null })
      setLastRequest({ endpoint, payload, options })

      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          const error: AIRequestError = {
            message: errorData.error || `HTTP ${response.status}: ${response.statusText}`,
            code: errorData.code,
            statusCode: response.status,
            retryable: true,
          }
          throw error
        }

        const data = await response.json()
        setState({ isLoading: false, error: null, data })
        
        if (options?.onSuccess) {
          options.onSuccess(data)
        }

        return data
      } catch (error) {
        const aiError: AIRequestError =
          error instanceof Error
            ? {
                message: error.message,
                retryable: true,
              }
            : (error as AIRequestError)

        setState({ isLoading: false, error: aiError, data: null })

        if (options?.onError) {
          options.onError(aiError)
        }

        throw aiError
      }
    },
    []
  )

  const retry = useCallback(async () => {
    if (!lastRequest) {
      throw new Error("No previous request to retry")
    }

    return makeRequest(lastRequest.endpoint, lastRequest.payload, lastRequest.options)
  }, [lastRequest, makeRequest])

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }))
  }, [])

  return {
    ...state,
    makeRequest,
    retry,
    clearError,
    canRetry: !!lastRequest && !!state.error?.retryable,
  }
}

