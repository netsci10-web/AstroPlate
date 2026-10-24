export interface RememberedAccountJob {
  jobId: number | string;
  filename?: string;
  status: string;
  objects?: string[];
  dateAdded: number;
  calibration?: {
    ra?: number;
    dec?: number;
    radius?: number;
  } | null;
}

export const ACCOUNT_JOBS_STORAGE_KEY = 'astroplate_account_jobs';
export const DELETED_JOBS_STORAGE_KEY = 'astroplate_deleted_job_ids';

export function getDeletedJobIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DELETED_JOBS_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed.map(String) : []);
  } catch (e) {
    return new Set();
  }
}

export function markJobAsDeleted(jobId: number | string): void {
  try {
    const set = getDeletedJobIds();
    set.add(String(jobId));
    localStorage.setItem(DELETED_JOBS_STORAGE_KEY, JSON.stringify(Array.from(set)));
  } catch (e) {}
}

export function markAllJobsAsDeleted(jobIds: (number | string)[]): void {
  try {
    const set = getDeletedJobIds();
    jobIds.forEach((id) => set.add(String(id)));
    localStorage.setItem(DELETED_JOBS_STORAGE_KEY, JSON.stringify(Array.from(set)));
  } catch (e) {}
}

export function isJobDeleted(jobId: number | string): boolean {
  if (!jobId) return false;
  return getDeletedJobIds().has(String(jobId));
}

export function getRememberedAccountJobs(): RememberedAccountJob[] {
  try {
    const raw = localStorage.getItem(ACCOUNT_JOBS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const deleted = getDeletedJobIds();
    if (Array.isArray(parsed)) {
      return parsed.filter((j) => j && j.jobId && !deleted.has(String(j.jobId)));
    }
    return [];
  } catch (e) {
    console.error('Failed to parse remembered account jobs:', e);
    return [];
  }
}

export function saveRememberedAccountJobs(jobs: RememberedAccountJob[]): void {
  try {
    const deleted = getDeletedJobIds();
    const filtered = jobs.filter((j) => j && j.jobId && !deleted.has(String(j.jobId)));
    localStorage.setItem(ACCOUNT_JOBS_STORAGE_KEY, JSON.stringify(filtered.slice(0, 100)));
  } catch (e) {
    console.error('Failed to save remembered account jobs:', e);
  }
}

export function rememberAccountJob(
  jobId: number | string,
  filename?: string,
  objects?: string[],
  status: string = 'success',
  calibration?: any
): RememberedAccountJob[] {
  if (!jobId) return getRememberedAccountJobs();
  const strId = String(jobId);

  // If this job was previously marked deleted, un-delete it because user is explicitly analyzing it now
  try {
    const deleted = getDeletedJobIds();
    if (deleted.has(strId)) {
      deleted.delete(strId);
      localStorage.setItem(DELETED_JOBS_STORAGE_KEY, JSON.stringify(Array.from(deleted)));
    }
  } catch (e) {}

  const current = getRememberedAccountJobs();
  const existingIdx = current.findIndex((j) => String(j.jobId) === strId);
  const existing = existingIdx >= 0 ? current[existingIdx] : null;

  const updated: RememberedAccountJob = {
    ...(existing || {}),
    jobId,
    filename: filename || existing?.filename || `Astrometry Job #${jobId}`,
    status: status || existing?.status || 'success',
    objects: objects && objects.length > 0 ? objects : existing?.objects || [],
    dateAdded: Date.now(),
    calibration: calibration || existing?.calibration || null,
  };

  const filtered = current.filter((j) => String(j.jobId) !== strId);
  const next = [updated, ...filtered];
  saveRememberedAccountJobs(next);
  return next;
}

export function deleteRememberedAccountJob(jobId: number | string): RememberedAccountJob[] {
  markJobAsDeleted(jobId);
  const strId = String(jobId);
  const current = getRememberedAccountJobs();
  const next = current.filter((j) => String(j.jobId) !== strId);
  saveRememberedAccountJobs(next);

  // Clean from raw storage as well
  try {
    const raw = localStorage.getItem(ACCOUNT_JOBS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const cleaned = parsed.filter((item: any) => String(item.jobId) !== strId && item.id !== `job_${strId}`);
        localStorage.setItem(ACCOUNT_JOBS_STORAGE_KEY, JSON.stringify(cleaned));
      }
    }
    localStorage.removeItem('astroplate_user_history');
  } catch (e) {}

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('astroplate_jobs_updated', { detail: { action: 'delete', jobId } }));
  }

  return next;
}

export function clearAllRememberedAccountJobs(currentJobs: (number | string)[] = []): void {
  try {
    const current = getRememberedAccountJobs();
    const allIds = [...current.map((j) => j.jobId), ...currentJobs];
    markAllJobsAsDeleted(allIds);
    localStorage.removeItem(ACCOUNT_JOBS_STORAGE_KEY);
    localStorage.removeItem('astroplate_user_history');
  } catch (e) {}

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('astroplate_jobs_updated', { detail: { action: 'clearAll' } }));
  }
}
