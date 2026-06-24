export async function requestJson(url, options = {}) {
  let response;

  try {
    response = await fetch(url, options);
  } catch (error) {
    throw new Error("Could not reach the API server. Restart the frontend and backend, then try again.");
  }

  const rawText = await response.text();
  const data = (() => {
    try {
      return rawText ? JSON.parse(rawText) : {};
    } catch (error) {
      return {};
    }
  })();

  if (!response.ok) {
    if (data.error) {
      throw new Error(data.error);
    }

    if (response.status === 404 && url.includes("/ats-score")) {
      throw new Error("ATS scoring API was not found. Restart the backend server and try again.");
    }

    if (rawText) {
      throw new Error(`${response.status} ${response.statusText}`);
    }

    throw new Error("Something went wrong.");
  }

  return data;
}

export async function uploadResumeFile(file) {
  const formData = new FormData();
  formData.append("resume", file);

  return requestJson("/api/interview/resume", {
    method: "POST",
    body: formData,
  });
}

export async function generateInterviewQuestions(payload) {
  return requestJson("/api/interview/questions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export async function evaluateInterview(payload) {
  return requestJson("/api/interview/evaluate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export async function analyzeATSResume(payload) {
  return requestJson("/api/interview/ats-score", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}
