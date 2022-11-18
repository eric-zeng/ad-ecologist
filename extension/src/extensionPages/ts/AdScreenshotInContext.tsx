import React from 'react';

// Programmatically create an <img> element with the given url.
async function getImage(dataUrl: string) {
  const img = document.createElement('img');
  img.src = dataUrl;
  await new Promise(resolve => img.onload = resolve);
  return img;
}

interface AdScreenshotInContextProps {
  width: number,
  height: number,
  screenshot: string,
  rect: DOMRect,
  pixelRatio: number,
  style?: React.CSSProperties
}

/**
 * React component used to render an image of an ad with its surrounding
 * context, by shading the area outside of the ad, and drawing a border around
 * the ad.
 */
export default class AdScreenshotInContext extends React.Component<AdScreenshotInContextProps, {}> {
  private canvasRef: React.RefObject<HTMLCanvasElement>;

  constructor(props: AdScreenshotInContextProps) {
    super(props);
    this.canvasRef = React.createRef();
  }

  async componentDidMount() {
    this.renderScreenshot()
  }

  async componentDidUpdate(prevProps: AdScreenshotInContextProps) {
    // If the props change, re-render the canvas.
    if (this.props.rect.x !== prevProps.rect.x ||
        this.props.rect.y !== prevProps.rect.y ||
        this.props.screenshot !== prevProps.screenshot) {
      this.renderScreenshot();
    }
  }

  /**
   * Render the image, the shading, and the borders, by drawing on a <canvas>.
   * Must manually call this method again if the screenshot data changes, since
   * this is not part of the standard React render pipeline.
   */
  async renderScreenshot() {
    const canvas = this.canvasRef.current;
    if (!canvas) {
      console.log('Canvas element doesn\'t exist')
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.log('Failed to get canvas context');
      return;
    }

    ctx.clearRect(0, 0, this.props.rect.width, this.props.rect.height);

    const img = await getImage(this.props.screenshot);
    ctx.drawImage(
      img,
      this.props.rect.left * this.props.pixelRatio,
      this.props.rect.top * this.props.pixelRatio,
      this.props.rect.width * this.props.pixelRatio,
      this.props.rect.height * this.props.pixelRatio,
      0,
      0,
      this.props.rect.width,
      this.props.rect.height
      );

  }

  render() {
    return (
      <div className="screenshot">
        <canvas
          style={this.props.style}
          ref={this.canvasRef}
          width={this.props.rect.width}
          height={this.props.rect.height}>
        </canvas>
      </div>
    );
  }
}