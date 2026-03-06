export function validateRegister(req, res, next) {
  const { email, password } = req.body;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Valid email is required' });
  }

  if (!password || password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  next();
}

export function validateVideoUrl(req, res, next) {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  if (!/^https?:\/\/(www\.)?youtube\.com\/watch\?.*v=[\w-]+/.test(url)) {
    return res.status(400).json({ error: 'Invalid YouTube URL format' });
  }

  next();
}

const ALLOWED_EXTENSIONS = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v', '.mp3', '.wav', '.m4a', '.flac', '.ogg'];

export function validateFileUpload(req, res, next) {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  if (!/^(video|audio)\//.test(req.file.mimetype)) {
    return res.status(400).json({ error: 'Only video and audio files are allowed' });
  }

  const ext = req.file.originalname.toLowerCase().match(/\.[^.]+$/)?.[0];
  if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
    return res.status(400).json({
      error: `Unsupported file format. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`
    });
  }

  next();
}

export function validateSearchQuery(req, res, next) {
  const query = req.body.query || req.body.question;

  if (!query || query.trim().length === 0) {
    return res.status(400).json({ error: 'Query cannot be empty' });
  }

  if (query.length > 500) {
    return res.status(400).json({ error: 'Query must be 500 characters or less' });
  }

  next();
}
