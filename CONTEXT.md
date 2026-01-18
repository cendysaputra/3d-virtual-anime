# AI Waifu Project - Context

## Overview

Project AI Waifu dengan 3D model VRM yang bisa gerak autonomous dan nantinya bisa interaksi via AI chat.

## Tech Stack

- React + Vite
- Three.js + @pixiv/three-vrm
- Model: VRM 0.0 dari VRoid Studio

## File Structure

```
3d-virtual-anime/
├── public/
│   └── cewaifu.vrm      # 3D model waifu
├── src/
│   └── App.jsx          # Main component dengan VRM loader + animasi
└── package.json
```

## Current Features (src/App.jsx)

1. Load & render VRM model
2. Idle animations:
   - Kedip otomatis tiap ~3 detik
   - Napas (badan naik-turun)
   - Kepala gerak halus (noleh + angguk)
   - Badan sway kiri-kanan
   - Tangan ayun natural (beda phase kiri-kanan)

## Planned Features

- [ ] Lip sync dari audio
- [ ] Ekspresi (senang/sedih/marah) trigger dari AI
- [ ] AI chat integration (Claude/OpenAI)
- [ ] Text-to-Speech
- [ ] Package ke desktop app (Electron/Tauri)

## Dependencies

- three
- @pixiv/three-vrm

## Run

```bash
npm run dev
```

## Notes

- Model VRM sudah rigged dengan blend shapes untuk ekspresi
- Project ini untuk local use, bukan web deployment
