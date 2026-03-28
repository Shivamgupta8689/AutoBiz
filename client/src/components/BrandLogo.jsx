import { Link } from 'react-router-dom';

const heights = {
  sm: 'h-7',
  md: 'h-9',
  lg: 'h-11',
  xl: 'h-14',
};

/**
 * AutoBiz wordmark — uses /autobiz-logo.png from public/
 */
export default function BrandLogo({
  to = '/',
  size = 'md',
  className = '',
  imgClassName = '',
}) {
  const h = heights[size] || heights.md;
  const img = (
    <img
      src="/autobiz-logo.png"
      alt="AutoBiz"
      width={280}
      height={64}
      className={`${h} w-auto max-w-[200px] sm:max-w-[220px] object-left object-contain ${imgClassName}`}
      decoding="async"
    />
  );

  if (to === false || to === null) {
    return <span className={`inline-flex items-center ${className}`}>{img}</span>;
  }

  return (
    <Link to={to} className={`inline-flex items-center shrink-0 ${className}`}>
      {img}
    </Link>
  );
}
