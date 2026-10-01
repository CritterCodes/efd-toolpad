import { buildFeatureVector } from '@/services/lookalike/lookalike.vector.util.js';
import { getLookalikeProfiles } from '@/services/lookalike/lookalike.profile.service.js';
import { calculateLookalikeScoreFromProfiles } from '@/services/lookalike/lookalike.score.util.js';
import { calculateBlendedLookalikeScore } from '@/services/lookalike/lookalike.score.util.js';
import { GEMINI_FEATURE_SCHEMA, callGemini, leadPromptContext } from './gemini';
import { buildLeadTruthSignals, deterministicFeatureExtraction, leadIdsQuery, normalizeFeatureExtraction, normalizeLeadIds, reviewFeaturesFromLead, scoreWholesaleLeadFeatures } from './leadFeatures';
import { GEMINI_MODEL, buildActivity, getImportJobsCollection, getLeadsCollection, objectIdFilter, serializeJob, serializeLead } from './shared';
import { hydrateLeadGoogleReviewResearch, hydrateLeadWebsiteResearch } from './websiteScrape';
export async function evaluateWholesaleLead(lead) {
  const prompt = [
    'Extract structured lead qualification features for Engel Fine Design wholesale repair outreach.',
    'Do NOT produce a final score. Be conservative and only mark a signal true when supported by the provided Google/site/notes data.',
    'Treat Google review snippets as evidence. If reviews mention the owner is a jeweler, chain repair, ring sizing, stone setting, polishing, watch battery, or similar work, reflect that in the repair/revenue features even when the website is silent.',
    'EFD is strongest for pawn shops, smaller operators, jewelry sellers without repair infrastructure, businesses with used jewelry/refurbishment opportunity, and stores likely using manual repair intake.',
    'Mature in-house repair, luxury positioning, big chains, and polished full-service repair departments increase sales friction.',
    '',
    'Return ONLY valid JSON with this exact shape:',
    '{ "has_jewelry": false, "business_type": "pawn_shop|jewelry_store|watch_business|bridal_jewelry|gold_buyer|luxury_retailer|unclear", "pawn_signals": false, "used_inventory_signals": false, "refurbishment_opportunity": false, "offers_repair": false, "repair_capability": 0.0, "in_house_repair": false, "mature_in_house_repair": false, "manual_process_likelihood": 0.0, "process_maturity": "manual|semi|digital|unknown", "estimated_scale": "micro|small|medium|large|chain|unknown", "repair_volume_signal": 0.0, "revenue_opportunity": 0.0, "sales_friction": 0.0, "luxury_brand": false, "chain_or_multi_location": false, "outsourcing_evidence": false, "turnaround_complaints": false, "review_repair_evidence": false, "review_owner_jeweler_evidence": false, "review_service_mentions": [], "contact_quality": 0.0, "confidence": 0.0, "summary": "", "likely_repair_need": "", "concerns": [], "recommended_outreach_angle": "" }',
    '',
    `Lead: ${leadPromptContext(lead)}`,
  ].join('\n');

  let parsed = null;
  let geminiError = null;
  try {
    parsed = await callGemini(prompt, {
      label: 'wholesale lead feature extraction',
      responseSchema: GEMINI_FEATURE_SCHEMA,
      maxOutputTokens: 6000,
    });
  } catch (error) {
    geminiError = error;
  }
  const reviewFeatures = reviewFeaturesFromLead(lead);
  const geminiFeatures = parsed ? normalizeFeatureExtraction(parsed) : deterministicFeatureExtraction(lead, geminiError);
  const features = {
    ...geminiFeatures,
    review_repair_evidence: geminiFeatures.review_repair_evidence || reviewFeatures.review_repair_evidence,
    review_owner_jeweler_evidence: geminiFeatures.review_owner_jeweler_evidence || reviewFeatures.review_owner_jeweler_evidence,
    review_service_mentions: [...new Set([
      ...(geminiFeatures.review_service_mentions || []),
      ...(reviewFeatures.review_service_mentions || []),
    ])].slice(0, 8),
    turnaround_complaints: geminiFeatures.turnaround_complaints || reviewFeatures.turnaround_complaints,
    outsourcing_evidence: geminiFeatures.outsourcing_evidence || reviewFeatures.outsourcing_evidence,
    repeat_issues: reviewFeatures.repeat_issues,
    repair_volume_signal: Math.max(Number(geminiFeatures.repair_volume_signal || 0), Number(reviewFeatures.repair_volume_signal || 0)),
  };
  const { truthSignals, signalBreakdown } = buildLeadTruthSignals(lead, features);
  features.truthSignals = truthSignals;
  features.signalBreakdown = signalBreakdown;
  if (truthSignals.strongInHouse) {
    features.in_house_repair = true;
    features.mature_in_house_repair = true;
    features.repair_capability = Math.max(Number(features.repair_capability || 0), Number(signalBreakdown.inHouseRepairStrength || 0), 0.8);
    features.sales_friction = Math.max(Number(features.sales_friction || 0), 0.85);
  }
  if (truthSignals.outsourcingEvidence) features.outsourcing_evidence = true;
  if (truthSignals.turnaroundComplaints) features.turnaround_complaints = true;
  features.repair_volume_signal = Math.max(Number(features.repair_volume_signal || 0), Number(truthSignals.repairVolume || 0));
  const scoring = scoreWholesaleLeadFeatures(features);
  const leadVector = buildFeatureVector({ ...lead, scoreFeatures: features });
  const profiles = await getLookalikeProfiles();
  const lookalike = calculateLookalikeScoreFromProfiles(leadVector, profiles);
  const blendedLookalike = calculateBlendedLookalikeScore(scoring.fitScore, lookalike.lookalikeScore, lookalike.lookalikeConfidence);
  const adjustedFitScore = scoring.forceScoreCap === null || scoring.forceScoreCap === undefined
    ? blendedLookalike.finalScore
    : Math.min(scoring.forceScoreCap, blendedLookalike.finalScore);
  const lookalikeAdjustment = adjustedFitScore - scoring.fitScore;
  const recommendedStatus = scoring.hardNotFit || adjustedFitScore < 40
    ? 'not_fit'
    : adjustedFitScore >= 70
      ? 'qualified'
      : 'researching';
  const knownWholesaler = Boolean(lead.knownCustomerSignal?.isCurrentWholesaler);
  const finalReasons = [
    ...scoring.reasons,
    `Lookalike score ${lookalike.lookalikeScore} (${lookalikeAdjustment >= 0 ? '+' : ''}${lookalikeAdjustment}, ${Math.round(Number(lookalike.lookalikeConfidence || 0) * 100)}% confidence)`,
  ].slice(0, 10);

  return {
    fitScore: adjustedFitScore,
    baseScore: scoring.fitScore,
    scoreSource: 'rules_v1',
    aiScore: adjustedFitScore,
    aiConfidence: features.confidence,
    aiSummary: features.summary,
    likelyRepairNeed: features.likely_repair_need,
    aiConcerns: features.concerns,
    recommendedOutreachAngle: features.recommended_outreach_angle,
    scoreFeatures: features,
    truthSignals,
    signalBreakdown,
    scoreBreakdown: {
      opportunityScore: scoring.opportunityScore,
      frictionScore: scoring.frictionScore,
      hardNotFit: scoring.hardNotFit,
      forceScoreCap: scoring.forceScoreCap,
      signalBreakdown,
      model: 'rules_v1',
      lookalikeAdjustment,
      lookalikeEffectiveWeight: Math.round(blendedLookalike.effectiveWeight * 100) / 100,
      baseScore: scoring.fitScore,
      knownCustomerOverride: false,
      geminiFallback: Boolean(geminiError),
    },
    lookalikeScore: lookalike.lookalikeScore,
    lookalikeConfidence: lookalike.lookalikeConfidence,
    lookalikeReasons: lookalike.lookalikeReasons,
    lookalikeDetails: {
      customerSimilarity: lookalike.customerSimilarity,
      notFitSimilarity: lookalike.notFitSimilarity,
      adjustment: lookalikeAdjustment,
      confidence: lookalike.lookalikeConfidence,
      rawLookalikeScore: lookalike.rawLookalikeScore,
      effectiveWeight: blendedLookalike.effectiveWeight,
      customerFieldScores: lookalike.customerFieldScores,
      notFitFieldScores: lookalike.notFitFieldScores,
      profileUpdatedAt: profiles.updatedAt,
      customerSampleSize: profiles.customerProfile?.sampleSize || 0,
      customerEligibleSampleSize: profiles.customerProfile?.eligibleSampleSize || 0,
      notFitSampleSize: profiles.notFitProfile?.sampleSize || 0,
      notFitEligibleSampleSize: profiles.notFitProfile?.eligibleSampleSize || 0,
      vector: leadVector,
    },
    scoreReasons: finalReasons,
    leadTier: knownWholesaler ? 'current_account_training' : scoring.tier,
    status: knownWholesaler ? 'approved' : (['new', 'researching'].includes(lead.status) ? recommendedStatus : lead.status),
    sourceType: knownWholesaler ? 'customer' : (recommendedStatus === 'not_fit' ? 'not_fit' : (lead.sourceType || 'prospect')),
    scoreError: geminiError ? geminiError.message : null,
    updatedAt: new Date(),
  };
}

export async function scoreWholesaleLead(leadId, actor) {
  const collection = await getLeadsCollection();
  let lead = await collection.findOne(objectIdFilter(leadId));
  if (!lead) return null;
  lead = await hydrateLeadWebsiteResearch(collection, lead, actor);
  lead = await hydrateLeadGoogleReviewResearch(collection, lead, actor);

  const update = {
    ...(await evaluateWholesaleLead(lead)),
    updatedBy: actor || null,
  };

  const result = await collection.findOneAndUpdate(
    objectIdFilter(leadId),
    {
      $set: update,
      $push: { activity: buildActivity({ type: 'ai_score', message: `AI fit score set to ${update.fitScore}`, actor, metadata: { model: GEMINI_MODEL } }) },
    },
    { returnDocument: 'after' },
  );
  return serializeLead(result);
}

export async function bulkRescoreWholesaleLeads({ leadIds = [], scope = 'selected', onProgress = null } = {}, actor) {
  const collection = await getLeadsCollection();
  const ids = normalizeLeadIds(leadIds);
  const query = scope === 'active'
    ? { status: { $ne: 'not_fit' } }
    : leadIdsQuery(ids);

  if (scope !== 'active' && !ids.length) throw Object.assign(new Error('Select at least one lead to rescore'), { status: 400 });

  const leads = await collection.find(query).sort({ fitScore: -1, createdAt: -1 }).toArray();
  const results = [];
  let processed = 0;
  const updateProgress = async (patch = {}) => {
    if (typeof onProgress === 'function') {
      await onProgress({
        total: leads.length,
        processed,
        rescored: results.filter((result) => result.status === 'rescored').length,
        failed: results.filter((result) => result.status === 'failed').length,
        ...patch,
      });
    }
  };
  await updateProgress({ phase: 'starting' });

  for (const lead of leads) {
    try {
      await updateProgress({ phase: 'website_research', currentCandidate: lead.storeName });
      const researchedLead = await hydrateLeadWebsiteResearch(collection, lead, actor);
      const reviewResearchedLead = await hydrateLeadGoogleReviewResearch(collection, researchedLead, actor);
      await updateProgress({ phase: 'scoring', currentCandidate: lead.storeName });
      const update = {
        ...(await evaluateWholesaleLead(reviewResearchedLead)),
        updatedBy: actor || null,
      };
      await collection.updateOne(
        objectIdFilter(lead._id?.toString() || lead.leadId),
        {
          $set: update,
          $push: {
            activity: buildActivity({
              type: 'ai_score',
              message: `AI fit score refreshed to ${update.fitScore}`,
              actor,
              metadata: { model: GEMINI_MODEL, bulk: true, scope },
            }),
          },
        },
      );
      results.push({ leadId: lead._id?.toString(), storeName: lead.storeName, status: 'rescored', fitScore: update.fitScore });
    } catch (error) {
      results.push({ leadId: lead._id?.toString(), storeName: lead.storeName, status: 'failed', error: error.message });
    } finally {
      processed += 1;
      await updateProgress({ phase: 'running', currentCandidate: lead.storeName });
    }
  }

  return {
    scope,
    selected: scope === 'active' ? leads.length : ids.length,
    processed: results.length,
    rescored: results.filter((result) => result.status === 'rescored').length,
    failed: results.filter((result) => result.status === 'failed').length,
    results,
  };
}

export async function createWholesaleRescoreJob(options = {}, actor) {
  const jobs = await getImportJobsCollection();
  const now = new Date();
  const job = {
    type: 'wholesale_rescore',
    status: 'queued',
    phase: 'queued',
    options,
    progress: {
      total: 0,
      processed: 0,
      rescored: 0,
      failed: 0,
    },
    result: null,
    error: null,
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

export async function getWholesaleRescoreJob(jobId) {
  const jobs = await getImportJobsCollection();
  const job = await jobs.findOne({ ...objectIdFilter(jobId), type: 'wholesale_rescore' });
  return job ? serializeJob(job) : null;
}

export async function getLatestWholesaleRescoreJob() {
  const jobs = await getImportJobsCollection();
  const job = await jobs.findOne({ type: 'wholesale_rescore' }, { sort: { createdAt: -1 } });
  return job ? serializeJob(job) : null;
}

export async function runWholesaleRescoreJob(jobId, actor) {
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
    const result = await bulkRescoreWholesaleLeads({
      ...(job?.options || {}),
      onProgress: async (progress) => {
        await jobs.updateOne(objectIdFilter(jobId), {
          $set: {
            status: 'running',
            phase: progress.phase || 'running',
            currentCandidate: progress.currentCandidate || '',
            progress: {
              total: progress.total || 0,
              processed: progress.processed || 0,
              rescored: progress.rescored || 0,
              failed: progress.failed || 0,
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
          total: result.processed || 0,
          processed: result.processed || 0,
          rescored: result.rescored || 0,
          failed: result.failed || 0,
        },
        currentCandidate: '',
        finishedAt,
        updatedAt: finishedAt,
      },
    });
  } catch (error) {
    const finishedAt = new Date();
    await jobs.updateOne(objectIdFilter(jobId), {
      $set: {
        status: 'failed',
        phase: 'failed',
        error: error.message || 'Rescore failed',
        finishedAt,
        updatedAt: finishedAt,
      },
    });
  }

  return getWholesaleRescoreJob(jobId);
}

