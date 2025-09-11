import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  checkEnvironment,
  getCeleryWorkerUrls,
  getApiBaseUrl,
} from '../environment';

const originalLocation = window.location;

describe('environment helpers', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    // Restore window.location if modified
    Object.defineProperty(window, 'location', { value: originalLocation });
  });

  it('checkEnvironment flags localhost correctly', () => {
    // Override hostname to localhost
    // @ts-expect-error override readonly for test
    delete window.location;
    Object.defineProperty(window, 'location', {
      value: { hostname: 'localhost' },
      configurable: true,
    });

    checkEnvironment();
    expect(localStorage.getItem('isLocalhost')).toBe('true');

    // Non-localhost
    // @ts-expect-error override readonly for test
    delete window.location;
    Object.defineProperty(window, 'location', {
      value: { hostname: 'example.com' },
      configurable: true,
    });

    checkEnvironment();
    expect(localStorage.getItem('isLocalhost')).toBe('false');
  });

  it('getApiBaseUrl returns default when not set', () => {
    const url = getApiBaseUrl();
    expect(url).toMatch(/http:\/\/localhost:8000\/api/);
  });

  it('getCeleryWorkerUrls yields defaults when env not set', () => {
    const urls = getCeleryWorkerUrls();
    expect(Array.isArray(urls)).toBe(true);
    // 1 worker + beat + websocket
    expect(urls.length).toBe(3);
    expect(urls[0].name).toBe('Worker 1');
    expect(urls[1].name).toBe('Beat');
    expect(urls[2].name).toBe('Websocket');
  });
});
