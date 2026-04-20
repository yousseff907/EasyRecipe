from urllib.parse import urlparse

DANGEROUS_CHARS = [
    # Script injection
    '<',
    '>',
    '"',
    "'",
    
    # Command injection
    ';',
    '|',
    '`',
    '$(',
    '${',
    
    # Path traversal
    '..',
    '\\',
    
    # Null bytes
    '\0',
    '%00',
    
    # Protocol exploits
    'javascript:',
    'data:',
    'file:',
    'vbscript:',
    'about:',
    
    # Additional command chars
    '\n',  # newline
    '\r',  # carriage return
    '&&',  # command chain
    '||',  # command OR
    
    # Format string attacks
    '%n',
    '%s',
    '%x',
]

TIKTOK_URL = ['tiktok.com', 'vm.tiktok.com', 'vt.tiktok.com']
FACEBOOK_URL = ['facebook.com', 'fb.watch', 'fb.com']

def is_valid_url(url) -> bool:
	if not (url.startswith('http://') or url.startswith('https://')):
		return False
	for char in DANGEROUS_CHARS:
		if char in url:
			return False
	if len(url) > 500:
		return False
	return True


def is_supported_platform(url):
	platform = get_platform_name(url)
	if platform == 'tiktok' or platform == 'facebook':
		return True
	return False


def get_platform_name(url):
	for urlType in TIKTOK_URL:
		if urlType in url:
			return 'tiktok'
	for urlType in FACEBOOK_URL:
		if urlType in url:
			return 'facebook'
	else:
		return None


def validate_video_url(url):
	if not is_valid_url(url):
		raise ValueError("URL format invalid or contains dangerous characters")
	if not is_supported_platform(url):
		raise ValueError("Platform not supported. Use TikTok or Facebook. Instagram is currently unavailable due to platform restrictions.")
	parsed = urlparse(url)
	if len(parsed.path) < 2:
		raise ValueError("URL doesn't appear to link to a video. Please paste a direct video link.")