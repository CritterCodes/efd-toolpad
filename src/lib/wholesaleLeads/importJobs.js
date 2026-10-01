import { getImportJobsCollection, objectIdFilter, serializeJob } from './shared';
import { importGoogleWholesaleLeads } from './googleImport';
export async function createWholesaleImportJob(options = {}, actor) {
  const jobs = await getImportJobsCollection();
  const now = new Date();
  const job = {
    type: 'google_places_import',
    status: 'queued',
    phase: 'queued',
    options,
    progress: {
      processedCandidates: 0,
      saved: 0,
      duplicates: 0,
      rejected: 0,
      scoringErrors: 0,
      searchErrors: 0,
      detailErrors: 0,
      emailDiscoveries: 0,
      outOfRadius: 0,
    },
    result: null,
    error: null,
    currentQuery: '',
    currentCandidate: '',
    createdBy: actor || null,
    createdAt: now,
    updatedAt: now,
    startedAt: null,
    finishedAt: null,
  };
  const result = await jobs.insertOne(job);
  return serializeJob({ ...job, _id: result.insertedId });
}

export async function getWholesaleImportJob(jobId) {
  const jobs = await getImportJobsCollection();
  const job = await jobs.findOne(objectIdFilter(jobId));
  return job ? serializeJob(job) : null;
}

export async function getLatestWholesaleImportJob() {
  const jobs = await getImportJobsCollection();
  const job = await jobs.findOne({}, { sort: { createdAt: -1 } });
  return job ? serializeJob(job) : null;
}

export async function claimNextQueuedWholesaleImportJob(workerId = 'wholesale-import-worker') {
  const jobs = await getImportJobsCollection();
  const now = new Date();
  const result = await jobs.findOneAndUpdate(
    { type: 'google_places_import', status: 'queued' },
    {
      $set: {
        status: 'running',
        phase: 'claimed',
        workerId,
        claimedAt: now,
        updatedAt: now,
      },
    },
    {
      sort: { createdAt: 1 },
      returnDocument: 'after',
    },
  );
  return result ? serializeJob(result) : null;
}

export async function cancelWholesaleImportJob(jobId, actor) {
  const jobs = await getImportJobsCollection();
  const now = new Date();
  const result = await jobs.updateOne(
    { ...objectIdFilter(jobId), type: 'google_places_import', status: { $in: ['queued', 'running'] } },
    {
      $set: {
        status: 'cancelled',
        phase: 'cancelled',
        error: null,
        cancelledBy: actor || null,
        cancelledAt: now,
        finishedAt: now,
        updatedAt: now,
      },
    },
  );
  if (!result.matchedCount) return null;
  return getWholesaleImportJob(jobId);
}

export async function runWholesaleImportJob(jobId, actor) {
  const jobs = await getImportJobsCollection();
  const startedAt = new Date();
  await jobs.updateOne(objectIdFilter(jobId), {
    $set: {
      status: 'running',
      phase: 'starting',
      startedAt,
      updatedAt: startedAt,
    },
  });

  try {
    const job = await jobs.findOne(objectIdFilter(jobId));
    const result = await importGoogleWholesaleLeads({
      ...(job?.options || {}),
      onProgress: async (progress) => {
        const currentJob = await jobs.findOne(objectIdFilter(jobId), { projection: { status: 1 } });
        if (currentJob?.status === 'cancelled') {
          throw Object.assign(new Error('Import cancelled'), { cancelled: true });
        }
        await jobs.updateOne(objectIdFilter(jobId), {
          $set: {
            status: 'running',
            phase: progress.phase || 'running',
            currentQuery: progress.currentQuery || '',
            currentCandidate: progress.currentCandidate || '',
            progress: {
              processedCandidates: progress.processedCandidates || 0,
              saved: progress.saved || 0,
              duplicates: progress.duplicates || 0,
              rejected: progress.rejected || 0,
              scoringErrors: progress.scoringErrors || 0,
              searchErrors: progress.searchErrors || 0,
              detailErrors: progress.detailErrors || 0,
              emailDiscoveries: progress.emailDiscoveries || 0,
              outOfRadius: progress.outOfRadius || 0,
            },
            updatedAt: new Date(),
          },
        });
      },
    }, actor);

    const finishedAt = new Date();
    await jobs.updateOne(objectIdFilter(jobId), {
      $set: {
        status: 'completed',
        phase: 'completed',
        result,
        progress: {
          processedCandidates: result.processedCandidates || 0,
          saved: result.imported?.length || 0,
          duplicates: result.duplicates?.length || 0,
          rejected: result.rejected?.length || 0,
          scoringErrors: result.scoringErrors?.length || 0,
          searchErrors: result.searchErrors?.length || 0,
          detailErrors: result.detailErrors?.length || 0,
          emailDiscoveries: result.emailDiscoveries?.length || 0,
          outOfRadius: result.outOfRadius?.length || 0,
        },
        currentQuery: '',
        currentCandidate: '',
        finishedAt,
        updatedAt: finishedAt,
      },
    });
  } catch (error) {
    const finishedAt = new Date();
    if (error.cancelled) {
      await jobs.updateOne(objectIdFilter(jobId), {
        $set: {
          status: 'cancelled',
          phase: 'cancelled',
          error: null,
          finishedAt,
          updatedAt: finishedAt,
        },
      });
      return getWholesaleImportJob(jobId);
    }
    await jobs.updateOne(objectIdFilter(jobId), {
      $set: {
        status: 'failed',
        phase: 'failed',
        error: error.message || 'Import failed',
        finishedAt,
        updatedAt: finishedAt,
      },
    });
  }

  return getWholesaleImportJob(jobId);
}

