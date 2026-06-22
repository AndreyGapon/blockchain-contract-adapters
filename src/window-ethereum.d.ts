interface Window {
  ethereum?: {
    // value that is populated and returns true by the Coinbase Wallet mobile dapp browser
    isCoinbaseWallet?: true
    isMetaMask?: true
    isOkxWallet?: true
    isBitKeep?: true
    autoRefreshOnNetworkChange?: boolean
    isBraveWallet?: true
  }
  okxwallet?: {
    isOkxWallet?: true
  }
  bitkeep?: {
    ethereum: {
      isBitKeep?: true
    }
  }
  dataLayer: []
  gtag: (...args: [string, ...unknown[]]) => void
  twq: (...args: unknown[]) => void
}
