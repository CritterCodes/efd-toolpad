import { GEMINI_MODEL, buildActivity, getLeadsCollection, getWholesaleApplicationUrl, normalizeOutreachDraftLinks, normalizeString, objectIdFilter, serializeLead } from './shared';
import { discoverEmailFromWebsite, hydrateLeadGoogleReviewResearch, hydrateLeadWebsiteResearch, scrapeWholesaleLeadWebsiteResearch } from './websiteScrape';
import { GEMINI_OUTREACH_SCHEMA, callGemini, leadPromptContext } from './gemini';
import { createTransporter, leadIdsQuery, normalizeLeadIds } from './leadFeatures';
export async function findWholesaleLeadEmail(leadId, actor) {
  const collection = await getLeadsCollection();
  const lead = await collection.findOne(objectIdFilter(leadId));
  if (!lead) return null;
  if (!lead.website) throw Object.assign(new Error('Lead does not have a website to scrape'), { status: 400 });

  const discovery = await discoverEmailFromWebsite(lead.website);
  const research = await scrapeWholesaleLeadWebsiteResearch(lead.website);
  const inHouseStrength = Number(research.signals?.inHouseRepairStrength || research.signals?.inHouseDetection?.inHouseRepairStrength || 0);
  const patch = {
    emailDiscovery: discovery,
    websiteResearch: research,
    websiteSummary: research.summary,
    websiteSignals: research.signals,
    truthSignals: {
      ...(lead.truthSignals || {}),
      strongInHouse: Boolean(lead.truthSignals?.strongInHouse || research.signals?.strongInHouseRepairMentioned || inHouseStrength >= 0.8),
    },
    signalBreakdown: {
      ...(lead.signalBreakdown || {}),
      inHouseDetected: Boolean(lead.signalBreakdown?.inHouseDetected || research.signals?.strongInHouseRepairMentioned || inHouseStrength >= 0.8),
      inHouseRepairStrength: Math.max(Number(lead.signalBreakdown?.inHouseRepairStrength || 0), inHouseStrength),
      websiteOutsourcingDetected: Boolean(research.signals?.outsourcingEvidence),
      websiteVagueRepairMention: Boolean(research.signals?.vagueRepairMention),
      websiteTimeEstimateMentioned: Boolean(research.signals?.timeEstimateMentioned),
    },
    websiteResearchCheckedAt: research.checkedAt,
    updatedAt: new Date(),
    updatedBy: actor || null,
  };
  if (discovery.email) {
    patch.email = discovery.email;
    patch.emailSource = 'website_scrape';
  }

  const result = await collection.findOneAndUpdate(
    objectIdFilter(leadId),
    {
      $set: patch,
      $push: {
        activity: buildActivity({
          type: discovery.email ? 'email_found' : 'email_not_found',
          message: discovery.email ? `Found email ${discovery.email} from website and refreshed website research` : 'No email found on website; refreshed website research',
          actor,
          metadata: { checkedUrls: discovery.checkedUrls, candidates: discovery.candidates, websiteSignals: research.signals },
        }),
      },
    },
    { returnDocument: 'after' },
  );
  return serializeLead(result);
}

export async function generateWholesaleLeadOutreach(leadId, actor) {
  const collection = await getLeadsCollection();
  let lead = await collection.findOne(objectIdFilter(leadId));
  if (!lead) return null;
  lead = await hydrateLeadWebsiteResearch(collection, lead, actor);
  lead = await hydrateLeadGoogleReviewResearch(collection, lead, actor);

  const outreachDraft = await buildWholesaleLeadOutreachDraft(lead);

  const result = await collection.findOneAndUpdate(
    objectIdFilter(leadId),
    {
      $set: { outreachDraft, updatedAt: new Date(), updatedBy: actor || null },
      $push: { activity: buildActivity({ type: 'outreach', message: 'Outreach draft generated', actor, metadata: { model: outreachDraft.model } }) },
    },
    { returnDocument: 'after' },
  );
  return serializeLead(result);
}

export async function buildWholesaleLeadOutreachDraft(lead) {
  const applicationUrl = getWholesaleApplicationUrl();

  const prompt = [
    'Write a warm, personal wholesale outreach email from Jake Engel, owner and operator of Engel Fine Design.',
    'It must sound like a real small-business owner wrote it, not like marketing automation or spam.',
    'Use a plain, direct, conversational tone. Keep it concise: 2-4 short paragraphs.',
    'Mention Engel Fine Design is a small business in Fort Smith, Arkansas, looking to build real wholesale repair relationships with other jewelry stores.',
    'Focus on jewelry repair support, repair overflow, bench coverage, clear repair intake, repair tracking, and making the store-side repair process easier.',
    'Do not pitch custom design, bespoke design, CAD/design services, or a national team of jewelers/designers.',
    'Mention free access to EFD repair management software as a practical benefit for tracking client repairs.',
    'Personalize the email based on what the business appears to be. If it is a pawn shop, call it a pawn shop and discuss jewelry customers, adding or expanding repair/refurbishment services, and replacing paper/manual repair tracking. Do not call a pawn shop a jewelry store.',
    'For pawn shops or used/estate jewelry businesses, include refurbishment when relevant: cleaning, polishing, repairing, or restoring jewelry pieces so they are easier to sell or worth more in the case.',
    'If the lead clearly offers repair, do not assume they have a polished in-house department. Frame the value around getting off paper envelopes/manual tracking, cleaner intake, overflow support, and consistent bench coverage.',
    'If the lead appears to sell jewelry but does not clearly offer repair, frame the value around adding repair/refurbishment as an additional service with low operational friction.',
    'If repair availability is unknown, gracefully say you were not sure whether they currently offer jewelry repair, but wanted to share an easy way to add or organize it if useful.',
    'Avoid sounding like EFD is trying to replace a mature in-house repair department. The pitch is best for smaller operators who want repair/refurbishment revenue and a better system without building a full repair operation.',
    'Make the primary call to action a low-friction invitation to apply for a free wholesale repair account and look around. Do not make a phone call or meeting the main ask.',
    'Include the application URL in the email body as the main next step, using simple wording like "You can apply for access here".',
    'A reply or call can be mentioned only as an optional path if they have questions. If mentioning phone contact, use Jake Engel at 479-546-6740.',
    'Do not overpromise, use hype, or use phrases like "revolutionize", "synergy", "game changer", or "just checking in".',
    'Use as much known context as possible: store name, city, business type, Google categories, rating/reviews, repair signals, jewelry sales signals, and notes. Do not invent details.',
    'End with a low-pressure account access invitation and include Jake Engel as the signature.',
    '',
    'Return ONLY valid JSON with this exact shape:',
    '{ "subject": "", "emailBody": "", "callOpener": "", "followUpNote": "", "inviteMessage": "" }',
    '',
    `Application URL: ${applicationUrl}`,
    `Lead: ${leadPromptContext(lead)}`,
  ].join('\n');

  const parsed = await callGemini(prompt, {
    label: 'wholesale outreach draft',
    responseSchema: GEMINI_OUTREACH_SCHEMA,
    maxOutputTokens: 6000,
  });
  return {
    subject: normalizeString(parsed.subject),
    emailBody: normalizeString(parsed.emailBody),
    callOpener: normalizeString(parsed.callOpener),
    followUpNote: normalizeString(parsed.followUpNote),
    inviteMessage: normalizeString(parsed.inviteMessage) || `You can apply for wholesale repair access here: ${applicationUrl}`,
    applicationUrl,
    model: GEMINI_MODEL,
    generatedAt: new Date(),
  };
}

export async function ensureWholesaleLeadOutreachDraft(collection, lead, actor, forceDraft = false) {
  if (lead.outreachDraft?.subject && lead.outreachDraft?.emailBody && !forceDraft) return normalizeOutreachDraftLinks(lead.outreachDraft);
  const outreachDraft = await buildWholesaleLeadOutreachDraft(lead);
  await collection.updateOne(
    objectIdFilter(lead._id?.toString() || lead.leadId),
    {
      $set: { outreachDraft, updatedAt: new Date(), updatedBy: actor || null },
      $push: { activity: buildActivity({ type: 'outreach', message: 'Outreach draft generated', actor, metadata: { model: outreachDraft.model, bulk: true } }) },
    },
  );
  return outreachDraft;
}

export async function bulkWholesaleLeadOutreach({ leadIds = [], action = 'draft', forceDraft = false, confirmSend = false } = {}, actor) {
  const ids = normalizeLeadIds(leadIds);
  if (!ids.length) throw Object.assign(new Error('Select at least one lead'), { status: 400 });
  if (!['draft', 'send'].includes(action)) throw Object.assign(new Error('Invalid bulk outreach action'), { status: 400 });
  if (action === 'send' && confirmSend !== true) {
    throw Object.assign(new Error('confirmSend is required before sending outreach emails'), { status: 400 });
  }

  const collection = await getLeadsCollection();
  const leads = await collection.find(leadIdsQuery(ids)).toArray();
  const byId = new Map(leads.flatMap((lead) => [
    [lead._id?.toString(), lead],
    [lead.leadId, lead],
  ]));

  const selected = ids.map((id) => byId.get(id)).filter(Boolean);
  const missing = ids.filter((id) => !byId.has(id));
  const results = [];
  const skipped = missing.map((id) => ({ leadId: id, reason: 'not_found' }));
  let transporter = null;
  let from = null;

  if (action === 'send') {
    const transport = createTransporter();
    transporter = transport.transporter;
    from = transport.from;
  }

  for (const lead of selected) {
    const publicLeadId = lead._id?.toString();
    if (lead.status === 'not_fit') {
      skipped.push({ leadId: publicLeadId, storeName: lead.storeName, reason: 'not_fit' });
      continue;
    }

    if (action === 'send' && !normalizeString(lead.email)) {
      skipped.push({ leadId: publicLeadId, storeName: lead.storeName, reason: 'missing_email' });
      continue;
    }

    try {
      const outreachDraft = await ensureWholesaleLeadOutreachDraft(collection, lead, actor, forceDraft);

      if (action === 'draft') {
        results.push({ leadId: publicLeadId, storeName: lead.storeName, email: lead.email || '', subject: outreachDraft.subject, status: 'drafted' });
        continue;
      }

      const info = await transporter.sendMail({
        from,
        to: lead.email,
        subject: outreachDraft.subject || 'Wholesale jewelry repair support',
        text: outreachDraft.emailBody,
      });

      const sentAt = new Date();
      await collection.updateOne(
        objectIdFilter(publicLeadId),
        {
          $set: {
            status: 'contacted',
            lastContactedAt: sentAt,
            outreachSentAt: sentAt,
            outreachLastSentAt: sentAt,
            updatedAt: sentAt,
            updatedBy: actor || null,
          },
          $inc: { outreachSendCount: 1 },
          $push: {
            activity: buildActivity({
              type: 'outreach_sent',
              message: `Outreach email sent to ${lead.email}`,
              actor,
              metadata: { messageId: info.messageId, bulk: true },
            }),
          },
        },
      );

      results.push({ leadId: publicLeadId, storeName: lead.storeName, email: lead.email, subject: outreachDraft.subject, status: 'sent', messageId: info.messageId });
    } catch (error) {
      results.push({ leadId: publicLeadId, storeName: lead.storeName, email: lead.email || '', status: 'failed', error: error.message });
    }
  }

  return {
    action,
    selected: ids.length,
    matched: selected.length,
    processed: results.length,
    sent: results.filter((result) => result.status === 'sent').length,
    drafted: results.filter((result) => result.status === 'drafted').length,
    failed: results.filter((result) => result.status === 'failed').length,
    skipped,
    results,
  };
}

