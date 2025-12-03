# 🎮 Bedrock Panel v2.0 - Frontend

Frontend moderno em **React + TypeScript + Vite** para gerenciar servidor Minecraft Bedrock.

## 🚀 Começando Rapidamente

### Instalação
```bash
# Na raiz do projeto
yarn install:all

# Ou apenas o frontend
cd frontend && yarn install
```

### Desenvolvimento
```bash
# Na raiz
yarn dev

# Frontend estará disponível em: http://localhost:5173
# Backend em: http://localhost:3001
```

### Build para Produção
```bash
yarn build
```

## 📊 Estrutura do Projeto

```
frontend/
├── components/           # Componentes React
│   ├── Dashboard.tsx    # Dashboard principal
│   ├── Console.tsx      # Console do servidor
│   ├── ConfigEditor.tsx # Editor de configurações
│   ├── AddonManager.tsx # Gerenciador de addons
│   └── Toast.tsx        # Sistema de notificações
├── App.tsx              # App principal
├── index.tsx            # Entry point
├── index.html           # HTML principal
├── styles.css           # Estilos globais
├── types.ts             # TypeScript types
├── vite.config.ts       # Configuração Vite
└── tsconfig.json        # Configuração TypeScript
```

## 🎨 Tecnologias Utilizadas

- **React 19** - UI Framework
- **TypeScript** - Type safety
- **Vite** - Build tool rápido
- **Lucide Icons** - Ícones
- **Axios** - HTTP client
- **Custom CSS** - Estilos personalizados

## 📱 Funcionalidades

### Dashboard
- Status do servidor (Online/Offline)
- Controles: Iniciar, Parar, Reiniciar
- Estatísticas (Mundos, Addons, etc)
- Acesso rápido para outras seções

### Console
- Terminal em tempo real via WebSocket
- Envio de comandos
- Logs ao vivo

### Gerenciador de Mundos
- Listar mundos
- Ver informações (tamanho, arquivos)
- Deletar mundos

### Gerenciador de Addons
- Upload de novos addons (.zip/.mcpack)
- Listar Behavior Packs e Resource Packs
- Remover addons

### Configurações
- Editor visual de server.properties
- Salvar alterações

## 🎯 Features

- ✅ Interface responsiva
- ✅ Sistema de Toast (Notificações)
- ✅ Modais de confirmação
- ✅ Loading spinners
- ✅ WebSocket em tempo real
- ✅ TypeScript completo
- ✅ Dark theme

---

**Versão**: 2.0.0  
**Status**: ✅ Pronto para Uso
