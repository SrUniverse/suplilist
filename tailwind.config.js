/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.html',
    './src/**/*.js'
  ],
  theme: {
    extend: {
      colors: {
        // Cores de resgate do Design System
        'bg-void': '#080810',
        'neon-purple': '#7c3aed',
        
        // Mapeamento semântico do Dark Navy Theme
        navy: {
          bg: '#0f0f1a',
          surface: '#1a1a2e',
          card: '#16213e',
          elevated: '#1e2a45',
          border1: '#2a3a5e',
          border2: '#3a4a6e',
        },
        // Tipografia customizada
        zinc: {
          100: '#f0f0ff',
          250: '#c5cbdc',
          400: '#b0b8d0',
          500: '#7080a0',
        },
        // Acentos roxo / violet
        purple: {
          600: '#7c3aed',
          500: '#8b5cf6',
          300: '#c4b5fd',
          950: '#2e1065',
        },
        // Variáveis de status clínicos
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444',
        info: '#3b82f6',
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      }
    },
  },
  plugins: [],
  // Safelist de classes injetadas dinamicamente via JS (Toasts, Badges, Modais, Cards)
  safelist: [
    // Badges de Evidência e Objetivos
    'bg-purple-500/20',
    'bg-purple-950/40',
    'text-purple-300',
    'border-purple-500/30',
    'border-purple-800/20',
    'bg-blue-500/20',
    'text-blue-300',
    'border-blue-500/30',
    'bg-zinc-500/20',
    'text-zinc-300',
    'border-zinc-500/30',
    
    // Alertas de estoque e vencedores no Comparador
    'bg-emerald-500/20',
    'text-emerald-400',
    'border-emerald-500/30',
    'bg-amber-500/20',
    'text-amber-400',
    'border-amber-500/30',
    'text-red-400',
    
    // Cores de Toasts Dinâmicos (success, warning, danger, info)
    'bg-emerald-950/95',
    'border-emerald-800/80',
    'bg-amber-950/95',
    'border-amber-800/80',
    'bg-red-950/95',
    'border-red-800/80',
    'bg-zinc-950/95',
    'border-zinc-800/80',
    'bg-blue-950/95',
    'border-blue-800/80',
    
    // Classes de animação injetadas
    'slide-in',
    'fade-out',
    'animate-pulse',
    'animate-fade-in',
  ],
}
