import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import probe from 'probe-image-size';
import { MV_DATA } from './assets/js/data';

@Injectable()
export class ImageSyncService implements OnModuleInit {
  private readonly logger = new Logger(ImageSyncService.name);
  
  // 在內存中維護處理過的數據，避免每次 API 請求都重新探測
  private processedData = [...MV_DATA];

  async onModuleInit() {
    // 伺服器啟動後自動執行異步任務，不會阻塞主線程啟動
    this.startBackgroundSync();
  }

  /**
   * 提供給 Controller 調用的方法，返回帶有寬高資訊的數據
   */
  getProcessedMvData() {
    return this.processedData;
  }

  private async startBackgroundSync() {
    this.logger.log('===== [Image Sync Task] 啟動偵測任務 =====');
    let syncCount = 0;

    for (const mv of this.processedData) {
      if (!mv.images || mv.images.length === 0) continue;

      for (const img of mv.images) {
        // 只針對沒有寬高資訊的圖片進行探測
        if (img.width && img.height) continue;

        try {
          // 僅讀取圖片 Header，速度極快
          const result = await probe(img.url, { timeout: 5000 });
          
          img.width = result.width;
          img.height = result.height;
          syncCount++;
          
          this.logger.debug(`[Sync成功] ${mv.title}: 已獲取尺寸 ${result.width}x${result.height}`);
        } catch (error) {
          this.logger.error(`[Sync失敗] 無法獲取 ${img.url} 的尺寸: ${error.message}`);
        }
      }
    }

    this.logger.log(`===== [Image Sync Task] 任務結束。補全了 ${syncCount} 張圖片資訊 =====`);
  }
}