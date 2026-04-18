import { useState, useEffect } from "react";
import { initGeo } from "@/lib/geo";

interface GeoInfo {
  labelCn: string;
  labelEn: string;
  desc: string;
}

export function useGeoLabel() {
  const [geoInfo, setGeoInfo] = useState<GeoInfo>({
    labelCn: "判斷中...",
    labelEn: "DETECTING...",
    desc: "正在為您偵測最佳的連線節點與資源載入策略..."
  });

  useEffect(() => {
    initGeo().then(info => {
      if (info.isVPN) {
        setGeoInfo({
          labelCn: "躍遷模式",
          labelEn: "WARP",
          desc: "偵測到空間躍遷訊號 🛸！既然您已具備跨越網路結界的能力，圖片資源將直接從 X/YouTube 官方 CDN 載入，就不浪費代理伺服器頻寬啦！"
        });
      } else {
        setGeoInfo({
          labelCn: info.isChinaIP ? "境內節點" : "國際邊緣",
          labelEn: info.isChinaIP ? "CN" : "GLOBAL",
          desc: info.isChinaIP 
            ? "偵測到您正位於中國大陸，圖片資源將經由代理伺服器加速，為您提供穩定、流暢的看圖體驗。"
            : "偵測到您位於中國大陸以外地區，圖片資源將直接自官方伺服器 (X/YouTube) 載入，享受物理極限速度！"
        });
      }
    });
  }, []);

  return geoInfo;
}
