const fs = require('fs');
const https = require('https');
const url = 'https://lh3.googleusercontent.com/aida-public/AB6AXuADuPEoMZAmT8C9XhjYpfeJYCfkdjG48MGjZdeCy5mhW10fqOI39EBLnV4cEJWZ_M5dOaFzUyJJg9tea7kiQYi6t-Xx9ymP2GEThk-W0w5HQExyO9ZYUlH-HLAqkrY5_8CYHSiqOYuya4wi9-mTQX0nFrW8os55MKzoOGZri5dNhCDpAHsKJ759e9Z6vfUBKEi95ZGOPp_ja6vY4WMq15ah6pqrmR5vN8-UyEm8YWB4';

https.get(url, res => {
  const chunks = [];
  res.on('data', chunk => chunks.push(chunk));
  res.on('end', () => {
    const buf = Buffer.concat(chunks);
    fs.writeFileSync('public/assets/images/gameplay-avatar.png', buf);
    console.log('Saved gameplay avatar, bytes:', buf.length);
  });
}).on('error', err => {
  console.error(err);
});
