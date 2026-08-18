import fs from "node:fs";
import path from "node:path";

const distDir = process.env.RSSHUB_DIST_DIR || "/app/dist";
const files = fs.readdirSync(distDir).filter((file) => file.endsWith(".mjs"));
const postPattern = /\b[$A-Z_a-z][$\w]*\.fetch\([$A-Z_a-z][$\w]*,\{method:["'`]POST["'`],headers:\{authority:["'`]x\.com["'`]/;
const getPattern = /(\b[$A-Z_a-z][$\w]*\.fetch\([$A-Z_a-z][$\w]*,\{)headers:(\{authority:["'`]x\.com["'`])/;
let patchedFiles = 0;
let alreadyPatched = false;

for (const file of files) {
  const targetFile = path.join(distDir, file);
  const code = fs.readFileSync(targetFile, "utf-8");
  if (!code.includes("Twitter API error")) continue;

  if (postPattern.test(code)) {
    alreadyPatched = true;
    continue;
  }

  if (!getPattern.test(code)) continue;

  const patched = code.replace(getPattern, '$1method:"POST",headers:$2');
  fs.writeFileSync(targetFile, patched, "utf-8");
  patchedFiles += 1;
  console.log(`Patched Twitter GraphQL GET -> POST in ${file}`);
}

if (patchedFiles > 0) process.exit(0);
if (alreadyPatched) {
  console.log("Twitter GraphQL request is already patched");
  process.exit(0);
}

console.error("Twitter GraphQL fetch pattern not found");
process.exit(1);
