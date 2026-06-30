/**
 * useTickets.js
 *
 * Custom hook encapsulating all ticket list state:
 * fetch, filters, pagination, and loading/error handling.
 *
 * Components just call `useTickets(filters)` and get back
 * { tickets, loading, error, refetch } — clean separation of concerns.
 */
import { useState, useEffect, useCallback } from 'react';
import { getTickets } from '../services/ticketService';

/**
 * @param {object} filters - { status, priority, type, search, startDate, endDate }
 * @param {boolean} autoFetch - whether to fetch on mount (default: true)
 */
export function useTickets(filters = {}, autoFetch = true) {
  const [tickets,  setTickets]  = useState([]);
  const [loading,  setLoading]  = useState(autoFetch);
  const [error,    setError]    = useState(null);
  const [fetchKey, setFetchKey] = useState(0);   // increment to trigger refetch

  const refetch = useCallback(() => setFetchKey((k) => k + 1), []);

  useEffect(() => {
    if (!autoFetch && fetchKey === 0) return;

    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getTickets(filters);
        if (!cancelled) setTickets(data.data || []);
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.message || 'Failed to load tickets.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchKey, JSON.stringify(filters)]);

  return { tickets, loading, error, refetch };
}
