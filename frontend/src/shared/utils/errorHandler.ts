import { ApiError } from '../types/common-types';

export interface ErrorHandlerOptions {
  fallbackMessage?: string;
  showFieldPrefix?: boolean;
  logError?: boolean;
}

export const handleApiError = (
  error: unknown,
  options: ErrorHandlerOptions = {}
): string => {
  const {
    fallbackMessage = 'An unexpected error occurred. Please try again.',
    showFieldPrefix = true,
    logError = true,
  } = options;

  if (logError) {
    console.error('API Error:', error);
  }

  // Handle RTK Query error structure
  if (error && typeof error === 'object' && 'data' in error) {
    const apiError = error as { data: ApiError; status: number };

    // Handle different backend error structures
    if (apiError.data) {
      // Check for Django REST framework style errors
      if (
        'non_field_errors' in apiError.data &&
        Array.isArray(apiError.data.non_field_errors)
      ) {
        const nonFieldErrors = apiError.data.non_field_errors as string[];
        return nonFieldErrors[0] || 'Operation failed.';
      }

      // Check for standardized API error structure first
      if (apiError.data.detail) {
        return apiError.data.detail;
      }

      if (apiError.data.message) {
        return apiError.data.message;
      }

      // Automatically detect and handle field-specific errors
      // Look for any property that contains an array of strings (typical Django field errors)
      for (const [fieldName, fieldValue] of Object.entries(apiError.data)) {
        // Skip known non-field properties
        if (['detail', 'message', 'non_field_errors'].includes(fieldName)) {
          continue;
        }

        // Check if this looks like a field error (array of strings)
        if (
          Array.isArray(fieldValue) &&
          fieldValue.length > 0 &&
          typeof fieldValue[0] === 'string'
        ) {
          const prefix = showFieldPrefix
            ? `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1).replace('_', ' ')}: `
            : '';
          return `${prefix}${fieldValue[0]}`;
        }

        // Handle single string field errors
        if (typeof fieldValue === 'string') {
          const prefix = showFieldPrefix
            ? `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1).replace('_', ' ')}: `
            : '';
          return `${prefix}${fieldValue}`;
        }
      }
    }

    // Handle HTTP status codes
    switch (apiError.status) {
      case 400:
        return 'Please check your input and try again.';
      case 401:
        return 'Invalid credentials. Please check your email and password.';
      case 403:
        return 'You do not have permission to perform this action.';
      case 404:
        return 'The requested resource was not found.';
      case 409:
        return 'This resource already exists or conflicts with existing data.';
      case 422:
        return 'The provided data is invalid. Please check your input.';
      case 429:
        return 'Too many requests. Please wait a moment and try again.';
      case 500:
        return 'Server error. Please try again later.';
      case 502:
      case 503:
      case 504:
        return 'Service temporarily unavailable. Please try again later.';
      default:
        if (apiError.status >= 500) {
          return 'Server error. Please try again later.';
        }
    }
  }

  // Handle network errors
  if (error && typeof error === 'object' && 'message' in error) {
    const networkError = error as { message: string };
    if (
      networkError.message.includes('fetch') ||
      networkError.message.includes('network')
    ) {
      return 'Network error. Please check your connection and try again.';
    }
  }

  // Fallback error message
  return fallbackMessage;
};

// Specialized error handlers for different contexts
export const handleAuthError = (error: unknown): string => {
  return handleApiError(error, {
    fallbackMessage: 'Authentication failed. Please try again.',
  });
};

export const handleFormError = (error: unknown): string => {
  return handleApiError(error, {
    fallbackMessage: 'Please check your input and try again.',
    showFieldPrefix: true,
  });
};

export const handleDataError = (error: unknown): string => {
  return handleApiError(error, {
    fallbackMessage: 'Unable to load data. Please try again.',
    showFieldPrefix: false,
  });
};
