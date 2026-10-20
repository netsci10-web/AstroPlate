/**
 * Coordinate mathematics for celestial mechanics & Astrometry plate-solving
 */

// Convert RA in degrees (0..360) to Hours, Minutes, Seconds string
export function degToRA_HMS(deg: number): string {
  let normalized = deg % 360;
  if (normalized < 0) normalized += 360;
  const totalHours = normalized / 15;
  const h = Math.floor(totalHours);
  const totalMinutes = (totalHours - h) * 60;
  const m = Math.floor(totalMinutes);
  const s = ((totalMinutes - m) * 60).toFixed(2);

  const pad = (n: number) => n.toString().padStart(2, '0');
  const padSec = parseFloat(s) < 10 ? '0' + s : s;
  return `${pad(h)}h ${pad(m)}m ${padSec}s`;
}

// Convert Dec in degrees (-90..+90) to Degrees, Arcminutes, Arcseconds string
export function degToDec_DMS(deg: number): string {
  const sign = deg >= 0 ? '+' : '-';
  const abs = Math.abs(deg);
  const d = Math.floor(abs);
  const totalMinutes = (abs - d) * 60;
  const m = Math.floor(totalMinutes);
  const s = ((totalMinutes - m) * 60).toFixed(1);

  const pad = (n: number) => n.toString().padStart(2, '0');
  const padSec = parseFloat(s) < 10 ? '0' + s : s;
  return `${sign}${pad(d)}° ${pad(m)}' ${padSec}"`;
}

// Format angular scale in arcseconds or degrees
export function formatAngularSize(deg: number): string {
  if (deg >= 1) {
    return `${deg.toFixed(2)}°`;
  }
  const arcmin = deg * 60;
  if (arcmin >= 1) {
    return `${arcmin.toFixed(1)}'`;
  }
  const arcsec = arcmin * 60;
  return `${arcsec.toFixed(1)}"`;
}

// Calculate angular separation between two coordinates (RA1, Dec1) and (RA2, Dec2) in degrees
export function angularSeparation(
  ra1Deg: number,
  dec1Deg: number,
  ra2Deg: number,
  dec2Deg: number
): number {
  const deg2rad = Math.PI / 180;
  const r1 = ra1Deg * deg2rad;
  const d1 = dec1Deg * deg2rad;
  const r2 = ra2Deg * deg2rad;
  const d2 = dec2Deg * deg2rad;

  const cosD = Math.sin(d1) * Math.sin(d2) + Math.cos(d1) * Math.cos(d2) * Math.cos(r1 - r2);
  const clamped = Math.max(-1, Math.min(1, cosD));
  return (Math.acos(clamped) * 180) / Math.PI;
}

// Compute the 4 sky corners (RA, Dec) of the image field of view using exact TAN projection
export function computeFieldCorners(
  centerRaDeg: number,
  centerDecDeg: number,
  widthArcsec: number,
  heightArcsec: number,
  orientationDeg: number,
  parity: number = 1.0
): { ra: number; dec: number }[] {
  const wPx = 1000;
  const hPx = widthArcsec > 0 ? (1000 * heightArcsec) / widthArcsec : 1000;
  const pixscale = widthArcsec > 0 ? widthArcsec / wPx : 1;

  const pixelCorners = [
    { x: 0, y: 0 },
    { x: wPx, y: 0 },
    { x: wPx, y: hPx },
    { x: 0, y: hPx },
  ];

  return pixelCorners.map((pt) =>
    pixelToSkyCoords(
      pt.x,
      pt.y,
      wPx,
      hPx,
      centerRaDeg,
      centerDecDeg,
      pixscale,
      orientationDeg,
      parity
    )
  );
}

// Convert 2D image pixel coordinates (X, Y) to celestial coordinates (RA, Dec in degrees)
// Matches dstndstn/astrometry.net exact Gnomonic (TAN) WCS & parity convention
export function pixelToSkyCoords(
  pixelX: number,
  pixelY: number,
  imageWidth: number,
  imageHeight: number,
  centerRaDeg: number,
  centerDecDeg: number,
  pixscaleArcsec: number,
  orientationDeg: number,
  parity: number = 1.0
): { ra: number; dec: number } {
  const deg2rad = Math.PI / 180;
  const rad2deg = 180 / Math.PI;
  const rotRad = (orientationDeg || 0) * deg2rad;
  const p = parity || 1.0;

  // Astrometry.net convention: for parity = +1 and orientation = 0,
  // +eta (North) is UP (-y) and +xi (East) is LEFT (-x)
  const uxDeg = (-p * (pixelX - imageWidth / 2) * pixscaleArcsec) / 3600;
  const uyDeg = ((imageHeight / 2 - pixelY) * pixscaleArcsec) / 3600;

  // Rotate from image frame into local tangent plane (xi, eta in degrees)
  const xiDeg = uxDeg * Math.cos(rotRad) - uyDeg * Math.sin(rotRad);
  const etaDeg = uxDeg * Math.sin(rotRad) + uyDeg * Math.cos(rotRad);

  const xi = xiDeg * deg2rad;
  const eta = etaDeg * deg2rad;
  const ra0 = centerRaDeg * deg2rad;
  const dec0 = centerDecDeg * deg2rad;

  const rho = Math.hypot(xi, eta);
  if (rho < 1e-12) {
    return { ra: ((centerRaDeg % 360) + 360) % 360, dec: centerDecDeg };
  }

  const c = Math.atan(rho);
  const sinC = Math.sin(c);
  const cosC = Math.cos(c);

  const dec = Math.asin(cosC * Math.sin(dec0) + (eta * sinC * Math.cos(dec0)) / rho);
  const ra =
    ra0 +
    Math.atan2(xi * sinC, rho * Math.cos(dec0) * cosC - eta * Math.sin(dec0) * sinC);

  return {
    ra: (((ra * rad2deg) % 360) + 360) % 360,
    dec: Math.max(-90, Math.min(90, dec * rad2deg)),
  };
}


