import re

with open('frontend/src/tailwind.css', 'r') as f:
    content = f.read()

# Delete old unused classes
content = re.sub(r'/\* 標題科技風掃描特效 \(Cyber Scan\) \*/\s*\.ztmy-cyber-title \{.*?\n  \}', '', content, flags=re.DOTALL)
content = re.sub(r'/\* 加上CRT螢幕閃爍層 \*/\s*\.ztmy-cyber-title::before \{.*?\n  \}', '', content, flags=re.DOTALL)
content = re.sub(r'/\* 第一條掃描線 \(快\) 改為獨立類，避免和 crt 衝突 \*/\s*\.ztmy-cyber-title-fast-scan::before \{.*?\n  \}', '', content, flags=re.DOTALL)
content = re.sub(r'/\* 第二條掃描線 \(慢，偶發\) \*/\s*\.ztmy-cyber-title-slow-scan::before \{.*?\n  \}', '', content, flags=re.DOTALL)
content = re.sub(r'/\* 第三條掃描線 \(細小，高頻\) \*/\s*\.ztmy-cyber-title-micro-scan::before \{.*?\n  \}', '', content, flags=re.DOTALL)
content = re.sub(r'@keyframes cyber-scan-fast \{.*?\n  \}', '', content, flags=re.DOTALL)
content = re.sub(r'@keyframes cyber-scan-slow \{.*?\n  \}', '', content, flags=re.DOTALL)
content = re.sub(r'@keyframes cyber-scan-micro \{.*?\n  \}', '', content, flags=re.DOTALL)
content = re.sub(r'\.ztmy-cyber-title::after \{.*?\n  \}', '', content, flags=re.DOTALL)
content = re.sub(r'/\* 內層文字：負責靜態色像差與局部橫向撕裂 \*/\s*\.ztmy-cyber-text \{.*?\n  \}', '', content, flags=re.DOTALL)
content = re.sub(r'/\* 全域文字色像差偶發放大縮小 \*/\s*@keyframes cyber-chromatic-aberration \{.*?\n  \}', '', content, flags=re.DOTALL)
content = re.sub(r'/\* 局部橫向錯位撕裂層 1 \*/\s*\.ztmy-cyber-text::before \{.*?\n  \}', '', content, flags=re.DOTALL)
content = re.sub(r'/\* 局部橫向錯位撕裂層 2 \*/\s*\.ztmy-cyber-text::after \{.*?\n  \}', '', content, flags=re.DOTALL)

# Rename test classes to formal classes
content = content.replace('.ztmy-test-title-crt', '.ztmy-cyber-title-crt')
content = content.replace('.ztmy-test-title-glow', '.ztmy-cyber-title-glow')
content = content.replace('.ztmy-test-text-aberration', '.ztmy-cyber-text-aberration')
content = content.replace('.ztmy-test-title-scan', '.ztmy-cyber-title-scan')
content = content.replace('cyber-chromatic-aberration-test', 'cyber-chromatic-aberration')
content = content.replace('cyber-scan-fast-test', 'cyber-scan-fast')
content = content.replace('cyber-scan-slow-test', 'cyber-scan-slow')
content = content.replace('var(--g-dur-6, 3s)', 'var(--glow-dur, 3s)')
content = content.replace('var(--g-dur-1, 5.1s)', 'var(--aberration-dur, 5.1s)')
content = content.replace('var(--g-dur-2, 4.3s)', 'var(--slice-1-dur, 4.3s)')
content = content.replace('var(--g-dur-3, 6.7s)', 'var(--slice-2-dur, 6.7s)')
content = content.replace('10s', 'var(--crt-scroll-dur, 10s)')

with open('frontend/src/tailwind.css', 'w') as f:
    f.write(content)

