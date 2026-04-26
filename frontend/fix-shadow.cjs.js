const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src', 'App.tsx');
let content = fs.readFileSync(file, 'utf8');

// Replace hover:shadow-none and active:shadow-none
content = content.replace(/hover:shadow-none/g, 'hover:shadow-[0px_0px_0px_0px_var(--border)]');
content = content.replace(/active:shadow-none/g, 'active:shadow-[0px_0px_0px_0px_var(--border)]');

// Replace conditional shadow-none in App.tsx (e.g. "translate-x-[4px] translate-y-[4px] shadow-none")
content = content.replace(/translate-y-\[4px\] shadow-none/g, 'translate-y-[4px] shadow-[0px_0px_0px_0px_var(--border)]');

fs.writeFileSync(file, content);
console.log('App.tsx updated!');
