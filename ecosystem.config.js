module.exports = {
  apps: [
    {
      name: 'slack-ai-agent',
      script: 'dist/app.js', // Run the compiled JS file
      // No more 'ts-node' or 'args' needed here
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};