fetch('https://api.fxtwitter.com/Twitter/status/1780521360155451631')
  .then(r => r.json())
  .then(data => console.log(Object.keys(data.tweet.author), data.tweet.author.avatar_url))
  .catch(console.error);
