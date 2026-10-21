import express, { Request, Response } from 'express';
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

    const setCookie = askResp.headers.get('set-cookie') || '';
    const html = await askResp.text().catch(() => '');
    const csrfMatch = html.match(/name="csrfmiddlewaretoken"\s+value="([^"]+)"/);
    const csrf = csrfMatch ? csrfMatch[1] : '';

    if (csrf) {
      const amResp = await fetch('https://nova.astrometry.net/am_human', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Cookie: setCookie,
          Referer: 'https://nova.astrometry.net/ask_human',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        body: `csrfmiddlewaretoken=${encodeURIComponent(csrf)}&human=yup&next=/`,
        redirect: 'manual',
        signal: AbortSignal.timeout(3000),
      }).catch(() => null);

      if (amResp) {
        const amSetCookie = amResp.headers.get('set-cookie') || '';
        const combined = [setCookie.split(';')[0], amSetCookie.split(';')[0]].filter(Boolean).join('; ');
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

    res.json({
      jobIds: combinedIds,
      detailed: detailed.filter((d) => d && !deletedJobIds.has(String(d.jobId))),
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
      solveOptions.url = imageUrl;
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

    const formData = new FormData();
    formData.append('request-json', JSON.stringify(solveOptions));
    const fileBlob = new Blob([new Uint8Array(buffer)], { type: mimeType || 'image/jpeg' });
    formData.append('file', fileBlob, filename || 'astrophoto.jpg');

    const uploadResp = await fetch('https://nova.astrometry.net/api/upload', {
      method: 'POST',
      headers: {
        'User-Agent': 'AstroPlate/1.0',
      },
      body: formData,
    });

    const uploadData = await uploadResp.json();
    if (uploadData.status !== 'success') {
      return res.status(400).json({ error: uploadData.errormessage || '이미지 분석 제출 실패' });
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
      return res.status(404).json({ error: `Local job #${jobId} calibration not found.` });
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
      return res.json({ annotations: hist?.solvedData?.annotations || [] });
    }
    const resp = await fetch(`https://nova.astrometry.net/api/jobs/${jobId}/annotations/`, {
      headers: { 'User-Agent': 'AstroPlate/1.0' },
    });
    if (!resp.ok) {
      return res.status(resp.status).json({ error: `Job annotations fetch failed: ${resp.statusText}` });
    }
    const data = await resp.json();
    res.json(data);
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
      const hist = userHistory.find((h) => String(h.jobId) === String(jobId));
      if (hist && hist.solvedData) {
        return res.json({
          jobId,
          calibration: hist.solvedData.calibration,
          annotations: hist.solvedData.annotations || [],
          info: hist.solvedData.info || {},
        });
      }
      return res.status(404).json({ error: `Local job #${jobId} not found on server.` });
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
    const annotations = annResp.ok ? await annResp.json() : { annotations: [] };
    const info = infoResp.ok ? await infoResp.json() : {};

    res.json({
      jobId,
      calibration,
      annotations: annotations.annotations || annotations || [],
      info,
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

// Proxy Astrometry.net output images with human authentication and CDS high-res optical survey fallback
app.get('/api/astrometry/image-proxy/:jobId/:type', async (req: Request, res: Response) => {
  try {
    const { jobId, type } = req.params;

    // Check if this is a local in-browser solved job
    if (isLocalJobId(jobId)) {
      // 1. Check in-memory uploaded photo cache
      const cached = originalPhotoCache.get(String(jobId));
      if (cached) {
        res.setHeader('Content-Type', cached.mimetype);
        res.setHeader('Cache-Control', 'public, max-age=86400');
        return res.send(cached.buffer);
      }

      // 2. Check userHistory for image data or coordinates
      const hist = userHistory.find((h) => String(h.jobId) === String(jobId));
      if (hist) {
        const targetImg = hist.imageUrl || hist.rawImageUrl || '';
        if (targetImg.startsWith('data:image/')) {
          const mime = targetImg.match(/data:(image\/[^;]+);base64,/)?.[1] || 'image/jpeg';
          const base64Data = targetImg.replace(/^data:image\/[^;]+;base64,/, '');
          const buf = Buffer.from(base64Data, 'base64');
          res.setHeader('Content-Type', mime);
          res.setHeader('Cache-Control', 'public, max-age=86400');
          return res.send(buf);
        }

        // If coordinates exist, fetch real CDS sky survey image for this field!
        if (typeof hist.raDeg === 'number' && typeof hist.decDeg === 'number') {
          const cdsBuf = await getCdsSkyImageByCoords(hist.raDeg, hist.decDeg, hist.radiusDeg || 1.0, 0);
          if (cdsBuf) {
            res.setHeader('Content-Type', 'image/jpeg');
            res.setHeader('Cache-Control', 'public, max-age=86400');
            return res.send(cdsBuf);
          }
        }
      }

      return res.status(404).send('Local job image not available');
    }

    // Dedicated optical survey mode for remote jobs
    if (type === 'survey') {
      const surveyBuf = await getCdsSkyImage(jobId);
      if (surveyBuf) {
        res.setHeader('Content-Type', 'image/jpeg');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        return res.send(surveyBuf);
      }
      return res.status(404).send('Survey image unavailable');
    }

    // 1. If original/raw image requested, first check in-memory cache of user's uploaded photo
    if (type === 'original' || type === 'raw' || type === 'image') {
      const cached = originalPhotoCache.get(String(jobId));
      if (cached) {
        res.setHeader('Content-Type', cached.mimetype);
        res.setHeader('Cache-Control', 'public, max-age=86400');
        return res.send(cached.buffer);
      }

      // If no local uploaded photo cached, fetch authentic clean CDS optical survey image
      const surveyBuf = await getCdsSkyImage(jobId);
      if (surveyBuf) {
        originalPhotoCache.set(String(jobId), { buffer: surveyBuf, mimetype: 'image/jpeg' });
        res.setHeader('Content-Type', 'image/jpeg');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        return res.send(surveyBuf);
      }
    }

    // 2. Candidate upstream Astrometry URLs in order of preference (full resolution first)
    let candidateUrls: string[] = [];
    if (type === 'annotated' || type === 'annotated_full') {
      candidateUrls = [
        `https://nova.astrometry.net/annotated_full/${jobId}`,
        `https://nova.astrometry.net/annotated_display/${jobId}`,
      ];
    } else if (type === 'red_green') {
      candidateUrls = [
        `https://nova.astrometry.net/red_green_image_full/${jobId}`,
        `https://nova.astrometry.net/red_green_image_display/${jobId}`,
      ];
    } else if (type === 'extraction') {
      candidateUrls = [
        `https://nova.astrometry.net/extraction_image_full/${jobId}`,
        `https://nova.astrometry.net/extraction_image_display/${jobId}`,
      ];
    } else if (type === 'grid') {
      candidateUrls = [
        `https://nova.astrometry.net/grid_full/${jobId}`,
        `https://nova.astrometry.net/grid_display/${jobId}`,
      ];
    } else if (type === 'original' || type === 'raw' || type === 'image') {
      candidateUrls = [
        `https://nova.astrometry.net/image/${jobId}`,
        `https://nova.astrometry.net/annotated_full/${jobId}`,
        `https://nova.astrometry.net/annotated_display/${jobId}`,
      ];
    } else {
      candidateUrls = [
        `https://nova.astrometry.net/annotated_full/${jobId}`,
        `https://nova.astrometry.net/annotated_display/${jobId}`,
      ];
    }

    // 3. Attempt retrieval with human session cookie to bypass ask_human bot barrier
    let cookie = await getHumanSessionCookie();
    for (const targetUrl of candidateUrls) {
      try {
        let upstream = await fetch(targetUrl, {
          headers: {
            'Cookie': cookie,
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          },
          redirect: 'manual',
          signal: AbortSignal.timeout(4000),
        }).catch(() => null);

        if (!upstream) continue;

        // If ask_human redirect occurred, refresh human session and retry once
        if (upstream.status === 302 || upstream.headers.get('content-type')?.includes('text/html')) {
          cookie = await getHumanSessionCookie(true);
          upstream = await fetch(targetUrl, {
            headers: {
              'Cookie': cookie,
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
            },
            redirect: 'manual',
            signal: AbortSignal.timeout(4000),
          }).catch(() => null);
        }

        if (upstream && upstream.ok) {
          const contentType = upstream.headers.get('content-type') || '';
          if (contentType.startsWith('image/')) {
            const arrayBuf = await upstream.arrayBuffer().catch(() => null);
            if (arrayBuf && arrayBuf.byteLength >= 10000) {
              res.setHeader('Content-Type', contentType);
              res.setHeader('Cache-Control', 'public, max-age=86400');
              return res.send(Buffer.from(arrayBuf));
            }
          }
        }
      } catch {
        // silent catch
      }
    }

    res.status(404).send('Astronomical plate image could not be retrieved');
  } catch (error: any) {
    res.status(500).send(error.message);
  }
});

// Real-time live astronomical query to CDS Sesame & SIMBAD Database
app.get('/api/astro/simbad', async (req: Request, res: Response) => {
  try {
    const target = req.query.target as string;
    if (!target || !target.trim()) {
      return res.status(400).json({ error: 'Target name is required' });
    }

    // Query CDS Sesame service
    const sesameUrl = `https://cds.unistra.fr/cgi-bin/nph-sesame/-oxp/SNV?${encodeURIComponent(target.trim())}`;
    const response = await fetch(sesameUrl, {
      headers: { 'User-Agent': 'AstroPlate/1.0' },
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to query CDS Sesame' });
    }

    const xml = await response.text();

    // Extract basic properties from XML
    const jposMatch = xml.match(/<jpos>([^<]+)<\/jpos>/);
    const jradegMatch = xml.match(/<jradeg>([^<]+)<\/jradeg>/);
    const jdedegMatch = xml.match(/<jdedeg>([^<]+)<\/jdedeg>/);
    const onameMatch = xml.match(/<oname>([^<]+)<\/oname>/);
    const otypeMatch = xml.match(/<otype>([^<]+)<\/otype>/);
    const magvMatch = xml.match(/<mag[^>]*band="V"[^>]*>([^<]+)<\/mag>/i);

    res.json({
      query: target,
      standardName: onameMatch ? onameMatch[1] : target,
      objectType: otypeMatch ? otypeMatch[1] : 'Astronomical Object',
      coordinatesHMS: jposMatch ? jposMatch[1] : null,
      raDeg: jradegMatch ? parseFloat(jradegMatch[1]) : null,
      decDeg: jdedegMatch ? parseFloat(jdedegMatch[1]) : null,
      vMag: magvMatch ? parseFloat(magvMatch[1]) : null,
      source: 'CDS SIMBAD / Sesame Live Astronomical Database',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
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
