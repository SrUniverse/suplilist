# 🛠️ Frontend Error Handling — Padrões & Exemplos Prontos

## 1. Carregamento de Dados com Retry Automático

### ❌ ERRADO (falha silenciosa):
```typescript
export function SupplementList() {
  const [supplements, setSupplements] = useState([]);

  useEffect(() => {
    // ⚠️ Sem try/catch! Se falhar, ninguém fica sabendo
    fetch('/api/supplements')
      .then(r => r.json())
      .then(data => setSupplements(data));
  }, []);

  return <div>{supplements.map(s => <div>{s.name}</div>)}</div>;
}
```

### ✅ CORRETO (com error handling):
```typescript
export function SupplementList() {
  const { data: supplements, loading, error, retry } = useApi(
    () => apiClient.get('/supplements')
  );

  if (loading) {
    return <LoadingSkeletons count={3} />;
  }

  if (error) {
    return (
      <ErrorCard
        message="Não foi possível carregar os suplementos"
        onRetry={retry}
      />
    );
  }

  if (!supplements || supplements.length === 0) {
    return <EmptyState message="Nenhum suplemento encontrado" />;
  }

  return (
    <div className={styles.grid}>
      {supplements.map(s => (
        <SupplementCard key={s.id} supplement={s} />
      ))}
    </div>
  );
}
```

---

## 2. Formulário com Validação e Error Handling

### ❌ ERRADO (sem feedback):
```typescript
export function AddSupplementForm() {
  const [name, setName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Nenhum tratamento de erro!
    await fetch('/api/supplements', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
    
    setName(''); // Assume que deu certo
  };

  return (
    <form onSubmit={handleSubmit}>
      <input value={name} onChange={e => setName(e.target.value)} />
      <button type="submit">Adicionar</button>
    </form>
  );
}
```

### ✅ CORRETO (com validação + feedback):
```typescript
export function AddSupplementForm() {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // 1. Validar localmente
    if (!name.trim()) {
      setValidationError('Nome do suplemento é obrigatório');
      return;
    }

    if (name.length < 3) {
      setValidationError('Nome deve ter pelo menos 3 caracteres');
      return;
    }

    setLoading(true);

    try {
      // 2. Submeter com retry automático
      await retryAsync(
        () => apiClient.post('/supplements', { name }),
        { maxAttempts: 3 }
      );

      toastService.success('Suplemento adicionado com sucesso!');
      setName('');
    } catch (error) {
      // Erro já foi tratado pelo API client, mas podemos fazer mais:
      const apiError = error as ApiError;
      
      if (apiError.code === 'DUPLICATE') {
        setValidationError('Este suplemento já existe');
      } else {
        toastService.error('Erro ao adicionar suplemento. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          disabled={loading}
          placeholder="Nome do suplemento"
        />
        {validationError && (
          <p style={{ color: 'red' }}>{validationError}</p>
        )}
      </div>
      <button type="submit" disabled={loading}>
        {loading ? 'Adicionando...' : 'Adicionar'}
      </button>
    </form>
  );
}
```

---

## 3. Upload de Arquivo com Progress & Error Handling

### ❌ ERRADO (nenhum tratamento):
```typescript
export function AvatarUpload() {
  const handleUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    // ❌ Sem try/catch, sem progress, sem feedback
    const response = await fetch('/api/upload/avatar', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();
    return data.url;
  };

  return <input type="file" onChange={e => handleUpload(e.target.files?.[0]!)} />;
}
```

### ✅ CORRETO (com progress, validação e error handling):
```typescript
export function AvatarUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (file: File) => {
    setError(null);

    // 1. Validar arquivo
    if (!file) {
      setError('Selecione um arquivo');
      return;
    }

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Apenas JPEG, PNG e WebP são aceitos');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB
      setError('Arquivo muito grande (máx 5MB)');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      // 2. Upload com progress tracking
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          setProgress(percentComplete);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          const data = JSON.parse(xhr.responseText);
          toastService.success('Avatar atualizado!');
          setProgress(0);
        } else {
          throw new Error(`Upload falhou com status ${xhr.status}`);
        }
      });

      xhr.addEventListener('error', () => {
        setError('Erro ao fazer upload. Verifique sua conexão.');
      });

      xhr.open('POST', '/api/upload/avatar');
      const token = localStorage.getItem('auth_token');
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      xhr.send(formData);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(message);
      errorLogger.captureException(err as Error, { context: 'Avatar Upload' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input
        type="file"
        onChange={e => handleUpload(e.target.files?.[0]!)}
        disabled={uploading}
        accept="image/*"
      />
      
      {uploading && (
        <ProgressBar value={progress} />
      )}
      
      {error && (
        <div style={{ color: 'red', marginTop: '8px' }}>
          ⚠️ {error}
        </div>
      )}
    </div>
  );
}
```

---

## 4. Busca com Debounce & Error Handling

### ❌ ERRADO (múltiplas requisições, sem tratar erros):
```typescript
export function SupplementSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  // ❌ Faz requisição a cada keystroke sem debounce
  const handleChange = async (value: string) => {
    setQuery(value);
    
    if (value.length > 0) {
      const data = await fetch(`/api/supplements/search?q=${value}`).then(r => r.json());
      setResults(data); // Assume sucesso
    }
  };

  return (
    <>
      <input onChange={e => handleChange(e.target.value)} />
      <div>{results.map(r => <div>{r.name}</div>)}</div>
    </>
  );
}
```

### ✅ CORRETO (com debounce, cancelamento e error handling):
```typescript
export function SupplementSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Supplement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const abortControllerRef = useRef<AbortController>();

  const performSearch = useCallback(
    async (searchQuery: string) => {
      setError(null);

      if (!searchQuery.trim()) {
        setResults([]);
        return;
      }

      // Cancelar requisição anterior
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();

      setLoading(true);

      try {
        const data = await retryAsync(
          () => apiClient.get('/supplements/search', {
            params: { q: searchQuery },
            signal: abortControllerRef.current.signal,
          }),
          { maxAttempts: 2 }
        );

        setResults(data || []);
      } catch (err) {
        // Ignorar erro se foi cancelado
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }

        setResults([]);
        setError('Erro ao buscar suplementos');
        errorLogger.logApiError(err as any);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const handleInputChange = (value: string) => {
    setQuery(value);

    // Debounce: aguardar 500ms antes de fazer requisição
    clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      performSearch(value);
    }, 500);
  };

  useEffect(() => {
    return () => {
      clearTimeout(searchTimeoutRef.current);
      abortControllerRef.current?.abort();
    };
  }, []);

  return (
    <div>
      <input
        value={query}
        onChange={e => handleInputChange(e.target.value)}
        placeholder="Buscar suplementos..."
      />

      {loading && <p>Buscando...</p>}
      {error && <p style={{ color: 'red' }}>⚠️ {error}</p>}

      {results.length > 0 && (
        <ul>
          {results.map(r => (
            <li key={r.id}>{r.name}</li>
          ))}
        </ul>
      )}

      {query && !loading && results.length === 0 && !error && (
        <p>Nenhum resultado encontrado</p>
      )}
    </div>
  );
}
```

---

## 5. Paginação com Error Handling

### ❌ ERRADO (sem tratamento de erros entre páginas):
```typescript
export function SupplementTable() {
  const [page, setPage] = useState(1);
  const [items, setItems] = useState([]);

  useEffect(() => {
    // ❌ Sem try/catch
    fetch(`/api/supplements?page=${page}`)
      .then(r => r.json())
      .then(data => setItems(data.items));
  }, [page]);

  return (
    <>
      <table>
        <tbody>
          {items.map(item => <tr key={item.id}><td>{item.name}</td></tr>)}
        </tbody>
      </table>
      
      <button onClick={() => setPage(page - 1)}>Anterior</button>
      <button onClick={() => setPage(page + 1)}>Próxima</button>
    </>
  );
}
```

### ✅ CORRETO (com estado de erro por página):
```typescript
export function SupplementTable() {
  const [page, setPage] = useState(1);
  const { data, loading, error, retry } = useApi(
    () => apiClient.get('/supplements', {
      params: { page, limit: 20 },
    })
  );

  const handleNextPage = () => {
    // Se houve erro na página anterior, retry antes de mudar página
    if (error) {
      retry();
    } else {
      setPage(p => p + 1);
    }
  };

  const handlePreviousPage = () => {
    if (page > 1) {
      setPage(p => p - 1);
    }
  };

  if (error) {
    return (
      <div>
        <ErrorCard 
          message="Erro ao carregar tabela" 
          onRetry={retry}
        />
      </div>
    );
  }

  return (
    <ErrorBoundary fallback={<TableErrorFallback />}>
      <div>
        {loading && <TableSkeleton />}

        {data && (
          <>
            <table>
              <tbody>
                {data.items?.map(item => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ marginTop: '16px' }}>
              <button 
                onClick={handlePreviousPage}
                disabled={page === 1}
              >
                ← Anterior
              </button>
              <span style={{ margin: '0 16px' }}>Página {page}</span>
              <button onClick={handleNextPage}>
                Próxima →
              </button>
            </div>
          </>
        )}
      </div>
    </ErrorBoundary>
  );
}
```

---

## 6. Deletar com Confirmação & Error Handling

### ❌ ERRADO (sem confirmação, sem rollback):
```typescript
export function SupplementCard({ supplement, onDelete }) {
  const handleDelete = async () => {
    await fetch(`/api/supplements/${supplement.id}`, {
      method: 'DELETE',
    });
    
    onDelete(supplement.id); // Assume sucesso!
  };

  return (
    <div>
      <h3>{supplement.name}</h3>
      <button onClick={handleDelete}>Deletar</button>
    </div>
  );
}
```

### ✅ CORRETO (com confirmação, rollback e feedback):
```typescript
export function SupplementCard({ supplement, onDelete }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!window.confirm(`Tem certeza que quer deletar "${supplement.name}"?`)) {
      return;
    }

    setError(null);
    setDeleting(true);

    try {
      await retryAsync(
        () => apiClient.delete(`/supplements/${supplement.id}`),
        { 
          maxAttempts: 2,
          shouldRetry: (error) => {
            // Não retry em 404 (já foi deletado)
            return (error as any).status !== 404;
          },
        }
      );

      toastService.success('Suplemento deletado');
      onDelete(supplement.id);
    } catch (err) {
      const apiError = err as ApiError;

      if (apiError.status === 404) {
        // Item já foi deletado por outro usuário
        toastService.warning('Este suplemento já foi deletado');
        onDelete(supplement.id);
      } else {
        setError('Erro ao deletar. Tente novamente.');
        errorLogger.captureException(err as Error);
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <h3>{supplement.name}</h3>
      
      {error && (
        <p style={{ color: 'red' }}>⚠️ {error}</p>
      )}

      <button onClick={handleDelete} disabled={deleting}>
        {deleting ? '⏳ Deletando...' : '🗑️ Deletar'}
      </button>
    </div>
  );
}
```

---

## 7. Autenticação com Error Handling

### ❌ ERRADO (sem tratamento de 401):
```typescript
export function LoginForm() {
  const handleLogin = async (email: string, password: string) => {
    const data = await fetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }).then(r => r.json());

    localStorage.setItem('token', data.token); // Assume 200!
    window.location.href = '/dashboard';
  };
}
```

### ✅ CORRETO (com tratamento de 401, 403, validação):
```typescript
export function LoginForm({ onLoginSuccess }: { onLoginSuccess: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validar
    if (!email || !password) {
      setError('Email e senha são obrigatórios');
      return;
    }

    setLoading(true);

    try {
      const response = await apiClient.post<{ token: string; user: any }>(
        '/auth/login',
        { email, password }
      );

      // Armazenar token
      localStorage.setItem('auth_token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));

      toastService.success('Login realizado com sucesso!');
      onLoginSuccess();
    } catch (err) {
      const apiError = err as ApiError;

      if (apiError.status === 401) {
        setError('Email ou senha incorretos');
      } else if (apiError.status === 429) {
        setError('Muitas tentativas. Tente novamente em alguns minutos.');
      } else if (apiError.status === 403) {
        setError('Sua conta foi bloqueada. Contate o suporte.');
      } else {
        setError('Erro ao fazer login. Tente novamente.');
        errorLogger.captureException(err as Error);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin}>
      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="Email"
        disabled={loading}
      />
      
      <input
        type="password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        placeholder="Senha"
        disabled={loading}
      />

      {error && (
        <div style={{ color: 'red', marginTop: '8px' }}>
          ⚠️ {error}
        </div>
      )}

      <button type="submit" disabled={loading}>
        {loading ? 'Entrando...' : 'Entrar'}
      </button>
    </form>
  );
}
```

---

## 8. Interceptador para Renovar Token (401 Automático)

```typescript
// src/shared/services/api-client.ts — adicionar ao constructor

// Interceptor para renovar token em 401
this.axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retried) {
      originalRequest._retried = true;

      try {
        // Tentar renovar token
        const { token } = await this.axiosInstance.post('/auth/refresh', {});
        localStorage.setItem('auth_token', token);

        // Retry original request
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return this.axiosInstance(originalRequest);
      } catch (refreshError) {
        // Falha na renovação: logout
        localStorage.removeItem('auth_token');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
```

---

## 📋 Checklist Final

- [ ] Todos os `fetch()` / `axios` chamadas têm try/catch
- [ ] Operações assincronas com fallback quando falham
- [ ] Usuário recebe feedback em erros (toast)
- [ ] Erros técnicos logados no servidor (não expostos ao usuário)
- [ ] Retry automático com backoff exponencial
- [ ] Error Boundary em páginas críticas
- [ ] Validação local antes de submeter
- [ ] Tratamento de 401, 403, 404, 429, 500
- [ ] Cancelamento de requisições outdated (AbortController)
- [ ] Debounce em buscas
- [ ] Confirmação antes de deletar
- [ ] Progress em uploads
- [ ] Estado de loading em botões
- [ ] Rollback de estado em caso de erro

✅ **Sistema totalmente robusto e user-friendly!**

