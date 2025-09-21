# ReleaseCompass MVP Development Strategy

## 🚨 CRITICAL DEPLOYMENT & PRODUCTION RULES

**EMPIRICAL EVIDENCE OBSERVED:**
- Git repository: `git@github.com:o4villegas/releasecompass-mvpify.git`
- Single commit: "source repo import" (88dabbf)
- Main branch triggers Cloudflare auto-build (NO GitHub Actions found)
- Build outputs to `public/dist/` directory (`index.js`, `index.css`)
- Entry: `public/index.html` → `src/client/index.tsx` → `src/server/index.ts`

**PRODUCTION-ONLY DEVELOPMENT RULES:**
- NEVER use `wrangler deploy` or `wrangler dev` commands
- ALL testing happens in production via git push to main branch
- DELETE all temporary test files after each feature validation
- Repository cleanliness is mandatory - no orphaned files
- Every commit must be production-ready and complete

**NEVER MODIFY WITHOUT USER APPROVAL:**
- `wrangler.json` - Cloudflare Workers configuration
- `package.json` scripts section - Build commands
- `src/server/index.ts` structure - Main entry point
- `public/index.html` - Asset loading structure

## 📋 PRODUCTION-BASED EMPIRICAL DEVELOPMENT PHASES

### Phase 1: Financial Engine + Production Testing (Week 1)
**EMPIRICAL VALIDATION:** Push financial engine to production, test live, delete test files

**OBSERVED REQUIREMENTS FROM ROADMAP:**
- Project types: Single ($1,500), EP ($6,500), Album ($25,000)
- Timeline compression: mild/moderate/severe impact calculation
- Real-time revenue calculation during milestone dragging

**EMPIRICAL IMPLEMENTATION:**
- Create `src/lib/financial-engine.js` (observed: no existing lib directory)
- ENHANCE existing React hooks in `src/client/index.tsx` (observed: useState, useEffect, useRef)
- Test by committing to main branch, validate in production
- DELETE any temporary test files after validation

### Phase 2: ENHANCE Existing Cobe Globe → Timeline Cylinder (Week 2)
**EMPIRICAL VALIDATION:** Timeline renders in production, commit and delete temp files

**OBSERVED COBE IMPLEMENTATION:**
- `createGlobe` from "cobe" library (v0.6.3) in `src/client/index.tsx:58`
- Current config: `devicePixelRatio: 2, width: 400*2, height: 400*2`
- Existing markers system via `state.markers = [...positions.current.values()]`
- Animation loop: `state.phi = phi; phi += 0.01`

**ENHANCEMENT STRATEGY (NOT REPLACEMENT):**
- ENHANCE existing `createGlobe` configuration for timeline appearance
- REPURPOSE existing `positions.current` Map for milestone data
- ADAPT existing `onRender` callback for timeline rotation
- MAINTAIN existing canvas ref and React integration

### Phase 3: REPURPOSE PartySocket → Desktop Interactions (Week 3)
**EMPIRICAL VALIDATION:** Mouse dragging works in production, financial updates trigger

**OBSERVED PARTYSOCKET IMPLEMENTATION:**
- `usePartySocket` from "partysocket/react" in `src/client/index.tsx:31`
- Message handling: `onMessage(evt)` with `add-marker`/`remove-marker`
- Real-time position updates to `positions.current.set()`

**REPURPOSING STRATEGY:**
- ENHANCE existing `onMessage` for milestone data instead of visitor positions
- REPURPOSE existing position Map for timeline milestone coordinates
- ADD mouse event handlers to existing canvas element
- INTEGRATE financial engine with existing state updates

### Phase 4: REPURPOSE Server State → Timeline Database (Week 4)
**EMPIRICAL VALIDATION:** Milestone templates populate in production

**OBSERVED SERVER IMPLEMENTATION:**
- `Globe` Durable Object class in `src/server/index.ts:11`
- Connection state: `position: Position` with lat/lng/id
- Broadcast system: `this.broadcast()` to all connections

**REPURPOSING STRATEGY:**
- ENHANCE existing `ConnectionState` type for timeline project data
- REPURPOSE existing `onConnect` for project initialization
- CREATE static JSON milestone database (no external dependencies)
- MAINTAIN existing Durable Objects infrastructure

### Phase 5: ENHANCE Existing Visual Effects → Risk Visualization (Week 5)
**EMPIRICAL VALIDATION:** Environmental effects respond to timeline changes in production

**OBSERVED VISUAL CONFIGURATION:**
- Existing cobe config: `baseColor: [0.3, 0.3, 0.3], markerColor: [0.8, 0.1, 0.1]`
- Current styling: black background, white text in `src/client/styles.css`

**ENHANCEMENT STRATEGY:**
- ENHANCE existing cobe color configurations for risk visualization
- ADAPT existing marker styling for timeline stress indicators
- REPURPOSE existing animation loop for environmental effects

### Phase 6: COMPLETE Integration + Playwright Testing (Week 6)
**EMPIRICAL VALIDATION:** Full user flow tested in production via Playwright

**COMPLETE IMPLEMENTATION:**
- Playwright tests for all user interactions in production environment
- VERIFY all roadmap requirements implemented
- DELETE all temporary files, ensure repository cleanliness
- CONFIRM no broken functionality from original codebase

## 🏗️ EMPIRICAL ENHANCEMENT STRATEGY

### OBSERVED CODE TO ENHANCE (NOT REPLACE):
1. **EXISTING React structure** - `useState`, `useEffect`, `useRef` in `src/client/index.tsx`
2. **EXISTING Durable Objects** - `Globe` class with connection state management
3. **EXISTING cobe library** - v0.6.3 with marker system and animation loop
4. **EXISTING PartySocket** - Real-time messaging infrastructure

### EMPIRICAL COMPONENT ENHANCEMENTS:
- `createGlobe` config → Enhanced for timeline visualization
- `positions.current` Map → Repurposed for milestone coordinates
- `usePartySocket` messages → Enhanced for timeline state updates
- `ConnectionState` type → Enhanced for project/milestone data
- Existing canvas styling → Enhanced for timeline appearance

## 🧪 PRODUCTION TESTING REQUIREMENTS

### EMPIRICAL TESTING APPROACH:
- NO local testing commands (no npm test infrastructure observed)
- ALL testing via git push to main branch in production
- Playwright tests for UI validation in live environment
- DELETE test files immediately after validation

### OBSERVED BUILD COMMANDS:
```bash
npm run check          # Existing: tsc + wrangler deploy --dry-run
npm run cf-typegen     # Existing: wrangler types
npm run deploy         # NEVER USE - git push triggers auto-build
```

### PRODUCTION VALIDATION APPROACH:
- Commit financial engine → Test calculations in production
- Commit timeline changes → Verify rendering in production
- Playwright tests → Validate user interactions in production
- Repository cleanup → Delete temporary files after each phase

## 💰 FINANCIAL CALCULATION SPECIFICATIONS

### Project Types:
- **Single:** $1,500 baseline
- **EP:** $6,500 baseline
- **Album:** $25,000 baseline

### Timeline Compression Impact:
- **Mild:** 5-10% revenue impact
- **Moderate:** 15-25% revenue impact
- **Severe:** 30%+ revenue impact

### Real-Time Calculation Triggers:
- Milestone position changes
- Dependency adjustments
- Timeline compression detection
- Risk threshold crossings

## 🎯 DESKTOP-ONLY OPTIMIZATION

### Interaction Patterns:
- Mouse-based milestone dragging
- Scroll wheel timeline zoom
- Right-click context menus
- Keyboard shortcuts for navigation

### Performance Optimizations:
- Leverage desktop GPU for environmental effects
- Support 50+ milestone objects
- Real-time dependency line rendering
- Desktop memory for comprehensive state caching

## 🔄 DEVELOPMENT WORKFLOW

### Sequential Phase Approach:
1. **Complete each phase fully before proceeding**
2. **Pass validation checkpoint before next phase**
3. **Maintain deployment safety throughout**
4. **Remove multiplayer code progressively for hygiene**

### Safety Protocols:
- Test financial engine thoroughly before 3D integration
- Backup existing functionality before major changes
- Validate deployment pipeline after each phase
- Maintain existing asset and build structure

## 📝 COMMAND REFERENCE

### Development:
```bash
npm run dev                    # Start development server
npm run check                  # Typecheck + build verification
npm run cf-typegen            # Generate Cloudflare types
```

### Deployment:
```bash
npm run deploy --dry-run      # Safety check
npm run deploy                # Production deploy (existing pipeline)
```

### Testing (to be implemented):
```bash
npm test                      # All tests
npm test financial-engine     # Core calculations
npm test timeline             # Timeline functionality
```

## 🎯 SUCCESS CRITERIA

Each phase must achieve its validation checkpoint before proceeding. The final MVP must deliver all original specification requirements optimized for desktop users while maintaining the existing Cloudflare deployment infrastructure.

---

**Remember:** Preserve deployment configuration absolutely. Implement financial testing first. Remove multiplayer functionality completely. Focus on desktop-only experience.