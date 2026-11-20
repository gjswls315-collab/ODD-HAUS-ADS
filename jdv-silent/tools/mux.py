"""Mux out/frames + out/mix.wav -> jdv-silent.mp4 (two-pass loudnorm to -14 LUFS), poster.
No subtitles: the film has no words, only the brand's marks on its cards."""
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
     "-vf", "format=yuv420p", "-c:v", "libx264", "-preset", "slow", "-crf", "29", "-tune", "grain",   # grain is already in the print
     "-af", ln + ",aresample=48000", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", str(out)])
# poster: the sign card, before the burn
run(["ffmpeg", "-hide_banner", "-y", "-ss", "60.5", "-i", str(out), "-frames:v", "1", "-q:v", "3", str(HERE / "poster.jpg")])
print(run(["ffmpeg", "-hide_banner", "-i", str(out), "-af", "ebur128=peak=true", "-f", "null", "-"]).split("Summary:")[-1].strip()[:260])
