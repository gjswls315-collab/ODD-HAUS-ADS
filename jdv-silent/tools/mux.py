"""Mux out/frames + out/mix.wav -> jdv-silent.mp4 (two-pass loudnorm to -14 LUFS, light grain), poster, srt."""
import json, pathlib, re, subprocess, sys
HERE = pathlib.Path(__file__).resolve().parents[1]
TL = json.loads((HERE / "timeline.json").read_text())
out, frames, mix = HERE / "jdv-silent.mp4", HERE / "out/frames/%05d.jpg", HERE / "out/mix.wav"

def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode:
        sys.exit(r.stderr[-2000:])
    return r.stderr

# pass 1: measure
log = run(["ffmpeg", "-hide_banner", "-i", str(mix), "-af", "loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"])
m = json.loads(re.findall(r"\{[^{}]*\}", log, re.S)[-1])
ln = (f"loudnorm=I=-14:TP=-1.5:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}:"
      f"measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true")
# pass 2: encode
run(["ffmpeg", "-hide_banner", "-y", "-framerate", str(TL["fps"]), "-i", str(frames), "-i", str(mix),
     "-vf", "noise=alls=3:allf=t,format=yuv420p", "-c:v", "libx264", "-preset", "slow", "-crf", "21", "-tune", "grain",
     "-af", ln + ",aresample=48000", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", str(out)])
# poster: the end card before the burn
run(["ffmpeg", "-hide_banner", "-y", "-ss", "42.5", "-i", str(out), "-frames:v", "1", "-q:v", "3", str(HERE / "poster.jpg")])
# subtitles: the intertitles are the subtitles (burned in, so this is subtitles_ko.srt)
def ts(t):
    ms = int(round(t * 1000)); return f"{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}"
rows, i = [], 1
for s in TL["shots"]:
    if not s.get("card"):
        continue
    c = TL["cards"][s["card"]]
    t1 = min(s["t1"], TL["hits"]["burn"]) if s["card"] == "end" else s["t1"]
    rows.append(f"{i}\n{ts(s['t0'] + 0.3)} --> {ts(t1)}\n{' '.join(c['ko'])}\n{c['en']}\n"); i += 1
(HERE / "subtitles_ko.srt").write_text("\n".join(rows), encoding="utf-8")
print(run(["ffmpeg", "-hide_banner", "-i", str(out), "-af", "ebur128=peak=true", "-f", "null", "-"]).split("Summary:")[-1].strip()[:260])
