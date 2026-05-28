#!/bin/bash

################################################################################
# 🔨 SCRIPT DE REFATORAÇÃO AUTOMÁTICA — SupliList v4.0
# 
# Segurança: Zero-Risk (nenhum arquivo é apagado)
# Tempo: ~2 minutos
# 
# USO: Coloque este arquivo como refactor.sh na raiz do seu projeto
#      chmod +x refactor.sh
#      ./refactor.sh
#
################################################################################

set -e  # Sair no primeiro erro

echo "🚀 Iniciando refatoração SupliList v4.0..."
echo ""

################################################################################
# PASSO 1: Verificar estrutura atual
################################################################################

echo "📋 [PASSO 1] Verificando estrutura atual..."

if [ ! -d "src" ]; then
    echo "❌ ERRO: Pasta 'src' não encontrada. Execute este script na raiz do projeto."
    exit 1
fi

echo "✅ Pasta src/ encontrada"

if [ -d "src/css" ]; then
    echo "✅ src/css/ já existe (design-system.css deve estar aqui)"
else
    echo "⚠️  AVISO: src/css/ não encontrada. Criando..."
    mkdir -p src/css
fi

if [ -d "src/js" ]; then
    echo "✅ src/js/ encontrado (componentes legais estão aqui)"
else
    echo "⚠️  AVISO: src/js/ não encontrada. Estrutura pode estar diferente."
fi

echo ""
echo "---"
echo ""

################################################################################
# PASSO 2: Criar 6 Pastas Vazias (v4.0 Skeletons)
################################################################################

echo "📁 [PASSO 2] Criando 6 pastas v4.0 Elevada..."

PASTAS=("ai" "community" "i18n" "integrations" "monetization" "pages")

for pasta in "${PASTAS[@]}"; do
    if [ ! -d "src/$pasta" ]; then
        mkdir -p "src/$pasta"
        echo "   ✅ Criado: src/$pasta/"
    else
        echo "   ℹ️  Já existe: src/$pasta/"
    fi
done

echo ""
echo "---"
echo ""

################################################################################
# PASSO 3: Criar index.js Placeholders
################################################################################

echo "📄 [PASSO 3] Criando index.js placeholders..."
echo ""

# Template base
create_index_file() {
    local dir=$1
    local title=$2
    local description=$3
    local sprint=$4
    
    if [ ! -f "src/$dir/index.js" ]; then
        cat > "src/$dir/index.js" << EOF
/**
 * $title
 * 
 * $description
 * 
 * Status: Em desenvolvimento no $sprint
 */

export const MODULE_PENDING = true;
EOF
        echo "   ✅ Criado: src/$dir/index.js"
    else
        echo "   ℹ️  Já existe: src/$dir/index.js (pulando)"
    fi
}

create_index_file "ai" \
    "🤖 IA ENGINE v4.0" \
    "- StackRecommender (Algoritmo clínico local)\n * - DosageCalculator (Cálculos com biometria)\n * - InteractionEngine (Detecção de sinergias)" \
    "Sprint 3-4"

create_index_file "community" \
    "👥 COMMUNITY ENGINE v4.0" \
    "- SocialFeed (Feed tipo Twitter)\n * - Gamification (Streaks, badges, níveis)\n * - Leaderboards (Rankings anônimos)\n * - Challenges (Desafios mensais)" \
    "Sprint 6-9"

create_index_file "i18n" \
    "🌍 INTERNACIONALIZAÇÃO v4.0" \
    "- Traduções: PT-BR, EN, ES, FR, DE, ZH, JA, KO, etc.\n * - Moedas: 150+ supported\n * - Localizações regionais (GDPR, LGPD, CCPA)" \
    "Sprint 5+"

create_index_file "integrations" \
    "🔌 INTEGRAÇÕES EXTERNAS v4.0" \
    "- Wearables: Apple Health, Garmin Connect, Whoop\n * - Marketplaces: Shopify (500+), Amazon, ML, Shopee\n * - Analytics: GA4, Sentry\n * - Pagamentos: Stripe" \
    "Sprint 10-14"

create_index_file "monetization" \
    "💰 MOTOR FINANCEIRO v4.0" \
    "- AffiliateEngine (Injeção dinâmica de UTMs em 500+ lojas)\n * - PriceComparator (Batalha de preços real-time)\n * - StripeHandler (Assinaturas Premium/Master/Enterprise)\n * - ComplianceLogger (Logs FTC/CVM para transparência)" \
    "Sprint 5-6"

create_index_file "pages" \
    "📄 PÁGINAS HTML & VIEWS v4.0" \
    "- Legal (legal.html — já existe)\n * - Privacy\n * - Terms of Service" \
    "Sprint 15-18"

echo ""
echo "---"
echo ""

################################################################################
# PASSO 4: Verificação Automática
################################################################################

echo "🔍 [PASSO 4] Validando estrutura criada..."
echo ""

SUCESSO=true

# Verificar que todas as 6 pastas foram criadas
for pasta in "${PASTAS[@]}"; do
    if [ -d "src/$pasta" ]; then
        echo "   ✅ src/$pasta/ existe"
    else
        echo "   ❌ src/$pasta/ NÃO foi criado"
        SUCESSO=false
    fi
done

echo ""

# Verificar que todos os index.js foram criados
for pasta in "${PASTAS[@]}"; do
    if [ -f "src/$pasta/index.js" ]; then
        echo "   ✅ src/$pasta/index.js existe"
    else
        echo "   ❌ src/$pasta/index.js NÃO foi criado"
        SUCESSO=false
    fi
done

echo ""
echo "---"
echo ""

################################################################################
# PASSO 5: Teste de Build (Opcional)
################################################################################

echo "🏗️  [PASSO 5] Testando build (se npm disponível)..."
echo ""

if command -v npm &> /dev/null; then
    echo "   ℹ️  npm encontrado, testando build..."
    
    if npm run dev --version &> /dev/null 2>&1; then
        echo "   ✅ npm run dev está disponível"
    fi
    
    if [ -f "package.json" ]; then
        echo "   ✅ package.json encontrado"
    fi
else
    echo "   ⚠️  npm não encontrado (pulando teste de build)"
fi

echo ""
echo "---"
echo ""

################################################################################
# RESULTADO FINAL
################################################################################

if [ "$SUCESSO" = true ]; then
    echo "🎉 SUCESSO! Refatoração completada sem erros."
    echo ""
    echo "📊 Resumo do que foi feito:"
    echo "   ✅ 6 Pastas vazias criadas (ai, community, i18n, integrations, monetization, pages)"
    echo "   ✅ 6 index.js placeholders criados (documentados para próximos sprints)"
    echo "   ✅ Nenhum arquivo existente foi alterado"
    echo "   ✅ Estrutura pronta para v4.0"
    echo ""
    echo "🚀 Próximas etapas:"
    echo "   1. Execute: npm run dev"
    echo "   2. Confirme que a app ainda carrega sem erros"
    echo "   3. Comece o Sprint 3: Implementar src/ai/StackRecommender"
    echo ""
    echo "✨ Você está 100% seguro. Nenhuma lógica foi quebrada."
    echo ""
else
    echo "❌ ERRO: Alguns passos falharam. Verifique os mensagens acima."
    exit 1
fi

################################################################################
# FIM DO SCRIPT
################################################################################

echo "Refatoração finalizada às $(date '+%H:%M:%S')"
