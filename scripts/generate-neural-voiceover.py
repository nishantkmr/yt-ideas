import asyncio
import json
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT / ".tools" / "edge-tts"))

import edge_tts  # noqa: E402

DATA_ROOT = PROJECT_ROOT / "src" / "data"
PUBLIC_ROOT = PROJECT_ROOT / "public"


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
            cues[f"{question['id']}-question"] = f"Question {index}. {question['question']}"
            cues[f"{question['id']}-answer"] = (
                f"It's {question['answer']}! {question['explanation']}"
            )
        return cues

    return {
        "intro": "Hello, superstar! Can you guess the animal?",
        "clue-1": f"Here's clue one. {content['clues'][0]}",
        "clue-2": f"And clue two. {content['clues'][1]}",
        "answer": f"Yes! It's a {content['answer']}. Great guessing!",
        "fact": f"Here's a fun fact. {content['funFact']}",
        "outro": "Amazing job, superstar! Thanks for playing. See you next time!",
    }


async def generate() -> None:
    for source in sorted(DATA_ROOT.glob("*.json")):
        content = json.loads(source.read_text(encoding="utf-8"))
        narration = content.get("narration")
        if not narration or not narration.get("enabled"):
            print(f"SKIP {source.name} (narration disabled)")
            continue
        if narration.get("provider") != "edge-neural":
            print(f"SKIP {source.name} (provider is not edge-neural)")
            continue

        output_root = (PUBLIC_ROOT / narration["audioBase"]).resolve()
        if PUBLIC_ROOT.resolve() not in output_root.parents:
            raise ValueError(f"audioBase must stay inside public/: {narration['audioBase']}")
        output_root.mkdir(parents=True, exist_ok=True)

        for cue, text in narration_cues(content).items():
            output = output_root / f"{cue}.{narration['format']}"
            communicate = edge_tts.Communicate(
                text,
                narration["voice"],
                rate="+5%",
                volume="+0%",
                pitch="+4Hz",
            )
            await communicate.save(str(output))
            print(f"GENERATED {output.relative_to(PUBLIC_ROOT).as_posix()}")


if __name__ == "__main__":
    asyncio.run(generate())
