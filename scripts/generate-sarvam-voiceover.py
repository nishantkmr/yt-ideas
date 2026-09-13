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
    """Retire narration whose cue no longer exists.

    These files cost API credits and carry human listening approval, so they are
    moved into work/stale-audio/ rather than deleted: a renamed cue is then a
    recoverable mistake instead of a silent, irreversible loss.
    """
    removed = 0
    attic = (
        PROJECT_ROOT
        / "work"
        / "stale-audio"
        / output_root.name
        / time.strftime("%Y%m%d-%H%M%S")
    )
    for candidate in sorted(output_root.iterdir()):
        if (
            candidate.is_file()
            and candidate.suffix.lower() in {".mp3", ".wav"}
            and candidate.name not in expected_filenames
        ):
            attic.mkdir(parents=True, exist_ok=True)
            candidate.rename(attic / candidate.name)
            removed += 1
            print(
                f"RETIRED {candidate.relative_to(PUBLIC_ROOT).as_posix()}"
                f" -> {(attic / candidate.name).relative_to(PROJECT_ROOT).as_posix()}",
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
    parser = argparse.ArgumentParser(
        description=(
            "Render Sarvam voiceovers from cue sheets. Cue sheets are produced by "
            "scripts/generate-voiceover.mjs, which owns the narration wording."
        )
    )
    parser.add_argument(
        "--cues",
        action="append",
        required=True,
        metavar="FILE",
        help="Cue sheet JSON to render. May be repeated.",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Regenerate every cue even when its text and settings are unchanged.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Report what would be generated without calling the Sarvam API.",
    )
    parser.add_argument(
        "--strict-cache",
        action="store_true",
        help="Exit non-zero if any cue would be generated. Proves a run spends nothing.",
    )
    parser.add_argument(
        "--adopt-existing",
        action="store_true",
        help="Adopt audio already on disk for cues with no cache entry instead of regenerating it.",
    )
    parser.add_argument(
        "--prune",
        action="store_true",
        help="Retire narration audio whose cue no longer exists.",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Print a machine-readable RESULT summary line.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    api_key = None
    total = 0
    reused = 0
    generated = 0
    would_generate = 0
    removed = 0

    for sheet_path in args.cues:
        sheet = json.loads(Path(sheet_path).read_text(encoding="utf-8"))
        if sheet.get("schemaVersion") != 1:
            raise ValueError(f"Unsupported cue sheet schema in {sheet_path}")
        if sheet.get("provider") != "sarvam-bulbul-v3":
            print(f"SKIP {sheet['contentId']} (provider is not sarvam-bulbul-v3)")
            continue

        # cue_fingerprint hashes the narration settings alongside the text, and
        # its canonical form must not change: these three keys are exactly what
        # the cached fingerprints were built from.
        narration = {
            "provider": sheet["provider"],
            "voice": sheet["voice"],
            "format": sheet["format"],
        }

        output_root = (PUBLIC_ROOT / sheet["audioBase"]).resolve()
        if PUBLIC_ROOT.resolve() not in output_root.parents:
            raise ValueError(f"audioBase must stay inside public/: {sheet['audioBase']}")
        if not args.dry_run:
            output_root.mkdir(parents=True, exist_ok=True)

        cache_path = output_root / CACHE_FILENAME
        old_cache, cache_existed = load_cache(cache_path)
        new_cache = {}

        for cue in sheet["cues"]:
            name, text = cue["name"], cue["text"]
            total += 1
            output = output_root / f"{name}.{sheet['format']}"
            fingerprint = cue_fingerprint(text, narration)
            new_cache[name] = fingerprint

            if not args.force and output.exists():
                if old_cache.get(name) == fingerprint:
                    reused += 1
                    print(f"REUSED {output.relative_to(PUBLIC_ROOT).as_posix()}", flush=True)
                    continue
                # Audio with no matching cache entry is only trusted when asked
                # for explicitly. Adopting by default would bless whatever
                # happens to be on disk after the cache file is lost.
                if args.adopt_existing and not cache_existed:
                    reused += 1
                    print(
                        f"ADOPTED {output.relative_to(PUBLIC_ROOT).as_posix()} into cache",
                        flush=True,
                    )
                    continue

            if args.dry_run:
                would_generate += 1
                print(f"WOULD GENERATE {output.relative_to(PUBLIC_ROOT).as_posix()}", flush=True)
                continue

            if api_key is None:
                api_key = load_api_key()
            output.write_bytes(synthesize(text, sheet["voice"], api_key))
            generated += 1
            print(f"GENERATED {output.relative_to(PUBLIC_ROOT).as_posix()}", flush=True)

        if not args.dry_run:
            write_cache(cache_path, new_cache)
            if args.prune:
                expected = {f"{cue['name']}.{sheet['format']}" for cue in sheet["cues"]}
                removed += prune_stale_audio(output_root, expected)

    print(
        f"DONE {reused} reused, {generated} generated, "
        f"{would_generate} pending, {removed} retired",
        flush=True,
    )
    if args.json:
        print(
            "RESULT "
            + json.dumps(
                {
                    "cues": total,
                    "reused": reused,
                    "generated": generated,
                    "wouldGenerate": would_generate,
                    "retired": removed,
                    "dryRun": args.dry_run,
                }
            ),
            flush=True,
        )
    if args.strict_cache and would_generate > 0:
        raise SystemExit(3)


if __name__ == "__main__":
    main()
