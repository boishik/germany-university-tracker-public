const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store"
};

export async function onRequestGet(context) {
  try {
    const config = getConfig(context.env);
    const current = await readReviewsFile(config);
    return jsonResponse(current.data, 200);
  } catch (error) {
    return jsonResponse({ error: publicError(error) }, statusFor(error));
  }
}

export async function onRequestPost(context) {
  try {
    const config = getConfig(context.env);
    const body = await readJsonBody(context.request);

    // Honeypot for simple bots. Real visitors never fill this hidden field.
    if (cleanText(body.website)) {
      return jsonResponse({ ok: true }, 200);
    }

    const anonymous = Boolean(body.anonymous);
    const message = cleanText(body.message);
    const requestedName = cleanText(body.name);
    const name = anonymous ? "Anonymous" : requestedName;

    if (!anonymous && !name) {
      return jsonResponse({ error: "Enter a name or choose Anonymous." }, 400);
    }

    if (!message) {
      return jsonResponse({ error: "Feedback cannot be empty." }, 400);
    }

    if (name.length > 60 || message.length > 1000) {
      return jsonResponse({ error: "Feedback is too long." }, 400);
    }

    const review = {
      id: crypto.randomUUID(),
      name: name.slice(0, 60) || "Anonymous",
      anonymous,
      message: message.slice(0, 1000),
      createdAt: new Date().toISOString()
    };

    const result = await appendWithRetry(config, review);
    return jsonResponse({ ok: true, review, updatedAt: result.updatedAt }, 201);
  } catch (error) {
    return jsonResponse({ error: publicError(error) }, statusFor(error));
  }
}

async function appendWithRetry(config, review) {
  let lastError;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const current = await readReviewsFile(config);
      const data = normalizeStore(current.data);
      data.reviews.push(review);
      data.updatedAt = new Date().toISOString();
      await writeReviewsFile(config, data, current.sha);
      return data;
    } catch (error) {
      lastError = error;
      if (error.status !== 409) throw error;
    }
  }

  throw lastError || new Error("Could not save feedback.");
}

function getConfig(env) {
  const owner = cleanText(env.GITHUB_OWNER);
  const repo = cleanText(env.GITHUB_REPO);
  const branch = cleanText(env.GITHUB_BRANCH) || "main";
  const token = cleanText(env.GITHUB_TOKEN);
  const path = cleanText(env.GITHUB_REVIEWS_PATH) || "reviews.json";

  if (!owner || !repo || !token) {
    const error = new Error("Shared feedback is not configured on the server.");
    error.status = 503;
    throw error;
  }

  return { owner, repo, branch, token, path };
}

async function readReviewsFile(config) {
  const url = githubContentsUrl(config);
  const response = await fetch(`${url}?ref=${encodeURIComponent(config.branch)}`, {
    headers: githubHeaders(config)
  });

  if (response.status === 404) {
    return {
      sha: null,
      data: normalizeStore(null)
    };
  }

  if (!response.ok) throw await githubError(response, "Could not read reviews.json.");

  const payload = await response.json();
  const decoded = decodeBase64Utf8(String(payload.content || "").replace(/\n/g, ""));
  let parsed;

  try {
    parsed = JSON.parse(decoded);
  } catch (_) {
    parsed = null;
  }

  return {
    sha: payload.sha || null,
    data: normalizeStore(parsed)
  };
}

async function writeReviewsFile(config, data, sha) {
  const body = {
    message: "Add website feedback",
    content: encodeBase64Utf8(`${JSON.stringify(data, null, 2)}\n`),
    branch: config.branch
  };

  if (sha) body.sha = sha;

  const response = await fetch(githubContentsUrl(config), {
    method: "PUT",
    headers: githubHeaders(config),
    body: JSON.stringify(body)
  });

  if (!response.ok) throw await githubError(response, "Could not update reviews.json.");
}

function githubContentsUrl(config) {
  const path = config.path.split("/").map(encodeURIComponent).join("/");
  return `https://api.github.com/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/contents/${path}`;
}

function githubHeaders(config) {
  return {
    "accept": "application/vnd.github+json",
    "authorization": `Bearer ${config.token}`,
    "content-type": "application/json",
    "user-agent": "germany-university-tracker-feedback",
    "x-github-api-version": "2022-11-28"
  };
}

async function githubError(response, fallback) {
  let detail = fallback;
  try {
    const payload = await response.json();
    if (payload?.message) detail = `${fallback} ${payload.message}`;
  } catch (_) {
    // Keep fallback.
  }

  const error = new Error(detail);
  error.status = response.status === 409 || response.status === 422 ? 409 : 502;
  return error;
}

async function readJsonBody(request) {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 5000) {
    const error = new Error("Request is too large.");
    error.status = 413;
    throw error;
  }

  try {
    return await request.json();
  } catch (_) {
    const error = new Error("Invalid JSON request.");
    error.status = 400;
    throw error;
  }
}

function normalizeStore(value) {
  const reviews = Array.isArray(value?.reviews)
    ? value.reviews.map(normalizeReview).filter(Boolean).slice(-2000)
    : [];

  return {
    schemaVersion: 1,
    updatedAt: cleanText(value?.updatedAt) || null,
    reviews
  };
}

function normalizeReview(value) {
  const message = cleanText(value?.message).slice(0, 1000);
  if (!message) return null;

  return {
    id: cleanText(value?.id) || crypto.randomUUID(),
    name: cleanText(value?.name).slice(0, 60) || "Anonymous",
    anonymous: Boolean(value?.anonymous),
    message,
    createdAt: validIsoDate(value?.createdAt)
  };
}

function validIsoDate(value) {
  const date = new Date(value || 0);
  return Number.isNaN(date.getTime()) ? new Date(0).toISOString() : date.toISOString();
}

function cleanText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function encodeBase64Utf8(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function decodeBase64Utf8(value) {
  const binary = atob(value);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function jsonResponse(data, status) {
  return new Response(JSON.stringify(data), {
    status,
    headers: JSON_HEADERS
  });
}

function publicError(error) {
  return cleanText(error?.message) || "Feedback service error.";
}

function statusFor(error) {
  const status = Number(error?.status);
  return Number.isInteger(status) && status >= 400 && status <= 599 ? status : 500;
}
