import twilio from 'twilio';

async function debugTwilio() {
  // Check what credentials are available via connector
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  console.log('Connector hostname:', hostname);
  console.log('Token type:', xReplitToken ? xReplitToken.split(' ')[0] : 'none');

  if (!xReplitToken) {
    console.log('No token found');
    return;
  }

  const response = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=twilio',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  );
  
  const data = await response.json();
  console.log('Connector response:', JSON.stringify(data, null, 2));
  
  const settings = data.items?.[0]?.settings;
  if (settings) {
    console.log('\nCredentials found:');
    console.log('  account_sid:', settings.account_sid ? settings.account_sid.substring(0, 10) + '...' : 'missing');
    console.log('  api_key:', settings.api_key ? settings.api_key.substring(0, 10) + '...' : 'missing');
    console.log('  api_key_secret:', settings.api_key_secret ? 'present' : 'missing');
    console.log('  phone_number:', settings.phone_number);
  }
}

debugTwilio();
