import argparse
import base64
import hashlib
import json
import os
import time
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_ROOT = PROJECT_ROOT / "src" / "data"
PUBLIC_ROOT = PROJECT_ROOT / "public"
API_URL = "https://api.sarvam.ai/text-to-speech"
CACHE_FILENAME = ".voiceover-cache.json"
SYNTHESIS_SETTINGS = {
    "language_code": "en-IN",
    "model": "bulbul:v3",
    "pace": 0.9,
    "temperature": 0.8,
    "speech_sample_rate": 48000,
    "output_audio_codec": "wav",
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
        raise RuntimeError("SARVAM_API_KEY is missing from the environment or .env file.")
    return key


def narration_cues(content: dict) -> dict[str, str]:
    if "questions" in content:
        cues = {
            "intro": f"Hello, curious explorers! Welcome to {content['title']}. Let's play!",
            "outro": (
                f"Amazing work! You completed all {len(content['questions'])} questions. "
                "Thanks for playing, and keep exploring!"
            ),
        }
        for index, question in enumerate(content["questions"], start=1):
            cues[f"{question['id']}-question"] = (
                f"Question {index}. {question['question']}"
            )
            cues[f"{question['id']}-answer"] = (
                f"It's {question['answer']}! {question['explanation']}"
            )
        return cues

    is_animal = content.get("type") == "guess-animal"
    return {
        "intro": (
            "Hello, superstar! Can you guess the animal?"
            if is_animal
            else f"Hello, superstar! {content.get('title', 'Can you solve the clues?')}"
        ),
        "clue-1": f"Here's clue one. {content['clues'][0]}",
        "clue-2": f"And clue two. {content['clues'][1]}",
        "answer": (
            f"Yes! It's a {content['answer']}. Great guessing!"
            if is_animal
            else f"The answer is {content['answer']}. Great thinking!"
        ),
        "fact": f"Here's a fun fact. {content['funFact']}",
        "outro": "Amazing job, superstar! Thanks for playing. See you next time!",
    }


def cue_fingerprint(text: str, narration: dict) -> str:
    fingerprint_data = {
        "text": text,
        "provider": narration["provider"],
        "voice": narration["voice"],
        "format": narration["format"],
        "settings": SYNTHESIS_SETTINGS,
    }
    canonical = json.dumps(
        fingerprint_data, ensure_ascii=False, sort_keys=True, separators=(",", ":")
    )
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def load_cache(cache_path: Path) -> tuple[dict[str, str], bool]:
    if not cache_path.exists():
        return {}, False
    try:
        cache = json.loads(cache_path.read_text(encoding="utf-8"))
        if cache.get("version") != 1 or not isinstance(cache.get("cues"), dict):
            raise ValueError("unsupported cache format")
        return cache["cues"], True
    except (OSError, ValueError, json.JSONDecodeError) as error:
        print(f"WARNING Ignoring invalid cache {cache_path.name}: {error}", flush=True)
        return {}, True


def write_cache(cache_path: Path, cues: dict[str, str]) -> None:
    cache = {"version": 1, "cues": cues}
    cache_path.write_text(
        json.dumps(cache, indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )


def prune_stale_audio(output_root: Path, expected_filenames: set[str]) -> int:
    removed = 0
    for candidate in output_root.iterdir():
        if (
            candidate.is_file()
            and candidate.suffix.lower() in {".mp3", ".wav"}
            and candidate.name not in expected_filenames
        ):
            candidate.unlink()
            removed += 1
            print(
                f"REMOVED stale {candidate.relative_to(PUBLIC_ROOT).as_posix()}",
                flush=True,
            )
    return removed


def synthesize(text: str, speaker: str, api_key: str) -> bytes:
    payload = json.dumps(
        {
            "text": text,
            "speaker": speaker,
            **SYNTHESIS_SETTINGS,
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
    result = None
    for attempt in range(1, 4):
        try:
            with urlopen(request, timeout=120) as response:
                result = json.loads(response.read().decode("utf-8"))
            break
        except HTTPError as error:
            detail = error.read().decode("utf-8", errors="replace")
            raise RuntimeError(
                f"Sarvam API returned HTTP {error.code}: {detail}"
            ) from error
        except (URLError, TimeoutError) as error:
            if attempt == 3:
                raise RuntimeError(
                    "Sarvam API could not be reached after three attempts"
                ) from error
            print(f"RETRY Sarvam connection ({attempt}/3)", flush=True)
            time.sleep(attempt * 2)
    if result is None:
        raise RuntimeError("Sarvam API returned no result")
    audios = result.get("audios", [])
    if not audios:
        raise RuntimeError("Sarvam API response did not include audio")
    return base64.b64decode(audios[0])


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate cached Sarvam voiceovers.")
    parser.add_argument(
        "--force",
        action="store_true",
        help="Regenerate every cue even when its text and settings are unchanged.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    api_key = None
    reused = 0
    generated = 0
    removed = 0
    for source in sorted(DATA_ROOT.glob("*.json")):
        content = json.loads(source.read_text(encoding="utf-8"))
        narration = content.get("narration")
        if not narration or not narration.get("enabled"):
            print(f"SKIP {source.name} (narration disabled)")
            continue
        if narration.get("provider") != "sarvam-bulbul-v3":
            print(f"SKIP {source.name} (provider is not sarvam-bulbul-v3)")
            continue

        output_root = (PUBLIC_ROOT / narration["audioBase"]).resolve()
        if PUBLIC_ROOT.resolve() not in output_root.parents:
            raise ValueError(f"audioBase must stay inside public/: {narration['audioBase']}")
        output_root.mkdir(parents=True, exist_ok=True)

        cache_path = output_root / CACHE_FILENAME
        old_cache, cache_existed = load_cache(cache_path)
        cues = narration_cues(content)
        new_cache = {}
        for cue, text in cues.items():
            output = output_root / f"{cue}.{narration['format']}"
            fingerprint = cue_fingerprint(text, narration)
            new_cache[cue] = fingerprint

            if not args.force and output.exists():
                if old_cache.get(cue) == fingerprint:
                    reused += 1
                    print(
                        f"REUSED {output.relative_to(PUBLIC_ROOT).as_posix()}",
                        flush=True,
                    )
                    continue
                if not cache_existed:
                    reused += 1
                    print(
                        f"ADOPTED {output.relative_to(PUBLIC_ROOT).as_posix()} into cache",
                        flush=True,
                    )
                    continue

            if api_key is None:
                api_key = load_api_key()
            output.write_bytes(synthesize(text, narration["voice"], api_key))
            generated += 1
            print(
                f"GENERATED {output.relative_to(PUBLIC_ROOT).as_posix()}",
                flush=True,
            )
        write_cache(cache_path, new_cache)
        expected_filenames = {f"{cue}.{narration['format']}" for cue in cues}
        removed += prune_stale_audio(output_root, expected_filenames)

    print(
        f"DONE {reused} reused, {generated} generated, {removed} stale removed",
        flush=True,
    )


if __name__ == "__main__":
    main()
