import subprocess
from glob import glob
import uuid
import os
import requests

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
				"--print", "%(description)s\nBy: %(uploader)s",
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
	
def get_slideshow_data(url):
	try:
		response = requests.get(f"https://tikwm.com/api/?url={url}")
		data = response.json()
		if data.get("code") != 0:
			raise RuntimeError("Failed to fetch slideshow data")
		return {
			"caption": data["data"]["title"],
			"images": data["data"]["images"],
			"author": data["data"]["author"]["unique_id"]
        }
	except Exception as e:
		raise RuntimeError("Failed to fetch slideshow data") from e
	
def download_slideshow_images(image_urls):
	image_paths = []
	for index, image_url in enumerate(image_urls[:25]):
		try:
			file_id = str(uuid.uuid4())
			image_path = f"data/image_{file_id}_{index}.jpg"
			response = requests.get(image_url)
			with open(image_path, "wb") as f:
				f.write(response.content)
			image_paths.append(image_path)
		except Exception as e:
			print(f"Failed to download image {index}: {e}")
			continue
	return image_paths