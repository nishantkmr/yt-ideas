import {Img, staticFile} from 'remotion';

type GuessPictureProps = {
  alt: string;
  asset: string;
  silhouette?: boolean;
};

export const GuessPicture: React.FC<GuessPictureProps> = ({
  alt,
  asset,
  silhouette = false,
}) => (
  <figure className={`picture-prompt ${silhouette ? 'picture-prompt--silhouette' : ''}`.trim()}>
    <div className="picture-burst" />
    <Img alt={alt} className="picture-animal" src={staticFile(asset)} />
  </figure>
);
