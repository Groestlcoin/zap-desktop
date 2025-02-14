import Dexie from 'dexie'
import decode from 'lndconnect/decode'
import encode from 'lndconnect/encode'
import getDbName from '@zap/utils/db'
import config from 'config'

/**
 * initDb - Initialise the database and make it globally accessible.
 *
 * @returns {Promise} Resolves once database connection is open
 */
export const initDb = () => {
  const { namespace, domain } = config.db
  const { NODE_ENV: environment } = process.env
  const dbName = getDbName({
    namespace,
    domain,
    environment,
  })
  window.db = getDb(dbName)
  return window.db.open()
}

/**
 * getDb - Define the database.
 *
 * @param {string} name Database name
 * @returns {object} Dexie database schema
 */
export const getDb = name => {
  const db = new Dexie(name)

  // Initial database schema.
  db.version(1).stores({
    settings: 'key',
    wallets: '++id, type, chain, network',
    nodes: 'id',
  })

  // Migrate custom wallets to lndconnect.
  db.version(2).upgrade(tx =>
    tx.wallets.toCollection().modify((wallet, ref) => {
      // All configs are now stored as an lndconnect uri.
      wallet.decoder = 'lnd.lndconnect.v1'

      // Convert old connection props to lndconnect uri.
      if (['custom', 'btcpayserver'].includes(wallet.type)) {
        try {
          const { host, cert, macaroon } = wallet
          const lndconnectUri = encode({ host, cert, macaroon })
          wallet.type = 'custom'
          wallet.lndconnectUri = lndconnectUri
        } catch (e) {
          // There was a problem migrating this wallet config.
          // There isn't a way for us to recover from this, so delete the wallet config to ensure that we don't end up
          // with invalid configs in the database.
          //
          // See https://dexie.org/docs/Collection/Collection.modify()#sample-deleting-object
          delete ref.value
        }
      }

      // Remove old props.
      delete wallet.host
      delete wallet.cert
      delete wallet.macaroon
      delete wallet.string
    })
  )

  // ADd autopay table.
  db.version(3).stores({
    autopay: 'id',
  })

  // Convert old settings to new config overrides
  db.version(4).upgrade(async tx => {
    const configMap = [
      {
        settingsKey: 'theme',
        settingsPath: 'value',
        configPath: 'theme',
      },
      {
        settingsKey: 'locale',
        settingsPath: 'value',
        configPath: 'locale',
      },
      {
        settingsKey: 'fiatTicker',
        settingsPath: 'value',
        configPath: 'currency',
      },
      {
        settingsKey: 'channelViewMode',
        settingsPath: 'value',
        configPath: 'channels.viewMode',
        configMutator: value => {
          switch (value) {
            case 'CHANNEL_LIST_VIEW_MODE_SUMMARY':
              return 'summary'
            case 'CHANNEL_LIST_VIEW_MODE_CARD':
              return 'card'
            default:
              return
          }
        },
      },
      {
        settingsKey: 'chain.',
        settingsPath: 'value.unit',
        configPath: 'units.bitcoin',
      },
      {
        settingsKey: 'chain.litecoin',
        settingsPath: 'value.unit',
        configPath: 'units.litecoin',
      },
      {
        settingsKey: 'chain.groestlcoin',
        settingsPath: 'value.unit',
        configPath: 'units.groestlcoin',
      },
    ]
    const newConfig = {}
    await tx.settings.toCollection().modify((setting, ref) => {
      const c = configMap.find(c => c.settingsKey === setting.key)
      if (c) {
        try {
          const defaultValue = Dexie.getByKeyPath(config, c.configPath)
          let value = Dexie.getByKeyPath(setting, c.settingsPath)
          // Apply value mapper if there is one.
          if (c.configMutator) {
            value = c.configMutator(value)
          }
          // If the value differes from the default, save it into the config.
          if (value && value !== defaultValue) {
            Dexie.setByKeyPath(newConfig, c.configPath, value)
          }
          // Finally, delete the old setting.
          delete ref.value
        } catch (e) {
          // If there was a problem migrating the old setting just delete the setting altogether.
          delete ref.value
        }
      }
    })
    // Save the migrated config overrides.
    await tx.settings.put({ key: 'config', value: newConfig })
  })

  /**
   * @class Wallet
   * Wallet helper class.
   */
  const Wallet = db.wallets.defineClass({
    id: Number,
    type: String,
    network: String,
    chain: String,
    decoder: String,
    lndconnectUri: String,
    name: String,
    alias: String,
    autopilot: Boolean,
    autopilotMaxchannels: Number,
    autopilotAllocation: Number,
    autopilotMinchansize: Number,
    autopilotMaxchansize: Number,
    autopilotPrivate: Boolean,
    autopilotMinconfs: Number,
    backup: Object,
  })

  // Strip out all unknown properties on create.
  db.wallets.hook('creating', function(primKey, obj) {
    Object.keys(obj).forEach(key => {
      if (!Object.keys(db.wallets.schema.instanceTemplate).includes(key)) {
        delete obj[key]
      }
    })
  })

  // Strip out all unknown properties on update.
  db.wallets.hook('updating', function(modifications, primKey, obj) {
    return Object.keys({ ...obj, ...modifications }).reduce((acc, cur) => {
      const isValidKey = Object.keys(db.wallets.schema.instanceTemplate).includes(cur)
      const isInMods = Object.keys(modifications).includes(cur)
      let newVal = isInMods ? modifications[cur] : obj[cur]
      return {
        ...acc,
        [cur]: isValidKey ? newVal : undefined,
      }
    }, {})
  })

  // Inject `wallet` property.
  db.wallets.hook('reading', function(obj) {
    obj.wallet = `wallet-${obj.id}`
    return obj
  })

  // Set up getters for host, cert, and macaroon.
  const props = ['host', 'cert', 'macaroon']
  props.forEach(prop => {
    Object.defineProperty(Wallet.prototype, prop, {
      enumerable: true,
      get: function() {
        if (this.decoder === 'lnd.lndconnect.v1' && this.lndconnectUri) {
          const data = decode(this.lndconnectUri)
          return data[prop]
        }
        return
      },
    })
  })

  /**
   * @class Node
   * Node helper class.
   */
  const Node = db.nodes.defineClass({
    id: String,
    hasSynced: Boolean,
    addresses: Object,
  })

  /**
   * getCurrentAddress - Get current address of a given type.
   *
   * @param  {string} type type of address to fetch.
   * @returns {string} current address of requested type, if one exists.
   */
  Node.prototype.getCurrentAddress = function(type) {
    return Dexie.getByKeyPath(this, `addresses.${type}`)
  }

  /**
   * setCurrentAddress - Set current address of a given type.
   *
   * @param  {string} type type of address to save.
   * @param  {string} address address to save.
   * @returns {Node} updated node instance.
   */
  Node.prototype.setCurrentAddress = function(type, address) {
    Dexie.setByKeyPath(this, `addresses.${type}`, address)
    return db.nodes.put(this)
  }

  return db
}
