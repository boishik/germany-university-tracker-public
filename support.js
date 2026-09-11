(function () {
    "use strict";

    const ACTIVE_SUPPORT_DELAY_MS = 4 * 60 * 1000;
    const ACTIVE_TICK_MS = 1000;

    document.addEventListener("DOMContentLoaded", initSupportFeature);

    function initSupportFeature() {
        const updateDialog = document.getElementById("updateDialog");
        const supportDialog = document.getElementById("supportDialog");
        const shortlistDialog = document.getElementById("shortlistDialog");

        const supportUsButton = document.getElementById("supportUsButton");
        const shortlistHelpButton = document.getElementById("shortlistHelpButton");
        const openShortlistFromSupport = document.getElementById("openShortlistFromSupport");
        const continueFreeListButton = document.getElementById("continueFreeListButton");
        const openPersonalizedFromUpdate = document.getElementById("openPersonalizedFromUpdate");

        const closeSupportTopButton = document.getElementById("closeSupportDialogButton");
        const closeSupportBottomButton = document.getElementById("closeSupportDialogBottom");
        const closeShortlistTopButton = document.getElementById("closeShortlistDialogButton");
        const closeShortlistBottomButton = document.getElementById("closeShortlistDialogBottom");

        const exportButton = document.getElementById("exportButton");
        const toastRegion = document.getElementById("toastRegion");

        if (!supportDialog || !supportUsButton) return;

        let activeVisibleMs = 0;
        let timedSupportTriggered = false;
        let lastTickAt = Date.now();

        supportUsButton.addEventListener("click", showSupportDialog);
        shortlistHelpButton?.addEventListener("click", showShortlistDialog);
        document.addEventListener("tracker:show-support", showSupportDialog);

        openShortlistFromSupport?.addEventListener("click", () => {
            closeSupportDialog();
            showShortlistDialog();
        });

        continueFreeListButton?.addEventListener("click", closeUpdateDialog);

        openPersonalizedFromUpdate?.addEventListener("click", () => {
            closeUpdateDialog();
            showShortlistDialog();
        });

        closeSupportTopButton?.addEventListener("click", closeSupportDialog);
        closeSupportBottomButton?.addEventListener("click", closeSupportDialog);
        closeShortlistTopButton?.addEventListener("click", closeShortlistDialog);
        closeShortlistBottomButton?.addEventListener("click", closeShortlistDialog);

        updateDialog?.addEventListener("click", handleUpdateDialogClick);
        supportDialog.addEventListener("click", handleSupportDialogClick);
        shortlistDialog?.addEventListener("click", handleShortlistDialogClick);

        /*
         * Landing / refresh prompt:
         * Show only the small New Update message, not Support Us.
         */
        window.setTimeout(showUpdateDialog, 300);

        /*
         * Support reminder:
         * Count only time while this page is visible. Applied checkbox changes
         * intentionally do NOT trigger Support Us anymore.
         */
        window.setInterval(updateActiveSupportTimer, ACTIVE_TICK_MS);
        document.addEventListener("visibilitychange", () => {
            lastTickAt = Date.now();
        });

        /*
         * Keep the existing optional reminder on Download List.
         * It does not stop or delay the PDF export.
         */
        exportButton?.addEventListener(
            "click",
            showSupportDialog,
            true
        );

        function updateActiveSupportTimer() {
            if (timedSupportTriggered) return;

            const now = Date.now();
            const elapsed = Math.min(now - lastTickAt, ACTIVE_TICK_MS * 2);
            lastTickAt = now;

            if (document.visibilityState !== "visible") return;

            activeVisibleMs += Math.max(0, elapsed);

            if (activeVisibleMs >= ACTIVE_SUPPORT_DELAY_MS) {
                timedSupportTriggered = true;
                showSupportWhenFree();
            }
        }

        function showSupportWhenFree() {
            const blockingDialog = Array.from(document.querySelectorAll("dialog[open]"))
                .some((dialog) => dialog !== supportDialog);

            if (blockingDialog) {
                window.setTimeout(showSupportWhenFree, 1500);
                return;
            }

            showSupportDialog();
        }

        function showUpdateDialog() {
            if (!updateDialog) return;

            closeSupportDialog();
            closeShortlistDialog();

            if (!updateDialog.open) {
                updateDialog.showModal();
            }
        }

        function closeUpdateDialog() {
            if (updateDialog?.open) {
                updateDialog.close();
            }
        }

        function showSupportDialog() {
            closeUpdateDialog();
            closeShortlistDialog();

            if (!supportDialog.open) {
                supportDialog.showModal();
            }
        }

        function closeSupportDialog() {
            if (supportDialog.open) {
                supportDialog.close();
            }
        }

        function showShortlistDialog() {
            if (!shortlistDialog) return;

            closeUpdateDialog();
            closeSupportDialog();

            if (!shortlistDialog.open) {
                shortlistDialog.showModal();
            }
        }

        function closeShortlistDialog() {
            if (shortlistDialog?.open) {
                shortlistDialog.close();
            }
        }

        function handleUpdateDialogClick(event) {
            if (event.target === updateDialog) {
                closeUpdateDialog();
            }
        }

        function handleSupportDialogClick(event) {
            if (event.target === supportDialog) {
                closeSupportDialog();
                return;
            }

            const copyButton = event.target.closest("[data-copy-value]");

            if (!copyButton) return;

            const value = copyButton.dataset.copyValue;
            const label = copyButton.dataset.copyLabel || "Number";

            copySupportText(
                value,
                label,
                copyButton
            );
        }

        function handleShortlistDialogClick(event) {
            if (event.target === shortlistDialog) {
                closeShortlistDialog();
            }
        }

        async function copySupportText(value, label, button) {
            const originalText = button.textContent;

            try {
                if (navigator.clipboard?.writeText) {
                    await navigator.clipboard.writeText(value);
                } else {
                    fallbackCopy(value);
                }

                button.textContent = "Copied!";

                showSupportToast(
                    `${label} copied.`
                );

                window.setTimeout(() => {
                    button.textContent = originalText;
                }, 1400);
            } catch (error) {
                console.warn(
                    "Could not copy support number",
                    error
                );

                showSupportToast(
                    `Please copy manually: ${value}`,
                    true
                );
            }
        }

        function fallbackCopy(value) {
            const textarea = document.createElement("textarea");

            textarea.value = value;
            textarea.setAttribute("readonly", "");
            textarea.style.position = "fixed";
            textarea.style.opacity = "0";

            document.body.append(textarea);

            textarea.select();

            const copied = document.execCommand("copy");

            textarea.remove();

            if (!copied) {
                throw new Error("Copy command failed");
            }
        }

        function showSupportToast(message, error = false) {
            if (!toastRegion) return;

            const toast = document.createElement("div");

            toast.className = `toast${error ? " error" : ""}`;
            toast.textContent = message;

            toastRegion.append(toast);

            window.setTimeout(
                () => toast.remove(),
                3500
            );
        }
    }
})();
