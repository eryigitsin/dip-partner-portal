// ecosystem.config.js
module.exports = {
    apps: [{
      name: 'dip-partner',
      script: './dist/server/index.js',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        SESSION_SECRET: 'your-secret-key',
        DATABASE_URL: 'postgresql://...'
      }
    }]
  };