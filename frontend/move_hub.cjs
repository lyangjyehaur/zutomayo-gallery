const fs = require('fs');
const content = fs.readFileSync('src/App.tsx', 'utf-8');
const lines = content.split('\n');

const hubStart = lines.findIndex(l => l.includes('右下角懸浮控制面板 (Control Hub)'));
const hubEnd = lines.findIndex((l, i) => i > hubStart && l.includes('反饋側邊欄 遮罩 (Overlay)')) - 2; // -2 to exclude empty lines

const hubLines = lines.slice(hubStart - 1, hubEnd + 1);
let newLines = lines.filter((_, i) => i < hubStart - 1 || i > hubEnd);

// Wrap hubLines in our absolute/sticky wrapper
const wrappedHub = [
  '        {/* 右下角懸浮控制面板 (Control Hub) */}',
  '        <div className="absolute right-0 md:-right-6 bottom-0 top-0 pointer-events-none z-50 w-24">',
  '          <div className="sticky bottom-6 flex flex-col items-end -space-y-[2px] pointer-events-auto pr-4 md:pr-0">',
  ...hubLines.slice(2).map(l => {
     if(l.includes('className="fixed bottom-6 right-6 flex flex-col -space-y-[2px]"')) return '';
     return '  ' + l; // indent
  }),
  '        </div>'
];

const mainEndIndex = newLines.findIndex(l => l.includes('</main>'));
newLines.splice(mainEndIndex, 0, ...wrappedHub);

fs.writeFileSync('src/App.tsx', newLines.join('\n'));
