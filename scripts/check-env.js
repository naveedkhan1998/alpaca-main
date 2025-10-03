const fs = require('fs');
const path = require('path');

const ENV_LOCAL_PATH = path.join(__dirname, '..', '.envs', '.env.local');
const ENV_PATH = path.join(__dirname, '..', '.envs', '.env');

function checkEnv() {
  console.log('\n🔍 Checking environment configuration...\n');

  // Check if .env.local exists
  if (!fs.existsSync(ENV_LOCAL_PATH)) {
    console.error('❌ Error: .env.local file not found at .envs/.env.local');
    console.error('   Please create this file with your configuration.');
    process.exit(1);
  }

  // Read .env.local
  const envLocalContent = fs.readFileSync(ENV_LOCAL_PATH, 'utf-8');

  // Check if .env exists, if not create it from .env.local
  if (!fs.existsSync(ENV_PATH)) {
    console.log('📝 Creating .env file from .env.local...');
    fs.copyFileSync(ENV_LOCAL_PATH, ENV_PATH);
    console.log('✅ .env file created\n');
  }

  // Read .env
  const envContent = fs.readFileSync(ENV_PATH, 'utf-8');

  // Check for APCA_API_KEY
  const apicaKeyMatch = envContent.match(/^APCA_API_KEY=(.*)$/m);
  
  if (!apicaKeyMatch) {
    console.error('❌ Error: APCA_API_KEY not found in .env file');
    console.error('   Please add APCA_API_KEY to .envs/.env');
    process.exit(1);
  }

  const apicaKeyValue = apicaKeyMatch[1].trim();

  // Check if it's set to a placeholder value
  if (!apicaKeyValue || apicaKeyValue === 'YOUR_ALPACA_KEY' || apicaKeyValue === '') {
    console.error('❌ Error: APCA_API_KEY is not properly configured');
    console.error('   Current value: ' + (apicaKeyValue || '(empty)'));
    console.error('\n   Please set a valid Alpaca API key in .envs/.env:');
    console.error('   APCA_API_KEY=your_actual_api_key_here\n');
    process.exit(1);
  }

  // Check for APCA_API_SECRET_KEY as well
  const secretKeyMatch = envContent.match(/^APCA_API_SECRET_KEY=(.*)$/m);
  
  if (!secretKeyMatch) {
    console.error('❌ Error: APCA_API_SECRET_KEY not found in .env file');
    console.error('   Please add APCA_API_SECRET_KEY to .envs/.env');
    process.exit(1);
  }

  const secretKeyValue = secretKeyMatch[1].trim();

  if (!secretKeyValue || secretKeyValue === 'YOUR_ALPACA_SECRET_KEY' || secretKeyValue === '') {
    console.error('❌ Error: APCA_API_SECRET_KEY is not properly configured');
    console.error('   Current value: ' + (secretKeyValue || '(empty)'));
    console.error('\n   Please set a valid Alpaca API secret key in .envs/.env:');
    console.error('   APCA_API_SECRET_KEY=your_actual_secret_key_here\n');
    process.exit(1);
  }

  console.log('✅ Environment configuration is valid');
  console.log('   APCA_API_KEY: ****' + apicaKeyValue.slice(-4));
  console.log('   APCA_API_SECRET_KEY: ****' + secretKeyValue.slice(-4));
  console.log('');
}

checkEnv();
