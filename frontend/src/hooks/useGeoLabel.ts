import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { initGeo } from "@/lib/geo";

interface GeoInfo {
  labelCn: string;
  labelEn: string;
  desc: string;
  isChinaIP: boolean;
}

export function useGeoLabel() {
  const { t, i18n } = useTranslation();
  const [geoInfo, setGeoInfo] = useState<GeoInfo>({
    labelCn: t("geo.detecting", "判斷中..."),
    labelEn: "DETECTING...",
    desc: t("geo.detecting_desc", "正在為您偵測最佳的連線節點與資源載入策略..."),
    isChinaIP: false
  });

  useEffect(() => {
    initGeo().then(info => {
      if (info.isVPN) {
        setGeoInfo({
          labelCn: t("geo.warp", "躍遷模式"),
          labelEn: "WARP",
          desc: t("geo.warp_desc", "偵測到空間躍遷訊號 🛸！既然您已具備跨越網路結界的能力，圖片資源將直接從 X/YouTube 官方 CDN 載入，就不浪費代理伺服器頻寬啦！"),
          isChinaIP: info.isChinaIP
        });
      } else {
        setGeoInfo({
          labelCn: info.isChinaIP ? t("geo.cn_node", "境內節點") : t("geo.global_node", "國際邊緣"),
          labelEn: info.isChinaIP ? "CN" : "GLOBAL",
          desc: info.isChinaIP 
            ? t("geo.cn_desc", "偵測到您正位於中國大陸，圖片資源將經由代理伺服器加速，為您提供穩定、流暢的看圖體驗。")
            : t("geo.global_desc", "偵測到您位於中國大陸以外地區，圖片資源將直接自官方伺服器 (X/YouTube) 載入，享受物理極限速度！"),
          isChinaIP: info.isChinaIP
        });
      }
    });
  }, [t, i18n.language]);

  return geoInfo;
}
