# 🚨 Frontend Error Handling Strategy — SupliList Web App

## 📋 Sumário Executivo

Este guia define como o frontend do SupliList tratará erros de forma consistente, prevenindo falhas silenciosas, mantendo o usuário informado e garantindo observabilidade.

### Problemas Evitados:
1. ❌ **Chamadas API sem try/catch** → ✅ Wrapper com error handling obrigatório
2. ❌ **Operações assincronas que falham silenciosamente** → ✅ Fallbacks e retry logic
3. ❌ **Falta de feedback ao usuário** → ✅ Toast notifications + user-friendly messages
4. ❌ **Erros no console sem contexto** → ✅ Error boundary + logging estruturado

---

## 1️⃣ React Error Boundary (Classe para Erros de Rendering)

### Implementação Base:

```typescript
// src/shared/components/error-boundary/ErrorBoundary.tsx
import React, { ReactNode, ErrorInfo } from 'react';
import { ErrorBoundaryUI } from './ErrorBoundaryUI';
import { errorLogger } from '../../services/error-logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log ao serviço de errors
    errorLogger.captureException(error, {
      context: 'React Error Boundary',
      componentStack: errorInfo.componentStack,
    });

    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <ErrorBoundaryUI
            error={this.state.error}
            onReset={this.handleReset}
            isDev={process.env.NODE_ENV === 'development'}
            componentStack={this.state.errorInfo?.componentStack}
          />
        )
      );
    }

    return this.props.children;
  }
}
```

### UI do Error Boundary:

```typescript
// src/shared/components/error-boundary/ErrorBoundaryUI.tsx
import React from 'react';
import styles from './ErrorBoundaryUI.module.css';

interface Props {
  error: Error | null;
  onReset: () => void;
  isDev: boolean;
  componentStack?: string;
}

export function ErrorBoundaryUI({
  error,
  onReset,
  isDev,
  componentStack,
}: Props) {
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <h1 className={styles.title}>⚠️ Algo deu errado</h1>
        <p className={styles.message}>
          Desculpe, a página encontrou um erro inesperado. Tente recarregar ou voltar ao início.
        </p>

        {isDev && error && (
          <details className={styles.devInfo}>
            <summary>Detalhes do erro (desenvolvimento)</summary>
            <pre className={styles.stack}>
              {error.toString()}
              {componentStack && `\n\n${componentStack}`}
            </pre>
          </details>
        )}

        <div className={styles.actions}>
          <button onClick={onReset} className={styles.primaryButton}>
            ↻ Tentar novamente
          </button>
          <a href="/" className={styles.secondaryButton}>
            ← Voltar ao início
          </a>
        </div>
      </div>
    </div>
  );
}
```

### Usar em Páginas Principais:

```typescript
// src/app.tsx
import { ErrorBoundary } from './shared/components/error-boundary/ErrorBoundary';

export function App() {
  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          {/* rotas */}
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}

// Granular também em seções específicas:
export function SupplementCatalog() {
  return (
    <ErrorBoundary fallback={<CatalogErrorFallback />}>
      <div>
        <CatalogHeader />
        <CatalogGrid />
      </div>
    </ErrorBoundary>
  );
}
```

---

## 2️⃣ Wrapper de Requisições HTTP com Error Handling

### API Client Base:

```typescript
// src/shared/services/api-client.ts
import axios, { AxiosInstance, AxiosError } from 'axios';
import { toastService } from './toast.service';
import { errorLogger } from './error-logger';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ApiError {
  code: string;
  message: string;
  status: number;
  details?: Record<string, unknown>;
}

class ApiClient {
  private axiosInstance: AxiosInstance;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Interceptor para adicionar token
    this.axiosInstance.interceptors.request.use((config) => {
      const token = localStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Interceptor para tratar erros
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error) => this.handleError(error)
    );
  }

  private handleError(error: unknown): Promise<never> {
    const apiError = this.parseError(error);

    // Log estruturado
    errorLogger.logApiError(apiError);

    // Mostrar toast ao usuário (não técnico)
    this.showUserFriendlyError(apiError);

    return Promise.reject(apiError);
  }

  private parseError(error: unknown): ApiError {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status || 500;
      const data = error.response?.data as any;

      return {
        code: data?.error || `HTTP_${status}`,
        message: this.getUserFriendlyMessage(status, data?.message),
        status,
        details: data?.details,
      };
    }

    if (error instanceof Error) {
      return {
        code: 'NETWORK_ERROR',
        message: 'Verifique sua conexão de internet',
        status: 0,
        details: { originalMessage: error.message },
      };
    }

    return {
      code: 'UNKNOWN_ERROR',
      message: 'Um erro desconhecido ocorreu',
      status: 500,
    };
  }

  private getUserFriendlyMessage(status: number, serverMessage?: string): string {
    const messages: Record<number, string> = {
      400: 'Dados inválidos. Verifique o formulário.',
      401: 'Faça login novamente.',
      403: 'Você não tem permissão para fazer isso.',
      404: 'Recurso não encontrado.',
      429: 'Muitas requisições. Aguarde um momento.',
      500: 'Erro no servidor. Tente novamente mais tarde.',
      503: 'Serviço indisponível. Tente novamente em alguns minutos.',
      0: 'Sem conexão. Verifique sua internet.',
    };

    return messages[status] || serverMessage || 'Algo deu errado. Tente novamente.';
  }

  private showUserFriendlyError(error: ApiError) {
    // Não mostrar erros técnicos ao usuário
    toastService.error(error.message);
  }

  // Métodos GET, POST, PUT, DELETE com error handling

  async get<T>(url: string, options?: any): Promise<T> {
    try {
      const response = await this.axiosInstance.get<ApiResponse<T>>(url, options);
      return response.data.data as T;
    } catch (error) {
      throw error; // Já tratado no interceptor
    }
  }

  async post<T>(url: string, data?: any, options?: any): Promise<T> {
    try {
      const response = await this.axiosInstance.post<ApiResponse<T>>(url, data, options);
      return response.data.data as T;
    } catch (error) {
      throw error;
    }
  }

  async put<T>(url: string, data?: any, options?: any): Promise<T> {
    try {
      const response = await this.axiosInstance.put<ApiResponse<T>>(url, data, options);
      return response.data.data as T;
    } catch (error) {
      throw error;
    }
  }

  async delete<T>(url: string, options?: any): Promise<T> {
    try {
      const response = await this.axiosInstance.delete<ApiResponse<T>>(url, options);
      return response.data.data as T;
    } catch (error) {
      throw error;
    }
  }
}

export const apiClient = new ApiClient();
```

### Exemplo de Uso em um Hook:

```typescript
// src/shared/hooks/useApi.ts
import { useState, useCallback } from 'react';
import { ApiError } from '../services/api-client';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: ApiError | null;
}

export function useApi<T>(
  apiCall: () => Promise<T>,
  initialData: T | null = null
) {
  const [state, setState] = useState<UseApiState<T>>({
    data: initialData,
    loading: false,
    error: null,
  });

  const execute = useCallback(async () => {
    setState({ data: initialData, loading: true, error: null });

    try {
      const result = await apiCall();
      setState({ data: result, loading: false, error: null });
      return result;
    } catch (error) {
      const apiError = error as ApiError;
      setState({
        data: initialData,
        loading: false,
        error: apiError,
      });
      throw error; // Re-throw se o caller quiser tratar
    }
  }, [apiCall, initialData]);

  const retry = useCallback(() => execute(), [execute]);

  return { ...state, execute, retry };
}
```

### Usando no Componente:

```typescript
// src/features/supplements/pages/SupplementDetail.tsx
import { useApi } from '../../../shared/hooks/useApi';
import { supplementService } from '../services/supplement.service';
import { Skeleton } from '../../../shared/components/skeleton/Skeleton';
import { ErrorCard } from '../../../shared/components/error-card/ErrorCard';

export function SupplementDetail({ id }: { id: string }) {
  const { data, loading, error, retry } = useApi(
    () => supplementService.getSupplement(id),
    null
  );

  if (loading) return <Skeleton />;

  if (error) {
    return (
      <ErrorCard
        message={error.message}
        onRetry={retry}
        showDetails={process.env.NODE_ENV === 'development'}
      />
    );
  }

  if (!data) return <div>Suplemento não encontrado</div>;

  return <SupplementView supplement={data} />;
}
```

---

## 3️⃣ Toast Service para Notificações do Usuário

```typescript
// src/shared/services/toast.service.ts
export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastListener {
  (toast: Toast): void;
}

class ToastService {
  private listeners: Set<ToastListener> = new Set();

  subscribe(listener: ToastListener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(toast: Toast) {
    this.listeners.forEach((listener) => listener(toast));
  }

  success(message: string, duration = 3000) {
    this.emit({
      id: Date.now().toString(),
      type: 'success',
      message,
      duration,
    });
  }

  error(message: string, duration = 5000) {
    this.emit({
      id: Date.now().toString(),
      type: 'error',
      message,
      duration,
    });
  }

  warning(message: string, duration = 4000) {
    this.emit({
      id: Date.now().toString(),
      type: 'warning',
      message,
      duration,
    });
  }

  info(message: string, duration = 3000) {
    this.emit({
      id: Date.now().toString(),
      type: 'info',
      message,
      duration,
    });
  }
}

export const toastService = new ToastService();
```

### Componente ToastContainer:

```typescript
// src/shared/components/toast/ToastContainer.tsx
import React, { useEffect, useState } from 'react';
import { Toast, toastService } from '../../services/toast.service';
import { Toast as ToastComponent } from './Toast';
import styles from './ToastContainer.module.css';

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const unsubscribe = toastService.subscribe((toast) => {
      setToasts((prev) => [...prev, toast]);

      // Auto-remove após duration
      if (toast.duration) {
        const timer = setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== toast.id));
        }, toast.duration);

        return () => clearTimeout(timer);
      }
    });

    return unsubscribe;
  }, []);

  const handleRemove = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className={styles.container}>
      {toasts.map((toast) => (
        <ToastComponent
          key={toast.id}
          {...toast}
          onClose={() => handleRemove(toast.id)}
        />
      ))}
    </div>
  );
}
```

---

## 4️⃣ Error Logger Estruturado

```typescript
// src/shared/services/error-logger.ts
export interface ErrorContext {
  context?: string;
  userId?: string;
  url?: string;
  userAgent?: string;
  timestamp?: string;
  [key: string]: unknown;
}

class ErrorLogger {
  captureException(error: Error, context: ErrorContext = {}) {
    const errorData = {
      message: error.message,
      stack: error.stack,
      name: error.name,
      context: {
        ...context,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
      },
    };

    // Log no console em dev
    if (process.env.NODE_ENV === 'development') {
      console.group('🚨 Error Logged');
      console.error(errorData);
      console.groupEnd();
    }

    // Enviar ao servidor (optional, para monitoring em produção)
    if (process.env.NODE_ENV === 'production') {
      this.sendToServer(errorData);
    }
  }

  logApiError(error: {
    code: string;
    message: string;
    status: number;
    details?: Record<string, unknown>;
  }) {
    const errorLog = {
      type: 'API_ERROR',
      ...error,
      url: window.location.href,
      timestamp: new Date().toISOString(),
    };

    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ API Error:', errorLog);
    }

    if (process.env.NODE_ENV === 'production') {
      this.sendToServer(errorLog);
    }
  }

  private sendToServer(errorData: unknown) {
    // Enviar para um endpoint de logging
    navigator.sendBeacon('/api/logs/errors', JSON.stringify(errorData));
  }
}

export const errorLogger = new ErrorLogger();
```

---

## 5️⃣ Componente ErrorCard para Exibição de Erros

```typescript
// src/shared/components/error-card/ErrorCard.tsx
import React from 'react';
import styles from './ErrorCard.module.css';

interface Props {
  message: string;
  onRetry?: () => void;
  showDetails?: boolean;
  details?: Record<string, unknown>;
}

export function ErrorCard({ message, onRetry, showDetails, details }: Props) {
  return (
    <div className={styles.card}>
      <div className={styles.icon}>⚠️</div>
      <h2 className={styles.title}>Ops!</h2>
      <p className={styles.message}>{message}</p>

      {showDetails && details && (
        <details className={styles.details}>
          <summary>Detalhes técnicos</summary>
          <pre className={styles.code}>{JSON.stringify(details, null, 2)}</pre>
        </details>
      )}

      <div className={styles.actions}>
        {onRetry && (
          <button onClick={onRetry} className={styles.primaryButton}>
            ↻ Tentar novamente
          </button>
        )}
        <a href="/" className={styles.secondaryButton}>
          ← Voltar ao início
        </a>
      </div>
    </div>
  );
}
```

---

## 6️⃣ Padrão para Async Operations com Retry Logic

```typescript
// src/shared/utils/retry.ts
export interface RetryOptions {
  maxAttempts?: number;
  delayMs?: number;
  backoffMultiplier?: number;
  shouldRetry?: (error: unknown) => boolean;
}

export async function retryAsync<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    delayMs = 1000,
    backoffMultiplier = 2,
    shouldRetry = () => true,
  } = options;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Não retry se o erro não deve ser retentado
      if (!shouldRetry(error)) {
        throw error;
      }

      // Última tentativa: lançar o erro
      if (attempt === maxAttempts) {
        throw error;
      }

      // Aguardar antes de retry
      const delay = delayMs * Math.pow(backoffMultiplier, attempt - 1);
      console.warn(`Retry attempt ${attempt + 1}/${maxAttempts} in ${delay}ms`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

// Uso:
async function loadSupplements() {
  const supplements = await retryAsync(
    () => supplementService.getAll(),
    {
      maxAttempts: 3,
      delayMs: 1000,
      shouldRetry: (error) => {
        // Retry apenas em erros de rede, não em 404
        return (error as any).status !== 404;
      },
    }
  );
  return supplements;
}
```

---

## 7️⃣ Estrutura de Diretórios Recomendada

```
src/
├── shared/
│   ├── components/
│   │   ├── error-boundary/
│   │   │   ├── ErrorBoundary.tsx
│   │   │   └── ErrorBoundaryUI.tsx
│   │   ├── error-card/
│   │   │   ├── ErrorCard.tsx
│   │   │   └── ErrorCard.module.css
│   │   └── toast/
│   │       ├── ToastContainer.tsx
│   │       ├── Toast.tsx
│   │       └── Toast.module.css
│   ├── services/
│   │   ├── api-client.ts
│   │   ├── error-logger.ts
│   │   └── toast.service.ts
│   ├── hooks/
│   │   └── useApi.ts
│   └── utils/
│       └── retry.ts
├── features/
│   ├── supplements/
│   │   ├── services/
│   │   │   └── supplement.service.ts
│   │   └── pages/
│   └── ...
└── app.tsx
```

---

## 8️⃣ Checklist de Implementação

- [ ] Error Boundary implementado em `src/app.tsx`
- [ ] API Client com interceptores configurado
- [ ] Toast Service com ToastContainer
- [ ] Error Logger estruturado
- [ ] useApi hook customizado
- [ ] ErrorCard componente para fallbacks
- [ ] Retry logic implementada
- [ ] Tratamento de erros de autenticação (401)
- [ ] Tratamento de erros de permissão (403)
- [ ] Tratamento de erros de rate limit (429)
- [ ] Testes de error scenarios

---

## 9️⃣ Padrão de Erro no Backend

Garantir que o backend retorna erros estruturados:

```typescript
// Backend response exemplo
{
  "success": false,
  "error": "VALIDATION_ERROR",
  "message": "Email inválido",
  "details": {
    "field": "email",
    "value": "invalid-email"
  }
}

// Frontend trata com:
const apiError = {
  code: "VALIDATION_ERROR",
  message: "Email inválido",
  status: 400,
  details: { field: "email" }
}
```

---

## 🔟 Testing Error Scenarios

```typescript
// src/__tests__/error-handling.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { ErrorBoundary } from '../shared/components/error-boundary/ErrorBoundary';

// Componente que lança erro propositalmente
function ProblematicComponent() {
  throw new Error('Test error');
}

describe('ErrorBoundary', () => {
  it('should catch errors and display fallback', () => {
    render(
      <ErrorBoundary>
        <ProblematicComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText(/algo deu errado/i)).toBeInTheDocument();
  });

  it('should allow reset', async () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ProblematicComponent />
      </ErrorBoundary>
    );

    const button = screen.getByText(/tentar novamente/i);
    button.click();

    // Componente deve voltar ao estado normal
    expect(screen.queryByText(/algo deu errado/i)).not.toBeInTheDocument();
  });
});
```

---

## Resumo: Padrão Recomendado

```typescript
// Componente exemplo com error handling completo
export function SupplementCatalog() {
  const { data: supplements, loading, error, retry } = useApi(
    () => supplementService.getAllSupplements()
  );

  if (loading) return <CatalogSkeleton />;

  if (error) {
    return <ErrorCard message={error.message} onRetry={retry} />;
  }

  return (
    <ErrorBoundary fallback={<CatalogErrorFallback />}>
      <div className={styles.catalog}>
        {supplements?.map((supplement) => (
          <SupplementCard key={supplement.id} supplement={supplement} />
        ))}
      </div>
    </ErrorBoundary>
  );
}
```

✅ **Sistema de error handling 100% robusto, com feedback ao usuário, logging estruturado e prevenção de falhas silenciosas.**

