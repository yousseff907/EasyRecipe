import whisper


def extract_transcript(path: str):
	try:
		model = whisper.load_model("base")
		result = model.transcribe(path)
		transcript = result['text']
		return transcript
	except Exception as e:
		raise RuntimeError(f"Transcription failed: {str(e)}") from e
