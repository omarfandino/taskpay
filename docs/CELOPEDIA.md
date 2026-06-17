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
| COPm | `0x8a567e2ae79ca692bd748ab832081c45de4041ea` | `0x5F8d55c3627d2dc0a2B4afa798f877242F382F67` |
| USDm (feeCurrency) | `0x765de816845861e75a25fca122bb6898b8b1282a` | `0xdE9e4C3ce781b4bA68120d6261cbad65ce0aB00b` |

Configured in `apps/web/src/lib/constants.ts`.
