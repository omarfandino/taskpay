# Celopedia

Install once globally (Cursor reads `~/.cursor/skills/`):

```bash
npx skills add celo-org/celopedia-skills
# then copy to Cursor path if needed:
# cp -r ~/.agents/skills/celopedia-skill ~/.cursor/skills/
```

Do **not** commit Celopedia into this repo — use the global skill only.

## TaskPay token addresses

| Token | Mainnet | Sepolia |
|-------|---------|---------|
| COPm (rewards) | `0x8a567e2ae79ca692bd748ab832081c45de4041ea` | `0x5F8d55c3627d2dc0a2B4afa798f877242F382F67` |
| USDC (network fees) | `0xcebA9300f2b948710d2653dD7B07f33A8B32118C` | `0x01C5C0122039549AD1493B8220cABEdD739BC44E` |

Configured in `apps/web/src/lib/constants.ts`.
