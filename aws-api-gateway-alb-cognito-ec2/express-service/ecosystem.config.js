module.exports = {
  apps: [
    {
      name: 'express-service',
      script: 'index.js',
      instances: 2,          // 2 workers (t3.micro has 2 vCPU)
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      error_file: '/var/log/express-service-error.log',
      out_file: '/var/log/express-service-out.log',
      time: true,
    },
  ],
};
