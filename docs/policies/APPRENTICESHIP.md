# EFD Apprenticeship — curriculum, bench test, pay

Status: **OPEN — being designed.** Started 2026-09-30. Nothing here is built except what's under
"Shipped". Answer the open questions in place; mark each one **DECIDED** with the date.

Recommendations below come from the research at the bottom of this doc. They are **not decisions**.

---

## Shipped (2026-09-30, PR #140)

These are owner rulings and are live in production:

- **An apprentice is paid by the hour, as a shop expense.** Clocked hours × the Apprentice rate on
  the pay ladder. Nobody else's pay moves: the jeweler who holds a job is credited it in full.
- **An apprentice never holds a job.** They work on jobs other jewelers hold — polishing, plating,
  sizing under supervision — but can't claim, be assigned, or be handed off to.
- **Moving up is not "whichever pays more."** An apprentice moves up by passing the bench test, not
  by comparing hourly pay against per-task pay.
- **The flag is the ladder rung.** Being placed on the Apprentice rung of the pay ladder
  (`employment.payTier === 'apprentice'`) is being an apprentice. Code: `src/services/pay/apprentice.js`.
- Current apprentices: **Michelle Grazier** and **Henlie Nall**, both at $15/hr.

---

## Scope

**This curriculum is the FABRICATION / BENCH JEWELER apprenticeship** (owner, 2026-09-30). It's
centered on repairs, and it ends when the apprentice passes the bench test and can do bench work on
their own.

**Design and custom work is a SEPARATE, LATER curriculum** — for a jeweler moving to the next pay
level, not for an apprentice becoming a jeweler. Things like submitting a set number of designs and
completing custom pieces. Not covered here.

---

## Open questions

1. **The numbers.** How many reps of each skill qualify someone to take the bench test? Are clocked
   hours a minimum, or do reps alone decide?
   - *Research:* **no program publishes rep counts** (see Research). Every one gates on time plus
     graded projects. So any rep number is ours to set.
   - *Recommendation:* make each skill's target **a minimum count AND a streak** — e.g. at least 30
     sizings, *and the last 10 passed QC with no rework*. The streak is what actually shows
     competence; the minimum stops a lucky run from counting. It runs off the QC the shop already
     does.
   - *Recommendation:* use hours only as a floor for being *allowed* to sit the bench test (JA pegs
     its beginner level at about one year's experience), not as the thing that proves skill.

2. **Who checks a rep.** Does the apprentice's own tap count, or does the mentor confirm each one?
   Confirming everything is management overhead the owner doesn't want; trusting taps means the
   counts are only as honest as the apprentice.
   - *Research:* the UK apprenticeship standard says evidence **"should not include reflective
     accounts or any methods of self-assessment"** — it has to come from direct observation.
   - *Recommendation:* the apprentice taps what they did, and **the rep only counts once that ticket
     passes QC.** No extra step for the mentor — QC already happens on every job — and a tap on a job
     that fails QC never counts.

3. **Who can pass someone.** Only the owner, or eventually a senior jeweler too?
   - *Research:* JA and the UK both use an assessor who isn't the trainer. JA's beginner exam can be
     taken at your own bench with a proctor.
   - *Option worth considering:* use **JA's Certified Beginner Bench Jeweler exam as the bench test
     itself.** It's external, it's credible to customers and future employers, and the apprentice
     keeps the credential. Cost in 2024: $300 registration plus about $1,305 in test materials
     (priced off gold).

4. **Michelle's starting point.** Her application says she's already partway through a bench
   apprenticeship. Does she test out of Stage 1?
   - *Research:* the UK standard's gateway is the employer confirming the apprentice "is consistently
     working at or above the level" — not time served.
   - *Recommendation:* let her sit the Stage 1 exit check now. If she passes, she starts in Stage 2.

5. **One path or two.** — **DECIDED 2026-09-30:** one path for now. This curriculum is the
   fabrication / bench track. Design / custom work is a separate curriculum for jewelers moving up
   (see Scope). Henlie's wire-wrapping and design background doesn't change her track.

6. **Missing tasks.** Rhodium plating isn't a task in the catalog, so there's nothing to count those
   reps against. Anything else apprentices do a lot of that isn't a task?

7. **What passing does.** Does passing the bench test automatically move someone to the next rung,
   or is it the point where the owner *can* move them?
   - *Research:* registered apprenticeships put the raise schedule **in writing ahead of time** and
     tie each step to competencies completed. A sponsor can pay more than the schedule, never less.
   - *Recommendation:* automatic. Publish the steps (see Pay ladder), and passing a stage *is* the
     raise. It removes the negotiation and it's fair to the apprentice.

8. **The pay ladder** — **REOPENED 2026-09-30.** See "Pay ladder" below.

---

## Pay ladder — reopened

The ladder as drafted on 2026-09-22 (code defaults in `src/services/pay/payLadder.js`; never saved to
production settings):

| Rung | Rate | Paid |
| --- | --- | --- |
| Apprentice | $15 | per clocked hour |
| Bench jeweler | $30 | per catalog hour |
| Senior jeweler | $38 | per catalog hour |
| Master | $50 | per catalog hour |

**Owner, 2026-09-30:**

- The jump from $15 to $30 is too big.
- **Cap the ladder at $40** for the most experienced jeweler.
- **The owner is paid $50**, separately — "this is my business to do this." He tries not to take
  owner draws; the $50 is how he's paid for everything he does in the business. So $50 is not a rung
  anyone else climbs to.
- The gap between $40 and $50 is deliberate **headroom for raises**: hire someone very good at $40,
  and after they've been here a while there's room to give them $45.

### What the market says

Hourly wages for jewelers (BLS data via O*NET, 2025):

| | 10th | 25th | Median | 75th | 90th |
| --- | --- | --- | --- | --- | --- |
| **Arkansas** | $13.42 | $13.92 | $17.28 | $26.82 | $31.73 |
| **U.S.** | $17.11 | $19.00 | $25.26 | $33.56 | $42.09 |

- **$15 apprentice** sits between Arkansas's 10th and 25th percentile — right for someone learning.
- **The current $30 bench rung** is roughly Arkansas's *90th* percentile. For someone who just passed
  a beginner bench test, that's high — the data backs the owner's instinct.
- **A $40 cap** is about the U.S. 90th percentile and well above Arkansas's. That's top-of-market
  nationally: enough to recruit someone very good from out of state.

Two things make EFD's rates not directly comparable to those wages:

- **Most rungs are paid per *catalog* hour at QC pass, not per clocked hour.** A jeweler working at
  catalog pace earns the rate for every hour worked; faster earns more, slower earns less.
- **EFD pays contractors** (Stripe Connect, 1099s). They pay both halves of payroll tax and get no
  benefits, so a contractor dollar is worth somewhat less than an employee dollar at the same rate.

A cross-check from the trade: shops around 2000 paid bench jewelers about **one-third of the retail
labor charge** per job (Ganoksin forum: a $18 sizing paid the jeweler $6). EFD bills catalog hours ×
$50 × 2.0 = **$100 per catalog hour retail**, so a $24 rung is 24% of retail labor, $32 is 32%, and
$40 is 40%.

### Proposal (for discussion — NOT decided, nothing changed in code)

Step the apprentice wage up by competency instead of one jump, the way registered apprenticeships do
(see the Indiana example in Research). Those schedules typically start at 40–60% of the fully-trained
rate and step up at each stage.

| Rung | Rate | Paid | Earned by |
| --- | --- | --- | --- |
| Apprentice I | $15 | per clocked hour | hired — finishing work (Stage 1) |
| Apprentice II | $17 | per clocked hour | passing the Stage 1 exit check |
| Apprentice III | $19 | per clocked hour | completing half of the Stage 2 targets |
| Bench jeweler | $24 | per catalog hour | passing the bench test |
| Senior jeweler | $32 | per catalog hour | takes anything that comes in; can QC others |
| Master | $40 | per catalog hour | **top rung** |
| *(individual raise)* | up to $45 | per catalog hour | negotiated retention raise above the top rung |
| **Owner** | **$50** | — | not a rung |

Why these numbers fit together:

- **$15 → $17 → $19** is 62% → 71% → 79% of the $24 bench rate — inside the range registered
  apprenticeships use.
- **Moving to per-task can't cut her pay** if the bench test holds her to within 1.25× catalog time:
  at that pace, $24 per catalog hour works out to $19.20 per hour worked — no less than Apprentice
  III. That's a reason to tighten the draft's 1.5× time rule (below) to 1.25×.
- **Senior at $32** is about the U.S. 75th percentile; **Master at $40** about the U.S. 90th.

*Owner's calls:* the rates themselves; whether three apprentice steps is too many (two would be
$15 → $18); and whether the senior/master requirements on the current ladder still describe the right
people.

---

## Draft curriculum (2026-09-30 — placeholder numbers, NOT decided)

Built from two things the shop already has: the bench-jeweler requirements written into the pay
ladder on 2026-09-22, and the live task catalog, so every rep can eventually be counted from real
tickets. The research suggests replacing the fixed rep counts with **minimum + QC streak** (question
1) — the numbers below are the minimums.

### Stage 1 — Finishing (about the first 150 clocked hours)

- **Gate:** safety walkthrough signed off by the mentor — torch, laser, chemicals, rhodium bath,
  ultrasonic.
- **Reps:** 100 clean-and-polish, 25 rhodium plates.
- **Mentor sign-off:** finishes to shop standard without wearing detail — edges crisp, hallmarks
  readable, stone tables flat.
- **Exit** (the Apprentice line on the ladder): polish and rhodium a customer piece to standard;
  solder a jump ring closed with no visible seam; size a sterling ring down one size (untimed).

### Stage 2 — Supervised bench (about the next 300 hours)

The apprentice does the whole task on the mentor's tickets and the mentor checks it. Still hourly,
still the mentor's job.

| Skill | Catalog tasks | Reps |
| --- | --- | --- |
| Sizing | Size Down / Size Up | 100 (40 sterling, 60 gold) |
| Jump rings and soldering | Add Jump Ring, Solder Together | 50 |
| Chain | Break in chain, Clasp Repair | 30 |
| Prongs | Retip prongs, Reprong | 40 prongs |
| Stones | Check & Tighten / Set Stone under 0.49ct | 30 / 30 |
| Laser | Laser Weld | 30 |

### Stage 3 — Bench test

One sitting, on shop stock rather than customer pieces, graded by the mentor under a 10× loupe. Six
stations, from the bench-jeweler requirements already on the ladder:

1. Size a 14k ring up one size and down one, within 0.5 hr each — seam invisible at 10×, round on the
   mandrel, finish matched.
2. Retip four prongs on a head — even, symmetrical, stone tight.
3. Set a stone in a prong head, then check and secure the rest.
4. Chain: solder one break, laser one break, replace a clasp.
5. Laser weld a seam and fill it without undercutting.
6. Five pieces from a practice box: pick the right tasks and price them with no corrections.

Pass = every station passes. A failed station is retaken alone two weeks later. Time rule: within
catalog time passes; up to 1.5× passes with a note; slower fails — because on a per-task rung,
catalog time *is* the pay.

*Research suggests:* grade each station with a written checklist the way JA does (75% of items to
pass, some items automatic re-work, three attempts); compare these stations against JA's eight
beginner jobs (below); and tighten the time rule to 1.25× (see Pay ladder).

---

## Tracking (not built — build only after the numbers are decided)

A contributor logbook: the apprentice scans a ticket, taps which of its catalog tasks they did (plus
polish / rhodium), and a progress page counts those against the targets. No claiming, nothing for
the mentor to enter. Per question 2's recommendation, a tap only counts once the ticket passes QC.

---

## Research (2026-09-30)

### The headline

**Nobody publishes rep counts.** Not the schools, not the certifying body, not the registered
apprenticeships. Every program gates on **time spent plus graded projects**. The closest thing to a
rep count anywhere is North Bennet Street School's "50 feet of wire made into chain by each
student." So EFD's rep numbers are ours to invent — which is why question 1 recommends a
minimum-plus-streak rule instead of a big fixed number.

### How long it takes to be bench-ready

| Program | Length | Notes |
| --- | --- | --- |
| New Approach School — Graduate Bench Jeweler | **12 weeks** | Mon 8:30–5, Tue–Fri 8–4:30 ≈ **500 scheduled hours**; the school doesn't publish a total. $19,670.63 (2026). |
| New Approach — Bench Jeweler Comprehensive | 5 days | Sawing, filing, soldering, polishing, sizing up and down, head and shank work, chain repair, retipping and repronging, cast cleaning. |
| GIA — Graduate Jeweler (redesigned 2024 by Alan Revere) | 28 weeks | Fabrication-centered; includes repair, setting, laser, casting, engraving. |
| North Bennet Street School — Jewelry Making & Repair | 72 weeks, **2,340 class hours** | Two nine-month years. |
| MJSA Mentor & Apprenticeship Program | 50-week curriculum | The U.S. Department of Labor's national model for bench-jeweler apprenticeships. Certification requires **18 specified projects**, "from pierced earrings to stone-set rings to 3-D printed models." |
| New York State registered apprenticeship — Bench Jeweler (Production) | **4,500 on-the-job hours** + 144 classroom hours a year | Orientation 400 · tools & techniques 2,500 · production fundamentals 600 · quality control 600 · safety 400. A production track, not repair. |
| UK Level 3 — Jewellery, Silversmithing & Allied Trades | **36 months** typical, 12 minimum | At least 20% off-the-job training. |
| Germany — Goldschmied | **3½ years** | Mid-point exam in the fourth half-year; the final exam is a practical piece plus a written test. |
| O*NET (U.S. occupational database) | "one or two years of training" | On-the-job plus informal training with experienced workers. |

**Reading it together:** an intensive school gets someone bench-ready in about 500 hours of
full-time instruction. A shop apprenticeship to the beginner-certified level takes about **a year of
full-time work** (JA's own benchmark). Part-time — say 20 hours a week — that's about two years.

### The bench test: Jewelers of America (JA)

JA runs the U.S. bench-jeweler certification. Its levels:

- **Certified Beginner Bench Jeweler (CBBJ)** — "a trained entry-level bench jeweler generalist
  performing jewelry repair with about one year's experience." *This is the level that matches EFD's
  bench test.*
- **Certified Bench Jeweler (CBJ)** — "most jewelry repairs with two or more years of experience."
- **Certified Master Bench Jeweler (CMBJ)** — mastery at all levels.

**The beginner practical exam — 8 jobs, 19 hours total** (JA sample tests, 2023):

| # | Job | Estimated time |
| --- | --- | --- |
| 1 | Repair by reassembling and resoldering several different types of chains and clasps | 3 h |
| 2 | Assemble a pre-made bail and bezel; set an oval cabochon | 3 h |
| 3 | Prepare an oval head and fit it to a shank; size the ring; set the oval stone | 2 h |
| 4 | Repair the damaged tongue of a box clasp; install a new figure-8 wire | 1.5 h |
| 5 | File, finish and size a ring casting | 2.5 h |
| 6 | Solder and assemble earrings; set two stones; finish | 2 h |
| 7 | Retip three prongs to match an existing prong | 2 h |
| 8 | Assemble bracelet links so they're flexible; set three stones; finish | 3 h |

The next level up (CBJ: 7 jobs, 18 hours) adds channel and flush setting, a platinum head on a gold
shank, re-soldering posts on hollow earrings, a fancy-shape center with tapered baguettes, and a
seamless platinum weld.

**How JA grades — directly usable for EFD:**

- Each job is scored on a checklist of pass/fail items across fabrication, soldering, setting,
  polishing and delivery. The sample has 33 items.
- **Pass = 75% of items acceptable** (25 of 33). Some items are marked as automatic re-work or
  re-take no matter the score.
- **Three attempts** per job: first, second, third and final.
- Per-job times are guidelines; the **total** time limit is what's enforced.
- Example items: stone within 5° of level; prong contact between 33% and 50%; prong angle 65–75°; no
  excess solder visible to the unaided eye; no tool marks; no dirt, grease or water spots; prepared
  for customer delivery.
- An open-book written exam comes first and must be passed before the practical.

### How a final assessment is run: UK standard

- **Gateway:** the employer must confirm the apprentice "is consistently working at or above the
  level" of the standard, and a portfolio of evidence is submitted.
- The portfolio **"should not include reflective accounts or any methods of self-assessment."**
- **Observed practical:** 2 hours of observation plus 30 minutes of questioning (at least 6
  questions), one-to-one with an independent assessor. Graded fail / pass / distinction.

### How pay steps up: registered apprenticeships

- Federal rules require **a progressively increasing wage schedule, written down in advance**, tied
  to skills acquired. The sponsor sets the percentages; common schedules start around 40–60% of the
  fully-trained rate and step up each period.
- **Indiana Department of Workforce Development example** (official): steps tied to *competencies
  completed*, not time — "Starting Wage (0-5 competencies) = $22.00 … 6th Wage Increase (24
  competencies) = $28.00" against a $28 fully-trained rate. An employer can pay more than the
  schedule, never less.

### What this means for EFD

1. **Adopt JA's grading method for the bench test** — a written checklist per job, 75% to pass, some
   items automatic re-work, three attempts. It's proven, and it makes passing objective.
2. **Model the stations on JA's beginner exam**, trimmed to EFD's catalog. EFD doesn't need bezel
   cabochons or bracelet links on day one; it does need laser work, which JA's beginner test doesn't
   include.
3. **Or use JA's beginner certification outright** as the bench test (question 3).
4. **Set reps as minimum + QC streak** (question 1), and **count a rep only when the job passes QC**
   (question 2).
5. **Tie raises to stages, in writing** (question 7 and the pay proposal).

### Sources

- New Approach School — [Graduate Bench Jeweler Program](https://newapproachschool.com/graduate-bench-jeweler-program/), [Bench Jeweler Comprehensive](https://newapproachschool.com/bench-jeweler-comprehensive/)
- Jewelers of America — [Bench certification sample tests (PDF, 2023)](https://www.jewelers.org/images/careers/JA-BenchCertification-SampleTest-2023.pdf), [On-site certification at GIA (PDF, 2024)](https://www.jewelers.org/images/files/JA-BenchCertification-GIA-2024.pdf)
- New York State Dept. of Labor — [Bench Jeweler (Production) training outline (PDF)](https://dol.ny.gov/system/files/documents/2022/06/bench-jeweler-production-time.pdf)
- MJSA — [first advanced apprentice graduate (InStore)](https://instoremag.com/mjsa-mentor-apprenticeship-program-certifies-its-first-advanced-apprentice-graduate/), [program overview (National Jeweler)](https://nationaljeweler.com/articles/14614-the-mjsa-mentor-apprenticeship-program-attracting-training-the-next-generation-of-bench-jewelers), [National Guidelines Standard (National Jeweler)](https://nationaljeweler.com/articles/12643-mjsa-apprenticeship-program-gets-new-designation-from-dept-of-labor)
- GIA — [Graduate Jeweler program launch](https://www.gia.edu/gia-news-press/innovative-graduate-jeweler-program-launches-in-2038)
- North Bennet Street School — [Jewelry Making & Repair](https://nbss.edu/full-time-programs/jewelry-making-repair/)
- Skills England — [Jewellery, silversmithing and allied trades professional, Level 3 assessment plan (PDF)](https://skillsengland.education.gov.uk/media/4x1fdymw/st0439-jewellery-silversmithing-and-allied-trades-professional-level-3-ap-for-publication-19112025.pdf)
- Germany — [Goldschmied/-in (handwerk.de)](https://www.handwerk.de/infos-zur-ausbildung/ausbildungsberufe/berufsprofile/goldschmiedin)
- O*NET — [Jewelers and Precious Stone and Metal Workers](https://www.onetonline.org/link/summary/51-9071.00), [Arkansas wages](https://www.onetonline.org/link/localwages/51-9071.00?st=AR)
- BLS — [Jewelers, May 2023](https://www.bls.gov/oes/2023/may/oes519071.htm)
- Indiana DWD — [Example wage schedules for apprenticeships (PDF)](https://www.in.gov/dA/5ee7e8ea4e/DWD-OWBLA-Apprenticeship_Example-Wage-Schedule-Apprenticeships.pdf?language_id=1)
- Ganoksin Orchid forum — [Bench pay (2000)](https://orchid.ganoksin.com/t/bench-pay/9601)
