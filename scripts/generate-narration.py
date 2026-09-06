#!/usr/bin/env python3
"""Generate walkthrough narration MP3s, concatenated audio, timeline, and SRT."""
from __future__ import annotations

import asyncio
import json
import subprocess
import sys
from pathlib import Path

import edge_tts

ROOT = Path(__file__).resolve().parents[1]
SCENES = ROOT / "src/walkthrough/scenes.json"
OUT = ROOT / "public/walkthrough"
PARTS = OUT / "parts"
GAP_MS = 450


def ffprobe_ms(path: Path) -> int:
    r = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            str(path),
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    return int(round(float(r.stdout.strip()) * 1000))


async def synth(text: str, voice: str, rate: str, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    comm = edge_tts.Communicate(text, voice, rate=rate)
    await comm.save(str(dest))


async def main() -> int:
    data = json.loads(SCENES.read_text())
    voice = data.get("voice", "en-US-AndrewNeural")
    rate = data.get("rate", "-8%")
    OUT.mkdir(parents=True, exist_ok=True)
    PARTS.mkdir(parents=True, exist_ok=True)

    timeline = []
    concat_lines = []
    srt_blocks = []
    cursor = 0
    idx = 1

    silence = OUT / "silence.mp3"
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-f",
            "lavfi",
            "-i",
            f"anullsrc=r=24000:cl=mono",
            "-t",
            f"{GAP_MS / 1000:.3f}",
            "-q:a",
            "9",
            str(silence),
        ],
        check=True,
        capture_output=True,
    )

    for scene in data["scenes"]:
        part = PARTS / f"{scene['id']}.mp3"
        print(f"tts {scene['id']} …", flush=True)
        await synth(scene["voiceText"], voice, rate, part)
        duration = ffprobe_ms(part)
        timeline.append(
            {
                "id": scene["id"],
                "startMs": cursor,
                "durationMs": duration,
                "caption": scene["caption"],
                "voiceText": scene["voiceText"],
            }
        )
        start = cursor
        end = cursor + duration
        srt_blocks.append(
            f"{idx}\n{fmt(start)} --> {fmt(end)}\n{scene['caption']}\n"
        )
        concat_lines.append(f"file '{part}'")
        concat_lines.append(f"file '{silence}'")
        cursor = end + GAP_MS
        idx += 1

    list_file = OUT / "concat.txt"
    list_file.write_text("\n".join(concat_lines) + "\n")
    narration = OUT / "narration.mp3"
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-f",
            "concat",
            "-safe",
            "0",
            "-i",
            str(list_file),
            "-c:a",
            "libmp3lame",
            "-q:a",
            "4",
            str(narration),
        ],
        check=True,
        capture_output=True,
    )
    total = ffprobe_ms(narration)
    (OUT / "timeline.json").write_text(json.dumps({"totalMs": total, "scenes": timeline}, indent=2))
    (OUT / "captions.srt").write_text("\n".join(srt_blocks) + "\n")
    print(f"wrote {narration} ({total / 1000:.1f}s)")
    if total < 540_000 or total > 720_000:
        print(f"WARNING: duration {total / 1000:.1f}s is outside 9–12 min target", file=sys.stderr)
    return 0


def fmt(ms: int) -> str:
    h = ms // 3_600_000
    m = (ms % 3_600_000) // 60_000
    s = (ms % 60_000) // 1000
    x = ms % 1000
    return f"{h:02d}:{m:02d}:{s:02d},{x:03d}"


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
