const wallets = [
  { id: 'metamask', name: 'MetaMask', desc: 'Browser extension wallet' },
  { id: 'walletconnect', name: 'WalletConnect', desc: 'Mobile and desktop dApps' },
  { id: 'coinbase', name: 'Coinbase Wallet', desc: 'Trusted wallet provider' }
];

const walletList = document.getElementById('walletList');
const statusEl = document.getElementById('connectionStatus');
const disconnectButton = document.getElementById('disconnectButton');
let web3Modal = null;
let web3Provider = null;
let provider = null;
let signer = null;
let connectedAddress = null;
let connectedWalletId = null;

const infuraKey = window.CHAINLINK_INFURA_KEY || 'YOUR_INFURA_PROJECT_ID';

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.style.color = isError ? '#ff8f9e' : '#d1f4ff';
}

function formatAddress(address) {
  if (!address) return 'Not connected';
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function updateUI() {
  walletList.querySelectorAll('.wallet-option').forEach(node => {
    const active = node.getAttribute('data-wallet-id') === connectedWalletId && connectedAddress;
    node.setAttribute('data-active', active ? 'true' : 'false');
    node.setAttribute('aria-pressed', active ? 'true' : 'false');
  });

  if (connectedAddress) {
    setStatus(`Connected ${formatAddress(connectedAddress)}`);
    disconnectButton.hidden = false;
  } else {
    setStatus('Not connected');
    disconnectButton.hidden = true;
  }
}

async function initWeb3Modal() {
  const providerOptions = {
    walletconnect: {
      package: window.WalletConnectProvider.default || window.WalletConnectProvider,
      options: {
        infuraId: infuraKey,
      }
    },
    coinbasewallet: {
      package: window.CoinbaseWalletSDK || window.CoinbaseWalletSDK.default,
      options: {
        appName: 'Cannes AI DeFi Portfolio',
        infuraId: infuraKey,
        rpc: { 1: `https://mainnet.infura.io/v3/${infuraKey}` },
        chainId: 1,
      }
    }
  };

  web3Modal = new window.Web3Modal.default({
    cacheProvider: true,
    providerOptions,
    theme: 'dark',
  });

  if (web3Modal.cachedProvider) {
    await connectWallet();
  }
}

async function connectWallet(walletId) {
  connectedWalletId = walletId || 'walletconnect';
  setStatus('Connecting wallet...');

  try {
    if (walletId === 'metamask') {
      if (!window.ethereum) {
        setStatus('MetaMask is not installed. Try WalletConnect or Coinbase Wallet.', true);
        connectedWalletId = null;
        return;
      }

      web3Provider = window.ethereum;
      provider = new ethers.Web3Provider(web3Provider);
      await provider.send('eth_requestAccounts', []);
      signer = provider.getSigner();
      connectedAddress = await signer.getAddress();
    } else {
      if (!web3Modal) {
        setStatus('Wallet connection is not available right now.', true);
        connectedWalletId = null;
        return;
      }

      web3Provider = await web3Modal.connect();
      provider = new ethers.Web3Provider(web3Provider);
      signer = provider.getSigner();
      connectedAddress = await signer.getAddress();
    }

    if (!connectedAddress) {
      throw new Error('Unable to read account');
    }

    window.localStorage.setItem('cannesAddress', connectedAddress);
    updateUI();
    await updateBalance();

    if (web3Provider && web3Provider.on) {
      web3Provider.on('accountsChanged', handleAccountsChanged);
      web3Provider.on('chainChanged', () => window.location.reload());
      web3Provider.on('disconnect', () => disconnectWallet());
    }
  } catch (err) {
    connectedWalletId = null;
    if (walletId === 'metamask' && !window.ethereum) {
      setStatus('MetaMask is not installed. Try WalletConnect or Coinbase Wallet.', true);
    } else {
      setStatus('Wallet connection failed: ' + err.message, true);
    }
  }
}

function handleAccountsChanged(accounts) {
  if (!accounts || accounts.length === 0) {
    disconnectWallet();
    return;
  }

  connectedAddress = accounts[0];
  updateUI();
  updateBalance().catch(() => {
    setStatus(`Connected ${formatAddress(connectedAddress)}`);
  });
}

async function disconnectWallet() {
  connectedAddress = null;
  connectedWalletId = null;
  signer = null;
  provider = null;

  try {
    if (web3Provider && web3Provider.close) await web3Provider.close();
    if (web3Modal && web3Modal.clearCachedProvider) await web3Modal.clearCachedProvider();
  } catch (err) {
    // ignore
  }

  localStorage.removeItem('cannesAddress');
  updateUI();
}

function renderWalletOptions() {
  const buttons = wallets.map(w => {
    const button = document.createElement('button');
    button.className = 'wallet-option';
    button.type = 'button';
    button.setAttribute('data-wallet-id', w.id);
    button.setAttribute('aria-pressed', 'false');
    button.innerHTML = `<h3>${w.name}</h3><span>${w.desc}</span>`;
    button.addEventListener('click', () => connectWallet(w.id));
    return button;
  });

  walletList.append(...buttons);
}

renderWalletOptions();
updateUI();
disconnectButton.addEventListener('click', disconnectWallet);


// GraphQL / subgraph (Uniswap v3 example)
const subgraphAddress = document.getElementById('subgraphAddress');
const subgraphFetch = document.getElementById('subgraphFetch');
const subgraphResult = document.getElementById('subgraphResult');

const chainlinkResult = document.getElementById('chainlinkResult');
const chainlinkFetch = document.getElementById('chainlinkFetch');

const oneinchResult = document.getElementById('oneinchResult');
const oneinchQuoteBtn = document.getElementById('oneinchQuote');

const claudeResult = document.getElementById('claudeResult');
const claudeAnalyzeBtn = document.getElementById('claudeAnalyze');

async function runSubgraphQuery(address) {
  const endpoint = 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3';
  const query = `{
    tokenBalances: users(where:{id:\"${address.toLowerCase()}\"}) {
      id
      liquidityPositions {
        token0 { symbol }
        token1 { symbol }
        liquidity
      }
    }
  }`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });
  const data = await response.json();
  return data;
}

async function updateSubgraph() {
  const addr = subgraphAddress.value.trim();
  if (!addr) {
    subgraphResult.textContent = 'Enter a wallet address';
    return;
  }

  subgraphResult.textContent = 'Loading...';
  try {
    const data = await runSubgraphQuery(addr);
    subgraphResult.textContent = JSON.stringify(data, null, 2);
  } catch (err) {
    subgraphResult.textContent = 'Subgraph query failed: ' + err.message;
  }
}

async function fetchChainlinkFeeds() {
  chainlinkResult.textContent = 'Loading on-chain Chainlink prices...';

  try {
    if (!provider) {
      provider = new ethers.JsonRpcProvider('https://mainnet.infura.io/v3/' + (window.CHAINLINK_INFURA_KEY || '')); // fallback
    }

    const aggregatorAbi = [
      'function decimals() view returns (uint8)',
      'function latestRoundData() view returns (uint80, int256, uint256, uint256, uint80)'
    ];

    const feeds = {
      'ETH/USD': '0x5f4ec3df9cbd43714fe2740f5e3616155c5b8419',
      'USDC/USD': '0x8fffffd4afb6115b954bd326cbe7b4ba576818f6'
    };

    const lines = [];

    for (const [label, address] of Object.entries(feeds)) {
      const contract = new ethers.Contract(address, aggregatorAbi, provider);
      const decimals = await contract.decimals();
      const [_roundId, answer] = await contract.latestRoundData();
      const usdPrice = Number(answer) / 10 ** Number(decimals);
      lines.push(`${label} = ${usdPrice}`);
    }

    chainlinkResult.textContent = lines.join('\n');
  } catch (err) {
    chainlinkResult.textContent = 'Chainlink on-chain read failed: ' + err.message + '\nFall back to Coingecko API.';
    try {
      const eth = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd').then(r => r.json());
      const usdc = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=usd-coin&vs_currencies=usd').then(r => r.json());
      chainlinkResult.textContent += `\nETH/USD (fallback) ${eth.ethereum.usd} \nUSDC/USD (fallback) ${usdc['usd-coin'].usd}`;
    } catch (fallbackErr) {
      chainlinkResult.textContent += '\nFallback fetch failed: ' + fallbackErr.message;
    }
  }
}

async function fetch1InchQuote() {
  oneinchResult.textContent = 'Loading...';
  try {
    const url = 'https://api.1inch.io/v5.0/1/quote?fromTokenAddress=0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE&toTokenAddress=0x6B175474E89094C44Da98b954EedeAC495271d0F&amount=1000000000000000000';
    const r = await fetch(url);
    const json = await r.json();
    oneinchResult.textContent = JSON.stringify(json, null, 2);
  } catch (err) {
    oneinchResult.textContent = '1inch quote failed: ' + err.message;
  }
}

async function analyzeWithClaude() {
  claudeResult.textContent = 'Analyzing...';
  try {
    const payload = {
      prompt: 'Analyze this portfolio: ' + (connectedAddress || 'no wallet connected'),
      data: { assets: ['ETH', 'DAI', 'USDC'] }
    };

    // Replace `/api/claude` with your own server-side integration with Claude.
    const r = await fetch('/api/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const json = await r.json();
    claudeResult.textContent = JSON.stringify(json, null, 2);
  } catch (err) {
    claudeResult.textContent = 'Claude analysis failed: ' + err.message + '\n(You need backend support for Claude API)';
  }
}

subgraphFetch.addEventListener('click', updateSubgraph);
chainlinkFetch.addEventListener('click', fetchChainlinkFeeds);
oneinchQuoteBtn.addEventListener('click', fetch1InchQuote);
claudeAnalyzeBtn.addEventListener('click', analyzeWithClaude);

// init
initWeb3Modal();

window.addEventListener('load', async () => {
  const cachedAddress = localStorage.getItem('cannesAddress');
  if (cachedAddress && !connectedAddress) {
    await initWeb3Modal();
  }
});

