# INVC Header Slots

A real-time facilitated voting game for stakeholder workshops.

---

## Quick start (Claude Code)

```bash
npm install
node server.js
```

Open `http://localhost:3000` as **Facilitator**.  
Share the URL shown in the terminal with participants.

---

## For remote participants (ngrok)

```bash
# Terminal 1
node server.js

# Terminal 2 — after installing ngrok.com
ngrok http 3000
# Share the https://xxxx.ngrok.io URL in Zoom/Slack
```

---

## Session flow

1. You open the app → pick **Facilitator**
2. Participants open the shared URL → pick **Participant** → choose avatar + name
3. Round 1: everyone picks 3 always-on anchor fields
4. Rounds 2–12: one invoice status per round, everyone picks 4 contextual fields
   - Locked anchors are shown at the top and removed from the pickable cards
5. After each round: you click **Reveal** → everyone sees consensus → click **Next round**
6. Participants can also advance themselves after reveal
7. Final summary shows consensus across all 12 rounds

---

## Desktop app (optional)

```bash
npm run electron        # run as desktop app
npm run dist:mac        # build .dmg
npm run dist:win        # build .exe
```

The desktop app auto-detects your IP and shows the participant URL at the bottom.
