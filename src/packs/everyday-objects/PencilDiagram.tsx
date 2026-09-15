import {interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import type {PencilPart} from './manifest.ts';

type PencilDiagramProps = {
  alt?: string;
  answerHint?: string;
  answerLabel?: string;
  focus?: PencilPart;
  revealed: boolean;
};

const PART_LABELS: Record<PencilPart, string> = {
  inside: 'Inside the pencil',
  point: 'The point',
  core: 'The core',
  slats: 'The wood sandwich',
  wood: 'The wood',
  barrel: 'The shape',
  paint: 'The paint',
  ferrule: 'The ferrule',
  eraser: 'The eraser',
  layers: 'Flakes of graphite',
  line: 'One very long line',
};

const PART_HINTS: Record<PencilPart, string> = {
  inside: 'The core runs the whole length',
  point: 'Graphite and clay, never lead',
  core: 'More clay is harder, more graphite is darker',
  slats: 'Laid in a groove and glued shut',
  wood: 'Cedar sharpens without splintering',
  barrel: 'Six sides so it cannot roll away',
  paint: 'Coat after coat of colour',
  ferrule: 'The metal band that clamps the eraser',
  eraser: 'It lifts the mark off the paper',
  layers: 'Sheets one atom thick',
  line: 'About 45,000 words',
};

// Close-ups are viewBox windows onto the same drawing, so a part is never
// redrawn at a second scale. Each window keeps the panel's 320x382 ratio.
const FOCUS_VIEWS: Record<PencilPart, string> = {
  // The whole pencil, wood turned see-through. A Short's reveal has to be
  // recognisable on a phone in one second, which a tight crop of the barrel is
  // not.
  inside: '0 0 360 430',
  point: '132 325 96 115',
  core: '108 120 140 167',
  slats: '0 0 360 430',
  wood: '120 252 120 143',
  barrel: '0 0 360 430',
  paint: '0 0 360 430',
  ferrule: '120 15 120 143',
  eraser: '0 0 360 430',
  layers: '0 0 360 430',
  line: '0 0 360 430',
};

// Four stops are not a place on the pencil but a thing the pencil does, so they
// replace the drawing with a scene of their own instead of zooming into it.
const SCENE_PARTS = new Set<PencilPart>([
  'slats',
  'barrel',
  'paint',
  'eraser',
  'layers',
  'line',
]);

// The answer label sits over the bottom of the panel, so every scene below keeps
// its drawing above y=330. Getting that wrong hides the payoff behind the
// caption, which is invisible in Studio until the label has text in it.

// Where the travelling spotlight rests while a question is on screen: up the
// pencil from the point to the eraser, so the whole object is surveyed before
// any of it is named.
const SURVEY = [
  {x: 180, y: 396},
  {x: 180, y: 330},
  {x: 180, y: 240},
  {x: 180, y: 150},
  {x: 180, y: 52},
];

const surveyPoint = (progress: number) => {
  const scaled = progress * (SURVEY.length - 1);
  const index = Math.min(SURVEY.length - 2, Math.floor(scaled));
  const local = scaled - index;
  return {
    x: interpolate(local, [0, 1], [SURVEY[index].x, SURVEY[index + 1].x]),
    y: interpolate(local, [0, 1], [SURVEY[index].y, SURVEY[index + 1].y]),
  };
};

/** The pencil itself, drawn once and windowed into by every close-up. */
const PencilBody: React.FC<{cutaway: boolean}> = ({cutaway}) => (
  <g className={`pencil-body ${cutaway ? 'pencil-body--cutaway' : ''}`}>
    <path className="pencil-eraser" d="M142 44a19 19 0 0 1 19-19h38a19 19 0 0 1 19 19v26h-76Z" />
    <rect className="pencil-ferrule" x="139" y="68" width="82" height="38" rx="7" />
    <path className="pencil-crimp" d="M139 78h82M139 96h82" />
    <rect className="pencil-barrel" x="142" y="104" width="76" height="198" />
    <path className="pencil-facet" d="M161 104v198M199 104v198" />
    <path className="pencil-wood" d="M142 302h76l-27 79h-22Z" />
    <path className="pencil-grain" d="M156 318l14 58M204 318l-14 58" />
    <path className="pencil-tip" d="M169 381h22l-11 25Z" />
    <path className="pencil-core" d="M177 104h6v277l-3 7-3-7Z" />
  </g>
);

const PartActivity: React.FC<{focus: PencilPart; phase: number}> = ({focus, phase}) => {
  const bob = Math.sin(phase * Math.PI * 2) * 4;
  const pulse = 0.94 + (Math.sin(phase * Math.PI * 2) + 1) * 0.05;

  if (focus === 'point') {
    return (
      <g className="part-activity part-activity--point">
        <path className="paper-line" d="M132 418h96" />
        <path
          className="written-mark"
          d="M140 414c10-8 16 6 26-2s16 6 26-2"
          style={{strokeDasharray: 80, strokeDashoffset: interpolate(phase, [0, 1], [80, 0])}}
        />
        <path className="shine" d="m196 372 9-6M200 384l11-3" transform={`translate(${bob * 0.5} 0)`} />
      </g>
    );
  }

  if (focus === 'core' || focus === 'inside') {
    const depths = focus === 'inside' ? [140, 196, 252, 308] : [150, 186, 224, 258];
    return (
      <g
        className="part-activity part-activity--core"
        transform={`scale(${pulse})`}
        style={{transformOrigin: '180px 200px'}}
      >
        {depths.map((y, index) => (
          <circle
            className={index % 2 === 0 ? 'clay-speck' : 'graphite-speck'}
            cx="180"
            cy={index % 2 === 0 ? y + bob : y - bob}
            key={y}
            r={index % 2 === 0 ? 4 : 5}
          />
        ))}
      </g>
    );
  }

  if (focus === 'wood') {
    return (
      <g className="part-activity part-activity--wood">
        <path className="shaving" d="M136 322c-14 4-18 16-8 22 9 5 20-3 18-12" transform={`rotate(${bob} 130 332)`} />
        <path className="shaving" d="M224 344c14 4 18 16 8 22-9 5-20-3-18-12" transform={`rotate(${-bob} 230 354)`} />
      </g>
    );
  }

  return (
    <g className="part-activity part-activity--ferrule">
      <path className="squeeze" d={`M${126 + bob} 79l14 8-14 8`} />
      <path className="squeeze" d={`M${234 - bob} 79l-14 8 14 8`} />
      <circle className="prong" cx="160" cy="87" r="4" />
      <circle className="prong" cx="200" cy="87" r="4" />
    </g>
  );
};

/** The stops that are a process rather than a place. */
const PartScene: React.FC<{focus: PencilPart; phase: number; progress: number}> = ({
  focus,
  phase,
  progress,
}) => {
  const bob = Math.sin(phase * Math.PI * 2) * 5;

  if (focus === 'slats') {
    return (
      <g className="part-scene part-scene--slats">
        <rect className="slat" x="38" y={96 - bob} width="284" height="58" rx="10" />
        <path className="slat-groove" d={`M38 ${146 - bob}h284`} />
        <path className="drop-arrow" d={`M180 ${172 - bob}v24m0 0-13-13m13 13 13-13`} />
        <rect className="slat" x="38" y="222" width="284" height="58" rx="10" />
        <path className="slat-groove" d="M38 230h284" />
        <rect className="laid-core" x="38" y="224" width="284" height="12" rx="6" />
        <g className="glue">
          <circle cx="82" cy="256" r="7" />
          <circle cx="180" cy="264" r="7" />
          <circle cx="278" cy="256" r="7" />
        </g>
        <path className="cut-line" d="M110 212v78M250 212v78" />
      </g>
    );
  }

  if (focus === 'barrel') {
    const fall = Math.max(0, progress - 0.35) / 0.65;
    return (
      <g className="part-scene part-scene--barrel">
        <path className="desk" d="M20 258h230v18H20Z" />
        <path className="desk-edge" d="M250 258v64" />
        <path className="stay-tick" d="m92 128 14 15 28-34" />
        <path className="hex-end" d="M162 213 136 258H84L58 213 84 168h52Z" />
        <circle className="hex-core" cx="110" cy="213" r="12" />
        <g
          transform={`translate(${interpolate(progress, [0, 1], [0, 116])} ${interpolate(
            fall,
            [0, 1],
            [0, 78],
          )})`}
        >
          <circle className="round-end" cx="208" cy="220" r="38" />
          <circle className="round-core" cx="208" cy="220" r="12" />
        </g>
        <path className="roll-arc" d="M212 166c32-8 58 6 62 28" />
      </g>
    );
  }

  if (focus === 'paint') {
    // Bare wood on the left, then one band per coat: the point is that the
    // colour is not one layer but many.
    const COATS = ['#f7e9bd', '#fbdf9a', '#ffd776', '#ffcb5e', '#ffc849', '#f0b12c'];
    return (
      <g className="part-scene part-scene--paint">
        <rect className="bare-wood" x="44" y="118" width="96" height="196" rx="10" />
        {COATS.map((colour, index) => (
          <rect
            className="coat-band"
            key={colour}
            x={140 + index * 21}
            y="118"
            width="21"
            height="196"
            fill={colour}
          />
        ))}
        <path
          className="brush"
          d="M-16-34h32v44l-16 14-16-14Z"
          transform={`translate(288 ${interpolate(phase, [0, 1], [150, 286])})`}
        />
        <path className="drip" d={`M276 ${112 + bob}v-16M300 ${108 - bob}v-14`} />
      </g>
    );
  }

  if (focus === 'eraser') {
    // Sideways, because an eraser only makes sense on top of a page: the block
    // travels along the mark and the mark leaves with it.
    const sweep = interpolate(phase, [0, 0.55, 1], [72, 250, 72]);
    return (
      <g className="part-scene part-scene--eraser">
        <path className="paper-line" d="M46 300h268" />
        <path
          className="written-mark"
          d="M62 288c26-16 44 10 68-4s44 10 68-4 44 10 62-2"
          pathLength={1}
          style={{strokeDasharray: 1, strokeDashoffset: interpolate(phase, [0, 0.55, 1], [0, -0.7, 0])}}
        />
        <g transform={`translate(${sweep} 0)`}>
          <rect className="eraser-block" x="-38" y="196" width="76" height="80" rx="16" />
          <rect className="eraser-ferrule" x="-38" y="176" width="76" height="26" rx="8" />
          <circle className="crumb" cx={-52 + bob} cy="282" r="7" />
          <circle className="crumb" cx="52" cy={272 - bob} r="5" />
          <circle className="crumb" cx="-30" cy={318 + bob} r="6" />
        </g>
      </g>
    );
  }

  if (focus === 'layers') {
    return (
      <g className="part-scene part-scene--layers">
        {[0, 1, 2, 3, 4].map((index) => (
          <path
            className="sheet"
            key={index}
            d="M92 168l88-30 88 30-88 30Z"
            transform={`translate(0 ${index * 22})`}
          />
        ))}
        <path
          className="sheet sheet--free"
          d="M92 168l88-30 88 30-88 30Z"
          transform={`translate(${interpolate(phase, [0, 1], [0, 46])} ${interpolate(phase, [0, 1], [-22, 108])}) rotate(-8 180 168)`}
        />
        <path className="paper-line" d="M56 310h248" />
        <g className="sparkle">
          <path d={`m292 ${156 + bob} 5 11 11 5-11 5-5 11-5-11-11-5 11-5Z`} />
          <path d={`m64 ${206 - bob} 4 9 9 4-9 4-4 9-4-9-9-4 9-4Z`} />
        </g>
      </g>
    );
  }

  // The long line: a single switchback path that keeps unspooling, with the
  // point of the pencil riding its leading edge.
  const LEFT = 48;
  const RIGHT = 312;
  const TOP = 68;
  const GAP = 34;
  const ROWS = 8;
  // One path, not eight: the switchbacks are part of the stroke, so the dash
  // animation unspools a single continuous line rather than ruling a page.
  let line = `M${LEFT} ${TOP}`;
  for (let index = 0; index < ROWS; index += 1) {
    const y = TOP + index * GAP;
    const rightward = index % 2 === 0;
    line += ` H${rightward ? RIGHT : LEFT}`;
    if (index < ROWS - 1) {
      const turn = rightward ? RIGHT + 22 : LEFT - 22;
      line += ` C${turn} ${y} ${turn} ${y + GAP} ${rightward ? RIGHT : LEFT} ${y + GAP}`;
    }
  }
  const row = Math.min(ROWS - 1, Math.floor(progress * ROWS));
  const withinRow = progress * ROWS - row;
  const rightward = row % 2 === 0;
  return (
    <g className="part-scene part-scene--line">
      <path
        className="drawn-line"
        d={line}
        pathLength={1}
        style={{strokeDasharray: 1, strokeDashoffset: 1 - progress}}
      />
      <g
        transform={`translate(${interpolate(
          withinRow,
          [0, 1],
          rightward ? [LEFT, RIGHT] : [RIGHT, LEFT],
        )} ${TOP + row * GAP}) scale(${rightward ? 1 : -1} 1)`}
      >
        <path className="line-pencil" d="M0 0l-16-26h-14l16 26-16 26h14Z" />
      </g>
    </g>
  );
};

export const PencilDiagram: React.FC<PencilDiagramProps> = ({
  alt,
  answerHint,
  answerLabel,
  focus,
  revealed,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const showPart = revealed && focus ? focus : undefined;
  const scene = showPart !== undefined && SCENE_PARTS.has(showPart);
  const viewBox = showPart ? FOCUS_VIEWS[showPart] : '0 0 360 430';
  const activityPhase = (frame % (fps * 2)) / (fps * 2);
  // The line and the runaway pencil play once across the reveal rather than
  // looping, because both are journeys with an end.
  const sceneProgress = Math.min(1, frame / (fps * 7));
  const spotlight = surveyPoint((frame % (fps * 4)) / (fps * 4));

  return (
    <div
      className={`pencil-diagram ${revealed ? 'pencil-diagram--revealed' : ''} ${
        scene ? 'pencil-diagram--scene' : ''
      }`.trim()}
      aria-label={
        alt ??
        (showPart
          ? `Pencil cutaway showing ${PART_LABELS[showPart]}`
          : 'Unlabelled pencil, not yet taken apart')
      }
    >
      <svg viewBox={viewBox} role="img">
        {scene ? null : (
          <PencilBody
            cutaway={showPart === 'core' || showPart === 'point' || showPart === 'inside'}
          />
        )}
        {showPart && !scene ? <PartActivity focus={showPart} phase={activityPhase} /> : null}
        {showPart && scene ? (
          <PartScene focus={showPart} phase={activityPhase} progress={sceneProgress} />
        ) : null}
        {!revealed ? (
          <>
            <circle className="survey-spot" cx={spotlight.x} cy={spotlight.y} r="26" />
            <g className="mystery-badge">
              <circle cx="286" cy="392" r="22" />
              <text x="286" y="402" textAnchor="middle">?</text>
            </g>
          </>
        ) : null}
      </svg>
      {showPart ? (
        <div className="part-label">
          <strong>{answerLabel ?? PART_LABELS[showPart]}</strong>
          <span>{answerHint ?? PART_HINTS[showPart]}</span>
        </div>
      ) : null}
    </div>
  );
};
