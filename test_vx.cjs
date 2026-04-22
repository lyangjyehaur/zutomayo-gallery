const fetch = require('node-fetch');
fetch('https://api.vxtwitter.com/Twitter/status/1744652256421462294')
  .then(r => r.json())
  .then(data => console.log(Object.keys(data), data.user_profile_image_url));
