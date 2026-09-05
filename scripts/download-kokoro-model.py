from pathlib import Path
from urllib.request import urlretrieve

PROJECT_ROOT = Path(__file__).resolve().parent.parent
MODEL_ROOT = PROJECT_ROOT / ".tools" / "kokoro-model"
RELEASE_ROOT = (
    "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.1"
)
FILES = ("kokoro-v1.0.onnx", "voices-v1.0.bin")


def main() -> None:
    MODEL_ROOT.mkdir(parents=True, exist_ok=True)
    for filename in FILES:
        destination = MODEL_ROOT / filename
        if destination.exists() and destination.stat().st_size > 0:
            print(f"READY {destination.relative_to(PROJECT_ROOT).as_posix()}")
            continue
        print(f"DOWNLOADING {filename}")
        urlretrieve(f"{RELEASE_ROOT}/{filename}", destination)
        print(f"READY {destination.relative_to(PROJECT_ROOT).as_posix()}")


if __name__ == "__main__":
    main()
