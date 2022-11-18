import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

interface SaveScreenshotOptions {
  saveDir: string,   // Folder where screenshots will be saved
  dataUrl: string,   // Data URL encoded image data
  imgWidth: number,  // Width of overall image
  imgHeight: number, // Height of overall image
  adRect: DOMRect    // Bounding rect of ad in the image
};

/**
 * Saves ad screenshot data as a WebP file on disk.
 * Returns the path to the screenshot if successful, otherwise throws an error.
 */
export default async function saveScreenshot(options: SaveScreenshotOptions) {
  // Validate dimensions of screenshot
  if (options.imgWidth <= 0 || options.imgHeight <= 0) {
    throw new Error('Bad screenshot, overall width or height is zero');
  }

  let rect = {
    width: Math.round(options.adRect.width),
    height: Math.round(options.adRect.height),
    left: Math.floor(options.adRect.x),
    top: Math.floor(options.adRect.y)
  };

  if (rect.width <= 0 || rect.height <= 0) {
    throw new Error('Bad screenshot, ad rect width or height is zero');
  }

  // Make sure cropping dimensions are within the bounds of the image
  if (rect.left < 0) {
    rect.left = 0;
  }
  if (rect.top < 0) {
    rect.top = 0;
  }
  if (rect.width > options.imgWidth - rect.left) {
    rect.width = options.imgWidth - rect.left;
  }
  if (rect.height > options.imgHeight - rect.top) {
    rect.height = options.imgHeight - rect.top;
  }
  try {
    const screenshotFileName = uuidv4() + '.webp';
    const screenshotPath = path.join(options.saveDir, screenshotFileName);

    // Save screenshot as WebP image
    const b64Image = Buffer.from(
      options.dataUrl.substring('data:image/jpeg;base64,'.length),
      'base64');

    await sharp(b64Image)
      // Resize image, in case device pixels are different from the CSS pixels
      // used to specify the bounding box
      .resize({
        width: options.imgWidth,
        height: options.imgHeight
      })
      // Crop screenshot to just the ad
      .extract(rect)
      // Store in lossless WebP format for smallest file size
      .webp({ lossless: true })
      .toFile(screenshotPath);

    return screenshotPath;
  } catch (e) {
    throw e;
  }
}