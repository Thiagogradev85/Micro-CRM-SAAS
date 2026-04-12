import { useState, useEffect, useCallback } from 'react'
import {
  Settings, Lock, Eye, EyeOff, CheckCircle, XCircle,
  Loader2, Save, FlaskConical, AlertTriangle, RefreshCw, Trash2,
} from 'lucide-react'
import { api } from '../utils/api.js'
import { useModal } from '../hooks/useModal.jsx'

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
        readOnly: true,
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
        testable: true,
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
  const { modal, showModal } = useModal()

  const [authed, setAuthed]     = useState(() => sessionStorage.getItem('settings_authed') === '1')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  const [config, setConfig]     = useState([])
  const [loading, setLoading]   = useState(false)
  const [values, setValues]     = useState({})
  const [showValues, setShowValues] = useState({})
  const [saving, setSaving]     = useState({})
  const [testing, setTesting]   = useState({})
  const [clearing, setClearing] = useState({})
  const [saved, setSaved]       = useState({})  // {KEY: bool} — badge verde temporário

  // ── Carrega config ao autenticar ──
  const fetchConfig = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.getSettings()
      setConfig(data)
    } catch (err) {
      showModal({
        type: 'error',
        title: 'Erro ao carregar configurações',
        message: err.message || 'Não foi possível buscar as configurações do servidor.',
      })
    } finally {
      setLoading(false)
    }
  }, [showModal])

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
    if (!value) return
    setSaving(s => ({ ...s, [key]: true }))
    try {
      const pwd = sessionStorage.getItem('settings_password') || password
      await api.saveSettings(pwd, { [key]: value })
      setSaved(s => ({ ...s, [key]: true }))
      setTimeout(() => setSaved(s => ({ ...s, [key]: false })), 3000)
      setValues(v => { const n = { ...v }; delete n[key]; return n })
      await fetchConfig()
    } catch (err) {
      showModal({
        type: 'error',
        title: 'Erro ao salvar',
        message: err.message || 'Não foi possível salvar a configuração.',
        details: [
          'Verifique se o servidor está rodando.',
          'Confirme que a senha de acesso está correta.',
        ],
      })
    } finally {
      setSaving(s => ({ ...s, [key]: false }))
    }
  }

  // ── Testar chave ──
  async function handleTest(key) {
    setTesting(t => ({ ...t, [key]: true }))
    try {
      const pwd = sessionStorage.getItem('settings_password') || password
      const typedValue = values[key]
      const data = await api.testSetting(pwd, key, typedValue || undefined)

      if (data.ok) {
        showModal({
          type: 'success',
          title: 'Teste bem-sucedido!',
          message: data.message,
        })
        if (typedValue) {
          setSaved(s => ({ ...s, [key]: true }))
          setTimeout(() => setSaved(s => ({ ...s, [key]: false })), 3000)
          setValues(v => { const n = { ...v }; delete n[key]; return n })
          await fetchConfig()
        }
      } else {
        showModal({
          type: 'error',
          title: `Falha no teste — ${key}`,
          message: data.message,
          details: getTestErrorHints(key, data.message),
        })
      }
    } catch (err) {
      showModal({
        type: 'error',
        title: 'Erro ao testar',
        message: err.message || 'Não foi possível realizar o teste.',
        details: [
          'Verifique se o servidor local está rodando (bun run dev).',
          'Confirme que a chave foi salva corretamente.',
        ],
      })
    } finally {
      setTesting(t => ({ ...t, [key]: false }))
    }
  }

  // ── Limpar chave do banco (permite que o Render env var reassuma) ──
  async function handleClear(key, label) {
    showModal({
      type: 'warning',
      title: `Limpar ${label} do banco?`,
      message: 'O valor salvo no banco será removido. Se houver uma variável de ambiente configurada no Render, ela será usada automaticamente na próxima inicialização.',
      actions: [
        {
          label: 'Sim, limpar',
          variant: 'danger',
          onClick: async () => {
            setClearing(c => ({ ...c, [key]: true }))
            try {
              const pwd = sessionStorage.getItem('settings_password') || password
              await api.saveSettings(pwd, { [key]: '' })
              await fetchConfig()
            } catch (err) {
              showModal({
                type: 'error',
                title: 'Erro ao limpar',
                message: err.message || 'Não foi possível limpar o valor.',
              })
            } finally {
              setClearing(c => ({ ...c, [key]: false }))
            }
          },
        },
      ],
    })
  }

  function getConfigEntry(key) {
    return config.find(c => c.key === key)
  }

  // Dicas específicas por chave para facilitar o diagnóstico
  function getTestErrorHints(key, message = '') {
    const hints = {
      ANTHROPIC_API_KEY: [
        'A chave deve começar com sk-ant-api03-...',
        'Acesse console.anthropic.com → API Keys para gerar uma nova.',
        'Verifique se há créditos disponíveis na sua conta Anthropic.',
      ],
      SERPER_API_KEY: [
        'Acesse serper.dev → faça login → copie a API Key do dashboard.',
        'O plano gratuito inclui 2.500 buscas/mês.',
        'Certifique-se de copiar a chave completa sem espaços.',
      ],
      SERPAPI_KEY: [
        'Acesse serpapi.com → faça login → copie a API Key.',
        'O plano gratuito inclui 100 buscas/mês.',
      ],
      BRAVE_SEARCH_KEY: [
        'Acesse api.search.brave.com → crie uma conta → gere uma API Key.',
        'O plano gratuito inclui 2.000 buscas/mês.',
      ],
      BING_SEARCH_KEY: [
        'Acesse portal.azure.com → crie o recurso "Bing Search v7".',
        'Copie a Key 1 em "Keys and Endpoint".',
      ],
      GOOGLE_CSE_CX: [
        'GOOGLE_CSE_KEY e GOOGLE_CSE_CX devem ambas estar configuradas.',
        'Acesse programmablesearchengine.google.com para criar um mecanismo.',
        'Ative a Custom Search API no Google Cloud Console.',
      ],
    }
    const base = hints[key] || []
    if (message.includes('401') || message.includes('403') || message.includes('invalid')) {
      return ['Chave inválida ou sem permissão.', ...base]
    }
    if (message.includes('429') || message.includes('quota')) {
      return ['Limite de requisições atingido. Aguarde ou verifique seu plano.', ...base]
    }
    return base
  }

  // ── Tela de login ──
  if (!authed) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        {modal}
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
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Senha"
              autoFocus
              className="w-full bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500
                         rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-sky-500 transition-colors"
            />

            {authError && (
              <div className="flex items-center gap-2 bg-red-950/50 border border-red-800/50 rounded-lg px-3 py-2.5">
                <XCircle size={15} className="text-red-400 flex-shrink-0" />
                <p className="text-red-300 text-sm">{authError}</p>
              </div>
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
      {modal}
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

        {/* Aviso DATABASE_URL */}
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
                const entry     = getConfigEntry(def.key)
                const isSaving  = saving[def.key]
                const isTesting = testing[def.key]
                const isClearing = clearing[def.key]
                const wasSaved  = saved[def.key]
                const isDirty   = !!values[def.key]
                const visible   = showValues[def.key]
                // Mostra lixeira se o valor veio do banco (pode ter sido digitado errado)
                const hasDbValue = entry?.source === 'db' || entry?.source === 'env+db'

                return (
                  <div key={def.key} className="px-6 py-5">
                    {/* Cabeçalho da chave */}
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center flex-wrap gap-2 mb-0.5">
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
                          {entry?.source === 'env+db' && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-400"
                                  title="Há um valor no banco que pode estar sobrescrevendo o Render">
                              env + banco ⚠
                            </span>
                          )}
                          {entry?.source === 'db' && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-400">
                              via banco
                            </span>
                          )}

                          {wasSaved && (
                            <span className="text-xs flex items-center gap-1 text-emerald-400">
                              <CheckCircle size={12} /> Salvo!
                            </span>
                          )}
                        </div>
                        <p className="text-zinc-500 text-xs">{def.description}</p>
                      </div>

                      {/* Botão limpar banco */}
                      {hasDbValue && !def.readOnly && (
                        <button
                          onClick={() => handleClear(def.key, def.label)}
                          disabled={isClearing}
                          title="Limpar valor salvo no banco"
                          className="text-zinc-600 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10
                                     transition-colors flex-shrink-0 disabled:opacity-50"
                        >
                          {isClearing ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        </button>
                      )}
                    </div>

                    {/* Campo */}
                    {def.readOnly ? (
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
                            {isTesting ? <Loader2 size={13} className="animate-spin" /> : <FlaskConical size={13} />}
                            Testar
                          </button>
                        )}
                      </div>
                    ) : (
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
                                       bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors
                                       disabled:opacity-50 whitespace-nowrap"
                          >
                            {isTesting ? <Loader2 size={13} className="animate-spin" /> : <FlaskConical size={13} />}
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
                          {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                          Salvar
                        </button>
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
