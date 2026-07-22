import { BadRequestException } from '@nestjs/common';
import sharp from 'sharp';
import { MinioService } from '../../src/common/minio.service.js';

describe('MinioService upload security', () => {
  let service: MinioService;
  let putObject: jest.Mock;

  beforeEach(() => {
    putObject = jest.fn().mockResolvedValue(undefined);
    service = new MinioService();
    Object.assign(service as unknown as Record<string, unknown>, {
      client: { putObject },
      bucket: 'private-bucket',
      publicBucket: 'private-bucket',
      r2BaseUrl: 'https://r2.test/private-bucket',
      cdnBaseUrl: null,
    });
  });

  it('auto-orients and strips EXIF before upload', async () => {
    const input = await sharp({
      create: {
        width: 2,
        height: 1,
        channels: 3,
        background: { r: 255, g: 0, b: 0 },
      },
    })
      .jpeg()
      .withMetadata({ orientation: 6 })
      .toBuffer();

    const inputMetadata = await sharp(input).metadata();
    expect(inputMetadata.exif).toBeDefined();
    expect(inputMetadata.orientation).toBe(6);

    const url = await service.uploadFile(
      input,
      'provider.jpeg',
      'providers/gallery',
    );

    const [, objectName, uploaded, size, headers] = putObject.mock.calls[0];
    const outputMetadata = await sharp(uploaded as Buffer).metadata();
    expect(objectName).toMatch(/^providers\/gallery\/.+\.jpeg$/);
    expect(headers).toEqual({ 'Content-Type': 'image/jpeg' });
    expect(size).toBe((uploaded as Buffer).length);
    expect(outputMetadata.width).toBe(1);
    expect(outputMetadata.height).toBe(2);
    expect(outputMetadata.orientation).toBeUndefined();
    expect(outputMetadata.exif).toBeUndefined();
    expect(url).toBe(`https://r2.test/private-bucket/${objectName}`);
  });

  it('uses the decoded format instead of a spoofed extension', async () => {
    const input = await sharp({
      create: {
        width: 2,
        height: 2,
        channels: 4,
        background: { r: 0, g: 128, b: 255, alpha: 0.5 },
      },
    })
      .png()
      .toBuffer();

    await service.uploadFile(input, 'fake.jpg', 'providers/gallery');

    const [, objectName, uploaded, , headers] = putObject.mock.calls[0];
    expect(objectName).toMatch(/^providers\/gallery\/.+\.png$/);
    expect(headers).toEqual({ 'Content-Type': 'image/png' });
    await expect(sharp(uploaded as Buffer).metadata()).resolves.toMatchObject({
      format: 'png',
    });
  });

  it('keeps the public CDN flow with a sanitized original and thumbnail', async () => {
    Object.assign(service as unknown as Record<string, unknown>, {
      publicBucket: 'public-bucket',
      cdnBaseUrl: 'https://img.test',
    });
    const input = await sharp({
      create: {
        width: 8,
        height: 4,
        channels: 3,
        background: { r: 10, g: 20, b: 30 },
      },
    })
      .jpeg()
      .withMetadata({ orientation: 6 })
      .toBuffer();

    const url = await service.uploadFile(
      input,
      'cover.jpg',
      'providers/gallery',
    );

    expect(putObject).toHaveBeenCalledTimes(2);
    const [originalBucket, objectName, original] = putObject.mock.calls[0];
    const [thumbBucket, thumbName, thumb, , thumbHeaders] =
      putObject.mock.calls[1];
    expect(originalBucket).toBe('public-bucket');
    expect(thumbBucket).toBe('public-bucket');
    expect(thumbName).toMatch(/_thumb\.webp$/);
    expect(thumbHeaders).toEqual({ 'Content-Type': 'image/webp' });
    const originalMetadata = await sharp(original as Buffer).metadata();
    expect(originalMetadata).toMatchObject({
      format: 'jpeg',
      width: 4,
      height: 8,
    });
    expect(originalMetadata.orientation).toBeUndefined();
    expect(originalMetadata.exif).toBeUndefined();
    await expect(sharp(thumb as Buffer).metadata()).resolves.toMatchObject({
      format: 'webp',
      width: 4,
      height: 8,
    });
    expect(url).toBe(`https://img.test/${objectName}`);
  });

  it('keeps GIF support while decoding and rewriting the file', async () => {
    const input = Buffer.from(
      'R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==',
      'base64',
    );

    await service.uploadFile(input, 'pixel.gif', 'providers/gallery');

    const [, objectName, uploaded, , headers] = putObject.mock.calls[0];
    expect(objectName).toMatch(/^providers\/gallery\/.+\.gif$/);
    expect(headers).toEqual({ 'Content-Type': 'image/gif' });
    await expect(sharp(uploaded as Buffer).metadata()).resolves.toMatchObject({
      format: 'gif',
    });
  });

  it('rejects fake or corrupted image content before storage', async () => {
    await expect(
      service.uploadFile(
        Buffer.from('<script>alert(1)</script>'),
        'payload.jpg',
        'providers/gallery',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(putObject).not.toHaveBeenCalled();
  });
});
