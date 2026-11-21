import subprocess
import uuid
import os
import requests
from urllib.parse import urlparse, urljoin
from utils.validators import validate_video_url

SHORT_LINK_HOSTS = ('fb.watch',)


def resolve_short_link(url, max_hops=3):
	for _ in range(max_hops):
		host = urlparse(url).hostname or ''
		if not any(host == h or host.endswith('.' + h) for h in SHORT_LINK_HOSTS):
			return url
		response = requests.get(url, allow_redirects=False, timeout=15, stream=True)
		response.close()
		location = response.headers.get('Location')
		if not location:
			raise ValueError("Could not resolve the short link. Please paste the full video link.")
		url = urljoin(url, location)
		validate_video_url(url)
	raise ValueError("Too many redirects. Please paste the full video link.")


def download_video(url):
	try:
		file_id = str(uuid.uuid4())
		video_path = f"data/video_{file_id}.mp4"
		subprocess.run(
			[
				"yt-dlp",
				"--ies",
				"default,-generic",
				"--no-playlist",
				"--restrict-filenames",
				"-f",
				"bv*+ba/b",
				"-o",
				video_path,
				url,
			],
			check=True,
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
				"--ies",
				"default,-generic",
				"--skip-download",
				"--print",
				"%(description)s\nBy: %(uploader)s",
				url,
			],
			check=True,
			capture_output=True,
			text=True,
		)

		caption = result.stdout.strip()
		return caption

	except subprocess.CalledProcessError as e:
		raise RuntimeError("Failed to fetch caption") from e


def get_slideshow_data(url):
	try:
		response = requests.get("https://tikwm.com/api/", params={"url": url}, timeout=30)
		data = response.json()
		if data.get("code") != 0:
			raise RuntimeError("Failed to fetch slideshow data")
		return {
			"caption": data["data"]["title"],
			"images": data["data"]["images"],
			"author": data["data"]["author"]["unique_id"],
		}
	except Exception as e:
		raise RuntimeError("Failed to fetch slideshow data") from e


def download_slideshow_images(image_urls):
	image_paths = []
	for index, image_url in enumerate(image_urls[:25]):
		try:
			file_id = str(uuid.uuid4())
			image_path = f"data/image_{file_id}_{index}.jpg"
			response = requests.get(image_url, timeout=30)
			with open(image_path, "wb") as f:
				f.write(response.content)
			image_paths.append(image_path)
		except Exception as e:
			print(f"Failed to download image {index}: {e}")
			continue
	return image_paths
