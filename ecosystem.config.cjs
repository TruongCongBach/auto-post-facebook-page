module.exports = {
  apps: [
    {
      name: 'auto-post-facebook-page',
      script: 'src/index.js',
      cwd: __dirname,
      interpreter: 'node',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      restart_delay: 5000,
      min_uptime: '30s',
      max_restarts: 20,
      time: false,
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      merge_logs: true,
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
