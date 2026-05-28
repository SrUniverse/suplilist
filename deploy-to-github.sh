#!/bin/bash

# ============================================================
# Deploy SupliList para GitHub Pages
# Executa build do Vite e copia dist/ para raiz do repositório
# ============================================================

set -e  # Exit on error

echo "🚀 SupliList Deployment Script"
echo "======================================"

# 1. Verificar se estamos na raiz do projeto
if [ ! -f "package.json" ]; then
    echo "❌ Erro: package.json não encontrado."
    echo "   Execute este script na raiz do projeto (/suplilist)"
    exit 1
fi

echo "✅ Detectado repositório SupliList"

# 2. Remover CSS antigo (links quebrados)
echo ""
echo "🔧 Removendo referências CSS antigas do index.html..."

# Backup do arquivo original
cp index.html index.html.backup
echo "   📦 Backup criado: index.html.backup"

# Remove as 17 linhas de CSS que apontam para /css/*
sed -i '/<link rel="stylesheet" href="css\/.*\.css/d' index.html
# Remove script inline do Tailwind
sed -i '/<script src="https:\/\/cdn\.tailwindcss\.com"><\/script>/d' index.html
# Remove o bloco de configuração do tailwind
sed -i '/<script>/,/<\/script>/d' index.html

# Adiciona comentário para clareza
sed -i '/<meta name="theme-color"/a\  <!-- CSS injected by Vite at build time -->' index.html

echo "   ✅ CSS antigo removido"

# 3. Rodar build do Vite
echo ""
echo "🔨 Executando: npm run build"
npm run build

if [ ! -d "dist" ]; then
    echo "❌ Erro: Diretório dist/ não foi criado após o build."
    exit 1
fi

echo "✅ Build concluído"

# 4. Copiar arquivos de dist para raiz
echo ""
echo "📋 Copiando arquivos de dist/ para raiz do repositório..."

# Copia tudo de dist/ exceto .git
rsync -av --exclude='.git' dist/ .

echo "✅ Arquivos copiados"

# 5. Remover diretório dist (opcional — você pode mantê-lo)
echo ""
echo "🗑️  Removendo diretório dist/ (você pode usar .gitignore em vez disso)..."
rm -rf dist

# 6. Status do Git
echo ""
echo "📊 Status do Git:"
git status --short | head -20

echo ""
echo "======================================"
echo "✅ Deployment pronto!"
echo ""
echo "Próximos passos:"
echo "  1. git add ."
echo "  2. git commit -m 'Deploy: build Vite para GitHub Pages'"
echo "  3. git push origin main"
echo ""
echo "Se algo deu errado, restaure com:"
echo "  git checkout index.html"
echo "======================================"
