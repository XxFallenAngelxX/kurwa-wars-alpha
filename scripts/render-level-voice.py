"""Render 14 short Russian Garage FM shouts. Run from repository root with Piper and FFmpeg installed."""
import json, pathlib, re, subprocess, tempfile, urllib.request
ROOT = pathlib.Path(__file__).resolve().parents[1]
SOURCE = ROOT / "src/host/audio.js"
OUT = ROOT / "assets/audio/voice/shouts-v3"
BASE = "https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/ru/ru_RU/ruslan/medium/"
MODEL = "ru_RU-ruslan-medium.onnx"
lines = json.loads(re.search(r"const levelShouts=(\[[^\n]+\]);", SOURCE.read_text(encoding="utf-8")).group(1))
OUT.mkdir(parents=True, exist_ok=True)
with tempfile.TemporaryDirectory() as tmp:
    tmp = pathlib.Path(tmp)
    for name in [MODEL, MODEL+".json"]:
        urllib.request.urlretrieve(BASE+name, tmp/name)
    for i,ru in enumerate(lines):
        raw = tmp/"raw.wav"
        subprocess.run(["piper","--model",str(tmp/MODEL),"--output_file",str(raw)],input=ru+"\n",text=True,encoding="utf-8",check=True)
        # Cheeki Breeki: tighter delivery without raising pitch.
        quick = "чики-брики" in ru.lower()
        timing = "atempo=1.25," if quick else ""
        subprocess.run(["ffmpeg","-hide_banner","-loglevel","error","-y","-i",str(raw),"-af",timing+"asetrate=21000,aresample=22050,highpass=f=100,equalizer=f=180:t=q:w=1:g=2.5,equalizer=f=2600:t=q:w=1:g=3,acompressor=threshold=0.1:ratio=3:attack=8:release=100,asoftclip=type=tanh:threshold=0.7,loudnorm=I=-17:TP=-2:LRA=5","-t","2.8","-ar","44100","-ac","1","-codec:a","libmp3lame","-b:a","96k",str(OUT/f"{i:02d}.mp3")],check=True)
    (OUT/"manifest.json").write_text(json.dumps({"count":len(lines),"model":"Piper ru_RU-ruslan-medium v1.0.0","lines":lines},ensure_ascii=False),encoding="utf-8")
    urllib.request.urlretrieve(BASE+"MODEL_CARD", OUT/"MODEL_CARD.txt")
print(f"Generated {len(lines)} voice clips")
