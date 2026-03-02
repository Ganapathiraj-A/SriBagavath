# AI Automation Rules for Sri Bagavath

To ensure maximum efficiency and reflect the user's preference for this workspace, the following rules apply to all AI agents:

## ⚡ Zero-Wait Execution
- **Autonomous Coding**: Create implementation plans and update the task checklist for visibility, but **start code changes immediately** without waiting for manual user approval unless a specific design choice requires clarification.
- **Workflow-Driven**: Always favor the automated workflows defined in `.agent/workflows/`.

## 🤖 Auto-Run Commands
- **Workspace Commands**: Any terminal command executed within the workspace (`C:\Code\Android\SriBagavath`) should be marked with `SafeToAutoRun: true`.
- **Read Operations**: Any file read or research operation should be performed autonomously without explicit permission.
- **Build & Publish**: Commands like `npm run publish:prod` or `npm run publish:aab:prod` must be executed automatically using the `// turbo-all` workflow logic.
- **Build Cleanup**: Automatically maintain only the last 1 `.apk` and last 3 `.aab` files after every build using `scripts/cleanup_builds.ps1`.

## ⏱ Process Tracking
- Continue using the `process_tracking.md` artifact to log durations for AI Work, Build/Publish phases, and User wait times.
