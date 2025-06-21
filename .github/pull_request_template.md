# Pull Request Checklist

## 🚨 Critical Runtime Testing (REQUIRED)

- [ ] **Console Error Detection**: `npm run test:runtime-errors` passes with 0 errors
- [ ] **IPC Handler Validation**: All IPC channels used by code have registered handlers
- [ ] **Store Initialization**: No "No handler registered" errors during app startup
- [ ] **React Error Boundary**: No infinite loops or render errors
- [ ] **Backend Health**: All services initialize and report healthy status

**Required Commands Run:**
- [ ] `npm run test:critical` (must pass)
- [ ] `npm run type-check` (must pass)
- [ ] Manual app startup test with console monitoring

## Code Quality Checks

- [ ] TypeScript compilation passes without errors
- [ ] ESLint passes or has acceptable warnings only
- [ ] All existing tests continue to pass
- [ ] New tests added for new functionality

## Documentation Updates

- [ ] Updated relevant documentation for changes
- [ ] Updated `tasks/tasks-rfc-maestro.md` if needed
- [ ] Added/updated component documentation if UI changes

## Testing Evidence

**Runtime Error Test Results:**
```
Console errors: 0 ✅
IPC handler errors: 0 ✅  
React errors: 0 ✅
Backend health: ✅
```

**Manual Testing:**
- [ ] App starts without errors in console
- [ ] Core user flows work end-to-end
- [ ] No visible errors or broken functionality

## Change Description

<!-- Describe what this PR changes and why -->

## Risk Assessment

- [ ] Low risk - Documentation/test only changes
- [ ] Medium risk - Feature additions with full test coverage  
- [ ] High risk - Core architecture changes requiring extra validation

---

**⚠️ PR will be rejected if runtime error tests are not completed**