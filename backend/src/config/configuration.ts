export default () => ({
  // Server Configuration
  port: parseInt(process.env.PORT, 10) || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigins: process.env.CORS_ORIGINS || 'http://localhost:3000',

  // Database Configuration
  database: {
    url: process.env.DATABASE_URL,
    type: process.env.DB_TYPE || 'sqlite',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    database: process.env.DB_NAME || 'domalend',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    synchronize: process.env.NODE_ENV !== 'production',
    logging: process.env.NODE_ENV === 'development',
  },

  // Blockchain Configuration
  blockchain: {
    rpcUrl: process.env.DOMA_RPC_URL || 'https://rpc-testnet.doma.xyz',
    chainId: parseInt(process.env.CHAIN_ID, 10) || 97476,
    privateKey: process.env.SCORING_SERVICE_PRIVATE_KEY || process.env.PRIVATE_KEY,
    aiOracleAddress: process.env.AI_ORACLE_ADDRESS,
    domaLendAddress: process.env.DOMALEND_ADDRESS,
    domaOwnershipToken: process.env.DOMA_OWNERSHIP_TOKEN,
  },

  // External APIs Configuration
  externalApis: {
    domaSubgraph: process.env.DOMA_SUBGRAPH_URL || 'https://api-testnet.doma.xyz/graphql',
    ahrefs: {
      apiKey: process.env.AHREFS_API_KEY,
      baseUrl: 'https://apiv2.ahrefs.com/v3',
    },
    semrush: {
      apiKey: process.env.SEMRUSH_API_KEY,
      baseUrl: 'https://api.semrush.com',
    },
    similarweb: {
      apiKey: process.env.SIMILARWEB_API_KEY,
      baseUrl: 'https://api.similarweb.com/v1',
    },
  },

  // Scoring Configuration
  scoring: {
    cacheTimeout: parseInt(process.env.SCORE_CACHE_TIMEOUT, 10) || 3600, // 1 hour
    batchSize: parseInt(process.env.BATCH_SIZE, 10) || 10,
    maxRetries: parseInt(process.env.MAX_RETRIES, 10) || 3,
    weights: {
      age: 2000,      // 20%
      length: 1000,   // 10%
      extension: 1500, // 15%
      keyword: 2500,  // 25%
      traffic: 2000,  // 20%
      market: 500,    // 5%
      doma: 500,      // 5%
    },
  },

  // Security & Rate Limiting
  security: {
    jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS, 10) || 12,
    rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW, 10) || 60000, // 1 minute
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
  },

  // Liquidation Configuration
  liquidation: {
    checkIntervalMs: parseInt(process.env.LIQUIDATION_CHECK_INTERVAL_MS, 10) || 30000, // 30 seconds
    enabled: process.env.LIQUIDATION_ENABLED !== 'false', // Enabled by default
  },

  // Ponder Integration Configuration
  ponder: {
    graphqlUrl: process.env.PONDER_GRAPHQL_URL || 'http://localhost:42069',
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'combined',
    file: process.env.LOG_FILE,
  },
});