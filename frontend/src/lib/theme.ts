export const MODAL_THEME = {
  overlay: {
    // 反饋側邊欄：全平台半透明黑 + 輕微毛玻璃
    drawer: "bg-black/60 backdrop-blur-[2px]",
    // 碎碎念與 MV 彈窗：手機端跟隨主題背景的毛玻璃，電腦端半透明黑 + 輕微毛玻璃
    dialog: "max-md:bg-background/75 max-md:backdrop-blur-md md:bg-black/60 md:backdrop-blur-[2px]",
  },
  content: {
    // 反饋側邊欄本體：帶微透明度的背景 + 毛玻璃
    drawer: "bg-background/75 backdrop-blur-md",
    // 碎碎念與 MV 彈窗本體：加入半透明背景 + 毛玻璃
    dialog: "bg-background/75 backdrop-blur-md",
  },
  // 共用的 CRT 掃描線背景層
  crt: "absolute inset-0 pointer-events-none crt-lines z-0 opacity-100",
};