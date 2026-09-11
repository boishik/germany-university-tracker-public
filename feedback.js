(function () {
  "use strict";

  const FEEDBACK_API_URL = "./api/feedback";
  const FEEDBACK_FILE_URL = "./reviews.json";
  const LOCAL_FEEDBACK_KEY = "germany-university-tracker.local-feedback.v1";

  document.addEventListener("DOMContentLoaded", initFeedbackFeature);

  function initFeedbackFeature() {
    const feedbackButton = document.getElementById("feedbackButton");
    const feedbackDialog = document.getElementById("feedbackDialog");
    const closeFeedbackButton = document.getElementById("closeFeedbackDialogButton");
    const feedbackForm = document.getElementById("feedbackForm");
    const nameInput = document.getElementById("feedbackName");
    const anonymousInput = document.getElementById("feedbackAnonymous");
    const messageInput = document.getElementById("feedbackMessage");
    const submitButton = document.getElementById("feedbackSubmitButton");
    const status = document.getElementById("feedbackStatus");
    const reviewsList = document.getElementById("feedbackReviewsList");
    const reviewCount = document.getElementById("feedbackReviewCount");

    if (!feedbackButton || !feedbackDialog || !feedbackForm) return;

    let sharedReviews = [];
    let loadingPromise = null;

    feedbackButton.addEventListener("click", openFeedbackDialog);
    closeFeedbackButton?.addEventListener("click", closeFeedbackDialog);

    feedbackDialog.addEventListener("click", (event) => {
      if (event.target === feedbackDialog) closeFeedbackDialog();
    });

    feedbackDialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      closeFeedbackDialog();
    });

    anonymousInput?.addEventListener("change", syncAnonymousState);
    feedbackForm.addEventListener("submit", submitFeedback);

    syncAnonymousState();

    function openFeedbackDialog() {
      if (!feedbackDialog.open) feedbackDialog.showModal();
      loadReviews();
    }

    function closeFeedbackDialog() {
      if (feedbackDialog.open) feedbackDialog.close();
    }

    function syncAnonymousState() {
      const anonymous = Boolean(anonymousInput?.checked);
      nameInput.disabled = anonymous;
      nameInput.required = !anonymous;

      if (anonymous) {
        nameInput.value = "";
        nameInput.placeholder = "Posting as Anonymous";
      } else {
        nameInput.placeholder = "Your name";
      }
    }

    async function loadReviews(force = false) {
      if (loadingPromise && !force) return loadingPromise;

      loadingPromise = (async () => {
        renderLoading();

        try {
          sharedReviews = await fetchSharedReviews();
        } catch (error) {
          console.warn("Shared feedback API unavailable; loading static review file.", error);
          sharedReviews = await fetchStaticReviews();
        }

        renderReviews(mergeReviews(sharedReviews, loadLocalReviews()));
      })().finally(() => {
        loadingPromise = null;
      });

      return loadingPromise;
    }

    async function fetchSharedReviews() {
      const response = await fetch(FEEDBACK_API_URL, {
        method: "GET",
        headers: { "Accept": "application/json" },
        cache: "no-store"
      });

      if (!response.ok) throw new Error(`Feedback API HTTP ${response.status}`);

      const payload = await response.json();
      return normalizeReviews(payload?.reviews);
    }

    async function fetchStaticReviews() {
      try {
        const response = await fetch(FEEDBACK_FILE_URL, { cache: "no-store" });
        if (!response.ok) throw new Error(`reviews.json HTTP ${response.status}`);
        const payload = await response.json();
        return normalizeReviews(payload?.reviews);
      } catch (error) {
        console.warn("Could not load reviews.json", error);
        return [];
      }
    }

    async function submitFeedback(event) {
      event.preventDefault();
      clearStatus();

      const anonymous = Boolean(anonymousInput.checked);
      const name = anonymous ? "Anonymous" : cleanText(nameInput.value);
      const message = cleanText(messageInput.value);

      if (!anonymous && !name) {
        setStatus("Enter your name or choose Anonymous.", true);
        nameInput.focus();
        return;
      }

      if (!message) {
        setStatus("Please write your feedback first.", true);
        messageInput.focus();
        return;
      }

      if (message.length > 1000) {
        setStatus("Feedback must be 1000 characters or less.", true);
        return;
      }

      const review = {
        id: createId(),
        name: name.slice(0, 60) || "Anonymous",
        anonymous,
        message,
        createdAt: new Date().toISOString()
      };

      setSubmitting(true);

      let shared = false;

      try {
        const response = await fetch(FEEDBACK_API_URL, {
          method: "POST",
          headers: {
            "Accept": "application/json",
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            name: review.name,
            anonymous: review.anonymous,
            message: review.message,
            website: ""
          })
        });

        if (!response.ok) {
          const failure = await safeJson(response);
          throw new Error(failure?.error || `Feedback API HTTP ${response.status}`);
        }

        const payload = await response.json();
        if (payload?.review) {
          review.id = cleanText(payload.review.id) || review.id;
          review.createdAt = cleanText(payload.review.createdAt) || review.createdAt;
        }
        shared = true;
      } catch (error) {
        console.warn("Shared feedback submit unavailable; saving locally.", error);
        saveLocalReview(review);
      }

      feedbackForm.reset();
      syncAnonymousState();
      submitButton.textContent = "Thank you :,)";
      setStatus(
        shared
          ? "Your feedback was submitted. Thank you!"
          : "Saved in this browser. Shared posting needs the feedback API to be configured.",
        !shared
      );

      if (shared) {
        await loadReviews(true);
      } else {
        renderReviews(mergeReviews(sharedReviews, loadLocalReviews()));
      }

      window.setTimeout(() => {
        closeFeedbackDialog();
        document.dispatchEvent(new CustomEvent("tracker:show-support"));
      }, 1100);

      window.setTimeout(() => {
        submitButton.textContent = "Submit";
        setSubmitting(false);
        clearStatus();
      }, 1900);
    }

    function renderLoading() {
      reviewsList.replaceChildren();
      const p = document.createElement("p");
      p.className = "feedback-empty";
      p.textContent = "Loading reviews…";
      reviewsList.append(p);
    }

    function renderReviews(reviews) {
      reviewsList.replaceChildren();
      reviewCount.textContent = `${reviews.length} ${reviews.length === 1 ? "review" : "reviews"}`;

      if (!reviews.length) {
        const empty = document.createElement("p");
        empty.className = "feedback-empty";
        empty.textContent = "No feedback yet. You can be the first to leave a suggestion.";
        reviewsList.append(empty);
        return;
      }

      reviews
        .slice()
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
        .forEach((review) => reviewsList.append(createReviewCard(review)));
    }

    function createReviewCard(review) {
      const article = document.createElement("article");
      article.className = "feedback-review-card";

      const head = document.createElement("div");
      head.className = "feedback-review-head";

      const name = document.createElement("strong");
      name.textContent = review.anonymous ? "Anonymous" : (review.name || "Anonymous");

      const time = document.createElement("time");
      time.dateTime = review.createdAt || "";
      time.textContent = formatDate(review.createdAt);

      const text = document.createElement("p");
      text.textContent = review.message;

      head.append(name, time);
      article.append(head, text);
      return article;
    }

    function normalizeReviews(value) {
      if (!Array.isArray(value)) return [];

      return value.map((review, index) => ({
        id: cleanText(review?.id) || `review-${index}`,
        name: cleanText(review?.name) || "Anonymous",
        anonymous: Boolean(review?.anonymous),
        message: cleanText(review?.message).slice(0, 1000),
        createdAt: normalizeDate(review?.createdAt)
      })).filter((review) => review.message);
    }

    function mergeReviews(publicReviews, localReviews) {
      const map = new Map();
      [...publicReviews, ...localReviews].forEach((review) => map.set(review.id, review));
      return [...map.values()];
    }

    function loadLocalReviews() {
      try {
        const value = JSON.parse(localStorage.getItem(LOCAL_FEEDBACK_KEY) || "[]");
        return normalizeReviews(value);
      } catch (_) {
        return [];
      }
    }

    function saveLocalReview(review) {
      try {
        const reviews = loadLocalReviews();
        reviews.push(review);
        localStorage.setItem(LOCAL_FEEDBACK_KEY, JSON.stringify(reviews.slice(-100)));
      } catch (error) {
        console.warn("Could not save local feedback", error);
      }
    }

    function setSubmitting(submitting) {
      submitButton.disabled = submitting;
      nameInput.disabled = submitting || Boolean(anonymousInput.checked);
      anonymousInput.disabled = submitting;
      messageInput.disabled = submitting;
    }

    function setStatus(message, error = false) {
      status.textContent = message;
      status.classList.toggle("error", error);
    }

    function clearStatus() {
      status.textContent = "";
      status.classList.remove("error");
    }

    function cleanText(value) {
      return String(value ?? "").replace(/\s+/g, " ").trim();
    }

    function normalizeDate(value) {
      const date = new Date(value || 0);
      return Number.isNaN(date.getTime()) ? new Date(0).toISOString() : date.toISOString();
    }

    function formatDate(value) {
      const date = new Date(value || 0);
      if (Number.isNaN(date.getTime())) return "";
      return new Intl.DateTimeFormat("en", {
        year: "numeric",
        month: "short",
        day: "numeric"
      }).format(date);
    }

    function createId() {
      if (crypto?.randomUUID) return crypto.randomUUID();
      return `review-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }

    async function safeJson(response) {
      try {
        return await response.json();
      } catch (_) {
        return null;
      }
    }
  }
})();
