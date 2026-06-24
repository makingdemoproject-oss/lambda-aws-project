module.exports = {
  apps: [{
    name: 'rbac-service',
    script: 'src/server.js',
    exec_mode: 'cluster',
    instances: process.env.PM2_INSTANCES || 'max',
    max_memory_restart: '600M',
    kill_timeout: 8000,
    wait_ready: true,
    env_production: { NODE_ENV: 'production' },
    error_file: '/dev/stderr',
    out_file: '/dev/stdout',
    time: true,
  }],
};
