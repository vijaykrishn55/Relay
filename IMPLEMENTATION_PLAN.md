# Relay — Implementation Plan

> Working towards a Distributed AI OS

## Vision
Turn the current AI chat with multi-model routing into a **session-aware AI system** where users can:
1. Chat normally (AI picks the best model per message)
2. Select specific responses from a session
3. Start a new session seeded with those selections
4. Have the AI reason across the curated context

---

## Current State

### What Exists
| Layer | What We Have |
|-------|-------------|
| **Frontend** | ChatGPT-style chat UI (chat.jsx), Dashboard, Models page, Layout with sidebar |
| **Backend** | Express API, AI-powered routing (AIRouterService → Compound Mini picks model), 3 providers (Mistral, Cerebras, Groq), Cohere provider ready |
| **Routing** | router.js (strategy-based) + aiRouterService.js (AI-powered), fallback logic |
| **Data** | 9 active models across 3 providers, in-memory analytics |
| **Storage** | None — no DB, no sessions, no persistence |

### What's Missing
- No session/conversation persistence
- No message history sent to AI (each message is standalone, no context)
- No regenerate, edit, or copy on messages
- No session management (new chat, session list, rename, delete)
- No memory/selection system
- No database

---

## Implementation Steps

### Phase 1: Context-Aware Chat (Make it actually work like ChatGPT)

Right now each message is sent alone with no history. The AI has no memory of previous messages in the same session.

#### 1.1 Send Conversation History to Backend
**Files:** `chat.jsx`, `api.js`, `ai.js`

- Change frontend to send full `messages[]` array (not just `input` string)
- Backend receives `messages[]` and passes it to the provider
- Each provider formats messages as `[{role, content}, ...]` for the API call

#### 1.2 Update All Providers to Accept Messages Array
**Files:** `groqProvider.js`, `cerebrasProvider.js`, `mistralProvider.js`, `cohereProvider.js`

- Change `callModel(model, input)` → `callModel(model, messages)`
- Build proper `messages` array with system prompt + conversation history
- Keep backward compatibility: if `messages` is a string, treat it as single user message

#### 1.3 Add Regenerate Button
**Files:** `chat.jsx`

- Add a regenerate icon on the last assistant message
- On click: remove last assistant message, resend the same user message
- Loading state while regenerating

#### 1.4 Add Copy Button on Messages
**Files:** `chat.jsx`

- Clipboard icon on hover for each assistant message
- Copy message content to clipboard
- Brief "Copied!" feedback

#### 1.5 Add Edit Message
**Files:** `chat.jsx`

- Edit icon on user messages
- On click: turn message into editable textarea
- On submit: remove all messages after the edited one, resend

---

### Phase 2: Session Management

#### 2.1 Add Session Data Structure
**Files:** New `backend/data/sessions.js` (in-memory for now)

```
Session {
  id: string
  title: string (auto-generated from first message)
  messages: [{role, content, model, timestamp}]
  createdAt: timestamp
  updatedAt: timestamp
}
```

#### 2.2 Session API Routes
**Files:** New `backend/routes/sessions.js`, update `server.js`

- `GET /api/sessions` — list all sessions (id, title, updatedAt)
- `GET /api/sessions/:id` — get full session with messages
- `POST /api/sessions` — create new session
- `PUT /api/sessions/:id` — update session (rename, add messages)
- `DELETE /api/sessions/:id` — delete session

#### 2.3 Update AI Route to Work with Sessions
**Files:** `ai.js`

- Accept `sessionId` in request body
- After generating response, save both user + assistant messages to session
- Return `sessionId` in response

#### 2.4 Frontend Session Sidebar
**Files:** `Layout.jsx`, new `components/SessionList.jsx`, `chat.jsx`

- Replace current static sidebar with session list in Chat
- "New Chat" button at top
- Session list: title, timestamp, delete button
- Click session → load its messages
- Auto-create session on first message if none selected

---

### Phase 3: Memory & Selection System (The Core Feature)

#### 3.1 Add Selection Mode to Messages
**Files:** `chat.jsx`, new `components/MessageBubble.jsx`

- Extract message rendering into its own component
- Add checkbox / select toggle on each message (both user & assistant)
- "Select Mode" button in header activates checkboxes
- Selected messages get highlighted border
- Bottom bar appears: "X selected — Start New Session with Context"

#### 3.2 Create Context-Seeded Sessions
**Files:** `chat.jsx`, `sessions.js` route, `ai.js`

- When user clicks "Start New Session with Context":
  - Create new session
  - Store selected messages as `contextMessages` (separate from regular messages)
  - Navigate to new session
- Display context messages at the top in a collapsible "Context from previous session" block

#### 3.3 Pass Context to AI
**Files:** `ai.js`, providers

- When session has `contextMessages`, prepend them as system/context before the conversation
- Format: system prompt explaining these are curated facts from a prior session
- AI now reasons with awareness of selected context

#### 3.4 Memory Bank (Persistent Curated Facts)
**Files:** New `backend/data/memory.js`, new `backend/routes/memory.js`

```
Memory {
  id: string
  content: string
  source: { sessionId, messageIndex }
  tags: string[]
  createdAt: timestamp
}
```

- `GET /api/memory` — list all saved memories
- `POST /api/memory` — save a message as memory
- `DELETE /api/memory/:id` — remove memory
- `PUT /api/memory/:id` — edit / tag memory

#### 3.5 Auto-inject Relevant Memories
**Files:** `ai.js`, new `backend/services/memoryService.js`

- Before each AI call, search memory bank for relevant entries
- Use keyword matching or AI-based relevance scoring
- Inject matching memories into system prompt
- AI reasons with both session context and long-term memory

#### 3.6 Frontend Memory Page
**Files:** New `pages/Memory.jsx`, update `Layout.jsx`, `App.jsx`

- New sidebar item: "Memory"
- View all saved memories with tags
- Search, edit, delete memories
- Toggle auto-inject on/off

---

### Phase 4: Polish & Production Readiness

#### 4.1 Replace In-Memory Storage with Database
- SQLite (via `better-sqlite3`) or JSON file persistence
- Migrate sessions, analytics, memory to DB

#### 4.2 Markdown Rendering in Chat
**Files:** `chat.jsx` or `MessageBubble.jsx`
- Render assistant responses with markdown (code blocks, lists, headers)
- Use `react-markdown` + `rehype-highlight` for syntax highlighting

#### 4.3 Streaming Responses
- Switch from waiting for full response to streaming tokens
- Show text appearing word by word

#### 4.4 Error Recovery
- Retry failed messages
- Rate limit handling with automatic model fallback
- Queue system for concurrent requests

---

## File Impact Summary

### New Files to Create
| File | Purpose |
|------|---------|
| `backend/data/sessions.js` | In-memory session store |
| `backend/routes/sessions.js` | Session CRUD API |
| `backend/data/memory.js` | Memory bank store |
| `backend/routes/memory.js` | Memory CRUD API |
| `backend/services/memoryService.js` | Memory retrieval & relevance |
| `frontend/src/components/MessageBubble.jsx` | Extracted message component with select/copy/edit |
| `frontend/src/components/SessionList.jsx` | Sidebar session list |
| `frontend/src/pages/Memory.jsx` | Memory management page |

### Files to Modify
| File | Changes |
|------|---------|
| `chat.jsx` | Session loading, message history, regenerate, edit, select mode |
| `ai.js` | Accept messages array, session integration, context injection |
| `groqProvider.js` | Accept messages array instead of single string |
| `cerebrasProvider.js` | Accept messages array instead of single string |
| `mistralProvider.js` | Accept messages array instead of single string |
| `cohereProvider.js` | Accept messages array instead of single string |
| `aiRouterService.js` | Route based on full conversation context, not just last message |
| `api.js` | Add session & memory API endpoints |
| `server.js` | Register new routes |
| `Layout.jsx` | Add Memory nav item |
| `App.jsx` | Add Memory route |

### Files to Remove
| File | Reason |
|------|--------|
| `components/ModelDropdown.jsx` | No longer used (AI-powered routing only) |
| `services/genericProvider.js` | Unused placeholder |
| `services/aiProvider.js` | OpenRouter removed, not in use |

---

## Execution Order

```
Phase 1.1 → 1.2 → 1.3 → 1.4 → 1.5
  ↓
Phase 2.1 → 2.2 → 2.3 → 2.4
  ↓
Phase 3.1 → 3.2 → 3.3 → 3.4 → 3.5 → 3.6
  ↓
Phase 4 (as needed)
```

**Start with Phase 1.1** — sending conversation history. Everything else builds on that.
