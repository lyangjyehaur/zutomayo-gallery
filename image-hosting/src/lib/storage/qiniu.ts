import * as qiniu from "qiniu";

export interface QiniuConfig {
  accessKey: string;
  secretKey: string;
  bucket: string;
  domain: string; // The public or custom domain bound to the bucket
  zone?: qiniu.conf.Zone; // e.g., qiniu.zone.Zone_z0
}

export class QiniuStorage {
  private mac: qiniu.auth.digest.Mac;
  private config: qiniu.conf.Config;
  private bucket: string;
  private domain: string;

  constructor(config: QiniuConfig) {
    this.mac = new qiniu.auth.digest.Mac(config.accessKey, config.secretKey);
    this.config = new qiniu.conf.Config();
    if (config.zone) {
      this.config.zone = config.zone;
    }
    this.bucket = config.bucket;
    this.domain = config.domain.endsWith("/")
      ? config.domain.slice(0, -1)
      : config.domain;
  }

  /**
   * Generates an upload token. Can be used for client-side uploads.
   */
  getUploadToken(key?: string, expiresIn = 3600): string {
    const options: qiniu.rs.PutPolicyOptions = {
      scope: key ? `${this.bucket}:${key}` : this.bucket,
      expires: expiresIn,
    };
    const putPolicy = new qiniu.rs.PutPolicy(options);
    return putPolicy.uploadToken(this.mac);
  }

  /**
   * Uploads a file buffer or stream.
   */
  async upload(
    key: string,
    body: Buffer | NodeJS.ReadableStream,
  ): Promise<string> {
    const uploadToken = this.getUploadToken(key);
    const formUploader = new qiniu.form_up.FormUploader(this.config);
    const putExtra = new qiniu.form_up.PutExtra();

    return new Promise((resolve, reject) => {
      if (Buffer.isBuffer(body)) {
        formUploader.put(
          uploadToken,
          key,
          body,
          putExtra,
          (err, respBody, respInfo) => {
            if (err) {
              return reject(err);
            }
            if (respInfo.statusCode === 200) {
              resolve(`${this.domain}/${key}`);
            } else {
              reject(
                new Error(
                  `Qiniu upload failed: ${respInfo.statusCode} ${JSON.stringify(respBody)}`,
                ),
              );
            }
          },
        );
      } else {
        formUploader.putStream(
          uploadToken,
          key,
          body,
          putExtra,
          (err, respBody, respInfo) => {
            if (err) {
              return reject(err);
            }
            if (respInfo.statusCode === 200) {
              resolve(`${this.domain}/${key}`);
            } else {
              reject(
                new Error(
                  `Qiniu upload failed: ${respInfo.statusCode} ${JSON.stringify(respBody)}`,
                ),
              );
            }
          },
        );
      }
    });
  }

  /**
   * Deletes a file from the bucket.
   */
  async delete(key: string): Promise<void> {
    const bucketManager = new qiniu.rs.BucketManager(this.mac, this.config);
    return new Promise((resolve, reject) => {
      bucketManager.delete(this.bucket, key, (err, respBody, respInfo) => {
        if (err) {
          return reject(err);
        }
        if (respInfo.statusCode === 200 || respInfo.statusCode === 612) {
          // 200 Success, 612 File not found (already deleted)
          resolve();
        } else {
          reject(
            new Error(
              `Qiniu delete failed: ${respInfo.statusCode} ${JSON.stringify(respBody)}`,
            ),
          );
        }
      });
    });
  }
}
