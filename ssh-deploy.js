const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const conn = new Client();
const envContent = fs.readFileSync(path.join(__dirname, 'api', '.env'), 'utf8');

conn.on('ready', () => {
  console.log('Client :: ready');
  
  // The commands to run on Hostinger
  const script = `
    cd public_html/cms
    unzip -o Hostinger-Deploy.zip
    
    echo "Writing .env file..."
    cat << 'EOF' > api/.env
${envContent}
EOF

    echo "Running npm install in root..."
    npm install
    
    echo "Running npm install in api..."
    cd api
    npm install
    cd ..
    
    echo "Starting server with pm2..."
    npx pm2 restart brandex-cms || npx pm2 start server.js --name brandex-cms
  `;

  conn.exec(script, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
      conn.end();
    }).on('data', (data) => {
      process.stdout.write(data);
    }).stderr.on('data', (data) => {
      process.stderr.write(data);
    });
  });
}).connect({
  host: '82.29.199.70',
  port: 65002,
  username: 'u472671597',
  password: 'BrandexCMS!2026'
});
