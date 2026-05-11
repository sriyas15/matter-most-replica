import { useState, useCallback } from "react";

/**
 * useAsync
 * Wraps any async function with loading / error / data state.
 *
 * Usage:
 *   const { execute, loading, error, data, clearError } = useAsync(async (id) => {
 *     const res = await api.get(`/items/${id}`);
 *     return res.data;
 *   });
 *
 *   await execute(42);
 */
export function useAsync(fn) {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const [data,    setData]     = useState(null);

  const execute = useCallback(
    async (...args) => {
      setLoading(true);
      setError(null);
      try {
        const result = await fn(...args);
        setData(result);
        return result;
      } catch (err) {
        const msg =
          err.response?.data?.message ||
          err.message ||
          "Something went wrong";
        setError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [fn]
  );

  const clearError = useCallback(() => setError(null), []);
  const reset      = useCallback(() => { setData(null); setError(null); setLoading(false); }, []);

  return { execute, loading, error, data, clearError, reset };
}

export default useAsync;