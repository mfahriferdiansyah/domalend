import { useState, useEffect, useCallback } from 'react';
import { domaLendAPI } from '@/services/domalend-api';

export interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export interface PaginatedApiState<T> extends ApiState<T[]> {
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}

export interface UseApiOptions {
  immediate?: boolean;
  pollingInterval?: number;
}

export function useApi<T>(
  apiCall: () => Promise<T>,
  options: UseApiOptions = {}
) {
  const { immediate = true, pollingInterval } = options;
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    loading: immediate,
    error: null,
  });

  const execute = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const data = await apiCall();
      setState({ data, loading: false, error: null });
      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      setState({ data: null, loading: false, error: errorMessage });
      throw error;
    }
  }, [apiCall]);

  const refresh = useCallback(() => {
    return execute();
  }, [execute]);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [execute, immediate]);

  useEffect(() => {
    if (pollingInterval && pollingInterval > 0) {
      const interval = setInterval(execute, pollingInterval);
      return () => clearInterval(interval);
    }
  }, [execute, pollingInterval]);

  return {
    ...state,
    execute,
    refresh,
    reset: () => setState({ data: null, loading: false, error: null }),
  };
}

export function usePaginatedApi<T>(
  apiCall: (params: { page: number; limit: number }) => Promise<{
    data: T[];
    total: number;
    page: number;
    limit: number;
  }>,
  initialPage = 1,
  itemsPerPage = 20,
  options: UseApiOptions = {}
) {
  const { immediate = true } = options;
  const [state, setState] = useState<PaginatedApiState<T>>({
    data: [],
    loading: immediate,
    error: null,
    pagination: {
      currentPage: initialPage,
      totalPages: 1,
      totalItems: 0,
      itemsPerPage,
    },
  });

  const execute = useCallback(async (page = state.pagination.currentPage) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await apiCall({ page, limit: itemsPerPage });
      const totalPages = Math.ceil(response.total / itemsPerPage);
      
      setState({
        data: response.data,
        loading: false,
        error: null,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: response.total,
          itemsPerPage,
        },
      });
      
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
      throw error;
    }
  }, [apiCall, itemsPerPage, state.pagination.currentPage]);

  const goToPage = useCallback((page: number) => {
    if (page >= 1 && page <= state.pagination.totalPages) {
      return execute(page);
    }
  }, [execute, state.pagination.totalPages]);

  const nextPage = useCallback(() => {
    return goToPage(state.pagination.currentPage + 1);
  }, [goToPage, state.pagination.currentPage]);

  const prevPage = useCallback(() => {
    return goToPage(state.pagination.currentPage - 1);
  }, [goToPage, state.pagination.currentPage]);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [execute, immediate]);

  return {
    ...state,
    execute,
    goToPage,
    nextPage,
    prevPage,
    refresh: () => execute(state.pagination.currentPage),
    reset: () => setState({
      data: [],
      loading: false,
      error: null,
      pagination: {
        currentPage: initialPage,
        totalPages: 1,
        totalItems: 0,
        itemsPerPage,
      },
    }),
  };
}

export function useApiMutation<T, P = void>(
  mutationFn: (params: P) => Promise<T>
) {
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const mutate = useCallback(async (params: P) => {
    setState({ data: null, loading: true, error: null });
    
    try {
      const data = await mutationFn(params);
      setState({ data, loading: false, error: null });
      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      setState({ data: null, loading: false, error: errorMessage });
      throw error;
    }
  }, [mutationFn]);

  return {
    ...state,
    mutate,
    reset: () => setState({ data: null, loading: false, error: null }),
  };
}