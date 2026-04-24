import fs from 'fs';
import path from 'path';

const replaceInFile = (filePath: string, replacements: [RegExp | string, string][]) => {
  let content = fs.readFileSync(filePath, 'utf-8');
  let original = content;
  for (const [search, replace] of replacements) {
    content = content.replace(search, replace);
  }
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`Updated ${filePath}`);
  }
};

const frontendDir = path.join(process.cwd(), 'frontend/src');

const walkDir = (dir: string, callback: (filePath: string) => void) => {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      walkDir(dirPath, callback);
    } else {
      if (dirPath.endsWith('.tsx') || dirPath.endsWith('.ts')) {
        callback(dirPath);
      }
    }
  });
};

walkDir(frontendDir, (filePath) => {
  replaceInFile(filePath, [
    // artist -> creators
    [/\bmv\.artist\b/g, 'mv.creators'],
    [/\.map\(\(artist\)/g, '.map((creator)'],
    [/\.includes\(artist\)/g, '.includes(creator.name)'],
    [/artists\.add\(a\)/g, 'artists.add(a.name)'],
    
    // album -> albums
    [/\bmv\.album\b/g, 'mv.albums'],
    [/albums\.add\(a\)/g, 'albums.add(a.name)'],

    // coverImages -> images.filter(img => img.MVImage?.usage === 'cover').map(img => img.url)
    [/\bmv\.coverImages\b/g, "(mv.images?.filter(img => img.MVImage?.usage === 'cover').map(img => img.url) || [])"],

    // keywords text -> name
    [/\bmv\.keywords\.some\(\(k\)/g, 'mv.keywords.some((k)'],
    [/\.includes\((typeof k === 'string' \? k : k\.text)\.toLowerCase\(\)\)/g, '.includes(k.name.toLowerCase())'],
    [/\(typeof key === 'string' \? key : key\.text\)/g, 'key.name'],
    [/typeof keyword === 'string' \? keyword : keyword\.text/g, 'keyword.name'],
    [/k\.text/g, 'k.name'],

    // image mapping
    [/\bimg\.tweetUrl\b/g, 'img.fanart_meta?.tweet_url'],
    [/\bimg\.tweetText\b/g, 'img.fanart_meta?.tweet_text'],
    [/\bimg\.tweetAuthor\b/g, 'img.fanart_meta?.tweet_author'],
    [/\bimg\.tweetHandle\b/g, 'img.fanart_meta?.tweet_handle'],
    [/\bimg\.tweetDate\b/g, 'img.fanart_meta?.tweet_date'],
    [/\bimg\.thumbnail\b/g, 'img.thumbnail_url'],
  ]);
});
