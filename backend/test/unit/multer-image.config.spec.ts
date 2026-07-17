import { BadRequestException } from '@nestjs/common';
import {
  imageFilter,
  MAX_IMAGE_SIZE_BYTES,
  MAX_MULTIPART_FIELDS,
  MAX_MULTIPART_FIELD_SIZE_BYTES,
  memOpts,
  providerImagesOpts,
  trustValidationImagesOpts,
} from '../../src/common/multer-image.config.js';

describe('multer image config', () => {
  const file = (originalname: string, mimetype: string): Express.Multer.File =>
    ({
      originalname,
      mimetype,
    }) as Express.Multer.File;

  it.each([
    ['single image', memOpts, 1],
    ['provider images', providerImagesOpts, 4],
    ['trust validation images', trustValidationImagesOpts, 6],
  ])('limits %s uploads in memory', (_label, options, maxFiles) => {
    expect(options.limits).toEqual({
      fileSize: MAX_IMAGE_SIZE_BYTES,
      files: maxFiles,
      fields: MAX_MULTIPART_FIELDS,
      fieldSize: MAX_MULTIPART_FIELD_SIZE_BYTES,
      parts: maxFiles + MAX_MULTIPART_FIELDS,
    });
    expect(options.fileFilter).toBe(imageFilter);
  });

  it('accepts a supported image', () => {
    const callback = jest.fn();

    imageFilter({}, file('photo.jpg', 'image/jpeg'), callback);

    expect(callback).toHaveBeenCalledWith(null, true);
  });

  it('rejects a non-image MIME type', () => {
    const callback = jest.fn();

    imageFilter({}, file('payload.jpg', 'application/octet-stream'), callback);

    expect(callback.mock.calls[0][0]).toBeInstanceOf(BadRequestException);
    expect(callback.mock.calls[0][1]).toBe(false);
  });

  it('rejects an unsupported extension', () => {
    const callback = jest.fn();

    imageFilter({}, file('payload.svg', 'image/svg+xml'), callback);

    expect(callback.mock.calls[0][0]).toBeInstanceOf(BadRequestException);
    expect(callback.mock.calls[0][1]).toBe(false);
  });
});
