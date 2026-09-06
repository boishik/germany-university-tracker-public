(function () {
    "use strict";

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

        const programTable = document.getElementById("programTable");
        const exportButton = document.getElementById("exportButton");
        const toastRegion = document.getElementById("toastRegion");

        if (!supportDialog || !supportUsButton) return;

        supportUsButton.addEventListener("click", showSupportDialog);
        shortlistHelpButton?.addEventListener("click", showShortlistDialog);

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
         * When a university is marked as Applied,
         * show the optional Support Us popup.
         *
         * app.js still handles saving the Applied state.
         */
        programTable?.addEventListener("change", (event) => {
            const checkbox = event.target.closest(
                '[data-action="toggle-applied"]'
            );

            if (checkbox?.checked) {
                showSupportDialog();
            }
        });

        /*
         * Show Support Us when Download List is clicked.
         * This does not stop or delay the existing PDF export.
         */
        exportButton?.addEventListener(
            "click",
            showSupportDialog,
            true
        );

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