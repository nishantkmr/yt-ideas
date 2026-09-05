import argparse
import json
import os
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
KOKORO_TEMP = PROJECT_ROOT / ".tools" / "kokoro-temp"
KOKORO_TEMP.mkdir(parents=True, exist_ok=True)
os.environ["TEMP"] = str(KOKORO_TEMP)
os.environ["TMP"] = str(KOKORO_TEMP)
sys.path.insert(0, str(PROJECT_ROOT / ".tools" / "kokoro-onnx"))

import soundfile as sf  # noqa: E402
import numpy as np  # noqa: E402
from kokoro_onnx import Kokoro  # noqa: E402

DATA_ROOT = PROJECT_ROOT / "src" / "data"
PUBLIC_ROOT = PROJECT_ROOT / "public"
MODEL_ROOT = PROJECT_ROOT / ".tools" / "kokoro-model"
WORK_ROOT = PROJECT_ROOT / "work"


def narration_cues(content: dict) -> dict[str, str]:
    return {
        "intro": "Hello, superstar! Can you guess the animal?",
        "clue-1": f"Here's clue one. {content['clues'][0]}",
        "clue-2": f"And clue two. {content['clues'][1]}",
        "answer": f"Yes! It's a {content['answer']}. Great guessing!",
        "fact": f"Here's a fun fact. {content['funFact']}",
        "outro": "Amazing job, superstar! Thanks for playing. See you next time!",
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate a local Kokoro voice sample.")
    parser.add_argument("--voice", default="af_heart")
    parser.add_argument("--speed", type=float, default=1.05)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    source = DATA_ROOT / "zebra-short.json"
    content = json.loads(source.read_text(encoding="utf-8"))
    model_path = MODEL_ROOT / "kokoro-v1.0.onnx"
    voices_path = MODEL_ROOT / "voices-v1.0.bin"

    for required in (model_path, voices_path):
        if not required.exists():
            raise FileNotFoundError(
                f"Missing {required}. Download the Kokoro v1 model files first."
            )

    audio_base = f"audio-comparisons/kokoro-{args.voice}/{content['id']}"
    output_root = PUBLIC_ROOT / audio_base
    output_root.mkdir(parents=True, exist_ok=True)

    kokoro = Kokoro(str(model_path), str(voices_path))
    if args.voice not in kokoro.voices:
        raise ValueError(f"Voice {args.voice!r} is not in the installed voice pack")

    for cue, text in narration_cues(content).items():
        samples, sample_rate = kokoro.create(
            text,
            voice=args.voice,
            speed=args.speed,
            lang="en-us",
            sentence_pause=0.3,
            clause_pause=0.12,
        )
        peak = float(np.max(np.abs(samples)))
        if peak > 0:
            samples = samples * (0.45 / peak)
        output = output_root / f"{cue}.wav"
        sf.write(output, samples, sample_rate)
        seconds = len(samples) / sample_rate
        print(f"GENERATED {output.relative_to(PUBLIC_ROOT).as_posix()} ({seconds:.2f}s)")

    comparison_props = {
        **content,
        "narration": {
            "enabled": True,
            "provider": "kokoro-local",
            "voice": args.voice,
            "audioBase": audio_base,
            "format": "wav",
        },
    }
    WORK_ROOT.mkdir(parents=True, exist_ok=True)
    props_path = WORK_ROOT / f"kokoro-{args.voice}-short-props.json"
    props_path.write_text(json.dumps(comparison_props, indent=2) + "\n", encoding="utf-8")
    print(f"PROPS {props_path.relative_to(PROJECT_ROOT).as_posix()}")


if __name__ == "__main__":
    main()
