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
  point: '132 325 96 115',
  core: '108 120 140 167',
  slats: '0 0 360 430',
  wood: '120 268 120 143',
  barrel: '0 0 360 430',
  paint: '120 128 120 143',
  ferrule: '120 15 120 143',
  eraser: '120 0 120 143',
  layers: '0 0 360 430',
  line: '0 0 360 430',
};

// Four stops are not a place on the pencil but a thing the pencil does, so they
// replace the drawing with a scene of their own instead of zooming into it.
const SCENE_PARTS = new Set<PencilPart>(['slats', 'barrel', 'eraser', 'layers', 'line']);

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

  if (focus === 'core') {
    return (
      <g className="part-activity part-activity--core" transform={`scale(${pulse})`} style={{transformOrigin: '180px 200px'}}>
        <circle className="clay-speck" cx="180" cy={150 + bob} r="4" />
        <circle className="graphite-speck" cx="180" cy={186 - bob} r="5" />
        <circle className="clay-speck" cx="180" cy={224 + bob} r="4" />
        <circle className="graphite-speck" cx="180" cy={258 - bob} r="5" />
      </g>
    );
  }

  if (focus === 'wood') {
    return (
      <g className="part-activity part-activity--wood">
        <path className="shaving" d="M136 322c-14 4-18 16-8 22 9 5 20-3 18-12" transform={`rotate(${bob} 130 332)`} />
        <path className="shaving" d="M224 344c14 4 18 16 8 22-9 5-20-3-18-12" transform={`rotate(${-bob} 230 354)`} />
        <path className="scent" d="M150 292c6-8 0-14 6-22M210 292c6-8 0-14 6-22" transform={`translate(0 ${bob * 0.6})`} />
      </g>
    );
  }

  if (focus === 'paint') {
    return (
      <g className="part-activity part-activity--paint">
        <path className="coat" d="M146 132v138M152 132v138M158 132v138" />
        <path className="coat coat--right" d="M202 132v138M208 132v138M214 132v138" />
        <path className="brush" d="M128 160h24v16h-24Z" transform={`translate(0 ${interpolate(phase, [0, 1], [0, 90])})`} />
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
        <rect className="slat" x="38" y={128 - bob} width="284" height="62" rx="10" />
        <path className="slat-groove" d={`M38 ${182 - bob}h284`} />
        <path className="drop-arrow" d={`M180 ${208 - bob}v26m0 0-13-13m13 13 13-13`} />
        <rect className="slat" x="38" y="256" width="284" height="62" rx="10" />
        <path className="slat-groove" d="M38 264h284" />
        <rect className="laid-core" x="38" y="258" width="284" height="12" rx="6" />
        <g className="glue">
          <circle cx="82" cy="292" r="7" />
          <circle cx="180" cy="300" r="7" />
          <circle cx="278" cy="292" r="7" />
        </g>
        <path className="cut-line" d="M110 246v82M250 246v82" />
      </g>
    );
  }

  if (focus === 'barrel') {
    const fall = Math.max(0, progress - 0.35) / 0.65;
    return (
      <g className="part-scene part-scene--barrel">
        <path className="desk" d="M20 320h230v18H20Z" />
        <path className="desk-edge" d="M250 320v92" />
        <path className="stay-tick" d="m92 186 14 15 28-34" />
        <path className="hex-end" d="M162 275 136 320H84L58 275 84 230h52Z" />
        <circle className="hex-core" cx="110" cy="275" r="12" />
        <g
          transform={`translate(${interpolate(progress, [0, 1], [0, 116])} ${interpolate(
            fall,
            [0, 1],
            [0, 96],
          )})`}
        >
          <circle className="round-end" cx="208" cy="282" r="38" />
          <circle className="round-core" cx="208" cy="282" r="12" />
        </g>
        <path className="roll-arc" d="M212 228c32-8 58 6 62 28" />
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
          style={{strokeDasharray: 1, strokeDashoffset: interpolate(phase, [0, 0.55, 1], [0, 0.7, 0])}}
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
            d="M92 200l88-34 88 34-88 34Z"
            transform={`translate(0 ${index * 26})`}
          />
        ))}
        <path
          className="sheet sheet--free"
          d="M92 200l88-34 88 34-88 34Z"
          transform={`translate(${interpolate(phase, [0, 1], [0, 54])} ${interpolate(phase, [0, 1], [-26, 118])}) rotate(-8 180 200)`}
        />
        <path className="paper-line" d="M56 386h248" />
        <g className="sparkle">
          <path d={`m292 ${188 + bob} 5 11 11 5-11 5-5 11-5-11-11-5 11-5Z`} />
          <path d={`m64 ${248 - bob} 4 9 9 4-9 4-4 9-4-9-9-4 9-4Z`} />
        </g>
      </g>
    );
  }

  // The long line: a single switchback path that keeps unspooling, with the
  // point of the pencil riding its leading edge.
  const LINE =
    'M48 78h264M48 116h264M48 154h264M48 192h264M48 230h264M48 268h264M48 306h264M48 344h264';
  const row = Math.min(7, Math.floor(progress * 8));
  const withinRow = progress * 8 - row;
  return (
    <g className="part-scene part-scene--line">
      <path
        className="drawn-line"
        d={LINE}
        pathLength={1}
        style={{strokeDasharray: 1, strokeDashoffset: 1 - progress}}
      />
      <g transform={`translate(${interpolate(withinRow, [0, 1], [48, 312])} ${78 + row * 38})`}>
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
        {scene ? null : <PencilBody cutaway={showPart === 'core' || showPart === 'point'} />}
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
