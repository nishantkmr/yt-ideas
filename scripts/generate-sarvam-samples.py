import argparse
import base64
import json
import os
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_ROOT = PROJECT_ROOT / "src" / "data"
PUBLIC_ROOT = PROJECT_ROOT / "public"
WORK_ROOT = PROJECT_ROOT / "work"
API_URL = "https://api.sarvam.ai/text-to-speech"


def narration_cues(content: dict) -> dict[str, str]:
    return {
        "intro": "Hello, superstar! Can you guess the animal?",
        "clue-1": f"Here's clue one. {content['clues'][0]}",
        "clue-2": f"And clue two. {content['clues'][1]}",
        "answer": f"Yes! It's a {content['answer']}. Great guessing!",
        "fact": f"Here's a fun fact. {content['funFact']}",
        "outro": "Amazing job, superstar! Thanks for playing. See you next time!",
    }


def load_api_key() -> str:
    key = os.environ.get("SARVAM_API_KEY", "").strip()
    env_path = PROJECT_ROOT / ".env"
    if not key and env_path.exists():
        for raw_line in env_path.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            name, value = line.split("=", 1)
            if name.strip() == "SARVAM_API_KEY":
                key = value.strip().strip('"').strip("'")
                break
    if not key:
        raise RuntimeError(
            "SARVAM_API_KEY is missing. Set it in the environment or in the ignored .env file."
        )
    return key


def synthesize(text: str, speaker: str, api_key: str, pace: float) -> bytes:
    payload = json.dumps(
        {
            "text": text,
            "language_code": "en-IN",
            "model": "bulbul:v3",
            "speaker": speaker,
            "pace": pace,
            "temperature": 0.8,
            "speech_sample_rate": 48000,
            "output_audio_codec": "wav",
        }
    ).encode("utf-8")
    request = Request(
        API_URL,
        data=payload,
        headers={
            "api-subscription-key": api_key,
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urlopen(request, timeout=90) as response:
            result = json.loads(response.read().decode("utf-8"))
    except HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Sarvam API returned HTTP {error.code}: {detail}") from error
    audios = result.get("audios", [])
    if not audios:
        raise RuntimeError("Sarvam API response did not include audio")
    return base64.b64decode(audios[0])


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate Sarvam Bulbul v3 samples.")
    parser.add_argument("--speakers", default="priya,ishita,suhani")
    parser.add_argument("--pace", type=float, default=0.9)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    api_key = load_api_key()
    speakers = [speaker.strip().lower() for speaker in args.speakers.split(",")]
    source = DATA_ROOT / "zebra-short.json"
    content = json.loads(source.read_text(encoding="utf-8"))

    for speaker in speakers:
        audio_base = f"audio-comparisons/sarvam-{speaker}/{content['id']}"
        output_root = PUBLIC_ROOT / audio_base
        output_root.mkdir(parents=True, exist_ok=True)
        for cue, text in narration_cues(content).items():
            output = output_root / f"{cue}.wav"
            output.write_bytes(synthesize(text, speaker, api_key, args.pace))
            print(f"GENERATED {output.relative_to(PUBLIC_ROOT).as_posix()}")

        comparison_props = {
            **content,
            "narration": {
                "enabled": True,
                "provider": "sarvam-bulbul-v3",
                "voice": speaker,
                "audioBase": audio_base,
                "format": "wav",
            },
        }
        WORK_ROOT.mkdir(parents=True, exist_ok=True)
        props_path = WORK_ROOT / f"sarvam-{speaker}-short-props.json"
        props_path.write_text(
            json.dumps(comparison_props, indent=2) + "\n", encoding="utf-8"
        )
        print(f"PROPS {props_path.relative_to(PROJECT_ROOT).as_posix()}")


if __name__ == "__main__":
    main()
