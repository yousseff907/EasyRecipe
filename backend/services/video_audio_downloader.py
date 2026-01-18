import subprocess
from glob import glob
import uuid
import os

def download_audio(url):
	try:
		file_id = str(uuid.uuid4())
		audio_path = f"data/audio_{file_id}.m4a"
		subprocess.run(
			[
				"yt-dlp",
				"-x",
				"--audio-format", "m4a",
				"--no-playlist",
				"--restrict-filenames",
				"-o", audio_path,
				url
			],
			check=True
		)

		if not os.path.exists(audio_path):
			raise RuntimeError("audio_path file not found after download")

		return audio_path

	except subprocess.CalledProcessError as e:
		raise RuntimeError("Audio download failed") from e


def download_video(url):
	try:
		file_id = str(uuid.uuid4())
		video_path = f"data/video_{file_id}.mp4"
		subprocess.run(
			[
				"yt-dlp",
				"--no-playlist",
				"--restrict-filenames",
				"-f", "bv*+ba/b",
				"-o", video_path,
				url
			],
			check=True
		)

		if not os.path.exists(video_path):
			raise RuntimeError("video_path file not found after download")

		return video_path

	except subprocess.CalledProcessError as e:
		raise RuntimeError("Video download failed") from e

def get_caption(url):
	try:
		result = subprocess.run(
			[
				"yt-dlp",
				"--skip-download",
				"--print", "description",
				url
			],
			check=True,
			capture_output=True,
			text=True
		)

		caption = result.stdout.strip()
		return caption

	except subprocess.CalledProcessError as e:
		raise RuntimeError("Failed to fetch caption") from e