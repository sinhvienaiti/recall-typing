# Recall Typing

Local-first English spelling recall game for the Typing Game platform.

## Learning loop

- English target is hidden.
- Vietnamese / IPA / pronunciation are used as hints.
- Correct letters reveal progressively.
- Wrong letters do not reveal the answer and do not advance.
- Spaces and structural punctuation remain visible.

## Development

```bash
pnpm install
pnpm dev
```

Default dev port:

```text
3002
```

Expected platform origin:

```text
https://recall.typing-game.local
```

## Build

```bash
pnpm build
```

Static output:

```text
dist/
```

## Offline

Core gameplay is local-first and uses IndexedDB/localStorage plus browser/system SpeechSynthesis. No network service is required for the main game loop after local setup/build.
