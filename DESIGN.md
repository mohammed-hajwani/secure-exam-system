---
name: ExamShield
description: Online exams that hold up, set as a printed exam timetable pinned to a felt noticeboard.
colors:
  board: "#2F6B4F"
  board-deep: "#245640"
  board-ink: "#D7EADF"
  ink: "#14213D"
  ink-deep: "#0C1529"
  ink-soft: "#3D4A63"
  ink-faint: "#5E6880"
  paper: "#FFFFFF"
  paper-ground: "#ECEFEA"
  paper-tint: "#F6F7F4"
  paper-rule: "#D3D9D1"
  paper-line: "#E5E9E3"
  stock-canary: "#FFE27A"
  stock-canary-ink: "#6B4E00"
  stock-mint: "#BFE9CF"
  stock-mint-ink: "#11523A"
  stock-sky: "#C6DFF5"
  stock-sky-ink: "#1C4A75"
  stock-salmon: "#FFC4B0"
  stock-salmon-ink: "#8A2B12"
  highlighter: "#E3F24C"
  alarm: "#B42318"
typography:
  display:
    fontFamily: "Archivo Variable, Atkinson Hyperlegible Next Variable, sans-serif"
    fontSize: "5.6rem"
    fontWeight: 800
    lineHeight: 0.92
    letterSpacing: "0"
    fontVariation: "'wdth' 68"
  headline:
    fontFamily: "Archivo Variable, Atkinson Hyperlegible Next Variable, sans-serif"
    fontSize: "3.25rem"
    fontWeight: 800
    lineHeight: 0.92
    letterSpacing: "0"
    fontVariation: "'wdth' 68"
  title:
    fontFamily: "Archivo Variable, sans-serif"
    fontSize: "15px"
    fontWeight: 700
    letterSpacing: "0.04em"
    fontVariation: "'wdth' 72"
  body-reading:
    fontFamily: "Atkinson Hyperlegible Next Variable, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.375
  body:
    fontFamily: "Atkinson Hyperlegible Next Variable, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
  body-ui:
    fontFamily: "Atkinson Hyperlegible Next Variable, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: 1.5
  label:
    fontFamily: "Archivo Variable, sans-serif"
    fontSize: "11px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.04em"
    fontVariation: "'wdth' 72"
  figure:
    fontFamily: "Atkinson Hyperlegible Next Variable, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1
    fontFeature: "'tnum' 1, 'lnum' 1"
rounded:
  notice: "2px"
  stamp: "3px"
  sheet: "4px"
  control: "5px"
  full: "9999px"
spacing:
  gutter-sm: "16px"
  gutter-md: "24px"
  gutter-lg: "32px"
  sheet-x: "20px"
  row-y: "16px"
  container: "72rem"
components:
  button-primary:
    backgroundColor: "{colors.board}"
    textColor: "{colors.paper}"
    typography: "{typography.body-ui}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.board-deep}"
  button-ink:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    typography: "{typography.body-ui}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "44px"
  button-ink-hover:
    backgroundColor: "{colors.ink-deep}"
  button-secondary:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "44px"
  button-secondary-hover:
    backgroundColor: "{colors.paper-tint}"
  button-on-board:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 20px"
    height: "48px"
  input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "44px"
  sheet:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sheet}"
  notice-pinned:
    backgroundColor: "{colors.stock-canary}"
    textColor: "{colors.ink}"
    rounded: "{rounded.notice}"
    padding: "24px 20px 20px"
  stamp-upcoming:
    backgroundColor: "{colors.stock-canary}"
    textColor: "{colors.stock-canary-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.stamp}"
    padding: "3px 6px"
  stamp-open:
    backgroundColor: "{colors.stock-mint}"
    textColor: "{colors.stock-mint-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.stamp}"
    padding: "3px 6px"
  stamp-submitted:
    backgroundColor: "{colors.stock-sky}"
    textColor: "{colors.stock-sky-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.stamp}"
    padding: "3px 6px"
  stamp-flagged:
    backgroundColor: "{colors.stock-salmon}"
    textColor: "{colors.stock-salmon-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.stamp}"
    padding: "3px 6px"
  stamp-in-progress:
    backgroundColor: "{colors.highlighter}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.stamp}"
    padding: "3px 6px"
  stamp-mark:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.stamp}"
    padding: "3px 6px"
  option:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.body-reading}"
    rounded: "{rounded.control}"
    padding: "12px 16px"
    height: "56px"
  question-cell-current:
    backgroundColor: "{colors.highlighter}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sheet}"
    height: "44px"
  question-cell-answered:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.sheet}"
    height: "44px"
  nav-bar:
    backgroundColor: "{colors.board}"
    textColor: "{colors.board-ink}"
    height: "64px"
---

# Design System: ExamShield

## Overview

**Creative North Star: "The Exam Noticeboard"**

Every exam lives on a printed exam timetable, and your own row is the one swiped with highlighter. The shell is a felt-green board; the work happens on white printed sheets in navy-black ink. The system refuses the category's illustrated purple SaaS dashboard and the product's old near-black console: nothing glows, nothing floats in a void, nothing is decorated for its own sake. Information reads like a well-kept corridor notice: condensed caps for heads, a highly legible face for every sentence, tabular figures for every quantity.

State is printed, not coloured in. Status is a stamp cut from coloured paper stock that always carries its word. Correctness, event types and question formats use ink marks: a white stamp with an ink border, a filled ink box, a strike-through. Spent things are struck through, pending things are outlined with a dashed rule, chosen things are filled. The fluorescent highlighter is the one loud colour, and it only ever means "you, now".

Density is calm and generous on the student path (one question per phone screen, thumb-reach navigation, 44px minimum targets) and tighter on faculty and admin desks, where sheets carry tables of rows. Pins and tilt belong to the board's own notices (landing page, the student Rules notice, empty states); working sheets sit square.

**Key Characteristics:**
- Felt-green board shell (CSS-only noise texture) over a pale paper ground.
- White sheets with a small 4px corner and a real two-layer paper shadow.
- Archivo condensed caps (wdth 68 to 72) for heads, stamps and column labels; Atkinson Hyperlegible Next for all reading.
- Coloured paper stock as a fixed status vocabulary, always with a printed word.
- Highlighter swipe (#E3F24C) reserved for you/now, visible by default, with a clip-path sweep played on top.
- Tabular lining figures with units on every quantity.

## Colors

A felt green, a navy ink and white paper carry everything; four pale paper stocks speak status; one fluorescent highlighter speaks "you".

### Primary
- **Felt Board Green** (board): the top bar, the landing ground, the primary action button, progress fill and spinners. It is the board the sheets are pinned to, never a fill inside a sheet beyond the primary button and progress bar.
- **Board Shadow Green** (board-deep): hover state of the primary button and the hairline under the board bar.
- **Chalk Mint** (board-ink): secondary text and inactive nav links printed on the board.

### Secondary
- **Timetable Navy Ink** (ink): all primary text, column-head rules (2px), the ink button, filled "chosen" marks, focus outline.
- **Press Ink** (ink-deep): hover of the ink button.
- **Faded Ink** (ink-soft) and **Pencil Grey** (ink-faint): supporting copy, metadata, units, placeholder text, spent rows.

### Tertiary
- **Fluorescent Highlighter** (highlighter): you/now only. Your next exam row, the current question cell and step, your chosen option, your own score, your in-progress stamp, the active nav underline, the focus halo and text selection.
- **Paper stock**: Canary (stock-canary) = Upcoming, Mint (stock-mint) = Open / Published / Active, Sky (stock-sky) = Submitted, Salmon (stock-salmon) = Flagged / Auto-submitted and proctoring violations. Each stock has a matching dark ink (stock-*-ink) used for the word printed on it and for tinted figures (violations allowed, flagged count).
- **Correction Red** (alarm): form errors, invalid field borders, required asterisks and the danger button text. Never a status fill.

### Neutral
- **Paper White** (paper): sheets, inputs, options, secondary buttons.
- **Corridor Ground** (paper-ground): the page ground behind sheets.
- **Paper Tint** (paper-tint): sheet footers, figure captions, hover rows, disabled fields, sticky day heads.
- **Ruled Line** (paper-rule): control and stamp borders.
- **Faint Line** (paper-line): hairlines inside sheets (header bottoms, dividers between figures).

### Named Rules
**The You-Are-Here Rule.** Highlighter marks only the thing that belongs to the current user at this moment: your next exam row, current question, chosen option, own score. It is visible by default; the swipe animation plays on top of an already-visible mark and is removed under reduced motion. If a highlighted thing is not about "you, now", it is wrong.

**The Printed Word Rule.** Coloured stock inside a stamp, chip or row is the fixed status vocabulary (Upcoming, Open, Submitted, Flagged / Auto-submitted) and always carries its printed word. Never colour alone, never a new hue for a new meaning. A whole pinned notice may be cut from canary stock (the Rules notice, the login "Before you sign in" aside, empty states, landing claims); that is the board's notice paper and carries no status.

**The Ink Mark Rule.** Anything that is not a status (question type, audit access/admin events, correctness on review, formats) is an ink mark: a white stamp with a full ink border, an ink-filled box, or a strike-through. Do not borrow stock colours for it.

## Typography

**Display Font:** Archivo Variable, width axis (with Atkinson Hyperlegible Next, sans-serif)
**Body Font:** Atkinson Hyperlegible Next Variable (with system-ui, sans-serif)

**Character:** Condensed, heavy uppercase Archivo reads as the printed timetable header; Atkinson Hyperlegible Next does all reading, chosen for exam-stress legibility. Both are self-hosted via @fontsource-variable.

### Hierarchy
- **Display** (800, wdth 68, uppercase, 3.6rem to 5.6rem, line-height 0.92): the landing notice headline and the score on the result sheet (5.5rem). Landing section heads step down to 3rem / 4rem.
- **Headline** (800, wdth 68, uppercase, 2.5rem mobile / 3.25rem desktop, line-height 0.92): page titles ("My exam timetable"), sign-in title (2.75rem), question numbers (2.6rem, tabular).
- **Title** (700, wdth 72, uppercase, 0.04em tracking, 15px): sheet headers, notice titles (16 to 18px), dialog titles (18px).
- **Body Reading** (17px, line-height 1.375): question stems, option text, timetable paper titles (bold).
- **Body** (16px, line-height 1.5): default running text; paragraphs held near 46 to 62ch.
- **Body UI** (15px, 600): buttons, nav links, form text, table cells. Supporting text at 14px.
- **Label** (700, wdth 72, uppercase, 0.04em, 11px; column heads 12 to 13px): stamps, figure labels, column heads.
- **Figure** (700, 1.5rem, tabular lining): the Figure block, label over value with its unit in 14px Pencil Grey.

### Named Rules
**The Tabular Quantity Rule.** Every quantity (times, dates, durations, counts, scores, violations, IPs) is set in tabular lining figures and carries its unit or noun: "30 min", "6 questions", "0/3 violations", "2 / 9". A bare number is unfinished.

**The Two Voices Rule.** Caps Archivo labels and heads; Atkinson reads. Never set a sentence in condensed caps, never set a head in the reading face.

## Layout

A single centred container (72rem) with 16 / 24 / 32px gutters at phone / sm / lg. Pages open with a headline-and-subtitle header (actions right-aligned from sm up), then sheets stacked 24px apart. The student timetable pairs the timetable sheet with a 14rem pinned Rules notice from lg up (sticky under the 64px bar). Timetable rows are a five-column grid from md (Day · window / Paper / Length / Status / Action) that collapses on phones to a stacked row with length and question count folded into the subtitle. Sheet headers pad 12px by 16 to 20px; rows pad 16px vertically.

The exam player has its own white header (4px board strip, title, tabular clock, violations stamp, Finish) with a 3px board progress rule beneath; on phones the counts drop to a second line so the header never wraps, and Prev / Next sit in a fixed bottom bar in thumb reach, respecting the safe-area inset. Dialogs become bottom sheets under sm. Breakpoints are Tailwind defaults (640 / 768 / 1024px). The landing alternates claim notices and proof sheets in a 5:7 / 7:5 grid.

## Elevation & Depth

Depth is physical paper, not glow. Sheets cast a short contact shadow plus a soft drop; lifted forms (sign-in) lift a little more; pinned notices and dialogs hang furthest off the board. All shadows are tinted with the navy ink, never pure black. Pins carry their own drop-shadow. Hover never raises a sheet.

### Shadow Vocabulary
- **Sheet** (`box-shadow: 0 1px 1px rgba(20,33,61,0.06), 0 6px 16px -6px rgba(20,33,61,0.14)`): every working sheet.
- **Lift** (`box-shadow: 0 1px 2px rgba(20,33,61,0.08), 0 10px 24px -10px rgba(20,33,61,0.28)`): the sign-in sheet and its aside.
- **Pinned** (`box-shadow: 0 2px 3px rgba(20,33,61,0.10), 0 18px 32px -14px rgba(20,33,61,0.38)`): pinned notices, landing hero sheets, dialogs.
- **Thumb bar** (`box-shadow: 0 -6px 16px -10px rgba(20,33,61,0.3)`): the fixed mobile question navigation.

### Named Rules
**The Square Desk Rule.** Pins and tilt (0.6 to 2deg) appear only on the landing page, the student Rules notice and empty-state notices. Working sheets, forms, tables and the exam player are square and unpinned.

## Shapes

Small, near-square corners throughout, stepped by role: pinned notices 2px, stamps and letter boxes 3px, sheets and question cells 4px, buttons, inputs and options 5px. The only round shapes are the user's initials disc and the pushpin. The highlighter is the one organic shape: an uneven 3/6/4/7px radius, rotated -0.6deg (rows -0.25deg), overshooting the text by 6px with feathered ends. Rules are hairlines (1px paper-line) inside sheets, a 1px paper-line rule between every timetable, register and table row (`.rule-b`, none after the last row), and a 2px ink rule under column heads. The low-time clock (under 2 minutes) inverts to white on ink rather than borrowing a status stock.

## Components

### Buttons
- **Shape:** gently squared (5px); heights 36 / 44 / 48px (sm / md / lg).
- **Primary (board):** Felt Board Green with white text, 600 weight; hover Board Shadow Green.
- **Ink:** Timetable Navy fill for the single decisive action in context (Resume exam, Start on your highlighted row, Finish, Take the practice paper); hover Press Ink.
- **Secondary:** white with a Ruled Line border; hover darkens the border and tints the fill.
- **Ghost / Danger:** ghost is Faded Ink text with a 5% ink wash on hover; danger is white with Correction Red text.
- **On board:** white paper button on the felt.
- **Press / Focus:** 150ms out-expo transitions; press scales to 0.96 (options 0.99). Focus everywhere is a 2px ink outline at 2px offset with a 5px highlighter halo. Hover styles apply only where hover exists (hoverOnlyWhenSupported).

### Stamps (status and marks)
- **Style:** Label type on a 3px-cornered stamp with a 1px border in the stock's ink at reduced opacity.
- **Status:** Upcoming = canary at 40% with a dashed border (pending); Open = mint; Submitted = sky; Flagged / Auto-submitted = salmon; In progress = highlighter; Draft = white, dashed; Closed / Missed / Deactivated = white, struck through in Pencil Grey.
- **Marks:** MARK = white with a full ink border; NEUTRAL = Paper Tint with a ruled border.

### Cards / Containers (Sheets)
- **Corner Style:** 4px.
- **Background:** Paper White on the Corridor Ground or the felt.
- **Shadow Strategy:** Sheet shadow (see Elevation).
- **Border:** none; headers separated by a Faint Line hairline.
- **Internal Padding:** 12px by 16 to 20px headers; 20 to 36px for question and hero sheets.

### Inputs / Fields
- **Style:** white, 1px Ruled Line border, 5px corner, 44px minimum height, 15px text, green caret.
- **Focus:** border turns ink with a 3px highlighter halo.
- **Error / Disabled:** Correction Red border and a red message with icon bound by aria-describedby; disabled fields go Paper Tint with Pencil Grey text. Every label is bound to its control.

### Navigation
- **Style:** a 64px felt-green bar with the ExamShield wordmark in display caps, role nav links in 15px 600 Chalk Mint turning white, and a 3px highlighter underline on the current page. Profile shows an initials disc on white. On phones, multi-link roles get a scrolling second row.

### Answer Options (signature)
A radio group of white option rows (56px min, 5px corner). Each carries a lettered 3px box: outlined when unchosen, filled ink when chosen; the chosen option's text gets the highlighter swipe and semibold weight. On review, the correct option takes an ink border and bold text with a "Correct" caps label; a wrong choice is struck through with "Your answer".

### Question Grid
44px tabular cells: current = highlighter fill with ink border, answered = ink fill, unanswered = white with ruled border. The faculty exam step list uses the same grammar (current highlighted, done struck through, todo dashed).

### Pinned Notice
Canary (or white / salmon on the landing) notice paper, 2px corner, Pinned shadow, a red pushpin centred on the top edge, a slight tilt, and a caps title. Used for the Rules notice, empty states and landing claims only.

### Dialog
A white sheet with the Pinned shadow over a 45% ink scrim; caps title, Paper Tint footer. It carries real dialog semantics (role="dialog", aria-modal, labelled title), moves focus in, traps Tab, closes on Escape when dismissible and returns focus on close. Becomes a bottom sheet under 640px.

## Do's and Don'ts

### Do:
- **Do** reserve the highlighter (#E3F24C) for you/now: your next exam row, current question, chosen option, own score, focus.
- **Do** keep the highlighter visible at rest and play the 520ms (rows 640ms) clip-path sweep on top of it; drop the sweep under prefers-reduced-motion.
- **Do** pair every stock colour with its printed word, using only the fixed vocabulary: canary Upcoming, mint Open, sky Submitted, salmon Flagged / Auto-submitted.
- **Do** use the MARK stamp (white, ink border), ink fills and strike-through for correctness, event types and formats.
- **Do** set every quantity in tabular lining figures with its unit.
- **Do** keep targets at 44px minimum and the phone question navigation in thumb reach.
- **Do** guard hover styles behind real hover support (hoverOnlyWhenSupported).
- **Do** use the shared Dialog for every modal so semantics, focus trap and Escape come for free.

### Don't:
- **Don't** use the highlighter as a hover colour, brand accent or decoration.
- **Don't** invent a new stock colour or tone for a new meaning, and don't show status by colour alone.
- **Don't** pin or tilt working sheets, forms, tables or the exam player; pins and tilt live on the landing page, the Rules notice and empty states.
- **Don't** set sentences in condensed caps or headings in the reading face.
- **Don't** use pure black shadows or glows; shadows are navy-tinted paper shadows.
- **Don't** return to dark console surfaces or illustrated purple dashboard styling.
