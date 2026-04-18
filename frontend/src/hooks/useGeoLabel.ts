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
          labelEn: "WARP_DRIVE",
          desc: "偵測到空間躍遷訊號 🛸！既然您已具備跨越網路結界的能力，系統已自動為您解除代理限制。圖片將直接從海外官方 CDN 載入，絕不浪費一滴伺服器頻寬！"
        });
      } else {
        setGeoInfo({
          labelCn: info.isChinaIP ? "境內節點" : "國際邊緣",
          labelEn: info.isChinaIP ? "CN_NODE" : "GLOBAL_EDGE",
          desc: info.isChinaIP 
            ? "偵測到您正處於境內網路，已自動切換至「香港直連專線」。圖片資源將經由 ZTMY 專屬代理伺服器加速，為您提供穩定、流暢的看圖體驗。"
            : "偵測到您位於海外地區，已為您分配「全球邊緣節點」。圖片資源將直接自官方伺服器 (Twitter/YouTube) 載入，享受物理極限速度！"
        });
      }
    });
  }, []);

  return geoInfo;
}
