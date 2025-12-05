# Bedrock Manager

Um painel de controle web moderno para gerenciar um **Minecraft Bedrock Dedicated Server** em Linux, com suporte a tunelamento via PlayIt e gerenciamento de addons.

---

## 📋 Requisitos

- **Node.js** v16+ (v18+ recomendado)
- **npm** ou **yarn**
- **Linux** (testado em Ubuntu/Debian)
- **Minecraft Bedrock Server** binário (baixado separadamente)

---

## 🚀 Instalação Rápida

### 1. Clone o Repositório

```bash
git clone https://github.com/DiomarGoncalves/minecraft_bedrock_server
cd minecraft_bedrock_server
```

### 2. Instale as Dependências

```bash
npm install
# ou
yarn install
```

### 3. Configure o Servidor

Crie um diretório para o servidor Bedrock:

```bash
mkdir mc-server
cd mc-server
```

### 4. Baixe os Binários do Bedrock Server

1. Acesse [Microsoft Minecraft Bedrock](https://www.minecraft.net/en-us/download/server/bedrock/)
2. Baixe o arquivo `bedrock-server-[versão].zip` para Linux
3. Extraia os arquivos para a pasta `mc-server`:

```bash
unzip bedrock-server-*.zip -d mc-server/
```

Verifique se o arquivo `bedrock_server` está executável:

```bash
chmod +x mc-server/bedrock_server
```

### 5. Configure as Variáveis de Ambiente (Opcional)

Crie um arquivo `.env.local` na raiz do projeto:

```env
PLAYIT_BIN=./playit
```

Se você tiver o PlayIt instalado globalmente, pode deixar como `playit`.

---

## 🎮 Executar Localmente

### Modo Desenvolvimento (Cliente + Servidor)

```bash
npm run dev
```

Isto inicia:
- **Frontend Vite**: http://localhost:5173
- **Backend Express**: http://localhost:3001

### Apenas o Servidor

```bash
npm run server
```

### Apenas o Cliente (Vite)

```bash
npm run client
```

---

## 📦 Build para Produção

```bash
npm run build
```

Isto vai:
1. Compilar TypeScript (`server.ts` e `types.ts`)
2. Compilar React + Tailwind com Vite
3. Gerar arquivos otimizados em `dist/`

---

## 🎯 Recursos Principais

### 📊 Dashboard
- Status em tempo real do servidor
- Botões de controle (Start, Stop, Restart)
- Indicador de conexão com o backend

### 💻 Console
- Logs em tempo real via WebSocket
- Enviar comandos ao servidor Bedrock
- Auto-scroll e limpeza de console
- Diferenciação de cores por tipo de mensagem (stdout, stderr, system)

### ⚙️ Configurações
- Editor visual de `server.properties`
- Búsca de propriedades
- Alterações sem precisar editar manualmente
- **Requer reinicialização do servidor** para aplicar

### 📦 Gerenciador de Addons
- Upload de `.mcpack` ou `.zip`
- Instalação automática em `development_behavior_packs` e `development_resource_packs`
- Listagem de addons instalados
- Remoção de addons

### 🌐 PlayIt Tunnel
- Iniciar/parar o agente PlayIt
- Exibir endereço público do servidor
- Visualizar logs do tunelamento
- Cópia rápida do endereço público

---

## 📁 Estrutura do Projeto
