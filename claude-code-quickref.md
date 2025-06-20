# Claude Code Quick Reference - Project Maestro

## 🚨 CRITICAL RULES
1. **NO Node.js in renderer/** - Use IPC only
2. **Commit frequently** - After each working feature
3. **TypeScript strict** - No `any` types
4. **Tailwind only** - No custom CSS

## 📁 Where to put files
- **React components:** `src/renderer/components/[category]/`
- **Zustand stores:** `src/renderer/stores/`
- **API handlers:** `src/main/api/routes/`
- **IPC handlers:** `src/main/ipc/`
- **Agent logic:** `src/main/services/agents/`
- **Types:** `src/shared/types/`

## 🔧 Common Commands
```bash
npm run dev          # Start development
npm run lint         # Check code
npm test            # Run tests
npm run build       # Build app
```

## 🎯 Quick Patterns

### Add API Endpoint
1. Create handler in `src/main/api/routes/[feature].ts`
2. Add IPC handler in `src/main/ipc/handlers.ts`
3. Expose in `src/preload/index.ts`
4. Add types in `src/shared/types/`

### Add Component
1. Copy template from `src/templates/component.template.tsx`
2. Place in correct category folder
3. Use Tailwind classes only
4. Export from category index

### Add Store
1. Copy template from `src/templates/store.template.ts`
2. Place in `src/renderer/stores/`
3. Connect to components with hooks

### Handle Async in Component
```typescript
const [loading, setLoading] = useState(false)
const [error, setError] = useState(null)

const handleAction = async () => {
  setLoading(true)
  try {
    await window.api.doSomething()
  } catch (err) {
    setError(err.message)
  } finally {
    setLoading(false)
  }
}
```

## 🏗️ Architecture Reminders

### Process Separation
```
Main Process (Node.js)
    ↕️ (IPC)
Preload Script (Bridge)
    ↕️ (contextBridge)
Renderer (Browser/React)
```

### Data Flow
```
User Action → React Component → Zustand Store → 
Window API → Preload → IPC → Main Process → 
Service/DB → Response → Update UI
```

### AI Integration
```
User Message → Producer Agent → Task Creation →
Architect Agent → Technical Spec →
Engineer Agent → Code Generation →
QA Agent → Testing & Validation
```

## 🐛 Common Issues

### "Cannot find module 'fs'"
- You're importing Node.js in renderer
- Solution: Use window.api methods

### "Property doesn't exist on window"
- Not exposed in preload
- Solution: Add to preload/index.ts

### TypeScript errors
- Run `npm run type-check`
- No `any` types allowed

### Styling not working
- Use Tailwind classes only
- Check class names in tailwind.config.js

## 📝 Templates Location
- Component: `src/templates/component.template.tsx`
- Store: `src/templates/store.template.ts`
- IPC Handler: `src/templates/ipc-handler.template.ts`

## 🔗 Key Documentation
- Master Blueprint: `CLAUDE_CODE_BLUEPRINT.md`
- API Reference: `docs/api/README.md`
- Components: `docs/components/README.md`
- Agents: `docs/agents/README.md`