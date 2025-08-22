module.exports = {
  apps: [
    {
      name: 'slack-ai-agent',
      main: "dist/app.js",
      scripts: {
        build: "tsc",
        start: "node dist/app.js"
      },
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};