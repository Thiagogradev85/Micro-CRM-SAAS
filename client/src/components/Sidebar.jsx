import { NavLink, useNavigate } from 'react-router-dom'
import {
  Users, BookOpen, BarChart2, UserCheck, X, Menu, Package, MessageCircle, Mail, Telescope, Sparkles
} from 'lucide-react'
import { useState } from 'react'

const links = [
  { to: '/clients',      icon: Users,         label: 'Clientes'         },
  { to: '/products',     icon: Package,       label: 'Produtos'         },
  { to: '/catalogs',     icon: BookOpen,      label: 'Catálogos'        },
  { to: '/sellers',      icon: UserCheck,     label: 'Vendedores'       },
  { to: '/whatsapp',     icon: MessageCircle, label: 'WhatsApp'         },
  { to: '/email',        icon: Mail,          label: 'E-mail em Massa'  },
  { to: '/daily-report', icon: BarChart2,     label: 'Relatório Diário' },
  { to: '/prospecting',  icon: Telescope,     label: 'Prospecção'       },
  { to: '/enrich',       icon: Sparkles,      label: 'Enriquecimento'   },
]

export function Sidebar() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="fixed top-3 left-3 z-50 md:hidden btn-ghost p-2 rounded-lg"
        onClick={() => setOpen(o => !o)}
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/60 z-30 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full w-60 bg-zinc-900 border-r border-zinc-800 z-40
        flex flex-col pt-14 pb-6
        transition-transform duration-300
        ${open ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0 md:static md:flex
      `}>
        <div className="px-4 mb-6 cursor-pointer" onClick={() => navigate('/clients')}>
          <span className="text-sky-400 font-bold text-lg tracking-tight hover:text-sky-300 transition-colors">⚡ CRM</span>
          <p className="text-zinc-500 text-xs mt-0.5">Controle de Vendas</p>
        </div>

        <nav className="flex flex-col gap-1 px-2 flex-1">
          {links.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                ${isActive
                  ? 'bg-sky-600/20 text-sky-400 border border-sky-600/30'
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
                }`
              }
            >
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-4 pb-2 space-y-0.5">
          <div className="text-xs text-zinc-600">v1.5.1</div>
          <div className="text-xs text-zinc-700 leading-tight truncate">Desenvolvido por Thiago Gramuglia</div>
          <div className="text-xs text-zinc-700 truncate">CNPJ 64.828.611/0001-05</div>
        </div>
      </aside>
    </>
  )
}
