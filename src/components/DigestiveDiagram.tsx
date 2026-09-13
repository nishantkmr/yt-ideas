import {interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import type {DigestiveOrgan} from '../types/content';

type DigestiveDiagramProps = {
  alt?: string;
  answerHint?: string;
  answerLabel?: string;
  focus?: DigestiveOrgan;
  revealed: boolean;
};

const ORGAN_LABELS: Record<DigestiveOrgan, string> = {
  mouth: 'Mouth',
  esophagus: 'Esophagus',
  stomach: 'Stomach',
  liver: 'Liver',
  gallbladder: 'Gallbladder',
  pancreas: 'Pancreas',
  'small-intestine': 'Small intestine',
  'large-intestine': 'Large intestine',
};

const ORGAN_SHAPE_HINTS: Record<DigestiveOrgan, string> = {
  mouth: 'The journey starts here',
  esophagus: 'A straight muscular tube',
  stomach: 'A large J-shaped pouch',
  liver: 'A broad helper organ',
  gallbladder: 'A small bile storage sac',
  pancreas: 'A long helper gland',
  'small-intestine': 'A long, thin coiled tube',
  'large-intestine': 'A thick outer tube',
};

const FOCUS_POINTS: Partial<Record<DigestiveOrgan, {x: number; y: number}>> = {
  mouth: {x: 180, y: 67},
  esophagus: {x: 181, y: 132},
  stomach: {x: 207, y: 228},
  liver: {x: 155, y: 198},
  gallbladder: {x: 167, y: 218},
  pancreas: {x: 188, y: 249},
  'small-intestine': {x: 180, y: 326},
  'large-intestine': {x: 126, y: 320},
};

const FOCUS_VIEWS: Record<DigestiveOrgan, string> = {
  mouth: '92 5 176 155',
  esophagus: '112 55 136 190',
  stomach: '112 145 176 165',
  liver: '78 145 210 145',
  gallbladder: '112 155 145 150',
  pancreas: '92 185 205 135',
  'small-intestine': '82 242 205 165',
  'large-intestine': '70 225 220 190',
};

const ROUTE = [
  {x: 181, y: 62},
  {x: 181, y: 122},
  {x: 184, y: 188},
  {x: 205, y: 229},
  {x: 194, y: 300},
  {x: 170, y: 354},
];

const routePoint = (progress: number) => {
  const scaled = progress * (ROUTE.length - 1);
  const index = Math.min(ROUTE.length - 2, Math.floor(scaled));
  const local = scaled - index;
  return {
    x: interpolate(local, [0, 1], [ROUTE[index].x, ROUTE[index + 1].x]),
    y: interpolate(local, [0, 1], [ROUTE[index].y, ROUTE[index + 1].y]),
  };
};

const OrganActivity: React.FC<{focus: DigestiveOrgan; phase: number}> = ({focus, phase}) => {
  const bob = Math.sin(phase * Math.PI * 2) * 4;
  const pulse = 0.9 + (Math.sin(phase * Math.PI * 2) + 1) * 0.08;

  if (focus === 'mouth') {
    return (
      <g className="organ-activity organ-activity--saliva">
        <path transform={`translate(0 ${bob})`} d="M146 45c-9 12-12 17-12 23a12 12 0 0 0 24 0c0-6-3-11-12-23Z" />
        <path transform={`translate(0 ${-bob * 0.7})`} d="M218 38c-7 10-10 14-10 19a10 10 0 0 0 20 0c0-5-3-9-10-19Z" />
        <circle className="food-crumb" cx="199" cy="67" r="11" />
        <circle className="food-crumb food-crumb--small" cx="211" cy="61" r="4" />
        <circle className="food-crumb food-crumb--small" cx="213" cy="75" r="3" />
      </g>
    );
  }

  if (focus === 'esophagus') {
    return (
      <g className="organ-activity organ-activity--motion" transform={`translate(0 ${bob})`}>
        <path d="m204 111 10 10-10 10" />
        <path d="m204 139 10 10-10 10" />
        <path d="m204 167 10 10-10 10" />
      </g>
    );
  }

  if (focus === 'stomach') {
    return (
      <g className="organ-activity organ-activity--bubbles">
        <circle cx="198" cy={225 + bob} r="7" />
        <circle cx="220" cy={242 - bob * 0.6} r="5" />
        <circle cx="190" cy={257 + bob * 0.4} r="4" />
      </g>
    );
  }

  if (focus === 'liver' || focus === 'gallbladder') {
    return (
      <g className="organ-activity organ-activity--bile" transform={`translate(0 ${bob * 0.5}) scale(${pulse})`}>
        <path d="M178 218c-8 11-11 16-11 22a11 11 0 0 0 22 0c0-6-3-11-11-22Z" />
        <path d="M199 225c-6 8-8 12-8 16a8 8 0 0 0 16 0c0-4-2-8-8-16Z" />
      </g>
    );
  }

  if (focus === 'pancreas') {
    return (
      <g className="organ-activity organ-activity--enzymes" transform={`scale(${pulse})`}>
        <path d="m156 224 4 9 9 4-9 4-4 9-4-9-9-4 9-4Z" />
        <path d="m224 225 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z" />
        <circle cx="190" cy={270 + bob} r="5" />
      </g>
    );
  }

  if (focus === 'small-intestine') {
    return (
      <g className="organ-activity organ-activity--nutrients" transform={`translate(0 ${bob})`}>
        <circle cx="144" cy="303" r="6" />
        <circle cx="213" cy="322" r="5" />
        <circle cx="151" cy="352" r="5" />
        <path d="m226 350 4 8 8 4-8 4-4 8-4-8-8-4 8-4Z" />
      </g>
    );
  }

  return (
    <g className="organ-activity organ-activity--water" transform={`translate(${bob} 0)`}>
      <path d="M98 283c-8 11-11 16-11 22a11 11 0 0 0 22 0c0-6-3-11-11-22Z" />
      <path d="M255 320c-7 10-10 14-10 19a10 10 0 0 0 20 0c0-5-3-9-10-19Z" />
    </g>
  );
};

export const DigestiveDiagram: React.FC<DigestiveDiagramProps> = ({
  alt,
  answerHint,
  answerLabel,
  focus,
  revealed,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const travellingPoint = routePoint((frame % (fps * 4)) / (fps * 4));
  const point = revealed && focus ? FOCUS_POINTS[focus] : travellingPoint;
  const selected = (organ: DigestiveOrgan) => revealed && focus === organ;
  const viewBox = revealed && focus ? FOCUS_VIEWS[focus] : '0 0 360 430';
  const activityPhase = (frame % (fps * 2)) / (fps * 2);

  return (
    <div
      className={`digestive-diagram ${revealed ? 'digestive-diagram--revealed' : ''}`}
      aria-label={alt ?? (revealed && focus ? `Digestive system diagram highlighting the ${ORGAN_LABELS[focus]}` : 'Unlabelled digestive system route')}
    >
      <svg viewBox={viewBox} role="img">
        <path className="body-silhouette" d="M180 14c34 0 57 24 57 54 0 20-10 36-24 47 50 18 80 63 80 122v145c0 24-19 43-43 43H110c-24 0-43-19-43-43V237c0-59 30-104 80-122-14-11-24-27-24-47 0-30 23-54 57-54Z" />
        <ellipse className={`organ organ--mouth ${selected('mouth') ? 'organ--selected' : ''}`} cx="180" cy="67" rx="25" ry="10" />
        <path className={`organ-line organ--esophagus ${selected('esophagus') ? 'organ--selected' : ''}`} d="M180 80 C174 112 187 142 182 194" />
        <path className={`organ organ--liver ${selected('liver') ? 'organ--selected' : ''}`} d="M112 194c16-28 72-36 104-16 8 5 8 22-2 28-32 19-76 20-101 8-8-4-7-13-1-20Z" />
        <path className={`organ organ--gallbladder ${selected('gallbladder') ? 'organ--selected' : ''}`} d="M160 205c13-5 23 5 20 18-2 13-9 22-18 19-10-3-12-12-8-21 3-7 2-13 6-16Z" />
        <path className={`organ organ--pancreas ${selected('pancreas') ? 'organ--selected' : ''}`} d="M142 240c23-13 82-14 101 0 7 5 3 15-6 16-28 4-61 6-91 0-10-2-12-11-4-16Z" />
        <path className={`organ organ--stomach ${selected('stomach') ? 'organ--selected' : ''}`} d="M190 178c27-11 55 4 58 30 4 34-15 67-48 71-27 4-48-13-47-34 1-16 13-24 25-31 13-8 5-26 12-36Z" />
        <path className={`organ-line organ--large-intestine ${selected('large-intestine') ? 'organ--selected' : ''}`} d="M126 258c-18 18-18 92 4 111m0-111c31-13 78-13 105 0m0 0c19 24 17 85-4 111m-101 0c29 12 72 12 101 0" />
        <path className={`organ-line organ--small-intestine ${selected('small-intestine') ? 'organ--selected' : ''}`} d="M151 285c57-25 78 7 22 18-47 9-44 35 12 24 52-10 58 20 5 29-42 7-49 27-8 27" />
        {revealed && focus ? <OrganActivity focus={focus} phase={activityPhase} /> : null}
        {point ? <circle className="food-bite" cx={point.x} cy={point.y} r="8" /> : null}
        {!revealed ? (
          <g className="mystery-label">
            <circle cx="180" cy="404" r="20" />
            <text x="180" y="413" textAnchor="middle">?</text>
          </g>
        ) : null}
      </svg>
      {revealed && focus ? (
        <div className="organ-label">
          <strong>{answerLabel ?? ORGAN_LABELS[focus]}</strong>
          <span>{answerHint ?? ORGAN_SHAPE_HINTS[focus]}</span>
        </div>
      ) : null}
    </div>
  );
};
