# Azzurra Avatar - Integrazione LiveAvatar + Claude

Questa integrazione permette ad Azzurra di conversare usando:
- **LiveAvatar** (ex HeyGen Streaming Avatar) per il video/audio
- **Claude (Anthropic)** come LLM per risposte intelligenti in modalità CUSTOM

## Setup

### 1. Installa le dipendenze

```bash
npm install @heygen/liveavatar-web-sdk @anthropic-ai/sdk
```

### 2. Configura le Environment Variables

**Su Vercel** (Settings > Environment Variables):
- `LIVEAVATAR_API_KEY` - da https://app.liveavatar.com/settings
- `LIVEAVATAR_AVATAR_ID` - ID del tuo avatar su LiveAvatar
- `ANTHROPIC_API_KEY` - da https://console.anthropic.com/

**In locale** (file `.env.local`):
```
LIVEAVATAR_API_KEY=your_api_key
LIVEAVATAR_AVATAR_ID=eeb15a59-7cf3-4ac6-8bf6-4dc0dc61871c
ANTHROPIC_API_KEY=sk-ant-...
```

### 3. Usa il componente

```jsx
import { AzzurraAvatar } from './components/AzzurraAvatar';

function App() {
  return (
    <div>
      <h1>Parla con Azzurra</h1>
      <AzzurraAvatar />
    </div>
  );
}
```

## Struttura file

| File | Descrizione |
|------|-------------|
| `api/liveavatar-session.js` | Genera session token per LiveAvatar (serverless) |
| `api/chat.js` | Processa domande con Claude |
| `src/hooks/useAzzurra.js` | Hook React con tutta la logica |
| `src/components/AzzurraAvatar.jsx` | Componente UI |
| `src/components/AzzurraAvatar.css` | Stili |

## Come funziona

```
1. Utente clicca "Connetti" → Backend richiede session token da LiveAvatar
2. Frontend crea LiveAvatarSession con il token
3. Utente parla → LiveAvatar fa speech-to-text
4. Testo va a Claude → Risponde in italiano
5. Risposta torna → Avatar la pronuncia (modalità CUSTOM con repeat())
```

## Modalità CUSTOM

Questa integrazione usa la modalità **CUSTOM** di LiveAvatar, che significa:
- **Noi** gestiamo l'LLM (Claude)
- **Noi** riceviamo la trascrizione utente
- **Noi** inviamo il testo da pronunciare all'avatar
- **LiveAvatar** gestisce solo avatar e streaming

Questo permette massima flessibilità nel definire la personalità di Azzurra.

## Personalizzazione

### Modificare il System Prompt

Apri `api/chat.js` e modifica `AZZURRA_SYSTEM_PROMPT`.
Puoi aggiungere tutto il contenuto che vuoi - nessun limite di caratteri!

### Cambiare Avatar ID

In `api/liveavatar-session.js` o tramite environment variable:
```
LIVEAVATAR_AVATAR_ID=nuovo_avatar_id
```

### Usare Claude Sonnet invece di Haiku

In `api/chat.js`, cambia:
```js
model: 'claude-sonnet-4-20250514', // Più intelligente ma più lento
```

## Troubleshooting

**"LiveAvatar API key not configured"**
- Verifica che `LIVEAVATAR_API_KEY` sia configurato su Vercel/env.local

**"Unauthorized" o errore 401/403**
- L'API key potrebbe essere scaduta o invalida
- Verifica su https://app.liveavatar.com/settings

**"Session disconnected" subito**
- Potresti aver raggiunto il limite di sessioni concorrenti
- Aspetta qualche minuto o chiudi altre sessioni

**Avatar non si connette**
- Verifica che `LIVEAVATAR_AVATAR_ID` sia corretto
- L'avatar deve esistere su LiveAvatar (non su HeyGen)

**Latenza alta**
- Usa Claude Haiku per risposte più veloci
- Riduci `max_tokens` in `api/chat.js`

## Migrazione da HeyGen

Se vieni da HeyGen Interactive Avatar:
1. L'SDK cambia da `@heygen/streaming-avatar` a `@heygen/liveavatar-web-sdk`
2. L'endpoint API cambia da `api.heygen.com` a `api.liveavatar.com`
3. Gli avatar HeyGen NON sono compatibili - devi creare un nuovo avatar su LiveAvatar
4. L'API key di LiveAvatar funziona solo con LiveAvatar

## Latenza tipica

| Step | Tempo |
|------|-------|
| Speech-to-text LiveAvatar | ~500ms |
| Claude Haiku | ~500ms |
| Avatar parla | ~500ms |
| **Totale** | **~1.5-2.5s** |
