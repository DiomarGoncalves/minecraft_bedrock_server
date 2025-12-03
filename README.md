# 📖 Guia de Uso - Bedrock Panel v2.0

## 🚀 Iniciando o Projeto

### Instalação Inicial
```bash
# Na raiz do projeto
yarn install:all

# Ou manualmente
cd backend && yarn install
cd ../frontend && yarn install
```

### Executar em Desenvolvimento
```bash
# Na raiz do projeto
yarn dev

# Ou manualmente
# Terminal 1 - Backend
cd backend && yarn dev

# Terminal 2 - Frontend
cd frontend && yarn dev
```

### URLs
- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:3001

---

## 📱 Interfacemente do Painel

### 1. **Dashboard** (Home)
Uma visão geral do seu servidor com:
- **Status do Servidor**: Online/Offline/Iniciando/Parando
- **Botões de Controle**: Iniciar, Parar, Reiniciar
- **Estatísticas**: Mundos, Addons, Jogadores, Porta
- **Informações**: Versão, Sistema Operacional, Modo de Jogo
- **Acesso Rápido**: Links diretos para Console, Mundos e Addons

**Ações Possíveis:**
- Iniciar servidor
- Parar servidor
- Reiniciar servidor
- Ver estatísticas em tempo real

---

### 2. **Console**
Terminal em tempo real do servidor com WebSocket.

**Recursos:**
- 📊 Status de conexão (Verde = Conectado, Vermelho = Desconectado)
- 💬 Chat ao vivo com logs do servidor
- 📋 Copiar todos os logs para área de transferência
- 🗑️ Limpar logs da tela
- ⌨️ Enviar comandos diretamente

**Exemplo de Comandos:**
```
/say Olá a todos!
/give @s diamond 64
/gamemode survival
/difficulty hard
```

---

### 3. **Mundos** (Gerenciador de Mundos)
Gerenciar os mundos do servidor.

**Informações Exibidas:**
- 📁 Nome do Mundo
- 💾 Tamanho em Disco
- 📊 Quantidade de Arquivos

**Ações:**
- 🗑️ Deletar Mundo (com confirmação)

**⚠️ CUIDADO**: Deletar um mundo é permanente!

---

### 4. **Addons** (Gerenciador de Addons)
Gerenciar Behavior Packs e Resource Packs.

**Recursos:**
- 📤 Upload de novos addons (.zip ou .mcpack)
- 📋 Lista de Behavior Packs Instalados
- 📋 Lista de Resource Packs Instalados
- 🗑️ Remover addons (com confirmação)

**Como Upload de Addon:**
1. Clique em "Upload Addon"
2. Selecione um arquivo .zip ou .mcpack
3. Aguarde o processamento
4. Verá uma notificação de sucesso

**Local de Armazenamento:**
- Behavior Packs: `backend/mc-server/development_behavior_packs/`
- Resource Packs: `backend/mc-server/development_resource_packs/`

---

### 5. **Configurações** (Gerenciador de server.properties)
Editar as propriedades do servidor.

**Seções:**
1. **Configurações Principais**:
   - Nome do Servidor
   - Gamemode (Survival/Creative)
   - Dificuldade (Peaceful/Easy/Normal/Hard)
   - Máximo de Jogadores
   - Permitir Cheats (true/false)
   - Nome do Mundo
   - Porta do Servidor

2. **Outras Configurações**:
   - Todas as demais propriedades

**Ações:**
- 💾 Salvar Alterações
- ↩️ Descartar Alterações (volta ao anterior)

**📌 NOTA**: Mudanças só entram em efeito na próxima reinicialização!

---

## 🎨 Recursos de UI/UX

### Notificações (Toast)
Aparecem no canto superior direito da tela:
- ✅ **Verde**: Sucesso
- ❌ **Vermelho**: Erro
- ⚠️ **Amarelo**: Aviso
- ℹ️ **Azul**: Informação

Cada notificação desaparece em 4 segundos automaticamente.

### Diálogos de Confirmação
Para ações críticas (delete, remove), um diálogo aparece:
- ℹ️ Mostra a ação
- ✅ Botão Confirmar
- ❌ Botão Cancelar

### Loading States
- 🔄 Spinner durante carregamento
- 💫 Botões desabilitados durante processamento
- 📊 Indicadores visuais de estado

---

## ⌨️ Atalhos de Teclado

| Atalho | Ação |
|--------|------|
| `Enter` | Enviar comando no Console |
| `Escape` | Fechar modal (em breve) |
| `Ctrl+L` | Limpar console (em breve) |

---

## 🔧 Troubleshooting

### Não consigo conectar ao console
**Solução:**
- Verifique se o backend está rodando (`yarn dev` na pasta backend)
- Verifique se a URL é http://localhost:3001
- Abra o DevTools (F12) e veja erros no console

### Addons não aparecem
**Solução:**
- Verifique se os arquivos estão em:
  - `backend/mc-server/development_behavior_packs/`
  - `backend/mc-server/development_resource_packs/`
- Certifique-se que têm um arquivo `manifest.json`
- Recarregue a página (Ctrl+R ou Cmd+R)

### Configurações não salvam
**Solução:**
- Verifique se o servidor está respondendo
- Confira se o arquivo `server.properties` tem permissão de escrita
- Tente novamente ou recarregue a página

### Interface lenta
**Solução:**
- Feche outras abas
- Limpe o cache do navegador
- Use um navegador mais recente (Chrome 90+, Firefox 88+)

---

## 📊 Estrutura de Arquivos

```
painel-host-server/
├── backend/
│   ├── src/
│   │   ├── index.js (servidor principal)
│   │   ├── routes/ (endpoints HTTP)
│   │   ├── services/ (lógica de negócio)
│   │   └── ws/ (WebSocket)
│   └── mc-server/
│       ├── development_behavior_packs/ ✅ NOSSOS ADDONS
│       ├── development_resource_packs/ ✅ NOSSOS ADDONS
│       └── server.properties
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── Layout.jsx
    │   │   ├── Toast.jsx (novo)
    │   │   └── Modal.jsx (novo)
    │   ├── pages/
    │   │   ├── Dashboard.jsx
    │   │   ├── Console.jsx
    │   │   ├── Worlds.jsx
    │   │   ├── Addons.jsx
    │   │   └── Config.jsx
    │   └── index.css
    └── package.json
```

---

## 🔐 Segurança

### ⚠️ Avisos Importantes
1. **Backups**: Sempre faça backup antes de deletar mundos ou alterar configs
2. **Acesso**: Este painel **NÃO** tem autenticação. Use em rede segura apenas
3. **Produção**: Para ambientes de produção, adicione autenticação e HTTPS
4. **Firewall**: Proteja a porta 3001 com firewall

### Melhorias Futuras
- [ ] Autenticação com login/senha
- [ ] HTTPS/TLS
- [ ] Logs de auditoria
- [ ] Rate limiting
- [ ] Validação de entrada

---

## 📚 API Endpoints

### Servidor
```
POST /server/start     - Iniciar servidor
POST /server/stop      - Parar servidor
POST /server/restart   - Reiniciar servidor
GET  /server/status    - Obter status
```

### Mundos
```
GET    /worlds           - Listar mundos
GET    /worlds/:id/config - Obter config do mundo
DELETE /worlds/:id       - Deletar mundo
```

### Addons
```
GET            /addons                  - Listar addons
POST           /addons/upload           - Upload novo addon
DELETE         /addons/:type/:id        - Remover addon
```

### Configurações
```
GET  /config/server    - Obter configurações
PUT  /config/server    - Atualizar configurações
```

### WebSocket
```
ws://localhost:3001/ws/console

Mensagens:
- Client: { type: 'command', data: 'seu comando' }
- Server: { type: 'log', data: 'output do servidor' }
- Server: { type: 'status', data: 'ONLINE|OFFLINE|...' }
```

---

## 🐛 Debug

### Abrir Console do Navegador
- Windows/Linux: `Ctrl + Shift + J`
- Mac: `Cmd + Option + J`

### Ver Requisições de Rede
- Windows/Linux: `Ctrl + Shift + E`
- Mac: `Cmd + Option + E`

### Ver WebSocket
1. F12 → Network
2. Filtrar por "WS"
3. Clicar em conexão `/ws/console`

---

## 📱 Mobile

O painel é responsivo e funciona em celulares!

**Recursos Mobile:**
- Sidebar colapsível
- Botões dimensionados para toque
- Layout adaptativo
- Teclado virtual para input

---

## 🎓 Exemplo de Workflow

### Criar e Configurar um Novo Mundo

1. **Dashboard**
   - Iniciar servidor (se offline)
   - Esperar status ficar ONLINE

2. **Console**
   - Executar `/function load new_world` (criar mundo)
   - Acompanhar logs de criação

3. **Configurações**
   - Alterar `server-name` se desejar
   - Salvar configurações
   - Reiniciar servidor

4. **Mundos**
   - Verificar novo mundo na lista
   - Ver tamanho e arquivos

5. **Addons**
   - Upload seus addons customizados
   - Instalar behavior/resource packs desejados

---

## 📞 Suporte

Para problemas ou dúvidas:
1. Verifique este guia
2. Veja os logs no Console
3. Abra uma issue no repositório

---

**Versão**: 2.0.0  
**Última Atualização**: 3 de Dezembro de 2025  
**Status**: ✅ Pronto para Uso
