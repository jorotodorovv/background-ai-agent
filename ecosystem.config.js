module.exports = {
  apps: [
    {
      name: 'slack-ai-agent',
      script: 'ts-node',
      args: 'src/app.ts',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
