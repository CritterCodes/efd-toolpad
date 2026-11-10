/**
 * MADE-UP intake notes — not real tickets, and never stored with them. They exist because the 69 real tickets never
 * ask for 11 of the 32 tasks and ask for 10 more exactly once (owner, 2026-11-10: "write a whole bunch of data to test
 * with for the tasks that aren't being tested regularly").
 *
 * Written in the two voices the real notes come in: dictated ("14-karat yellow gold ring, size 9, needs to be a size
 * 8.") and shorthand ("14k wg size 8 to 6.5", "10k yg break in shank"), with the same speech-to-text slips ("breaking
 * chain", "laser × 1").
 *
 * c(note, { task title: quantity }, { metal, sizes, stock, ruling })
 *   metal    [type, karat, colour] the note states; omitted = not scored
 *   sizes    [current, desired]; omitted = not scored
 *   stock    sizing stock the owner's rule gives (default 0)
 *   ruling   the expected answer is MY GUESS and the owner has not ruled. Scored and printed apart, never ratcheted.
 *
 * The expected answers come from the task descriptions and the owner's rulings of 2026-11-09 — not from what the
 * code does today. A case that fails is either a bug or a wrong expectation; both are worth knowing.
 */
import crypto from 'node:crypto';

const SD = 'Size Down';
const SU = 'Size up (1 size) - up to 3mm x 2 mm shank';
const SUW = 'Size Up  - 3mm to 5mm shanks';
const SUC = 'Size Up (Customer Supplied Gold)';
const RT = 'Retip prongs';
const SS1 = 'Set Stone less than0.49ct';
const SS2 = 'Set Stone 0.5ct to 0.99ct';
const SS3 = 'Set Stone 1ct or larger';
const CT = 'Check & Tighten < 20 stones';
const CT20 = 'Check & Tighten — over 20 stones';
const CP = 'Clean and Polish';
const LW = 'Laser Weld';
const RP = 'Reprong';
const BC = 'Break in chain';
const BS = 'Break in Shank';
const WB = 'Watch Battery';
const SP = 'Straighten Prongs — up to 20 stones';
const HS = 'Half-Shank — up to 3mm';
const HSW = 'Half-Shank — 3 to 5mm';
const ST = 'Solder Together per Ring';
const SB = 'Sizing Beads';
const RR = 'Reshape Ring';
const JR = 'Add 18gu Jump Ring — 5mm and smaller';
const JRL = 'Add 18gu Jump Ring w/ laser — 5mm and smaller';
const CR = 'Clasp Repair';
const WL = 'Watch Link Removal';
const GP = 'Glue Pearl';
const SDP = 'Size Down — Platinum (laser welded)';
const SUP = 'Size Up (1 size) — Platinum (laser welded)';
const HSP = 'Half-Shank — Platinum, up to 3mm (laser welded)';
const HSPW = 'Half-Shank — Platinum, 3 to 5mm (laser welded)';
const RH = 'Rhodium Plating';

const Y14 = ['gold', '14k', 'yellow'];
const W14 = ['gold', '14k', 'white'];
const R14 = ['gold', '14k', 'rose'];
const Y10 = ['gold', '10k', 'yellow'];
const SIL = ['silver', '', ''];
const PT = ['platinum', '', ''];

const c = (text, tasks, opts = {}) => ({
  id: `syn-${crypto.createHash('sha1').update(text).digest('hex').slice(0, 10)}`, text, tasks, ...opts,
});

export const SYNTHETIC_CASES = [
  // ── Half-Shank — 3 to 5mm (never in the real tickets) and its narrow sibling (once) ──
  c('14-karat yellow gold ring, 4 mm band, needs half shank.', { [HSW]: 1 }, { metal: Y14 }),
  c('14k yg wide band half shank', { [HSW]: 1 }, { metal: Y14 }),
  c('14k yellow gold men\'s ring, 5 mm shank, bottom worn thin, half shank.', { [HSW]: 1 }, { metal: Y14 }),
  c('10k yg half shank 3-5mm', { [HSW]: 1 }, { metal: Y10 }),
  c('14-karat white gold ring, half shank, 4.5 mm wide. Rhodium plate.', { [HSW]: 1, [RH]: 1 }, { metal: W14 }),
  c('14k wg have shank 4mm', { [HSW]: 1, [RH]: 1 }, { metal: W14 }),
  c('14k yg half shank 2mm band', { [HS]: 1 }, { metal: Y14 }),
  c('14k yellow gold ring needs half shank', { [HS]: 1 }, { metal: Y14 }),
  c('14k yg ring shank is paper thin at the bottom', { [HS]: 1 }, { metal: Y14 }),
  c('Sterling silver ring half shank', { [HS]: 1 }, { metal: SIL }),
  c('14-karat yellow gold ring needs half shank. 2 rings', { [HS]: 2 }, { metal: Y14 }),
  c('14k yg half shank, wears next to a 4mm band', { [HS]: 1 }, { metal: Y14 }),
  c('14k yg 3mm band half shank', { [HS]: 1 }, { metal: Y14 }),
  c('14k yellow gold ring half shank and size up from 6 to 7', { [HS]: 1, [SU]: 1 }, { metal: Y14, sizes: ['6', '7'], ruling: 'Does a half shank include the sizing, or is the size-up charged on top?' }),
  c('14k yg 6mm band half shank', { [HSW]: 1 }, { metal: Y14, ruling: 'A band wider than 5mm: no half-shank task fits. Which one, or by hand?' }),

  // ── Platinum (no platinum ticket exists; four platinum tasks never asked for) ──
  c('Platinum ring size 7 to 6', { [SDP]: 1 }, { metal: PT, sizes: ['7', '6'] }),
  c('Plat ring, size 6.5, needs to be a 5.5.', { [SDP]: 1 }, { metal: PT, sizes: ['6.5', '5.5'] }),
  c('PT950 ring size down 8 to 7.5', { [SDP]: 1 }, { metal: PT, sizes: ['8', '7.5'] }),
  c('Platinum band going from a 9 to a 10', { [SUP]: 1 }, { metal: PT, sizes: ['9', '10'] }),
  c('Platinum ring size 5 to 7', { [SUP]: 1 }, { metal: PT, sizes: ['5', '7'], stock: 1 }),
  c('Platinum ring, size 6, needs to be 7.25', { [SUP]: 1 }, { metal: PT, sizes: ['6', '7.25'], stock: 1 }),
  c('950 plat size 7 to 7.5', { [SUP]: 1 }, { metal: PT, sizes: ['7', '7.5'] }),
  c('Platinum ring needs half shank', { [HSP]: 1 }, { metal: PT }),
  c('Platinum men\'s band 5mm half shank', { [HSPW]: 1 }, { metal: PT }),
  c('Plat ring 4mm wide half shank', { [HSPW]: 1 }, { metal: PT }),
  c('Platinum ring retip 4 prongs', { [RT]: 4 }, { metal: PT }),
  c('Platinum ring, laser weld x2, clean and polish', { [LW]: 2, [CP]: 1 }, { metal: PT }),
  c('Platinum ring sizing beads', { [SB]: 1 }, { metal: PT }),
  c('Platinum ring reprong 6 prongs', { [RP]: 6 }, { metal: PT }),
  c('Platinum ring size 7 to 6, rhodium', { [SDP]: 1, [RH]: 1 }, { metal: PT, sizes: ['7', '6'] }),
  c('platinum wedding set, solder together, 2 rings', { [ST]: 1 }, { metal: PT }),
  c('White gold ring with platinum head, size 6 to 5', { [SD]: 1, [RH]: 1 }, { metal: ['gold', '', 'white'], sizes: ['6', '5'] }),
  c('Platinum 5 mm band, size up 2 sizes', { [SUP]: 1 }, { metal: PT, stock: 1, ruling: 'O7: there is no wide platinum size-up task. The narrow platinum one, or by hand?' }),

  // ── Sizing Beads (never) ──
  c('14k yellow gold ring, add sizing beads.', { [SB]: 1 }, { metal: Y14 }),
  c('14k yg sizing beads', { [SB]: 1 }, { metal: Y14 }),
  c('14-karat white gold ring, sizing beads, ring spins.', { [SB]: 1, [RH]: 1 }, { metal: W14 }),
  c('14k yg ring spins, add beads', { [SB]: 1 }, { metal: Y14 }),
  c('Sterling silver ring sizing beads', { [SB]: 1 }, { metal: SIL }),
  c('14k yg ring size down 7 to 6 and add sizing beads', { [SD]: 1, [SB]: 1 }, { metal: Y14, sizes: ['7', '6'] }),
  c('14k yg ring size 7 fits like a 6.5 with beads', { [SB]: 1 }, { metal: Y14 }),
  c('14k yg speed bumps', { [SB]: 1 }, { metal: Y14 }),
  c('14k yellow gold ring, two sizing beads', { [SB]: 1 }, { metal: Y14, ruling: 'Is Sizing Beads one job for the pair, or one per bead?' }),
  c('14k yg remove sizing beads', {}, { metal: Y14, ruling: 'No task removes beads. Nothing, or which task?' }),

  // ── Clasp Repair (never) ──
  c('14k yellow gold chain, clasp repair.', { [CR]: 1 }, { metal: Y14 }),
  c('Sterling silver bracelet clasp broken', { [CR]: 1 }, { metal: SIL }),
  c('14k yg necklace clasp won\'t close', { [CR]: 1 }, { metal: Y14 }),
  c('14-karat yellow gold bracelet, replace lobster clasp.', { [CR]: 1 }, { metal: Y14 }),
  c('14k yg bracelet tighten clasp tongue', { [CR]: 1 }, { metal: Y14 }),
  c('14k yg chain new spring ring', { [CR]: 1 }, { metal: Y14 }),
  c('14k wg chain clasp repair and one laser weld', { [CR]: 1, [LW]: 1, [RH]: 1 }, { metal: W14 }),
  c('Sterling silver necklace, clasp repair, break in chain', { [CR]: 1, [BC]: 1 }, { metal: SIL }),
  c('14k yg 2 chains clasp repair', { [CR]: 2 }, { metal: Y14 }),
  c('10k yg chain broken at the clasp', { [CR]: 1 }, { metal: Y10, ruling: '"Broken at the clasp": Clasp Repair or Break in chain?' }),

  // ── Watch Link Removal (never) and Watch Battery (once) ──
  c('Remove watch links.', { [WL]: 1 }),
  c('Stainless watch band size down', { [WL]: 1 }),
  c('Watch battery and remove links', { [WB]: 1, [WL]: 1 }),
  c('Replace watch battery x2', { [WB]: 2 }),
  c('2 watches, batteries', { [WB]: 2 }),
  c('Watch stopped', { [WB]: 1 }),
  c('Watch too big take out 2 links', { [WL]: 1 }, { ruling: 'Is Watch Link Removal one job, or one per link?' }),
  c('Watch link removal, 3 links', { [WL]: 1 }, { ruling: 'Is Watch Link Removal one job, or one per link?' }),
  c('Add a link back to watch', { [WL]: 1 }, { ruling: 'Adding a link: the same task as removing one, or nothing?' }),

  // ── Check & Tighten — over 20 stones (never) and the under-20 one (once) ──
  c('14k yellow gold ring, check and tighten, over 20 stones.', { [CT20]: 1 }, { metal: Y14 }),
  c('14k wg eternity band check and tighten all stones', { [CT20]: 1, [RH]: 1 }, { metal: W14 }),
  c('14-karat yellow gold pave ring, check and tighten 30 stones', { [CT20]: 1 }, { metal: Y14 }),
  c('14k yg ring check and tighten 25 stones', { [CT20]: 1 }, { metal: Y14 }),
  c('14k yg ring check and tighten 5 stones', { [CT]: 1 }, { metal: Y14 }),
  c('14k yg cluster ring tighten stones', { [CT]: 1 }, { metal: Y14 }),
  c('14k yg ring stone is loose', { [CT]: 1 }, { metal: Y14 }),
  c('14k yg tennis bracelet check and tighten', { [CT20]: 1 }, { metal: Y14, ruling: 'A tennis bracelet with no count said: over 20 stones, or under?' }),
  c('14k yg ring check and tighten 20 stones', { [CT20]: 1 }, { metal: Y14, ruling: 'Exactly 20 stones: one task says "fewer than 20", the other "more than 20".' }),

  // ── Reprong (never) ──
  c('14k yellow gold ring, reprong 2 prongs.', { [RP]: 2 }, { metal: Y14 }),
  c('14k yg re-prong x4', { [RP]: 4 }, { metal: Y14 }),
  c('14k yg re prong', { [RP]: 1 }, { metal: Y14 }),
  c('14-karat white gold ring, rebuild one prong, rhodium.', { [RP]: 1, [RH]: 1 }, { metal: W14 }),
  c('14k yg ring prong broke off, new prong', { [RP]: 1 }, { metal: Y14 }),
  c('14k yg ring retip 3 and reprong 1', { [RT]: 3, [RP]: 1 }, { metal: Y14 }),
  c('14k yg ring 4 new prongs and set stone .75ct', { [RP]: 4, [SS2]: 1 }, { metal: Y14 }),
  c('14k yg ring needs new head', {}, { metal: Y14, ruling: 'A new head: no task. Nothing, or Reprong times the prongs?' }),

  // ── Jump rings: the laser one (never expected; he removed it all 3 times it was suggested) ──
  c('14k yg pendant add jump ring', { [JR]: 1 }, { metal: Y14 }),
  c('Sterling silver charm bracelet, add 3 jump rings', { [JR]: 3 }, { metal: SIL }),
  c('14k yellow gold pendant, add jump ring, laser closed.', { [JRL]: 1 }, { metal: Y14, ruling: 'When, if ever, is the "w/ laser" jump ring the right task?' }),
  c('14k yg charm add jump ring and laser it shut', { [JRL]: 1 }, { metal: Y14, ruling: 'When, if ever, is the "w/ laser" jump ring the right task?' }),
  c('14k yg add 2 jump rings, solder closed', { [JR]: 2 }, { metal: Y14, ruling: '"Solder closed": the plain jump ring or the laser one?' }),
  c('14k yg chain add jump ring 7mm', { [JR]: 1 }, { metal: Y14, ruling: 'A jump ring over 5mm: no task fits. The 5mm one, or by hand?' }),

  // ── Glue Pearl (once, and its task description is empty) ──
  c('14k yellow gold ring, reglue pearl.', { [GP]: 1 }, { metal: Y14 }),
  c('14k yg earrings reglue 2 pearls', { [GP]: 2 }, { metal: Y14 }),
  c('Sterling silver pendant glue opal', { [GP]: 1 }, { metal: SIL }),
  c('14k yg pearl earring came off the post, reglue', { [GP]: 1 }, { metal: Y14 }),
  c('Pearl necklace restring', {}, { ruling: 'Restringing: no task. Nothing?' }),

  // ── Set Stone tiers (1ct or larger: once; half to one carat: twice) ──
  c('14k yellow gold ring, set 1.25 carat diamond.', { [SS3]: 1 }, { metal: Y14 }),
  c('14k wg ring set center stone 2ct', { [SS3]: 1, [RH]: 1 }, { metal: W14 }),
  c('14-karat yellow gold ring, set one stone, 1 carat.', { [SS3]: 1 }, { metal: Y14 }),
  c('14k yg ring set 3/4 carat stone', { [SS2]: 1 }, { metal: Y14 }),
  c('14k yg ring set stone half carat', { [SS2]: 1 }, { metal: Y14 }),
  c('14k yg ring set 50 pointer', { [SS2]: 1 }, { metal: Y14 }),
  c('14k yg ring set 2 stones .25 each', { [SS1]: 2 }, { metal: Y14 }),
  c('14k yg ring set 5 melee', { [SS1]: 5 }, { metal: Y14 }),
  c('14k yg ring reset center 1.5ct and 2 side stones 10 points each', { [SS3]: 1, [SS1]: 2 }, { metal: Y14 }),
  c('14k yg ring set stone', { [SS1]: 1 }, { metal: Y14, ruling: 'A stone with no weight said: which tier is the default?' }),
  c('14k wg earrings set 2 stones 1ct each', { [SS3]: 2, [RH]: 1 }, { metal: W14, ruling: 'O5: a pair of earrings — rhodium once or twice?' }),

  // ── Break in Shank, Solder Together, Reshape, Straighten Prongs (once each) ──
  c('14k yellow gold ring, break in shank.', { [BS]: 1 }, { metal: Y14 }),
  c('14k wg ring shank broken clean through', { [BS]: 1, [RH]: 1 }, { metal: W14 }),
  c('Sterling silver ring band snapped', { [BS]: 1 }, { metal: SIL }),
  c('14k yg 2 rings break in shank', { [BS]: 2 }, { metal: Y14 }),
  c('14k yg ring cracked shank', { [BS]: 1 }, { metal: Y14, ruling: '"Cracked shank": Break in Shank or Laser Weld?' }),
  c('14k yellow gold, solder 3 rings together.', { [ST]: 2 }, { metal: Y14 }),
  c('14k yg unsolder rings', {}, { metal: Y14, ruling: 'Taking soldered rings apart: no task. Nothing?' }),
  c('14k wg wedding set solder together', { [ST]: 1, [RH]: 2 }, { metal: W14, ruling: 'Two white gold rings soldered into one: rhodium once or twice?' }),
  c('14k yg solder together two rings and clean and polish', { [ST]: 1, [CP]: 2 }, { metal: Y14, ruling: 'Two rings soldered together, then polished: Clean and Polish once or twice?' }),
  c('14k yg ring bent out of round', { [RR]: 1 }, { metal: Y14 }),
  c('Sterling silver ring squished, reshape', { [RR]: 1 }, { metal: SIL }),
  c('14k yg ring reshape and size up 6 to 6.5', { [RR]: 1, [SU]: 1 }, { metal: Y14, sizes: ['6', '6.5'] }),
  c('14k yg bangle bent, reshape', { [RR]: 1 }, { metal: Y14, ruling: 'Reshape Ring on a bangle: the same task, or by hand?' }),
  c('14k yg ring straighten 3 prongs', { [SP]: 1 }, { metal: Y14 }),
  c('14k wg ring prongs bent, straighten, rhodium', { [SP]: 1, [RH]: 1 }, { metal: W14 }),
  c('14k yg ring straighten prongs and retip 2', { [SP]: 1, [RT]: 2 }, { metal: Y14 }),

  // ── Size Up, wide shank (once) and customer's gold (twice) ──
  c('14k yellow gold men\'s band, 4 mm, size 9 to 10.', { [SUW]: 1 }, { metal: Y14, sizes: ['9', '10'] }),
  c('14k yg 5mm band size 10 to 12.5', { [SUW]: 1 }, { metal: Y14, sizes: ['10', '12.5'], stock: 2 }),
  c('14-karat yellow gold wide band, size 7, needs to be size 8.', { [SUW]: 1 }, { metal: Y14, sizes: ['7', '8'] }),
  c('14k yg 3.5mm band size 6 to 7', { [SUW]: 1 }, { metal: Y14, sizes: ['6', '7'] }),
  c('14k yg 3mm band size 6 to 7', { [SU]: 1 }, { metal: Y14, sizes: ['6', '7'] }),
  c('10k yg class ring size 10 to 11', { [SU]: 1 }, { metal: Y10, sizes: ['10', '11'] }),
  c('14k yg ring size 7 to 9 customer\'s gold', { [SUC]: 1 }, { metal: Y14, sizes: ['7', '9'] }),
  c('14k wg 4mm band size 6 to 8, customer supplied gold', { [SUC]: 1, [RH]: 1 }, { metal: W14, sizes: ['6', '8'] }),
  c('14k yg 6mm band size 8 to 9', { [SUW]: 1 }, { metal: Y14, sizes: ['8', '9'], ruling: 'A band wider than 5mm: no size-up task fits. The 3–5mm one, or by hand?' }),

  // ── Metals the real tickets never or barely name: rose, 18k, 22k, odd shorthand ──
  c('14k rose gold ring size 6 to 7', { [SU]: 1 }, { metal: R14, sizes: ['6', '7'] }),
  c('14k rg size 7 to 5.5', { [SD]: 1 }, { metal: R14, sizes: ['7', '5.5'] }),
  c('10k rose gold chain break in chain', { [BC]: 1 }, { metal: ['gold', '10k', 'rose'] }),
  c('18k white gold ring size 5 to 6.5', { [SU]: 1, [RH]: 1 }, { metal: ['gold', '18k', 'white'], sizes: ['5', '6.5'], stock: 1 }),
  c('18-karat yellow gold ring, retip 2 prongs.', { [RT]: 2 }, { metal: ['gold', '18k', 'yellow'] }),
  c('22k yellow gold bangle laser weld', { [LW]: 1 }, { metal: ['gold', '22k', 'yellow'] }),
  c('Silver ring size 7 to 9', { [SU]: 1 }, { metal: SIL, sizes: ['7', '9'], stock: 1 }),
  c('Sterling silver ring, rhodium plate', { [RH]: 1 }, { metal: SIL }),
  c('14k yg ring rhodium the head only', { [RH]: 1 }, { metal: Y14 }),
  c('14k wg ring size 7 to 6 no rhodium', { [SD]: 1 }, { metal: W14, sizes: ['7', '6'] }),
  c('14kw ring size 6 to 5', { [SD]: 1, [RH]: 1 }, { metal: W14, sizes: ['6', '5'] }),
  c('14kt y/g ring sz 6-7', { [SU]: 1 }, { metal: Y14, sizes: ['6', '7'] }),
  c('14k wg ring sz 7-5', { [SD]: 1, [RH]: 1 }, { metal: W14, sizes: ['7', '5'] }),
  c('10kyg ring sz dwn 9-7', { [SD]: 1 }, { metal: Y10, sizes: ['9', '7'] }),
  c('Gold filled chain break in chain', { [BC]: 1 }),
  c('14k two tone ring size 6 to 7', { [SU]: 1 }, { sizes: ['6', '7'], ruling: 'Z4: a two-tone ring — rhodium or not?' }),
  c('Stainless steel ring size up', {}, { ruling: 'Stainless cannot be sized. Nothing?' }),

  // ── Sizes said the awkward way ──
  c('14-karat yellow gold ring, sized down from a seven to a six.', { [SD]: 1 }, { metal: Y14, sizes: ['7', '6'] }),
  c('14 karat white gold ring size eight and a half to seven', { [SD]: 1, [RH]: 1 }, { metal: W14, sizes: ['8.5', '7'] }),
  c('14k yg ring six to eight', { [SU]: 1 }, { metal: Y14, sizes: ['6', '8'], stock: 1 }),
  c('14k yg ring size 6 and a half to 7 and a quarter', { [SU]: 1 }, { metal: Y14, sizes: ['6.5', '7.25'] }),
  c('14k yg ring size down half a size', { [SD]: 1 }, { metal: Y14 }),
  c('14k yg ring size up a quarter size', { [SU]: 1 }, { metal: Y14 }),
  c('14-karat yellow gold ring. Size up one size. Customer will pick up Friday.', { [SU]: 1 }, { metal: Y14 }),
  c('14k yg ring too big', { [SD]: 1 }, { metal: Y14 }),
  c('14k yg ring too tight goes up to an 8', { [SU]: 1 }, { metal: Y14, sizes: ['', '8'] }),
  c('14k yg mens ring size 13 to 15.5', { [SU]: 1 }, { metal: Y14, sizes: ['13', '15.5'], stock: 2 }),
  c('14k yg baby ring size 1 to 3', { [SU]: 1 }, { metal: Y14, sizes: ['1', '3'], stock: 1 }),
  c('14 karat yellow gold ring size 7 to 7', {}, { metal: Y14 }),
  c('ring size 7 to 8', { [SU]: 1 }, { sizes: ['7', '8'] }),
  c('Size 7 to 5 14ky, wears with 4mm band', { [SD]: 1 }, { metal: Y14, sizes: ['7', '5'] }),
  c('14k wg ring size 6 to 7.5 wears with 4mm band', { [SU]: 1, [RH]: 1 }, { metal: W14, sizes: ['6', '7.5'], stock: 1 }),
  c('14k yg ring size 6 to 12', { [SU]: 1 }, { metal: Y14, sizes: ['6', '12'], stock: 5, ruling: 'Six sizes up: still one task plus five stock, or a remake?' }),
  c('14k yg ring currently a 7 customer wants it a 6 but try 6.25 first', { [SD]: 1 }, { metal: Y14, sizes: ['7', '6.25'], ruling: 'Two target sizes said: which goes on the ticket?' }),

  // ── More than one piece, and several jobs in one breath ──
  c('14k yg 3 rings size down, 7 to 6, 8 to 7, 9 to 8', { [SD]: 3 }, { metal: Y14 }),
  c('14k white gold ring and band, size both from 7 to 6', { [SD]: 2, [RH]: 2 }, { metal: W14, sizes: ['7', '6'] }),
  c('14k yg ring size 6 to 8 and retip 4 prongs and clean and polish', { [SU]: 1, [RT]: 4, [CP]: 1 }, { metal: Y14, sizes: ['6', '8'], stock: 1 }),
  c('14k yg ring retip 4 prongs on each of 2 rings', { [RT]: 8 }, { metal: Y14 }),
  c('14k yg 6 prong head retip 2', { [RT]: 2 }, { metal: Y14 }),
  c('14k yg ring size 7 retip 4', { [RT]: 4 }, { metal: Y14 }),
  c('14-karat yellow gold ring, size 7. Laser weld.', { [LW]: 1 }, { metal: Y14 }),
  c('14k yg dozen laser welds', { [LW]: 12 }, { metal: Y14 }),
  c('Fourteen karat yellow gold ring laser weld times two', { [LW]: 2 }, { metal: Y14 }),
  c('14k yg ring laser weld x3, do not polish', { [LW]: 3 }, { metal: Y14 }),
  c('14k yg pendant bail broken laser weld', { [LW]: 1 }, { metal: Y14 }),
  c('14k yg earring post broken, laser weld new post', { [LW]: 1 }, { metal: Y14 }),
  c('14k yg chain 2 breaks', { [BC]: 2 }, { metal: Y14 }),
  c('Sterling silver 5 rings clean and polish', { [CP]: 5 }, { metal: SIL }),
  c('14k wg ring clean and polish', { [CP]: 1, [RH]: 1 }, { metal: W14 }),
  c('Clean and polish', { [CP]: 1 }),
  c('14k yg ring retip all prongs', { [RT]: 1 }, { metal: Y14, ruling: '"All prongs" with no number: one, or leave the count blank and ask?' }),
  c('14k yg rope chain broke in two places, laser weld', { [LW]: 2 }, { metal: Y14, ruling: 'A chain broken in two places, "laser weld" said: Laser Weld x2 or Break in chain x2?' }),
  c('14k yg chain shorten 2 inches', { [BC]: 1 }, { metal: Y14, ruling: '"Shorten" with no job named: Break in chain, a laser weld, or ask?' }),
  c('14k yg retip 4, 14k wg retip 2', { [RT]: 6, [RH]: 1 }, { ruling: 'Two pieces of different metals in one note: one ticket or two?' }),

  // ── Work the catalog has no task for: the right answer is nothing ──
  c('14k yg ring engrave inside', {}, { metal: Y14 }),
  c('14k yg ring appraisal', {}, { metal: Y14 }),
  c('14k yg ring, ring guard', {}, { metal: Y14 }),
];
