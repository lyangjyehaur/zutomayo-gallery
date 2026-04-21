import fs from 'fs';

const HeaderInfoLength = 256;
const VectorIndexSize = 8;
const SegmentIndexSize = 14;

export class Ip2Region {
  private buffer: Buffer;

  /**
   * 初始化 XDB 搜尋器
   * @param dbPath xdb 檔案的絕對路徑
   */
  constructor(dbPath: string) {
    if (!fs.existsSync(dbPath)) {
      throw new Error(`[Ip2Region] xdb file not found at: ${dbPath}`);
    }
    // 將整個 XDB 檔案載入到記憶體 (Buffer) 中以提供最高查詢效能 (約 11MB)
    this.buffer = fs.readFileSync(dbPath);
  }

  /**
   * 將 IPv4 字串轉換為無號 32 位元整數
   */
  static ip2long(ip: string): number {
    const parts = ip.split('.');
    if (parts.length !== 4) {
      throw new Error(`[Ip2Region] Invalid IP address format: ${ip}`);
    }
    let val = 0;
    for (let i = 0; i < 4; i++) {
      const shift = 24 - 8 * i;
      val += (parseInt(parts[i], 10) << shift) >>> 0;
    }
    return val >>> 0;
  }

  /**
   * 搜尋 IP 所在的地區資訊
   * @param ip IPv4 字串
   * @returns 格式：國家|區域|省份|城市|ISP，若找不到則回傳 null
   */
  search(ip: string): string | null {
    try {
      const ipInt = Ip2Region.ip2long(ip);

      // 1. 取得 IP 的前兩個 byte，計算出在向量索引區的偏移量
      const il0 = (ipInt >>> 24) & 0xFF;
      const il1 = (ipInt >>> 16) & 0xFF;
      const idx = il0 * 256 + il1;
      const vectorIndexOffset = HeaderInfoLength + idx * VectorIndexSize;

      // 2. 從向量索引區取得該網段在資料區的「開始指標」與「結束指標」 (Little-Endian)
      const startPtr = this.buffer.readUInt32LE(vectorIndexOffset);
      const endPtr = this.buffer.readUInt32LE(vectorIndexOffset + 4);

      let dataLen = 0;
      let dataPtr = 0;

      // 3. 在該區間內使用二分搜尋法尋找對應的 Segment Index
      let l = 0;
      let h = Math.floor((endPtr - startPtr) / SegmentIndexSize);

      while (l <= h) {
        const m = (l + h) >> 1;
        const p = startPtr + m * SegmentIndexSize;

        const sip = this.buffer.readUInt32LE(p);
        if (ipInt < sip) {
          h = m - 1;
        } else {
          const eip = this.buffer.readUInt32LE(p + 4);
          if (ipInt > eip) {
            l = m + 1;
          } else {
            // 命中區間：取得資料長度 (2 bytes) 與資料指標 (4 bytes)
            dataLen = this.buffer.readUInt16LE(p + 8);
            dataPtr = this.buffer.readUInt32LE(p + 10);
            break;
          }
        }
      }

      // 4. 若找到對應指標，則從 Buffer 中擷取 UTF-8 字串
      if (dataPtr !== 0) {
        return this.buffer.toString('utf8', dataPtr, dataPtr + dataLen);
      }
    } catch (e) {
      console.error('[Ip2Region] Search error for IP:', ip, e);
    }

    return null;
  }
}
