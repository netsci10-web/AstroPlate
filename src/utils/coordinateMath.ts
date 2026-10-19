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

// Compute the 4 sky corners (RA, Dec) of the image field of view
export function computeFieldCorners(
  centerRaDeg: number,
  centerDecDeg: number,
  widthArcsec: number,
  heightArcsec: number,
  orientationDeg: number, // East of North
  parity: number = 1.0
): { ra: number; dec: number }[] {
  const deg2rad = Math.PI / 180;
  const rad2deg = 180 / Math.PI;

  const halfWidthDeg = (widthArcsec / 3600) / 2;
  const halfHeightDeg = (heightArcsec / 3600) / 2;
  const rotRad = orientationDeg * deg2rad;

  // Local pixel offsets from center [-halfW, +halfW]
  const cornersLocal = [
    { x: -halfWidthDeg * parity, y: -halfHeightDeg },
    { x: halfWidthDeg * parity, y: -halfHeightDeg },
    { x: halfWidthDeg * parity, y: halfHeightDeg },
    { x: -halfWidthDeg * parity, y: halfHeightDeg },
  ];

  const cDec = centerDecDeg * deg2rad;
  const cosCDec = Math.cos(cDec);

  return cornersLocal.map((c) => {
    // Rotate by orientation angle
    const rotX = c.x * Math.cos(rotRad) - c.y * Math.sin(rotRad);
    const rotY = c.x * Math.sin(rotRad) + c.y * Math.cos(rotRad);

    // Approximate tangent plane displacement in RA & Dec
    const dDec = rotY;
    const dRa = cosCDec !== 0 ? rotX / cosCDec : rotX;

    let cornerRa = centerRaDeg + dRa;
    let cornerDec = centerDecDeg + dDec;

    if (cornerRa < 0) cornerRa += 360;
    if (cornerRa >= 360) cornerRa -= 360;
    cornerDec = Math.max(-90, Math.min(90, cornerDec));

    return { ra: cornerRa, dec: cornerDec };
  });
}

// Convert 2D image pixel coordinates (X, Y) to celestial coordinates (RA, Dec in degrees)
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
  const rotRad = orientationDeg * deg2rad;

  // Tangent plane displacement from center in degrees
  const dxDeg = ((pixelX - imageWidth / 2) * pixscaleArcsec) / 3600;
  const dyDeg = -((pixelY - imageHeight / 2) * pixscaleArcsec) / 3600; // Inverted image Y

  const localX = dxDeg * parity;
  const localY = dyDeg;

  // Rotate by orientation angle (East of North)
  const rotX = localX * Math.cos(rotRad) - localY * Math.sin(rotRad);
  const rotY = localX * Math.sin(rotRad) + localY * Math.cos(rotRad);

  const cDecRad = centerDecDeg * deg2rad;
  const cosCDec = Math.cos(cDecRad);

  const dDec = rotY;
  const dRa = Math.abs(cosCDec) > 0.0001 ? rotX / cosCDec : rotX;

  let ra = (centerRaDeg + dRa + 360) % 360;
  let dec = Math.max(-90, Math.min(90, centerDecDeg + dDec));

  return { ra, dec };
}

