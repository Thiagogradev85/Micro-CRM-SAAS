import { useState, useEffect, useCallback } from 'react'
import {
  Settings, Lock, Eye, EyeOff, CheckCircle, XCircle,
  Loader2, Save, FlaskConical, AlertTriangle, RefreshCw,
} from 'lucide-react'
import { api } from '../utils/api.js'

// ─── Definição dos grupos e chaves ───────────────────────────────────────────
const GROUPS = [
  {
    id: 'db',
    label: 'Banco de Dados',
    description: 'Conexão com o PostgreSQL (Neon). DATABASE_URL é obrigatório no Render.',
    keys: [
      {
        key: 'DATABASE_URL',
        label: 'DATABASE_URL',
        description: 'String de conexão do Neon. Configure no painel do Render (obrigatório para o app iniciar).',
        placeholder: 'postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require',
        testable: true,
        readOnly: true, // não editável via UI — deve vir do Render
      },
    ],
  },
  {
    id: 'ai',
    label: 'Inteligência Artificial',
    description: 'Chave da API Anthropic (Claude) usada para importar catálogos em PDF.',
    keys: [
      {
        key: 'ANTHROPIC_API_KEY',
        label: 'Anthropic API Key',
        description: 'Necessário para importar catálogos PDF com IA.',
        placeholder: 'sk-ant-...',
        testable: true,
      },
    ],
  },
  {
    id: 'prospecting',
    label: 'Prospecção e Enriquecimento',
    description: 'Chaves dos provedores de busca usados na prospecção e enriquecimento de clientes.',
    keys: [
      {
        key: 'SERPER_API_KEY',
        label: 'Serper API Key',
        description: 'Provedor principal de busca (recomendado). serper.dev',
        placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        testable: true,
      },
      {
        key: 'SERPAPI_KEY',
        label: 'SerpApi Key',
        description: 'Fallback gratuito (100 buscas/mês). serpapi.com',
        placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        testable: true,
      },
      {
        key: 'GOOGLE_CSE_KEY',
        label: 'Google CSE Key',
        description: 'Google Custom Search Engine — chave de API.',
        placeholder: 'AIzaSy...',
        testable: false,
      },
      {
        key: 'GOOGLE_CSE_CX',
        label: 'Google CSE CX',
        description: 'ID do seu mecanismo de busca no Google CSE.',
        placeholder: 'xxxxxxxxxxxxxxx',
        testable: true, // testa junto com GOOGLE_CSE_KEY
      },
      {
        key: 'BRAVE_SEARCH_KEY',
        label: 'Brave Search Key',
        description: 'API de busca da Brave. search.brave.com/api',
        placeholder: 'BSAxxxxxxxxxxxxxxxxx',
        testable: true,
      },
      {
        key: 'BING_SEARCH_KEY',
        label: 'Bing Search Key',
        description: 'Azure Cognitive Services — Bing Web Search API.',
        placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        testable: true,
      },
      {
        key: 'ENRICH_SEGMENT',
        label: 'Segmento de Negócio',
        description: 'Segmento que direciona o enriquecimento (ex: "distribuidora de alimentos").',
        placeholder: 'distribuidora de alimentos',
        testable: false,
        isText: true,
      },
    ],
  },
  {
    id: 'security',
    label: 'Segurança',
    description: 'Senha de acesso a esta página de configurações.',
    keys: [
      {
        key: 'SETTINGS_PASSWORD',
        label: 'Senha das Configurações',
        description: 'Senha usada para acessar esta página. Padrão: admin1234',
        placeholder: 'Nova senha...',
        testable: false,
      },
    ],
  },
]

// ─── Componente principal ─────────────────────────────────────────────────────
export function SettingsPage() {
  const [authed, setAuthed]   = useState(() => sessionStorage.getItem('settings_authed') === '1')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  const [config, setConfig]   = useState([])  // [{key, configured, masked, source}]
  const [loading, setLoading] = useState(false)
  const [values, setValues]   = useState({})  // {KEY: valor digitado}
  const [showValues, setShowValues] = useState({}) // {KEY: bool}
  const [saving, setSaving]   = useState({})  // {KEY: bool}
  const [testing, setTesting] = useState({})  // {KEY: bool}
  const [results, setResults] = useState({})  // {KEY: {ok, message}}

  // ── Carrega config ao autenticar ──
  const fetchConfig = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.getSettings()
      setConfig(data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (authed) fetchConfig()
  }, [authed, fetchConfig])

  // ── Login ──
  async function handleLogin(e) {
    e.preventDefault()
    setAuthLoading(true)
    setAuthError('')
    try {
      await api.settingsAuth(password)
      sessionStorage.setItem('settings_authed', '1')
      sessionStorage.setItem('settings_password', password)
      setAuthed(true)
    } catch (err) {
      setAuthError(err.message || 'Senha incorreta.')
    } finally {
      setAuthLoading(false)
    }
  }

  // ── Salvar chave individual ──
  async function handleSave(key) {
    const value = values[key]
    if (value === undefined) return
    setSaving(s => ({ ...s, [key]: true }))
    setResults(r => ({ ...r, [key]: null }))
    try {
      const pwd = sessionStorage.getItem('settings_password') || password
      await api.saveSettings(pwd, { [key]: value })
      setResults(r => ({ ...r, [key]: { ok: true, message: 'Salvo com sucesso!' } }))
      await fetchConfig()
    } catch (err) {
      setResults(r => ({ ...r, [key]: { ok: false, message: err.message || 'Erro ao salvar.' } }))
    } finally {
      setSaving(s => ({ ...s, [key]: false }))
    }
  }

  // ── Testar chave ──
  async function handleTest(key) {
    setTesting(t => ({ ...t, [key]: true }))
    setResults(r => ({ ...r, [key]: null }))
    try {
      const pwd = sessionStorage.getItem('settings_password') || password
      const data = await api.testSetting(pwd, key)
      setResults(r => ({ ...r, [key]: data }))
    } catch (err) {
      setResults(r => ({ ...r, [key]: { ok: false, message: err.message || 'Erro no teste.' } }))
    } finally {
      setTesting(t => ({ ...t, [key]: false }))
    }
  }

  function getConfigEntry(key) {
    return config.find(c => c.key === key)
  }

  // ── Tela de login ──
  if (!authed) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl">
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 bg-sky-600/20 rounded-2xl flex items-center justify-center mb-4">
              <Lock size={28} className="text-sky-400" />
            </div>
            <h1 className="text-white font-bold text-xl">Configurações</h1>
            <p className="text-zinc-500 text-sm mt-1 text-center">
              Digite a senha de administrador para continuar.
            </p>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Senha"
                autoFocus
                className="w-full bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500
                           rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-sky-500 transition-colors"
              />
            </div>

            {authError && (
              <p className="text-red-400 text-sm flex items-center gap-1.5">
                <XCircle size={14} /> {authError}
              </p>
            )}

            <button
              type="submit"
              disabled={authLoading || !password}
              className="bg-sky-600 hover:bg-sky-500 disabled:opacity-50 disabled:cursor-not-allowed
                         text-white font-semibold rounded-lg py-3 text-sm transition-colors
                         flex items-center justify-center gap-2"
            >
              {authLoading ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
              Entrar
            </button>
          </form>

          <p className="text-zinc-600 text-xs text-center mt-6">
            Senha padrão: <span className="text-zinc-500 font-mono">admin1234</span>
          </p>
        </div>
      </div>
    )
  }

  // ── Tela principal ──
  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-sky-600/20 rounded-xl flex items-center justify-center">
              <Settings size={20} className="text-sky-400" />
            </div>
            <div>
              <h1 className="text-white font-bold text-xl">Configurações</h1>
              <p className="text-zinc-500 text-xs mt-0.5">Chaves de API e integrações</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchConfig}
              disabled={loading}
              className="text-zinc-400 hover:text-zinc-200 p-2 rounded-lg hover:bg-zinc-800 transition-colors"
              title="Recarregar"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={() => { sessionStorage.removeItem('settings_authed'); setAuthed(false) }}
              className="text-zinc-500 hover:text-zinc-300 text-xs px-3 py-1.5 rounded-lg
                         hover:bg-zinc-800 transition-colors flex items-center gap-1.5"
            >
              <Lock size={12} /> Sair
            </button>
          </div>
        </div>

        {/* Aviso sobre DATABASE_URL */}
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-6 flex gap-3">
          <AlertTriangle size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-300 text-sm font-medium">DATABASE_URL deve ser configurado no Render</p>
            <p className="text-amber-500/80 text-xs mt-1">
              Esta variável é necessária para o servidor iniciar. Configure-a nas Environment Variables
              do painel do Render antes de fazer o deploy. As demais chaves podem ser configuradas aqui.
            </p>
          </div>
        </div>

        {loading && (
          <div className="flex justify-center py-12">
            <Loader2 size={24} className="animate-spin text-zinc-500" />
          </div>
        )}

        {/* Grupos */}
        {!loading && GROUPS.map(group => (
          <div key={group.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl mb-4 overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-800">
              <h2 className="text-white font-semibold text-sm">{group.label}</h2>
              <p className="text-zinc-500 text-xs mt-0.5">{group.description}</p>
            </div>

            <div className="divide-y divide-zinc-800/60">
              {group.keys.map(def => {
                const entry   = getConfigEntry(def.key)
                const isSaving = saving[def.key]
                const isTesting = testing[def.key]
                const result  = results[def.key]
                const visible  = showValues[def.key]
                const hasValue = values[def.key] !== undefined
                const isDirty  = hasValue && values[def.key] !== ''

                return (
                  <div key={def.key} className="px-6 py-5">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-white text-sm font-medium font-mono">{def.label}</span>
                          {entry && (
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              entry.configured
                                ? 'bg-emerald-500/15 text-emerald-400'
                                : 'bg-zinc-700/50 text-zinc-500'
                            }`}>
                              {entry.configured ? 'Configurado' : 'Não configurado'}
                            </span>
                          )}
                          {entry?.source === 'env' && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-400">
                              via Render
                            </span>
                          )}
                        </div>
                        <p className="text-zinc-500 text-xs">{def.description}</p>
                      </div>
                    </div>

                    {def.readOnly ? (
                      // DATABASE_URL — só mostra status e botão de teste
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-zinc-800/50 border border-zinc-700/50 rounded-lg px-4 py-2.5
                                        text-zinc-500 text-sm font-mono italic">
                          {entry?.configured ? entry.masked : '— não configurado —'}
                        </div>
                        {def.testable && (
                          <button
                            onClick={() => handleTest(def.key)}
                            disabled={isTesting}
                            className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-medium
                                       bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors disabled:opacity-50"
                          >
                            {isTesting
                              ? <Loader2 size={13} className="animate-spin" />
                              : <FlaskConical size={13} />}
                            Testar
                          </button>
                        )}
                      </div>
                    ) : (
                      // Campo editável
                      <div className="flex items-center gap-2">
                        <div className="flex-1 relative">
                          <input
                            type={def.isText ? 'text' : visible ? 'text' : 'password'}
                            value={values[def.key] ?? ''}
                            onChange={e => setValues(v => ({ ...v, [def.key]: e.target.value }))}
                            placeholder={entry?.configured ? entry.masked : def.placeholder}
                            className="w-full bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600
                                       rounded-lg pl-4 pr-10 py-2.5 text-sm font-mono focus:outline-none
                                       focus:border-sky-500 transition-colors"
                          />
                          {!def.isText && (
                            <button
                              type="button"
                              onClick={() => setShowValues(s => ({ ...s, [def.key]: !s[def.key] }))}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                            >
                              {visible ? <EyeOff size={15} /> : <Eye size={15} />}
                            </button>
                          )}
                        </div>

                        {def.testable && (
                          <button
                            onClick={() => handleTest(def.key)}
                            disabled={isTesting}
                            className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-medium
                                       bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors disabled:opacity-50 whitespace-nowrap"
                          >
                            {isTesting
                              ? <Loader2 size={13} className="animate-spin" />
                              : <FlaskConical size={13} />}
                            Testar
                          </button>
                        )}

                        <button
                          onClick={() => handleSave(def.key)}
                          disabled={isSaving || !isDirty}
                          className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-medium
                                     bg-sky-600 hover:bg-sky-500 text-white transition-colors
                                     disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                        >
                          {isSaving
                            ? <Loader2 size={13} className="animate-spin" />
                            : <Save size={13} />}
                          Salvar
                        </button>
                      </div>
                    )}

                    {/* Resultado do teste/save */}
                    {result && (
                      <div className={`mt-2.5 flex items-center gap-1.5 text-xs ${
                        result.ok ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        {result.ok
                          ? <CheckCircle size={13} />
                          : <XCircle size={13} />}
                        {result.message}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        <p className="text-zinc-700 text-xs text-center mt-6 pb-4">
          As chaves são salvas no banco de dados e carregadas automaticamente na próxima inicialização do servidor.
        </p>
      </div>
    </div>
  )
}
