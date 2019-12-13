import getPackageDetails from '../utils/getPackageDetails'
import isStableVersion from '../utils/isStableVersion'
// The current stable base version.
// If the current version is in the same range asd this, the default database domain will be used.
const STABLE_VERSION = '0.5.x'

module.exports = {
  // Default debug settings.
  debug: 'zap:main,zap:updater,zap:grpc,lnrpc*',
  debugLevel: 'info',

  // Database settings.
  db: {
    namespace: 'ZapGrsDesktop',
    domain: isStableVersion(getPackageDetails().version, STABLE_VERSION) ? null : 'next',
  },

  theme: 'dark',
  currency: 'USD',
  locale: 'en',

  autoupdate: {
    active: true,
    channel: 'beta',
    interval: 60 * 60 * 1000,
  },

  // Supported chains.
  chains: ['bitcoin', 'litecoin', 'groestlcoin'],

  // Supported networks.
  networks: ['testnet', 'mainnet'],

  // Default chain for new wallets.
  chain: 'groestlcoin',

  // Default network for new wallets.
  network: 'mainnet',

  // Default address format (p2wkh|np2wkh)
  address: 'p2wkh',

  // Default settings for lnd.
  lnd: {
    // Default autopilot settings.
    autopilot: {
      active: false,
      private: true,
      maxchannels: 5,
      minchansize: 20000,
      maxchansize: 16777215,
      allocation: 0.6,
      minconfs: 1,
      heuristics: {
        externalscore: 0.95,
        preferential: 0.05,
      },
    },

    // Default ports.
    // We will search for free ports for lnd to use from these lists (from left to right).
    // To disable an interface, set the host to null.
    rpc: {
      host: 'localhost',
      port: [10009, 10008, 10007, 10006, 10005, 10004, 10003, 10002, 10001],
    },
    rest: {
      host: 'localhost',
      port: [8080, 8081, 8082, 8083, 8084, 8085, 8086, 8087, 8088, 8089],
    },
    p2p: {
      host: '', // disable p2p
      port: [9735, 9734, 9733, 9732, 9731, 9736, 9737, 9738, 9739],
    },

    neutrino: {
      bitcoin: {
        testnet: ['testnet1-btcd.zaphq.io', 'testnet2-btcd.zaphq.io'],
        mainnet: ['mainnet1-btcd.zaphq.io', 'mainnet2-btcd.zaphq.io'],
      },
      litecoin: {
        testnet: [],
        mainnet: [],
      },
      groestlcoin: {
        testnet: ['grsd-testnet.groestlcoin.org'],
        mainnet: ['grsd-mainnet.groestlcoin.org'],
      },
    },

    assumechanvalid: true,
    recoveryWindow: 2500,
  },

  // Default currency units.
  units: {
    bitcoin: 'sats',
    litecoin: 'lits',
    groestlcoin: 'gros',
  },

  // Default block explorer (blockstream|blockcypher|smartbit|insight)
  blockExplorer: 'chainz',
  // Default exchange rate provider (coinbase|bitstamp|kraken|bitfinex)
  rateProvider: 'coingecko',
  // Default invoice settings
  invoices: {
    expire: 3600,
    baseRetryDelay: 1000,
    retryCount: 2, // Number of retries for pay invoice failure
    feeIncrementExponent: 1.1, // Exponent applied to fee limit on payment retry attempts
  },

  autopay: {
    min: '1',
    max: '1500000',
    defaultValue: '150000',
  },

  channels: {
    // Default view mode(card|list)
    viewMode: 'card',
    // JSON feed for suggested nodes list
    suggestedNodes: 'https://groestlcoin.org/suggestedpeers.json',
  },

  // feature flags to enable/disable experimental functionality
  features: {
    autopay: false,
    // enables/disables mainnet lnd autopilot setting selection
    // if false, autopilot selection won't be available
    mainnetAutopilot: false,
    networkSelection: true,
    scbRestore: false,
  },

  // number of onchain confirmations for the specified periods
  // potentially needs multiple chain support (LTC)
  lndTargetConfirmations: {
    fast: 1,
    medium: 6,
    slow: 60,
  },

  backup: {
    filename: 'channels.backup',
    gdrive: {
      redirectUrl:
        'org.groestlcoin.zap-grs:com.googleusercontent.apps.557449694502-187ae583t4s4360nelmc907459rlbiq1',
      clientId: '557449694502-187ae583t4s4360nelmc907459rlbiq1.apps.googleusercontent.com',
      scope: 'https://www.googleapis.com/auth/drive.file',
    },

    dropbox: {
      redirectUrl: 'http://localhost/zapgrsdropbox',
      clientId: 'oll9zvmwgogad91',
    },
  },
}
