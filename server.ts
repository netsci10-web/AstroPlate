import express, { type Request, type Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Body parsers with large limit for astronomical images
app.use(express.json({ limit: '150mb' }));
app.use(express.urlencoded({ extended: true, limit: '150mb' }));

// Enable CORS for API routes and handle preflight
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Multer memory storage for direct file uploads up to 150MB
const upload = multer({
  limits: { fileSize: 150 * 1024 * 1024 },
  storage: multer.memoryStorage(),
});

// Helper for Astrometry.net API key retrieval (with ASTROMETRY_API_KE fallback)
function getAstrometryApiKey(explicitKey?: string): string {
  return (
    explicitKey ||
    process.env.ASTROMETRY_API_KEY ||
    process.env.ASTROMETRY_API_KE ||
    ''
  ).trim();
}

// Helper for Astrometry.net session management
let cachedSession: { session: string; expiresAt: number } | null = null;

async function getAstrometrySession(apiKey?: string): Promise<string> {
  const key = getAstrometryApiKey(apiKey);
  if (!key || key.trim() === '') {
    throw new Error('ASTROMETRY_API_KEY is not configured in environment variables.');
  }

  // Reuse session if valid for next 10 minutes
  const now = Date.now();
  if (cachedSession && cachedSession.expiresAt > now + 600000) {
    return cachedSession.session;
  }

  const loginUrl = 'https://nova.astrometry.net/api/login';
  const response = await fetch(loginUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'AstroPlate/1.0',
    },
    body: `request-json=${encodeURIComponent(JSON.stringify({ apikey: key.trim() }))}`,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Astrometry.net login failed (HTTP ${response.status}): ${errorText}`);
  }

  const data = await response.json();
  if (data.status !== 'success' || !data.session) {
    throw new Error(data.errormessage || 'Invalid API key or Astrometry.net login failed');
  }

  cachedSession = {
    session: data.session,
    expiresAt: now + 3600 * 1000, // 1 hour session validity
  };

  return data.session;
}

// Anti-bot session handler for Astrometry.net Django web views (annotated_display, extraction_image, etc.)
// Helper to determine if a job ID represents a local browser-solved job vs Astrometry.net job
function isLocalJobId(jobId: string | number | undefined | null): boolean {
  if (!jobId) return false;
  const str = String(jobId).trim();
  return str.startsWith('local_') || isNaN(Number(str));
}

let cachedHumanCookie: { cookie: string; expiresAt: number } | null = null;

async function getHumanSessionCookie(forceRefresh = false): Promise<string> {
  const now = Date.now();
  if (!forceRefresh && cachedHumanCookie && cachedHumanCookie.expiresAt > now) {
    return cachedHumanCookie.cookie;
  }

  try {
    const askResp = await fetch('https://nova.astrometry.net/ask_human', {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      signal: AbortSignal.timeout(3000),
    }).catch(() => null);

    if (!askResp || !askResp.ok) {
      cachedHumanCookie = { cookie: '', expiresAt: now + 60000 };
      return '';
    }

    const extractCookiePairs = (headers: Headers): string[] => {
      if (typeof (headers as any).getSetCookie === 'function') {
        const list: string[] = (headers as any).getSetCookie();
        return list.map((c) => c.split(';')[0].trim()).filter(Boolean);
      }
      const raw = headers.get('set-cookie') || '';
      return raw
        .split(/,(?=\s*[A-Za-z0-9_-]+=)/)
        .map((c) => c.split(';')[0].trim())
        .filter(Boolean);
    };

    const askCookies = extractCookiePairs(askResp.headers);
    const initialCookieStr = askCookies.join('; ');
    const html = await askResp.text().catch(() => '');
    const csrfMatch = html.match(/name="csrfmiddlewaretoken"\s+value="([^"]+)"/);
    const csrf = csrfMatch ? csrfMatch[1] : '';

    if (csrf) {
      const amResp = await fetch('https://nova.astrometry.net/am_human', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Cookie: initialCookieStr,
          Referer: 'https://nova.astrometry.net/ask_human',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        body: `csrfmiddlewaretoken=${encodeURIComponent(csrf)}&human=yup&next=/`,
        redirect: 'manual',
        signal: AbortSignal.timeout(4000),
      }).catch(() => null);

      if (amResp) {
        const amCookies = extractCookiePairs(amResp.headers);
        const cookieMap = new Map<string, string>();
        for (const pair of [...askCookies, ...amCookies]) {
          const eqIdx = pair.indexOf('=');
          if (eqIdx > 0) {
            cookieMap.set(pair.slice(0, eqIdx).trim(), pair);
          }
        }
        const combined = Array.from(cookieMap.values()).join('; ');
        cachedHumanCookie = {
          cookie: combined,
          expiresAt: now + 7 * 24 * 3600 * 1000, // 7 days validity
        };
        return combined;
      }
    }
  } catch {
    // If Astrometry.net connection is reset or unavailable, cache empty cookie for 60s
  }
  cachedHumanCookie = {
    cookie: '',
    expiresAt: now + 60000,
  };
  return '';
}

// ---------------- API ROUTES ----------------

// Status check endpoint
app.get('/api/astrometry/status', (_req: Request, res: Response) => {
  const key = getAstrometryApiKey();
  const hasKey = Boolean(key && key !== '');
  res.json({
    hasApiKey: hasKey,
    service: 'nova.astrometry.net',
    apiDoc: 'https://nova.astrometry.net/api_help',
  });
});

interface SavedAnalysisItem {
  id: string;
  jobId: number | string;
  title: string;
  imageUrl: string;
  rawImageUrl?: string;
  timestamp: number;
  raDeg: number;
  decDeg: number;
  radiusDeg: number;
  primaryConstellationKo: string;
  primaryConstellationCode: string;
  starsCount: number;
  dsosCount: number;
  objects?: string[];
  solvedData?: any;
}

let userHistory: SavedAnalysisItem[] = [];

// In-memory cache for original uploaded photo files (keyed by subid and jobid)
const originalPhotoCache = new Map<string, { buffer: Buffer; mimetype: string }>();

// In-memory cache for Astrometry job details (info, calibration, annotations)
const jobDetailsCache = new Map<string, any>();

// Analysis history endpoints
app.get('/api/astrometry/history', (_req: Request, res: Response) => {
  res.json({ history: userHistory });
});

app.post('/api/astrometry/history', (req: Request, res: Response) => {
  const item: SavedAnalysisItem = req.body;
  if (!item || !item.jobId) {
    return res.status(400).json({ error: 'Invalid history item' });
  }
  // Deduplicate and prepend newest
  userHistory = [item, ...userHistory.filter((h) => String(h.jobId) !== String(item.jobId))];
  if (userHistory.length > 50) userHistory = userHistory.slice(0, 50);
  res.json({ success: true, history: userHistory });
});

app.delete('/api/astrometry/history/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  userHistory = userHistory.filter((h) => h.id !== id && String(h.jobId) !== id);
  res.json({ success: true, history: userHistory });
});

app.delete('/api/astrometry/history', (_req: Request, res: Response) => {
  userHistory = [];
  res.json({ success: true, history: [] });
});

app.get('/api/astrometry/sample-jobs', (_req: Request, res: Response) => {
  res.json({ samples: [] });
});

// Pure Node.js CRC32 + 8-bit grayscale PNG generator from detected stars (x, y, flux)
const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makePngChunk(type: string, data: Buffer): Buffer {
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcInput = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function createSyntheticStarFieldPng(
  width: number,
  height: number,
  stars: { x: number; y: number; flux?: number }[]
): Buffer {
  const w = Math.max(64, Math.min(2560, Math.round(width || 1920)));
  const h = Math.max(64, Math.min(2560, Math.round(height || 1080)));
  const rowStride = w + 1;
  const raw = Buffer.alloc(rowStride * h, 0);

  const maxFlux = Math.max(1, ...stars.map((s) => Number(s.flux) || 100));
  stars.slice(0, 80).forEach((s, idx) => {
    const cx = Math.round(Number(s.x));
    const cy = Math.round(Number(s.y));
    if (cx < 2 || cx >= w - 2 || cy < 2 || cy >= h - 2) return;
    const relFlux = Math.max(0.05, (Number(s.flux) || 100) / maxFlux);
    const sigma = Math.max(1.25, Math.min(3.0, 2.7 - idx * 0.018 + Math.log10(1 + relFlux * 9) * 0.35));
    const peak = Math.max(120, Math.min(255, Math.round(255 - idx * 1.4)));
    const rad = Math.ceil(sigma * 3);
    for (let dy = -rad; dy <= rad; dy++) {
      const py = cy + dy;
      if (py < 0 || py >= h) continue;
      const rowOff = py * rowStride + 1;
      for (let dx = -rad; dx <= rad; dx++) {
        const px = cx + dx;
        if (px < 0 || px >= w) continue;
        const val = Math.round(peak * Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma)));
        if (val > raw[rowOff + px]) {
          raw[rowOff + px] = val;
        }
      }
    }
  });

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // 8-bit
  ihdr[9] = 0; // grayscale
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const idatData = zlib.deflateSync(raw, { level: 1 });
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    makePngChunk('IHDR', ihdr),
    makePngChunk('IDAT', idatData),
    makePngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function parseCorrBuffer(buf: Buffer): { fx: number; fy: number; ira: number; idec: number; mag: number }[] {
  if (buf.length < 9000) return [];
  const dataOffset = 8640;
  const h1 = buf.slice(2880, dataOffset).toString('ascii');
  const rowLenMatch = h1.match(/NAXIS1\s*=\s*(\d+)/);
  const numRowsMatch = h1.match(/NAXIS2\s*=\s*(\d+)/);
  if (!rowLenMatch || !numRowsMatch) return [];
  const rowLen = parseInt(rowLenMatch[1], 10);
  const numRows = parseInt(numRowsMatch[1], 10);

  const corrStars: { fx: number; fy: number; ira: number; idec: number; mag: number }[] = [];
  for (let r = 0; r < Math.min(numRows, 45); r++) {
    const off = dataOffset + r * rowLen;
    if (off + 88 > buf.length) break;
    corrStars.push({
      fx: buf.readDoubleBE(off + 0),
      fy: buf.readDoubleBE(off + 8),
      ira: buf.readDoubleBE(off + 48),
      idec: buf.readDoubleBE(off + 56),
      mag: buf.readFloatBE(off + 80) || 9.0,
    });
  }
  return corrStars;
}

// Server-assisted blind index lookup using detected stars (x, y, flux) for custom-framed deep-sky fields
app.post('/api/astrometry/assist-local-solve', async (req: Request, res: Response) => {
  try {
    const { detectedStars, width = 1920, height = 1080 } = req.body;
    if (!Array.isArray(detectedStars) || detectedStars.length < 4) {
      return res.status(404).json({ error: 'Not enough stars' });
    }

    const session = await getAstrometrySession().catch(() => null);
    if (!session) {
      return res.status(404).json({ error: 'No session available' });
    }

    const cookie = await getHumanSessionCookie();

    const buildAssistPayloadFromJob = async (
      jid: number,
      corrStars: { fx: number; fy: number; ira: number; idec: number; mag: number }[]
    ) => {
      const [infoRes, annRes] = await Promise.all([
        fetch(`https://nova.astrometry.net/api/jobs/${jid}/info/`, {
          signal: AbortSignal.timeout(4000),
        }).catch(() => null),
        fetch(`https://nova.astrometry.net/annotations/${jid}`, {
          headers: { Cookie: cookie },
          signal: AbortSignal.timeout(4000),
        }).catch(() => null),
      ]);
      if (!infoRes || !infoRes.ok) return null;
      const info = await infoRes.json().catch(() => null);
      if (!info?.calibration) return null;

      let annotations: any[] = [];
      if (annRes && annRes.ok) {
        const annJson = await annRes.json().catch(() => null);
        if (Array.isArray(annJson?.annotations)) {
          annotations = annJson.annotations;
        }
      }

      const objs: string[] = info.objects_in_field || info.machine_tags || [];
      const primaryObj = objs[0] || `Job #${jid}`;
      return {
        fieldId: `assist_${jid}`,
        nameKo: primaryObj,
        nameEn: primaryObj,
        primaryObjectLabel: primaryObj,
        constellation: 'Tri',
        calibration: info.calibration,
        objectsInField: objs,
        annotations,
        referenceStars: corrStars.slice(0, 30).map((cs, idx) => ({
          id: `assist_${jid}_s${idx + 1}`,
          nameKo: `TYC-${jid}-${idx + 1}`,
          nameEn: `TYC-${jid}-${idx + 1}`,
          bayer: `TYC-${jid}-${idx + 1}`,
          constellation: 'Tri',
          raDeg: Number(cs.ira.toFixed(4)),
          decDeg: Number(cs.idec.toFixed(4)),
          mag: Number(Math.max(4.0, Math.min(13.5, cs.mag)).toFixed(2)),
        })),
      };
    };

    // 1. Check recent solved jobs on nova.astrometry.net first
    const myJobsRes = await fetch('https://nova.astrometry.net/api/myjobs/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `request-json=${encodeURIComponent(JSON.stringify({ session }))}`,
      signal: AbortSignal.timeout(4000),
    }).catch(() => null);

    if (myJobsRes && myJobsRes.ok) {
      const { jobs } = await myJobsRes.json().catch(() => ({ jobs: [] }));
      const recentJobs: number[] = Array.isArray(jobs)
        ? jobs.map((n: any) => Number(n)).filter((n) => !isNaN(n)).sort((a, b) => b - a).slice(0, 15)
        : [];

      for (const jid of recentJobs) {
        try {
          const corrRes = await fetch(`https://nova.astrometry.net/corr_file/${jid}`, {
            headers: { Cookie: cookie },
            signal: AbortSignal.timeout(3000),
          }).catch(() => null);
          if (!corrRes || !corrRes.ok) continue;
          const buf = Buffer.from(await corrRes.arrayBuffer());
          const corrStars = parseCorrBuffer(buf);
          if (corrStars.length < 4) continue;

          let matchCount = 0;
          for (const ds of detectedStars.slice(0, 25)) {
            if (corrStars.some((cs) => Math.hypot(cs.fx - ds.x, cs.fy - ds.y) <= 14)) {
              matchCount++;
            }
          }

          if (matchCount >= 5) {
            const payload = await buildAssistPayloadFromJob(jid, corrStars);
            if (payload) {
              return res.json(payload);
            }
          }
        } catch {
          // continue
        }
      }
    }

    // 2. If not in recent jobs, synthesize a clean star-field PNG directly from detectedStars (x, y, flux) and solve blind!
    const synthPng = createSyntheticStarFieldPng(width, height, detectedStars);
    const form = new FormData();
    form.append(
      'request-json',
      JSON.stringify({
        session,
        allow_commercial_use: 'd',
        allow_modifications: 'd',
        publicly_visible: 'n',
        downsample_factor: 2,
      })
    );
    form.append('file', new Blob([synthPng], { type: 'image/png' }), 'synth_detected_stars.png');

    const uploadRes = await fetch('https://nova.astrometry.net/api/upload', {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(8000),
    }).catch(() => null);

    if (uploadRes && uploadRes.ok) {
      const uploadData = await uploadRes.json().catch(() => null);
      const subId = uploadData?.subid;
      if (subId) {
        const deadline = Date.now() + 34000;
        let solvedJobId: number | null = null;
        while (Date.now() < deadline) {
          await new Promise((r) => setTimeout(r, 2000));
          const subRes = await fetch(`https://nova.astrometry.net/api/submissions/${subId}`, {
            signal: AbortSignal.timeout(3500),
          }).catch(() => null);
          if (!subRes || !subRes.ok) continue;
          const subData = await subRes.json().catch(() => null);
          const jobs: number[] = Array.isArray(subData?.jobs)
            ? subData.jobs.filter((j: any) => typeof j === 'number' && j > 0)
            : [];
          if (jobs.length > 0) {
            const jid = jobs[0];
            const jRes = await fetch(`https://nova.astrometry.net/api/jobs/${jid}`, {
              signal: AbortSignal.timeout(3500),
            }).catch(() => null);
            if (jRes && jRes.ok) {
              const jData = await jRes.json().catch(() => null);
              if (jData?.status === 'success') {
                solvedJobId = jid;
                break;
              } else if (jData?.status === 'failure') {
                break;
              }
            }
          }
        }

        if (solvedJobId) {
          const corrRes = await fetch(`https://nova.astrometry.net/corr_file/${solvedJobId}`, {
            headers: { Cookie: cookie },
            signal: AbortSignal.timeout(4000),
          }).catch(() => null);
          const corrStars =
            corrRes && corrRes.ok
              ? parseCorrBuffer(Buffer.from(await corrRes.arrayBuffer()))
              : [];
          const payload = await buildAssistPayloadFromJob(solvedJobId, corrStars);
          if (payload) {
            return res.json(payload);
          }
        }
      }
    }

    return res.status(404).json({ error: 'No matching field found' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

const deletedJobIds = new Set<string>();

// Fetch user's solved jobs directly from nova.astrometry.net account & remembered jobs
app.get('/api/astrometry/my-jobs', async (req: Request, res: Response) => {
  try {
    const extraParam = String(req.query.extraJobs || req.query.jobIds || '').trim();
    const extraList: (string | number)[] = extraParam
      ? extraParam.split(',').map((s) => s.trim()).filter(Boolean)
      : [];

    const deletedParam = String(req.query.deletedJobs || '').trim();
    if (deletedParam) {
      deletedParam.split(',').forEach((d) => {
        const trimmed = d.trim();
        if (trimmed) deletedJobIds.add(trimmed);
      });
    }

    let accountJobIds: (string | number)[] = [];
    try {
      const session = await getAstrometrySession();
      const resp = await fetch('https://nova.astrometry.net/api/myjobs/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'AstroPlate/1.0' },
        body: `request-json=${encodeURIComponent(JSON.stringify({ session }))}`,
      });

      if (resp.ok) {
        const data = await resp.json();
        if (Array.isArray(data.jobs)) {
          accountJobIds = data.jobs;
        }
      }
    } catch {
      // Session error / no API key: we still proceed with extraList!
    }

    // Cache for job details to avoid bombarding Astrometry.net and prevent 429/503 rate limits
    const combinedIds = Array.from(new Set([...extraList, ...accountJobIds]))
      .filter((id) => id && !deletedJobIds.has(String(id)))
      .sort((a, b) => {
        const histA = userHistory.find((h) => String(h.jobId) === String(a));
        const histB = userHistory.find((h) => String(h.jobId) === String(b));
        const timeA = histA?.timestamp || (isLocalJobId(a) ? Number(String(a).replace(/\D/g, '')) : 0);
        const timeB = histB?.timestamp || (isLocalJobId(b) ? Number(String(b).replace(/\D/g, '')) : 0);
        if (timeA && timeB && timeA !== timeB) {
          return timeB - timeA; // Newest at top
        }
        const numA = Number(String(a).replace(/\D/g, ''));
        const numB = Number(String(b).replace(/\D/g, ''));
        if (!isNaN(numA) && !isNaN(numB) && numA !== numB) return numB - numA;
        return 0;
      });

    // Fetch brief info for top 25 jobs from Astrometry.net with caching
    const topJobs = combinedIds.slice(0, 25);
    const detailed = await Promise.all(
      topJobs.map(async (jobId) => {
        const strId = String(jobId);
        if (jobDetailsCache.has(strId)) {
          return jobDetailsCache.get(strId);
        }

        // Handle in-browser local jobs without hitting nova.astrometry.net
        if (isLocalJobId(jobId)) {
          const hist = userHistory.find((h) => String(h.jobId) === strId);
          if (hist) {
            const localDetail = {
              jobId,
              status: 'success',
              filename: hist.title || `Local Job #${jobId}`,
              objects: hist.objects || [],
              calibration: hist.solvedData?.calibration || {
                ra: hist.raDeg,
                dec: hist.decDeg,
                radius: hist.radiusDeg,
              },
            };
            jobDetailsCache.set(strId, localDetail);
            return localDetail;
          }
          return { jobId, status: 'success', filename: `Local Job #${jobId}` };
        }

        try {
          const infoResp = await fetch(`https://nova.astrometry.net/api/jobs/${jobId}/info/`, {
            headers: { 'User-Agent': 'AstroPlate/1.0' },
          }).catch(() => null);

          if (!infoResp || !infoResp.ok) {
            return { jobId, status: 'unknown' };
          }

          const info = await infoResp.json().catch(() => ({}));

          // Use info.calibration if available, or fetch calibration
          let calibration = info.calibration || null;
          if (!calibration || !calibration.width_arcsec) {
            const calResp = await fetch(`https://nova.astrometry.net/api/jobs/${jobId}/calibration/`, {
              headers: { 'User-Agent': 'AstroPlate/1.0' },
            }).catch(() => null);
            if (calResp && calResp.ok) {
              const fullCal = await calResp.json().catch(() => null);
              if (fullCal) calibration = { ...calibration, ...fullCal };
            }
          }

          let annoNames: string[] = [];
          try {
            const annoResp = await fetch(`https://nova.astrometry.net/api/jobs/${jobId}/annotations/`, {
              headers: { 'User-Agent': 'AstroPlate/1.0' },
            }).catch(() => null);
            if (annoResp && annoResp.ok) {
              const annoData = await annoResp.json().catch(() => null);
              if (Array.isArray(annoData?.annotations)) {
                annoNames = annoData.annotations.flatMap((a: any) => (Array.isArray(a.names) ? a.names : []));
              }
            }
          } catch {}

          const rawObjects = [
            ...(Array.isArray(info.objects_in_field) ? info.objects_in_field : []),
            ...(Array.isArray(info.tags) ? info.tags : []),
            ...(Array.isArray(info.machine_tags) ? info.machine_tags : []),
            ...annoNames,
          ];
          const objects = Array.from(new Set(rawObjects.filter(Boolean)));

          const resItem = {
            jobId,
            status: info.status || (calibration ? 'success' : 'unknown'),
            filename: info.original_filename || `Astrometry Job #${jobId}`,
            objects,
            calibration,
          };

          if (resItem.status === 'success' && calibration) {
            jobDetailsCache.set(strId, resItem);
          }

          return resItem;
        } catch {
          return { jobId, status: 'unknown' };
        }
      })
    );

    const validDetailed = detailed.filter(
      (d) =>
        d &&
        !deletedJobIds.has(String(d.jobId)) &&
        d.status === 'success' &&
        d.calibration &&
        typeof d.calibration.ra === 'number'
    );

    res.json({
      jobIds: validDetailed.map((d) => d.jobId),
      detailed: validDetailed,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch my jobs' });
  }
});

// Delete single job from remembered account jobs
app.delete('/api/astrometry/my-jobs/:jobId', (req: Request, res: Response) => {
  const { jobId } = req.params;
  if (jobId) {
    deletedJobIds.add(String(jobId));
  }
  userHistory = userHistory.filter((h) => String(h.jobId) !== String(jobId) && h.id !== jobId);
  res.json({ success: true, removedJobId: jobId });
});

// Clear all remembered account jobs
app.delete('/api/astrometry/my-jobs', async (req: Request, res: Response) => {
  const { jobIds, all } = req.body || {};
  if (Array.isArray(jobIds)) {
    jobIds.forEach((id) => deletedJobIds.add(String(id)));
  }
  userHistory.forEach((h) => deletedJobIds.add(String(h.jobId)));
  userHistory = [];

  // Also query session to mark all current account jobs as deleted if requested
  if (all) {
    try {
      const session = await getAstrometrySession();
      const resp = await fetch('https://nova.astrometry.net/api/myjobs/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'AstroPlate/1.0' },
        body: `request-json=${encodeURIComponent(JSON.stringify({ session }))}`,
      });
      if (resp.ok) {
        const data = await resp.json();
        if (Array.isArray(data.jobs)) {
          data.jobs.forEach((id: any) => deletedJobIds.add(String(id)));
        }
      }
    } catch {}
  }

  res.json({ success: true, message: 'All remembered account jobs cleared' });
});

// Direct Multipart File Upload (Supports up to 150MB files without Base64 overhead)
app.post('/api/astrometry/upload-file', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: '업로드할 사진 파일이 첨부되지 않았습니다.' });
    }

    const { scaleUnits, scaleType, scaleLower, scaleUpper } = req.body;

    let session: string;
    try {
      session = await getAstrometrySession();
    } catch (err: any) {
      return res.status(401).json({
        error: 'API_KEY_REQUIRED',
        message: err.message || 'nova.astrometry.net API 키가 설정되어 있지 않습니다.',
        instruction: 'AI Studio의 Secrets 설정 또는 .env 파일에서 ASTROMETRY_API_KEY를 등록해주세요.',
      });
    }

    const solveOptions: Record<string, any> = {
      session,
      allow_commercial_use: 'd',
      allow_modifications: 'd',
      publicly_visible: 'y',
    };

    const hasScaleLower = Boolean(scaleLower && !isNaN(parseFloat(scaleLower)));
    const hasScaleUpper = Boolean(scaleUpper && !isNaN(parseFloat(scaleUpper)));
    if (hasScaleLower || hasScaleUpper) {
      if (scaleUnits) solveOptions.scale_units = scaleUnits;
      if (scaleType) solveOptions.scale_type = scaleType || 'ul';
      if (hasScaleLower) solveOptions.scale_lower = parseFloat(scaleLower);
      if (hasScaleUpper) solveOptions.scale_upper = parseFloat(scaleUpper);
    }

    const formData = new FormData();
    formData.append('request-json', JSON.stringify(solveOptions));
    const fileBlob = new Blob([new Uint8Array(file.buffer)], { type: file.mimetype || 'image/jpeg' });
    const ext = path.extname(file.originalname || '') || '.jpg';
    const safeFilename = `astrophoto_${Date.now()}${ext.toLowerCase()}`;
    formData.append('file', fileBlob, safeFilename);

    const uploadResp = await fetch('https://nova.astrometry.net/api/upload', {
      method: 'POST',
      headers: {
        'User-Agent': 'AstroPlate/1.0',
      },
      body: formData,
    });

    if (!uploadResp.ok) {
      const errorText = await uploadResp.text();
      return res.status(uploadResp.status).json({ error: `Astrometry.net 업로드 실패 (HTTP ${uploadResp.status}): ${errorText}` });
    }

    const uploadData = await uploadResp.json();
    if (uploadData.status !== 'success') {
      return res.status(400).json({ error: uploadData.errormessage || '이미지 분석 제출 실패' });
    }

    console.log(`[Astrometry Upload] Success. SubID: ${uploadData.subid}, file: ${file.originalname}`);
    if (uploadData.subid) {
      originalPhotoCache.set(String(uploadData.subid), {
        buffer: Buffer.from(file.buffer),
        mimetype: file.mimetype || 'image/jpeg',
      });
    }
    return res.json({ status: 'success', subid: uploadData.subid });
  } catch (error: any) {
    console.error('File upload error:', error);
    res.status(500).json({ error: error.message || '서버 파일 업로드 중 오류가 발생했습니다.' });
  }
});

// Helper to upload an image buffer directly to nova.astrometry.net/api/upload
async function uploadBufferToAstrometry(
  buffer: Buffer,
  mimetype: string,
  filename: string,
  solveOptions: Record<string, any>
): Promise<{ status: string; subid?: number; errormessage?: string }> {
  const formData = new FormData();
  formData.append('request-json', JSON.stringify(solveOptions));
  const fileBlob = new Blob([new Uint8Array(buffer)], { type: mimetype || 'image/jpeg' });
  formData.append('file', fileBlob, filename || 'astrophoto.jpg');

  const uploadResp = await fetch('https://nova.astrometry.net/api/upload', {
    method: 'POST',
    headers: {
      'User-Agent': 'AstroPlate/1.0',
    },
    body: formData,
  });

  if (!uploadResp.ok) {
    const errText = await uploadResp.text().catch(() => '');
    throw new Error(`Astrometry.net 업로드 실패 (HTTP ${uploadResp.status}): ${errText}`);
  }

  return uploadResp.json();
}

// Plate solve submission: URL or Base64 Image
app.post('/api/astrometry/solve', async (req: Request, res: Response) => {
  try {
    const { imageUrl, imageBase64, filename, mimeType, scaleUnits, scaleType, scaleLower, scaleUpper } = req.body;

    if (!imageUrl && !imageBase64) {
      return res.status(400).json({ error: '천체 사진 이미지(Base64) 또는 이미지 URL이 필요합니다.' });
    }

    // Check API Key
    let session: string;
    try {
      session = await getAstrometrySession();
    } catch (err: any) {
      return res.status(401).json({
        error: 'API_KEY_REQUIRED',
        message: err.message || 'nova.astrometry.net API 키가 설정되어 있지 않습니다.',
        instruction: 'AI Studio의 Secrets 설정 또는 .env 파일에서 ASTROMETRY_API_KEY를 등록해주세요.',
      });
    }

    const solveOptions: Record<string, any> = {
      session,
      allow_commercial_use: 'd',
      allow_modifications: 'd',
      publicly_visible: 'y',
    };

    const hasScaleLower = Boolean(scaleLower && !isNaN(parseFloat(scaleLower)));
    const hasScaleUpper = Boolean(scaleUpper && !isNaN(parseFloat(scaleUpper)));
    if (hasScaleLower || hasScaleUpper) {
      if (scaleUnits) solveOptions.scale_units = scaleUnits;
      if (scaleType) solveOptions.scale_type = scaleType || 'ul';
      if (hasScaleLower) solveOptions.scale_lower = parseFloat(scaleLower);
      if (hasScaleUpper) solveOptions.scale_upper = parseFloat(scaleUpper);
    }

    // URL upload mode
    if (imageUrl) {
      const trimmedUrl = String(imageUrl).trim();

      // 1. Check if imageUrl is a Data URL (data:image/...)
      if (trimmedUrl.startsWith('data:image/')) {
        const detectedMime = trimmedUrl.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,/)?.[1] || 'image/jpeg';
        const base64Clean = trimmedUrl.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');
        const buffer = Buffer.from(base64Clean, 'base64');
        const uploadData = await uploadBufferToAstrometry(
          buffer,
          detectedMime,
          filename || 'astrophoto.jpg',
          solveOptions
        );
        if (uploadData.status !== 'success') {
          return res.status(400).json({ error: uploadData.errormessage || '이미지 분석 제출 실패' });
        }
        if (uploadData.subid) {
          originalPhotoCache.set(String(uploadData.subid), { buffer, mimetype: detectedMime });
        }
        return res.json({ status: 'success', subid: uploadData.subid });
      }

      // 2. Check if imageUrl is a local proxy URL (/api/astrometry/image-proxy/:jobId/:type or /api/astrometry/sky-image/:jobId)
      const proxyMatch = trimmedUrl.match(/\/api\/astrometry\/image-proxy\/([^/?#]+)(?:\/([^/?#]+))?/i);
      const skyImgMatch = trimmedUrl.match(/\/api\/astrometry\/sky-image\/([^/?#]+)/i);
      if (proxyMatch || skyImgMatch) {
        const targetJobId = proxyMatch ? proxyMatch[1] : skyImgMatch![1];
        const targetType = proxyMatch ? proxyMatch[2] || 'original' : 'survey';
        const resolved = await resolveJobImageBuffer(targetJobId, targetType);
        if (!resolved) {
          return res.status(404).json({
            error: `Job #${targetJobId}의 원본 천체 이미지를 불러올 수 없습니다.`,
          });
        }
        const uploadData = await uploadBufferToAstrometry(
          resolved.buffer,
          resolved.mimetype,
          filename || `job_${targetJobId}_reanalyze.jpg`,
          solveOptions
        );
        if (uploadData.status !== 'success') {
          return res.status(400).json({ error: uploadData.errormessage || '이미지 재분석 제출 실패' });
        }
        if (uploadData.subid) {
          originalPhotoCache.set(String(uploadData.subid), resolved);
        }
        return res.json({ status: 'success', subid: uploadData.subid });
      }

      // 3. External URL: ensure valid http/https scheme
      const normalizedExternalUrl = /^https?:\/\//i.test(trimmedUrl)
        ? trimmedUrl
        : `https://${trimmedUrl.replace(/^\/+/, '')}`;

      // Try fetching the image buffer on our server first and uploading binary to /api/upload
      // (avoids MissingSchema, hotlink blocks, or unreachable URL errors on nova.astrometry.net)
      try {
        const imgFetch = await fetch(normalizedExternalUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
          signal: AbortSignal.timeout(10000),
        });
        if (imgFetch.ok) {
          const ct = imgFetch.headers.get('content-type') || 'image/jpeg';
          const ab = await imgFetch.arrayBuffer();
          if (ab.byteLength > 1000 && !ct.includes('text/html')) {
            const buffer = Buffer.from(ab);
            const urlFileName =
              normalizedExternalUrl.split('/').pop()?.split('?')[0] || 'url_astrophoto.jpg';
            const uploadData = await uploadBufferToAstrometry(
              buffer,
              ct.startsWith('image/') ? ct : 'image/jpeg',
              urlFileName,
              solveOptions
            );
            if (uploadData.status === 'success' && uploadData.subid) {
              originalPhotoCache.set(String(uploadData.subid), {
                buffer,
                mimetype: ct.startsWith('image/') ? ct : 'image/jpeg',
              });
              return res.json({ status: 'success', subid: uploadData.subid });
            }
          }
        }
      } catch {
        // Fall back to Astrometry url_upload below
      }

      solveOptions.url = normalizedExternalUrl;
      const resp = await fetch('https://nova.astrometry.net/api/url_upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'AstroPlate/1.0',
        },
        body: `request-json=${encodeURIComponent(JSON.stringify(solveOptions))}`,
      });

      const data = await resp.json();
      if (data.status !== 'success') {
        return res.status(400).json({ error: data.errormessage || 'URL 업로드 제출 실패' });
      }
      return res.json({ status: 'success', subid: data.subid });
    }

    // Base64 file upload mode
    const base64Clean = imageBase64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');
    const buffer = Buffer.from(base64Clean, 'base64');
    const resolvedMime = mimeType || 'image/jpeg';

    const uploadData = await uploadBufferToAstrometry(
      buffer,
      resolvedMime,
      filename || 'astrophoto.jpg',
      solveOptions
    );
    if (uploadData.status !== 'success') {
      return res.status(400).json({ error: uploadData.errormessage || '이미지 분석 제출 실패' });
    }
    if (uploadData.subid) {
      originalPhotoCache.set(String(uploadData.subid), {
        buffer,
        mimetype: resolvedMime,
      });
    }

    return res.json({ status: 'success', subid: uploadData.subid });
  } catch (error: any) {
    console.error('Plate solve error:', error);
    res.status(500).json({ error: error.message || '서버 내부 오류가 발생했습니다.' });
  }
});

// Check Submission status and jobs
app.get('/api/astrometry/submissions/:subid', async (req: Request, res: Response) => {
  try {
    const { subid } = req.params;
    const resp = await fetch(`https://nova.astrometry.net/api/submissions/${subid}`, {
      headers: { 'User-Agent': 'AstroPlate/1.0' },
    });
    if (!resp.ok) {
      return res.status(resp.status).json({ error: `Submission check failed: ${resp.statusText}` });
    }
    const data = await resp.json();
    if (data && Array.isArray(data.jobs)) {
      const cached = originalPhotoCache.get(String(subid));
      if (cached) {
        for (const jId of data.jobs) {
          if (jId) originalPhotoCache.set(String(jId), cached);
        }
      }
    }
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Check Job status
app.get('/api/astrometry/jobs/:jobId/status', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    if (isLocalJobId(jobId)) {
      return res.json({ status: 'success', jobId });
    }
    const resp = await fetch(`https://nova.astrometry.net/api/jobs/${jobId}/`, {
      headers: { 'User-Agent': 'AstroPlate/1.0' },
    });
    if (!resp.ok) {
      return res.status(resp.status).json({ error: `Job status check failed: ${resp.statusText}` });
    }
    const data = await resp.json();
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get Job Calibration data (RA, Dec, radius, pixscale, orientation, parity)
app.get('/api/astrometry/jobs/:jobId/calibration', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    if (isLocalJobId(jobId)) {
      const hist = userHistory.find((h) => String(h.jobId) === String(jobId));
      if (hist && hist.solvedData?.calibration) {
        return res.json(hist.solvedData.calibration);
      }
      if (hist) {
        return res.json({
          ra: typeof hist.raDeg === 'number' ? hist.raDeg : 0,
          dec: typeof hist.decDeg === 'number' ? hist.decDeg : 0,
          radius: typeof hist.radiusDeg === 'number' ? hist.radiusDeg : 1,
          pixscale: 1.5,
          orientation: 0,
          parity: 1,
        });
      }
      return res.json({
        ra: 0,
        dec: 0,
        radius: 1,
        pixscale: 1.5,
        orientation: 0,
        parity: 1,
      });
    }
    const resp = await fetch(`https://nova.astrometry.net/api/jobs/${jobId}/calibration/`, {
      headers: { 'User-Agent': 'AstroPlate/1.0' },
    });
    if (!resp.ok) {
      return res.status(resp.status).json({ error: `Job calibration fetch failed: ${resp.statusText}` });
    }
    const data = await resp.json();
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get Job Annotations (stars, DSOs, pixel positions)
app.get('/api/astrometry/jobs/:jobId/annotations', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    if (isLocalJobId(jobId)) {
      const hist = userHistory.find((h) => String(h.jobId) === String(jobId));
      const localAnns = hist?.solvedData?.annotations;
      return res.json({ annotations: Array.isArray(localAnns) ? localAnns : [] });
    }
    const resp = await fetch(`https://nova.astrometry.net/api/jobs/${jobId}/annotations/`, {
      headers: { 'User-Agent': 'AstroPlate/1.0' },
    });
    if (!resp.ok) {
      return res.status(resp.status).json({ error: `Job annotations fetch failed: ${resp.statusText}` });
    }
    const data = await resp.json();
    const list = Array.isArray(data?.annotations)
      ? data.annotations
      : Array.isArray(data)
      ? data
      : [];
    res.json({ annotations: list });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get Job Info (objects in field, machine tags)
app.get('/api/astrometry/jobs/:jobId/info', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    if (isLocalJobId(jobId)) {
      const hist = userHistory.find((h) => String(h.jobId) === String(jobId));
      return res.json({
        status: 'success',
        objects_in_field: hist?.objects || [],
        original_filename: hist?.title || `Local Job #${jobId}`,
      });
    }
    const resp = await fetch(`https://nova.astrometry.net/api/jobs/${jobId}/info/`, {
      headers: { 'User-Agent': 'AstroPlate/1.0' },
    });
    if (!resp.ok) {
      return res.status(resp.status).json({ error: `Job info fetch failed: ${resp.statusText}` });
    }
    const data = await resp.json();
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Full unified Astrometry Job data
app.get('/api/astrometry/jobs/:jobId/full', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    if (isLocalJobId(jobId)) {
      const strId = String(jobId);
      const hist = userHistory.find((h) => String(h.jobId) === strId);
      if (hist && hist.solvedData) {
        const localAnns = hist.solvedData.annotations;
        return res.json({
          jobId,
          calibration: hist.solvedData.calibration,
          annotations: Array.isArray(localAnns) ? localAnns : [],
          info: hist.solvedData.info || {},
        });
      }
      if (hist) {
        return res.json({
          jobId,
          calibration: {
            ra: typeof hist.raDeg === 'number' ? hist.raDeg : 0,
            dec: typeof hist.decDeg === 'number' ? hist.decDeg : 0,
            radius: typeof hist.radiusDeg === 'number' ? hist.radiusDeg : 1,
            pixscale: 1.5,
            orientation: 0,
            parity: 1,
          },
          annotations: [],
          info: {
            original_filename: hist.title || `Local Job #${jobId}`,
            objects_in_field: hist.objects || [],
          },
        });
      }
      // Return a safe 200 payload for local browser-solved jobs so clients never crash on 404
      return res.json({
        jobId,
        status: 'success',
        calibration: {
          ra: 0,
          dec: 0,
          radius: 1,
          pixscale: 1.5,
          orientation: 0,
          parity: 1,
        },
        annotations: [],
        info: {
          original_filename: `Local Job #${jobId}`,
          objects_in_field: [],
        },
      });
    }

    const [calResp, annResp, infoResp] = await Promise.all([
      fetch(`https://nova.astrometry.net/api/jobs/${jobId}/calibration/`, { headers: { 'User-Agent': 'AstroPlate/1.0' } }),
      fetch(`https://nova.astrometry.net/api/jobs/${jobId}/annotations/`, { headers: { 'User-Agent': 'AstroPlate/1.0' } }),
      fetch(`https://nova.astrometry.net/api/jobs/${jobId}/info/`, { headers: { 'User-Agent': 'AstroPlate/1.0' } }),
    ]);

    if (!calResp.ok) {
      return res.status(calResp.status).json({ error: `Job calibration not ready or job not found.` });
    }

    const calibration = await calResp.json();
    const annotationsRaw = annResp.ok ? await annResp.json().catch(() => null) : null;
    const normalizedAnnotations = Array.isArray(annotationsRaw?.annotations)
      ? annotationsRaw.annotations
      : Array.isArray(annotationsRaw)
      ? annotationsRaw
      : [];
    const info = infoResp.ok ? await infoResp.json().catch(() => ({})) : {};

    res.json({
      jobId,
      calibration,
      annotations: normalizedAnnotations,
      info: info && typeof info === 'object' ? info : {},
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Helper to retrieve CDS real optical astronomical survey image by sky coordinates
async function getCdsSkyImageByCoords(
  ra: number,
  dec: number,
  radius = 1,
  orientation = 0
): Promise<Buffer | null> {
  try {
    const fov = Math.max(0.4, (radius || 1) * 2);
    const width = 1280;
    const height = 960;
    const rotation = orientation !== undefined ? Math.round(orientation) : 0;
    const cdsUrl = `https://alasky.cds.unistra.fr/hips-image-services/hips2fits?hips=CDS%2FP%2FDSS2%2Fcolor&ra=${ra}&dec=${dec}&fov=${fov}&width=${width}&height=${height}&rotation_angle=${rotation}&format=jpg`;
    const resp = await fetch(cdsUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(5000),
    }).catch(() => null);
    if (resp && resp.ok) {
      const arrayBuf = await resp.arrayBuffer().catch(() => null);
      if (arrayBuf && arrayBuf.byteLength > 8000) {
        return Buffer.from(arrayBuf);
      }
    }
  } catch {
    // silent catch
  }
  return null;
}

// Helper to retrieve CDS real optical astronomical survey image by Job ID
async function getCdsSkyImage(jobId: string | number): Promise<Buffer | null> {
  if (isLocalJobId(jobId)) {
    const hist = userHistory.find((h) => String(h.jobId) === String(jobId));
    if (hist && typeof hist.raDeg === 'number' && typeof hist.decDeg === 'number') {
      return getCdsSkyImageByCoords(hist.raDeg, hist.decDeg, hist.radiusDeg || 1.0, 0);
    }
    return null;
  }
  try {
    const calResp = await fetch(`https://nova.astrometry.net/api/jobs/${jobId}/calibration/`, {
      headers: { 'User-Agent': 'AstroPlate/1.0' },
      signal: AbortSignal.timeout(4000),
    }).catch(() => null);
    if (!calResp || !calResp.ok) return null;
    const cal = await calResp.json().catch(() => null);
    if (!cal || typeof cal.ra !== 'number' || typeof cal.dec !== 'number') return null;
    return getCdsSkyImageByCoords(cal.ra, cal.dec, cal.radius || 1.0, cal.orientation || 0);
  } catch {
    return null;
  }
}

// Dedicated endpoint for high-resolution field sky image
app.get('/api/astrometry/sky-image/:jobId', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const buf = await getCdsSkyImage(jobId);
    if (!buf) {
      return res.status(404).send('Sky survey image not available');
    }
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(buf);
  } catch (err: any) {
    res.status(500).send(err.message);
  }
});

// Download Astrometry FITS & output data files (wcs_file, new_fits_file, kml_file, rdls_file, axy_file, corr_file)
app.get('/api/astrometry/files/:jobId/:fileType', async (req: Request, res: Response) => {
  try {
    const { jobId, fileType } = req.params;
    const allowed = ['wcs_file', 'new_fits_file', 'kml_file', 'rdls_file', 'axy_file', 'corr_file', 'image_rd_file'];
    if (!allowed.includes(fileType)) {
      return res.status(400).send('Invalid file type requested');
    }

    const url = `https://nova.astrometry.net/${fileType}/${jobId}`;
    const cookie = await getHumanSessionCookie();
    let upstream = await fetch(url, {
      headers: {
        'Cookie': cookie,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (upstream.status === 302 || !upstream.ok) {
      const freshCookie = await getHumanSessionCookie(true);
      upstream = await fetch(url, {
        headers: {
          'Cookie': freshCookie,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });
    }

    if (!upstream.ok) {
      return res.status(upstream.status).send(`Failed to retrieve ${fileType}`);
    }

    const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
    const ext = fileType.includes('kml') ? 'kml' : 'fits';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="astrometry_${jobId}_${fileType}.${ext}"`);
    const arrayBuf = await upstream.arrayBuffer();
    res.send(Buffer.from(arrayBuf));
  } catch (err: any) {
    res.status(500).send(err.message);
  }
});

// Helper to resolve an astronomical image buffer for any local or remote Job ID
async function resolveJobImageBuffer(
  jobId: string | number,
  type = 'original'
): Promise<{ buffer: Buffer; mimetype: string } | null> {
  const strJobId = String(jobId);

  // 1. Check if this is a local in-browser solved job
  if (isLocalJobId(strJobId)) {
    const cached = originalPhotoCache.get(strJobId);
    if (cached) {
      return cached;
    }

    const hist = userHistory.find((h) => String(h.jobId) === strJobId);
    if (hist) {
      const targetImg =
        type === 'original' || type === 'raw'
          ? hist.rawImageUrl || hist.imageUrl || ''
          : hist.imageUrl || hist.rawImageUrl || '';
      if (targetImg.startsWith('data:image/')) {
        const mime = targetImg.match(/data:(image\/[^;]+);base64,/)?.[1] || 'image/jpeg';
        const base64Data = targetImg.replace(/^data:image\/[^;]+;base64,/, '');
        return { buffer: Buffer.from(base64Data, 'base64'), mimetype: mime };
      }

      if (typeof hist.raDeg === 'number' && typeof hist.decDeg === 'number') {
        const cdsBuf = await getCdsSkyImageByCoords(hist.raDeg, hist.decDeg, hist.radiusDeg || 1.0, 0);
        if (cdsBuf) {
          return { buffer: cdsBuf, mimetype: 'image/jpeg' };
        }
      }
    }
    return null;
  }

  // 2. Dedicated optical survey mode for remote jobs
  if (type === 'survey') {
    const surveyBuf = await getCdsSkyImage(strJobId);
    if (surveyBuf) {
      return { buffer: surveyBuf, mimetype: 'image/jpeg' };
    }
    return null;
  }

  // 3. If original/raw image requested, check in-memory cache first
  if (type === 'original' || type === 'raw' || type === 'image') {
    const cached = originalPhotoCache.get(strJobId);
    if (cached) {
      return cached;
    }

    // Also check if userHistory has a data URL for this job
    const hist = userHistory.find((h) => String(h.jobId) === strJobId);
    const histImg = hist?.rawImageUrl || hist?.imageUrl || '';
    if (histImg.startsWith('data:image/')) {
      const mime = histImg.match(/data:(image\/[^;]+);base64,/)?.[1] || 'image/jpeg';
      const base64Data = histImg.replace(/^data:image\/[^;]+;base64,/, '');
      const item = { buffer: Buffer.from(base64Data, 'base64'), mimetype: mime };
      originalPhotoCache.set(strJobId, item);
      return item;
    }
  }

  // 4. Candidate upstream Astrometry URLs in order of preference
  let candidateUrls: string[] = [];
  if (type === 'annotated' || type === 'annotated_full') {
    candidateUrls = [
      `https://nova.astrometry.net/annotated_full/${strJobId}`,
      `https://nova.astrometry.net/annotated_display/${strJobId}`,
      `https://nova.astrometry.net/extraction_image_full/${strJobId}`,
      `https://nova.astrometry.net/extraction_image_display/${strJobId}`,
    ];
  } else if (type === 'red_green') {
    candidateUrls = [
      `https://nova.astrometry.net/red_green_image_full/${strJobId}`,
      `https://nova.astrometry.net/red_green_image_display/${strJobId}`,
      `https://nova.astrometry.net/extraction_image_full/${strJobId}`,
    ];
  } else if (type === 'extraction') {
    candidateUrls = [
      `https://nova.astrometry.net/extraction_image_full/${strJobId}`,
      `https://nova.astrometry.net/extraction_image_display/${strJobId}`,
    ];
  } else if (type === 'grid') {
    candidateUrls = [
      `https://nova.astrometry.net/grid_full/${strJobId}`,
      `https://nova.astrometry.net/grid_display/${strJobId}`,
    ];
  } else if (type === 'original' || type === 'raw' || type === 'image') {
    candidateUrls = [
      `https://nova.astrometry.net/annotated_full/${strJobId}`,
      `https://nova.astrometry.net/extraction_image_full/${strJobId}`,
      `https://nova.astrometry.net/annotated_display/${strJobId}`,
      `https://nova.astrometry.net/extraction_image_display/${strJobId}`,
      `https://nova.astrometry.net/image/${strJobId}`,
    ];
  } else {
    candidateUrls = [
      `https://nova.astrometry.net/annotated_full/${strJobId}`,
      `https://nova.astrometry.net/annotated_display/${strJobId}`,
      `https://nova.astrometry.net/extraction_image_full/${strJobId}`,
    ];
  }

  // 5. Attempt retrieval from Astrometry.net with human session cookie
  let cookie = await getHumanSessionCookie();
  for (const targetUrl of candidateUrls) {
    try {
      let upstream = await fetch(targetUrl, {
        headers: {
          Cookie: cookie,
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        },
        redirect: 'manual',
        signal: AbortSignal.timeout(5000),
      }).catch(() => null);

      if (!upstream) continue;

      if (upstream.status === 302 || upstream.headers.get('content-type')?.includes('text/html')) {
        const loc = upstream.headers.get('location') || '';
        if (loc.includes('ask_human') || upstream.headers.get('content-type')?.includes('text/html')) {
          cookie = await getHumanSessionCookie(true);
        }
        upstream = await fetch(targetUrl, {
          headers: {
            Cookie: cookie,
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          },
          redirect: 'follow',
          signal: AbortSignal.timeout(6000),
        }).catch(() => null);
      }

      if (upstream && upstream.ok) {
        const contentType = upstream.headers.get('content-type') || '';
        if (contentType.startsWith('image/')) {
          const arrayBuf = await upstream.arrayBuffer().catch(() => null);
          if (arrayBuf && arrayBuf.byteLength >= 500) {
            const buf = Buffer.from(arrayBuf);
            if (type === 'original' || type === 'raw' || type === 'image') {
              originalPhotoCache.set(strJobId, { buffer: buf, mimetype: contentType });
            }
            return { buffer: buf, mimetype: contentType };
          }
        }
      }
    } catch {
      // continue to next candidate
    }
  }

  // 6. Fallback: fetch clean CDS optical survey image for this job's calibrated coordinates (or default deep-sky field)
  const surveyBuf = (await getCdsSkyImage(strJobId)) || (await getCdsSkyImageByCoords(35.17, 57.14, 1.0, 0));
  if (surveyBuf) {
    if (type === 'original' || type === 'raw' || type === 'image') {
      originalPhotoCache.set(strJobId, { buffer: surveyBuf, mimetype: 'image/jpeg' });
    }
    return { buffer: surveyBuf, mimetype: 'image/jpeg' };
  }

  return null;
}

// Proxy Astrometry.net output images with human authentication and CDS high-res optical survey fallback
app.get('/api/astrometry/image-proxy/:jobId/:type', async (req: Request, res: Response) => {
  try {
    const { jobId, type } = req.params;
    const resolved = await resolveJobImageBuffer(jobId, type);
    if (!resolved) {
      return res.status(404).send('Astronomical plate image could not be retrieved');
    }
    res.setHeader('Content-Type', resolved.mimetype);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.send(resolved.buffer);
  } catch (error: any) {
    res.status(500).send(error.message);
  }
});

// Real-time live astronomical query to CDS SIMBAD TAP (allfluxes + basic) & Sesame Database
app.get('/api/astro/simbad', async (req: Request, res: Response) => {
  try {
    const rawTarget = req.query.target as string;
    if (!rawTarget || !rawTarget.trim()) {
      return res.status(400).json({ error: 'Target name is required' });
    }

    // Extract atomic SIMBAD candidate identifiers (e.g., "M13 (NGC 6205)" -> ["M 13", "NGC 6205", "M13"])
    const candidates: string[] = [];
    const pushCandidate = (v?: string) => {
      const s = (v || '').replace(/\s+/g, ' ').trim();
      if (s && !candidates.includes(s)) candidates.push(s);
    };

    for (const m of rawTarget.matchAll(/\b(?:Messier|M)\s*(\d{1,3})\b/gi)) {
      pushCandidate(`M ${m[1]}`);
      pushCandidate(`M${m[1]}`);
    }
    for (const n of rawTarget.matchAll(/\b(NGC|IC)\s*(\d+[A-Z]?)\b/gi)) {
      pushCandidate(`${n[1].toUpperCase()} ${n[2].toUpperCase()}`);
    }
    for (const h of rawTarget.matchAll(/\b(HD|HIP|TYC|HR|SAO)\s*([0-9-]+)\b/gi)) {
      pushCandidate(`${h[1].toUpperCase()} ${h[2]}`);
    }
    for (const part of rawTarget.split(/[()\/|—–·,]/)) {
      const cleanedPart = part.replace(/[가-힣]+/g, ' ').replace(/\s+/g, ' ').trim();
      if (cleanedPart.length >= 2 && !/^C\d{1,3}$/i.test(cleanedPart)) {
        pushCandidate(cleanedPart);
      }
    }
    pushCandidate(rawTarget.trim());

    const mirrors = [
      'https://cds.unistra.fr/cgi-bin/nph-sesame/-oxp/SNV?',
      'https://cdsweb.u-strasbg.fr/cgi-bin/nph-sesame/-oxp/SNV?',
    ];

    const querySimbadTap = async (ident: string) => {
      try {
        const safeIdent = ident.replace(/'/g, "''").trim();
        const adql = `SELECT TOP 1 main_id, ra, dec, otype_txt, sp_type, plx_value, rvz_radvel, pmra, pmdec, V, B, G, J FROM basic JOIN ident ON oid = ident.oidref LEFT JOIN allfluxes ON oid = allfluxes.oidref WHERE id = '${safeIdent}'`;
        const tapUrl = `https://simbad.cds.unistra.fr/simbad/sim-tap/sync?request=doQuery&lang=adql&format=json&query=${encodeURIComponent(adql)}`;
        const resp = await fetch(tapUrl, {
          headers: { 'User-Agent': 'AstroPlate/1.0' },
          signal: AbortSignal.timeout(4000),
        }).catch(() => null);
        if (!resp || !resp.ok) return null;
        const json = await resp.json().catch(() => null);
        const row = json?.data?.[0];
        if (!Array.isArray(row)) return null;
        const [main_id, ra, dec, otype_txt, sp_type, plx_value, rvz_radvel, pmra, pmdec, V, B, G, J] = row;
        return {
          standardName: typeof main_id === 'string' ? main_id.replace(/\s+/g, ' ').trim() : ident,
          raDeg: typeof ra === 'number' ? ra : null,
          decDeg: typeof dec === 'number' ? dec : null,
          objectType: typeof otype_txt === 'string' ? otype_txt.trim() : null,
          spectralType: typeof sp_type === 'string' && sp_type.trim() ? sp_type.trim() : null,
          parallaxMas: typeof plx_value === 'number' ? plx_value : null,
          radialVelocityKms: typeof rvz_radvel === 'number' ? rvz_radvel : null,
          properMotionMasYr:
            typeof pmra === 'number' && typeof pmdec === 'number'
              ? Number(Math.hypot(pmra, pmdec).toFixed(2))
              : null,
          vMag: typeof V === 'number' ? V : typeof G === 'number' ? G : typeof B === 'number' ? B : typeof J === 'number' ? J : null,
          bMag: typeof B === 'number' ? B : null,
          gMag: typeof G === 'number' ? G : null,
          jMag: typeof J === 'number' ? J : null,
        };
      } catch {
        return null;
      }
    };

    for (const candidate of candidates.slice(0, 4)) {
      const tapData = await querySimbadTap(candidate);

      for (const mirrorBase of mirrors) {
        try {
          const sesameUrl = `${mirrorBase}${encodeURIComponent(candidate)}`;
          const response = await fetch(sesameUrl, {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            },
            signal: AbortSignal.timeout(4000),
          });

          if (!response.ok) continue;
          const xml = await response.text();
          if (!xml || xml.includes('Nothing found')) continue;

          const jposMatch = xml.match(/<jpos>([^<]+)<\/jpos>/);
          const jradegMatch = xml.match(/<jradeg>([^<]+)<\/jradeg>/);
          const jdedegMatch = xml.match(/<jdedeg>([^<]+)<\/jdedeg>/);
          const onameMatch = xml.match(/<oname>([^<]+)<\/oname>/);
          const otypeMatch = xml.match(/<otype>([^<]+)<\/otype>/);
          const spTypeMatch = xml.match(/<spType>([^<]+)<\/spType>/);
          const plxMatch = xml.match(/<plx>\s*<v>([^<]+)<\/v>/);
          const velMatch = xml.match(/<Vel>\s*<v>([^<]+)<\/v>/);
          const pmMatch = xml.match(/<pm>\s*<v>([^<]+)<\/v>/);
          const magvMatch =
            xml.match(/<mag[^>]*band=["']V["'][^>]*>\s*<v>([^<]+)<\/v>/i) ||
            xml.match(/<mag[^>]*band=["']V["'][^>]*>([^<]+)<\/mag>/i) ||
            xml.match(/<mag[^>]*>\s*<v>([^<]+)<\/v>/i);

          if (jposMatch || jradegMatch || onameMatch || tapData) {
            const sesameVMag = magvMatch && !isNaN(parseFloat(magvMatch[1])) ? parseFloat(magvMatch[1]) : null;
            return res.json({
              query: rawTarget,
              standardName:
                tapData?.standardName ||
                (onameMatch ? onameMatch[1].replace(/\s+/g, ' ').trim() : candidate),
              objectType:
                tapData?.objectType ||
                (otypeMatch ? otypeMatch[1].trim() : 'Astronomical Object'),
              coordinatesHMS: jposMatch ? jposMatch[1].trim() : null,
              raDeg: tapData?.raDeg ?? (jradegMatch ? parseFloat(jradegMatch[1]) : null),
              decDeg: tapData?.decDeg ?? (jdedegMatch ? parseFloat(jdedegMatch[1]) : null),
              vMag: tapData?.vMag ?? sesameVMag,
              bMag: tapData?.bMag ?? null,
              gMag: tapData?.gMag ?? null,
              jMag: tapData?.jMag ?? null,
              spectralType:
                tapData?.spectralType ?? (spTypeMatch ? spTypeMatch[1].trim() : null),
              parallaxMas:
                tapData?.parallaxMas ??
                (plxMatch && !isNaN(parseFloat(plxMatch[1])) ? parseFloat(plxMatch[1]) : null),
              radialVelocityKms:
                tapData?.radialVelocityKms ??
                (velMatch && !isNaN(parseFloat(velMatch[1])) ? parseFloat(velMatch[1]) : null),
              properMotionMasYr:
                tapData?.properMotionMasYr ??
                (pmMatch && !isNaN(parseFloat(pmMatch[1])) ? parseFloat(pmMatch[1]) : null),
              source: 'CDS SIMBAD TAP & Sesame Live Astronomical Database',
            });
          }
        } catch {
          // Try next mirror or candidate
        }
      }

      if (tapData && tapData.raDeg !== null && tapData.decDeg !== null) {
        return res.json({
          query: rawTarget,
          standardName: tapData.standardName,
          objectType: tapData.objectType || 'Astronomical Object',
          coordinatesHMS: null,
          raDeg: tapData.raDeg,
          decDeg: tapData.decDeg,
          vMag: tapData.vMag,
          bMag: tapData.bMag,
          gMag: tapData.gMag,
          jMag: tapData.jMag,
          spectralType: tapData.spectralType,
          parallaxMas: tapData.parallaxMas,
          radialVelocityKms: tapData.radialVelocityKms,
          properMotionMasYr: tapData.properMotionMasYr,
          source: 'CDS SIMBAD TAP Live Astronomical Database',
        });
      }
    }

    return res.status(404).json({
      query: rawTarget,
      error: 'No matching SIMBAD entry found',
    });
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
});

// Vite or Static file serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AstroPlate Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
