import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicDomain?: string;
}

export class R2Storage {
  private client: S3Client;
  private bucket: string;
  private publicDomain?: string;

  constructor(config: R2Config) {
    this.client = new S3Client({
      region: "auto",
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
    this.bucket = config.bucket;
    if (config.publicDomain !== undefined) {
      this.publicDomain = config.publicDomain;
    }
  }

  async upload(
    key: string,
    body: Buffer | Uint8Array | string,
    contentType?: string,
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    });

    await this.client.send(command);

    if (this.publicDomain) {
      // Ensure trailing slash is handled correctly
      const baseUrl = this.publicDomain.endsWith("/")
        ? this.publicDomain.slice(0, -1)
        : this.publicDomain;
      return `${baseUrl}/${key}`;
    }

    return key;
  }

  async delete(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    await this.client.send(command);
  }

  async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    return getSignedUrl(this.client, command, { expiresIn });
  }
}
