import { ExecutionContext } from '@nestjs/common';
import { getSubdomainFactory } from './get-subdomain.decorator';

describe('GetSubdomain Decorator', () => {
  let mockExecutionContext: ExecutionContext;
  let mockRequest: any;

  beforeEach(() => {
    mockRequest = {
      headers: {},
    };

    mockExecutionContext = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
    } as ExecutionContext;
  });

  describe('getSubdomainFactory', () => {
    it('should return subdomain when origin header contains valid subdomain', () => {
      mockRequest.headers = {
        origin: 'https://tenant1.example.com',
      };

      const result = getSubdomainFactory(undefined, mockExecutionContext);

      expect(result).toBe('tenant1');
    });

    it('should return subdomain with uppercase Origin header', () => {
      mockRequest.headers = {
        Origin: 'https://mycompany.mydomain.com',
      };

      const result = getSubdomainFactory(undefined, mockExecutionContext);

      expect(result).toBe('mycompany');
    });

    it('should return subdomain for localhost with subdomain', () => {
      mockRequest.headers = {
        origin: 'http://app.localhost:3000',
      };

      const result = getSubdomainFactory(undefined, mockExecutionContext);

      expect(result).toBe('app');
    });

    it('should return null when no origin header is present', () => {
      mockRequest.headers = {};

      const result = getSubdomainFactory(undefined, mockExecutionContext);

      expect(result).toBeNull();
    });

    it('should return null when origin header is invalid URL', () => {
      mockRequest.headers = {
        origin: 'invalid-url',
      };

      const result = getSubdomainFactory(undefined, mockExecutionContext);

      expect(result).toBeNull();
    });

    it('should return null for domain without subdomain', () => {
      mockRequest.headers = {
        origin: 'https://example.com',
      };

      const result = getSubdomainFactory(undefined, mockExecutionContext);

      expect(result).toBeNull();
    });

    it('should return null for plain localhost', () => {
      mockRequest.headers = {
        origin: 'http://localhost:3000',
      };

      const result = getSubdomainFactory(undefined, mockExecutionContext);

      expect(result).toBeNull();
    });

    it('should return null for IP address', () => {
      mockRequest.headers = {
        origin: 'http://192.168.1.1:3000',
      };

      const result = getSubdomainFactory(undefined, mockExecutionContext);

      expect(result).toBeNull();
    });

    it('should handle multiple subdomains and return the first one', () => {
      mockRequest.headers = {
        origin: 'https://app.tenant1.example.com',
      };

      const result = getSubdomainFactory(undefined, mockExecutionContext);

      expect(result).toBe('app');
    });
  });
}); 