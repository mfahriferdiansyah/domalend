import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { getMarketDataApiUrl } from '@/constants/api-config';

// Create a function to get API client for specific chain
export function getApiClient(chainId: string | number): AxiosInstance {
  const apiClient: AxiosInstance = axios.create({
    baseURL: getMarketDataApiUrl(chainId),
    timeout: 60000,
    headers: {
      'Content-Type': 'application/json',
      'Accept': '*/*',
    }
  });

  // Request interceptor
  apiClient.interceptors.request.use(
    (config) => {
      if (process.env.NODE_ENV === 'development') {
        console.log(`API Request [Chain ${chainId}]: ${config.method?.toUpperCase()} ${config.url}`);
      }
      return config;
    },
    (error) => {
      if (process.env.NODE_ENV === 'development') {
        console.error(`API Request Error [Chain ${chainId}]:`, error);
      }
      return Promise.reject(error);
    }
  );

  // Response interceptor
  apiClient.interceptors.response.use(
    (response) => {
      if (process.env.NODE_ENV === 'development') {
        console.log(`API Response [Chain ${chainId}]: ${response.status} ${response.config.url}`);
      }
      return response;
    },
    (error) => {
      if (process.env.NODE_ENV === 'development') {
        console.error(`API Response Error [Chain ${chainId}]:`, error);
      }
      return Promise.reject(error);
    }
  );

  return apiClient;
}

// Helper function to make GET requests
export const apiGet = async <T>(chainId: string | number, url: string, config?: AxiosRequestConfig): Promise<T> => {
  const client = getApiClient(chainId);
  const response: AxiosResponse<T> = await client.get(url, config);
  return response.data;
};

// Helper function to make POST requests
export const apiPost = async <T>(chainId: string | number, url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
  const client = getApiClient(chainId);
  const response: AxiosResponse<T> = await client.post(url, data, config);
  return response.data;
};

// Helper function to make PUT requests
export const apiPut = async <T>(chainId: string | number, url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
  const client = getApiClient(chainId);
  const response: AxiosResponse<T> = await client.put(url, data, config);
  return response.data;
};

// Helper function to make DELETE requests
export const apiDelete = async <T>(chainId: string | number, url: string, config?: AxiosRequestConfig): Promise<T> => {
  const client = getApiClient(chainId);
  const response: AxiosResponse<T> = await client.delete(url, config);
  return response.data;
};

export default getApiClient;
