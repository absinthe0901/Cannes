# Cannes
AI DeFi Portfolio

## Wallet Connect Landing Page

A new static landing page has been added:

- `index.html`
- `styles.css`
- `app.js`

### Run locally

1. Install dependencies:
   - `npm install`
2. Start backend server:
   - `npm run start`
3. Open `http://localhost:3000` in your browser.
4. Connect MetaMask and click a wallet card.
5. Use data action buttons to fetch Graph/Subgraph, Chainlink, 1inch quote, and Claude analysis.8. Save and load portfolio snapshots using the new portfolio tool card.
### Environment variables

- `CLAUDE_API_KEY` (or `ANTHROPIC_API_KEY`): required for real Claude requests.
- `CHAINLINK_INFURA_KEY`: optional API key used by the frontend when available; the backend exposes it through `/config.js`.
- `PORTFOLIO_API_KEY`: required for `/api/portfolio` save/load endpoints.

### Local development

- Use `npm run start` to serve the app and API from `http://localhost:3000`.
- Do not open `index.html` directly using the `file://` protocol; use the server instead.

### Notes

- MetaMask is now integrated via EIP-1193 / `window.ethereum` and ethers.js.
- Chainlink price reads are on-chain from official feed contracts (ETH/USD, USDC/USD).
- 1inch quote and subgraph query are live.
- Claude backend proxy in `server.js` performs request to Anthropic API if key set, otherwise stub response.

### Production TODO

- Replace inline RPC logic with a secure server-side provider key (Infura/Alchemy) and rate-limit.
- Add walletconnect/coinbase client flows using Web3Modal or onboard.js.
- Persist user portfolio in database and secure endpoint auth.

### Security

- Do not store private keys in frontend JS.
- Add proper API keys and backend proxies for heavyweight endpoints (Chainlink, 1inch, Claude).
