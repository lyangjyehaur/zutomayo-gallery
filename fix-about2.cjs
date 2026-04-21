const fs = require('fs');

let content = fs.readFileSync('frontend/src/App.tsx', 'utf-8');

content = content.replace(
  /後來慢慢發現純靜態網頁已經跟不上需求了，於是在各路 AI 的「物理外掛」下開始 React 工程化。雖然現在流行 vibe coding，但畢竟自帶一點代碼功底，而且本身對 UI\/UX 還是有些執念的。於是自己兼任 PM，在保證基本瀏覽體驗的同時瘋狂打磨細節。畢竟我不是專業的網頁設計師，在風格挑選上真的糾結了很久，最終才確定使用與 ZUTOMAYO 視覺風格很搭的 Neobrutalism；大到整體的實現、畫廊佈局到 Lightbox 燈箱的細節，小到每個按鈕偏移的像素，光是為了適配調試電腦和手機的不同顯示寬度，佈局就反反覆覆改了好幾版。/g,
  '{t("app.about_p4", "後來慢慢發現純靜態網頁已經跟不上需求了，於是在各路 AI 的「物理外掛」下開始 React 工程化。雖然現在流行 vibe coding，但畢竟自帶一點代碼功底，而且本身對 UI/UX 還是有些執念的。於是自己兼任 PM，在保證基本瀏覽體驗的同時瘋狂打磨細節。畢竟我不是專業的網頁設計師，在風格挑選上真的糾結了很久，最終才確定使用與 ZUTOMAYO 視覺風格很搭的 Neobrutalism；大到整體的實現、畫廊佈局到 Lightbox 燈箱的細節，小到每個按鈕偏移的像素，光是為了適配調試電腦和手機的不同顯示寬度，佈局就反反覆覆改了好幾版。")}'
);

fs.writeFileSync('frontend/src/App.tsx', content);
