# Demo Lab Manual QA Checklist (`/demo`)

This document outlines the manual verification procedures and edge-case behavior for the TrojanGuard Demonstration Simulation Lab.

---

## 1. Scenario End-to-End Execution

### 1.1 Scenario: Normal System (`normal`)
- [ ] Navigate to `/demo`.
- [ ] Verify scenario card displays:
  - Name: **Normal System Activity**
  - Scenario ID: `normal`
  - Duration: `~16s sequence`
  - Description matches backend `GET /api/demo/scenarios`.
- [ ] Click **Start Simulation**.
- [ ] Verify UI transitions into running state:
  - Card shows animated `RUNNING` badge and border highlights in low-risk green accent (`#10b981`).
  - Other scenario cards' "Start Simulation" buttons are disabled.
  - Progress bar renders active animated pulse indicator, elapsed time, total duration, and percentage.
  - EventStream reveals telemetry events with timestamps, event types, descriptions, and `[SIMULATED]` tags.
- [ ] Allow scenario to reach 100% completion (~16 seconds):
  - Polling stops immediately.
  - Result panel renders with:
    - Composite Risk Gauge showing score (0–12) and Low severity badge.
    - Classification badge: `Benign`.
    - Classifier output showing model prediction and confidence percentage (or rule note).
    - Top evidence list by points (if any points contributed; otherwise clean zero state).
    - **View Full Report** button linking to `/analysis/{id}`.
    - **Reset / Run Again** button.
    - Caption: *"Results come from the same backend pipeline as uploaded files, and the telemetry is simulated."*

### 1.2 Scenario: Suspicious Activity (`suspicious`)
- [ ] Click **Reset / Run Again** or refresh.
- [ ] Click **Start Simulation** on the **Suspicious Activity** card.
- [ ] Verify intermediate events stream into EventStream (e.g., suspicious PowerShell/script execution, unusual port connection).
- [ ] Verify completion result:
  - Composite Risk Gauge showing score in the Medium range (~40–60).
  - Classification badge: `Suspicious`.
  - Top 3 evidence items showing points contributed (e.g., process injection or suspicious script flags).

### 1.3 Scenario: Trojan-like Activity (`trojan`)
- [ ] Click **Reset / Run Again**.
- [ ] Click **Start Simulation** on the **Trojan-like Activity** card.
- [ ] Verify telemetry streams high-severity events (e.g., persistence via registry run keys, outbound C2 beaconing connections).
- [ ] Verify completion result:
  - Composite Risk Gauge showing Critical risk score (~88–95).
  - Classification badge: `Trojan-like`.
  - Top 3 evidence items displaying highest contributed points.

---

## 2. Re-running Twice in a Row
- [ ] Complete any scenario (e.g., Trojan-like Activity).
- [ ] Click **Reset / Run Again**.
- [ ] Verify state is completely cleared:
  - Event stream clears back to placeholder empty state.
  - Result panel unmounts.
  - All cards re-enable their Start Simulation buttons.
- [ ] Immediately click **Start Simulation** on a different scenario (e.g., Normal System) without refreshing the browser page.
- [ ] Verify a new `demo_id` is created by `POST /api/demo/start`.
- [ ] Verify polling begins cleanly, events populate for the new scenario, and completing it fetches a distinct new `analysis_id`.

---

## 3. Backend Killed Mid-Run
- [ ] Start any scenario (e.g., Trojan-like Activity).
- [ ] While the progress bar is at ~30–50%, terminate the backend server (`kill` process or stop FastAPI).
- [ ] **Next 1–4 seconds (jitter retry window)**:
  - Non-blocking warning banner appears: `Telemetry poll jitter (attempt X/5): retrying...`.
  - The UI does not freeze or crash; other controls remain stable.
- [ ] **After 5 consecutive failed polling attempts**:
  - Polling interval cancels immediately to prevent memory/request leaks.
  - Full `ErrorState` appears: *"Lost telemetry stream connection after 5 consecutive attempts."*
  - An interactive **Retry Simulation Stream** button is provided.
- [ ] Restart backend and click **Retry Simulation Stream** to verify recovery.

---

## 4. Navigating Away Mid-Run
- [ ] Start a scenario (e.g., Suspicious Activity).
- [ ] While running (e.g., at ~5 seconds), click the sidebar navigation to navigate to `/` (SOC Dashboard) or `/history`.
- [ ] Inspect browser console / developer tools:
  - Verify no `setState` warnings on unmounted component.
  - Verify polling interval timer (`clearInterval`) was cleaned up in the `useEffect` unmount hook.
  - No background HTTP requests continue firing in the Network tab.
- [ ] Return to `/demo`.
- [ ] Verify session resumption from `sessionStorage` re-attaches to the active demo if still running, or resumes cleanly.

---

## 5. Browser Refresh Mid-Run
- [ ] Start a scenario (e.g., Normal System).
- [ ] At ~5 seconds into the run, trigger a hard browser refresh (`Ctrl+R` / `F5`).
- [ ] Upon reload:
  - `DemoLab` inspects `sessionStorage` (`trojanguard_active_demo`).
  - Active `demo_id` and `scenario_id` are restored and polling resumes automatically.
  - If `sessionStorage` was corrupted or unavailable, the page falls back gracefully to a clean idle state without unhandled exceptions or broken UI.
