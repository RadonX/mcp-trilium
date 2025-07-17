import axios from 'axios';
import { logger } from './logger.js';

export class TriliumAPIError extends Error {
  constructor(message, status, details) {
    super(message);
    this.name = 'TriliumAPIError';
    this.status = status;
    this.details = details;
  }
}

export class TriliumClient {
  constructor() {
    this.baseURL = process.env.TRILIUM_URL || 'http://localhost:8080';
    this.authToken = process.env.TRILIUM_AUTH_TOKEN;
    this.timeout = parseInt(process.env.REQUEST_TIMEOUT, 10) || 30000;
    
    if (!this.authToken) {
      logger.warn('No TRILIUM_AUTH_TOKEN provided - authentication may fail');
    }
    
    this.client = axios.create({
      baseURL: `${this.baseURL}/etapi`,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
        ...(this.authToken && { 'Authorization': `Bearer ${this.authToken}` })
      }
    });

    // Add request/response interceptors for logging and error handling
    this.client.interceptors.request.use(
      (config) => {
        logger.debug(`Making request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        logger.error('Request error:', error.message);
        return Promise.reject(error);
      }
    );

    this.client.interceptors.response.use(
      (response) => {
        logger.debug(`Response: ${response.status} ${response.statusText}`);
        return response;
      },
      (error) => {
        const status = error.response?.status;
        const message = error.response?.data?.message || error.message;
        const details = error.response?.data;
        
        logger.error(`API error: ${status} - ${message}`);
        
        if (status === 401) {
          throw new TriliumAPIError('Authentication failed - check your TRILIUM_AUTH_TOKEN', status, details);
        } else if (status === 403) {
          throw new TriliumAPIError('Access forbidden - insufficient permissions', status, details);
        } else if (status === 404) {
          throw new TriliumAPIError('Resource not found', status, details);
        } else if (status >= 500) {
          throw new TriliumAPIError('TriliumNext server error', status, details);
        } else {
          throw new TriliumAPIError(message, status, details);
        }
      }
    );
  }

  async makeRequest(method, endpoint, data = null) {
    try {
      const config = {
        method,
        url: endpoint,
        ...(data && { data })
      };
      
      const response = await this.client(config);
      return response.data;
    } catch (error) {
      if (error instanceof TriliumAPIError) {
        throw error;
      }
      throw new TriliumAPIError(`Request failed: ${error.message}`, 0, { originalError: error.message });
    }
  }

  async get(endpoint) {
    return this.makeRequest('GET', endpoint);
  }

  async post(endpoint, data) {
    return this.makeRequest('POST', endpoint, data);
  }

  async put(endpoint, data) {
    return this.makeRequest('PUT', endpoint, data);
  }

  async putRaw(endpoint, content) {
    try {
      const config = {
        method: 'PUT',
        url: endpoint,
        data: content,
        headers: {
          'Content-Type': 'text/plain'
        }
      };
      
      const response = await this.client(config);
      return response.data;
    } catch (error) {
      if (error instanceof TriliumAPIError) {
        throw error;
      }
      throw new TriliumAPIError(`Request failed: ${error.message}`, 0, { originalError: error.message });
    }
  }

  async delete(endpoint) {
    return this.makeRequest('DELETE', endpoint);
  }
}