const fs = require('fs');
const content = fs.readFileSync('src/App.tsx', 'utf-8');
const lines = content.split('\n');

const hubStart = lines.findIndex(l => l.includes('右下角懸浮控制面板 (Control Hub)'));
const hubEnd = lines.findIndex(l => l.includes('</div>') && lines[l+1] && lines[l+1].includes('</main>'));
// Let's be safer and find </main>
const mainEnd = lines.findIndex(l => l.includes('</main>'));
const hubStartIdx = lines.findIndex(l => l.includes('{/* 右下角懸浮控制面板 (Control Hub) */}'));

let newLines = [...lines];
const hubLines = newLines.splice(hubStartIdx, mainEnd - hubStartIdx);
// hubLines includes everything from {/* 右下角懸浮控制面板 to the line before </main>
// Wait, the structure is:
// 994:        </div>
// 995:        </div>
// 996:      </main>
// 997:      </div>

// Let's just do it manually with sed or node
