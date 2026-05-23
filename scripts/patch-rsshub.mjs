import fs from "node:fs";

const files = fs.readdirSync("/app/dist").filter(f => f.startsWith("utils-") && f.endsWith(".mjs"));
let targetFile = null;
for (const f of files) {
  const c = fs.readFileSync("/app/dist/" + f, "utf-8");
  if (c.includes("p.fetch")) { targetFile = "/app/dist/" + f; break; }
}

if (!targetFile) { console.error("p.fetch not found"); process.exit(1); }

let code = fs.readFileSync(targetFile, "utf-8");

if (code.includes('method:"POST"')) { console.log("Already patched"); process.exit(0); }

// Simplest possible change: just add method:"POST" before headers
const oldStr = 'p.fetch(l,{headers:';
const newStr = 'p.fetch(l,{method:"POST",headers:';

if (!code.includes(oldStr)) { console.error("Pattern not found"); process.exit(1); }

code = code.replace(oldStr, newStr);
fs.writeFileSync(targetFile, code, "utf-8");
console.log("Patched: GET -> POST");
