(function () {
  "use strict";


  const state = {
    programs: [],
    metadata: {},
    originalDataset: null,
    sortField: "applicationStartDate",
    sortDirection: "asc",
    editingId: null,
  };

  const elements = {};
  const moneyFormatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR", maximumFractionDigits: 2 });
  const dateFormatter = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    cacheElements();
    bindEvents();
    const dataset = await loadDataset();
    state.originalDataset = structuredCloneSafe(dataset);
    applyDataset(dataset);
    populateFilterOptions();
    render();
    updateSaveStatus("Temporary session", "Changes reset when the page refreshes");
    disableServiceWorkerAndCaches();
  }

  function cacheElements() {
    const ids = [
      "saveStatus", "fileStatus", "programCount", "visibleCount", "freeTuitionCount", "appliedCount", "appliedPercent", "vpdCount",
      "addProgramButton", "exportButton", "resetDataButton",
      "searchInput", "sortField", "sortDirection", "filterToggle", "filterPanel", "universityFilter", "intakeFilter", "portalFilter",
      "vpdFilter", "moiFilter", "restrictedFilter", "feeTypeFilter", "tuitionFeeMin", "tuitionFeeMax", "startDateFrom", "startDateTo", "appliedFilter",
      "clearFiltersButton", "programTable", "programTableBody", "emptyState", "resultSummary", "programDialog", "programForm", "dialogTitle",
      "closeDialogButton", "cancelDialogButton", "toastRegion"
    ];
    ids.forEach((id) => { elements[id] = document.getElementById(id); });
  }

  function bindEvents() {
    const liveControls = [
      elements.searchInput, elements.sortField, elements.sortDirection, elements.universityFilter, elements.intakeFilter,
      elements.portalFilter, elements.vpdFilter, elements.moiFilter, elements.restrictedFilter, elements.feeTypeFilter,
      elements.tuitionFeeMin, elements.tuitionFeeMax, elements.startDateFrom, elements.startDateTo, elements.appliedFilter
    ];
    liveControls.forEach((control) => control.addEventListener(control.tagName === "INPUT" ? "input" : "change", render));

    elements.addProgramButton.addEventListener("click", () => openProgramDialog());
    elements.exportButton.addEventListener("click", exportFilteredPdf);
    elements.resetDataButton.addEventListener("click", resetDataset);
    elements.clearFiltersButton.addEventListener("click", clearFilters);
    elements.filterToggle.addEventListener("click", toggleFilters);
    elements.programTable.addEventListener("click", handleTableClick);
    elements.programTable.addEventListener("change", handleTableChange);
    elements.programForm.addEventListener("submit", saveProgramFromForm);
    elements.closeDialogButton.addEventListener("click", closeProgramDialog);
    elements.cancelDialogButton.addEventListener("click", closeProgramDialog);
    elements.programDialog.addEventListener("cancel", (event) => { event.preventDefault(); closeProgramDialog(); });
  }

  async function loadDataset() {
    try {
      const response = await fetch("data.json", { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      if (window.TRACKER_SEED_DATA) return structuredCloneSafe(window.TRACKER_SEED_DATA);
      throw new Error("No tracker data could be loaded.");
    }
  }


  function applyDataset(payload) {
    const normalized = normalizeDataset(payload);
    state.programs = normalized.programs;
    state.metadata = {
      title: normalized.title || "Germany University Application Tracker (Summer)",
      currency: normalized.currency || "EUR",
      schemaVersion: normalized.schemaVersion || 1,
    };
  }

  function normalizeDataset(payload) {
    const sourcePrograms = Array.isArray(payload) ? payload : payload?.programs;
    if (!Array.isArray(sourcePrograms)) throw new Error("JSON must contain a programs array.");
    return {
      schemaVersion: Number(payload?.schemaVersion) || 1,
      title: cleanText(payload?.title) || "Germany University Application Tracker (Summer)",
      currency: cleanText(payload?.currency) || "EUR",
      programs: sourcePrograms.map(normalizeProgram),
    };
  }

  function normalizeProgram(program, index) {
    const numberOrNull = (value) => {
      if (value === null || value === undefined || value === "" || value === "-") return null;
      if (typeof value === "string" && value.trim().toLowerCase() === "free") return 0;
      const parsed = Number(String(value).replace(/[€,]/g, ""));
      return Number.isFinite(parsed) ? parsed : null;
    };
    const bool = typeof program.applied === "boolean" ? program.applied : ["yes", "true", "1", "applied"].includes(cleanText(program.applied).toLowerCase());

    return {
      id: cleanText(program.id) || createId(index),
      universityName: cleanText(program.universityName),
      courseName: cleanText(program.courseName),
      intake: cleanText(program.intake),
      applicationStartDate: normalizeDate(program.applicationStartDate),
      applicationEndDate: normalizeDate(program.applicationEndDate),
      applicationPortal: cleanText(program.applicationPortal),
      vpdRequired: cleanText(program.vpdRequired),
      moiAccepted: cleanText(program.moiAccepted),
      tuitionFee: numberOrNull(program.tuitionFee),
      entranceExamInterview: cleanText(program.entranceExamInterview),
      greGmat: cleanText(program.greGmat),
      applied: bool,
      qsRanking: cleanText(program.qsRanking),
      applicationFee: numberOrNull(program.applicationFee),
      restricted: cleanText(program.restricted),
      applicationLink: cleanText(program.applicationLink),
    };
  }

  function createId(index = "") {
    if (window.crypto?.randomUUID) return crypto.randomUUID();
    return `program-${Date.now()}-${index}-${Math.random().toString(16).slice(2)}`;
  }

  function cleanText(value) {
    return String(value ?? "").replace(/\s+/g, " ").trim();
  }

  function normalizeDate(value) {
    const text = cleanText(value);
    if (!text) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
    const parsed = new Date(text);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
  }

  function persistDataset() {
    updateSaveStatus("Temporary changes", "Changes reset when the page refreshes");
  }


  function updateSaveStatus(primary, secondary) {
    elements.saveStatus.textContent = primary;
    elements.fileStatus.textContent = secondary;
  }

  function getCriteria() {
    return {
      query: elements.searchInput.value,
      university: elements.universityFilter.value,
      intake: elements.intakeFilter.value,
      portal: elements.portalFilter.value,
      vpd: elements.vpdFilter.value,
      moi: elements.moiFilter.value,
      restricted: elements.restrictedFilter.value,
      feeType: elements.feeTypeFilter.value,
      tuitionFeeMin: elements.tuitionFeeMin.value,
      tuitionFeeMax: elements.tuitionFeeMax.value,
      startFrom: elements.startDateFrom.value,
      startTo: elements.startDateTo.value,
      applied: elements.appliedFilter.value,
    };
  }

  function render() {
    state.sortField = elements.sortField.value;
    state.sortDirection = elements.sortDirection.value;
    const filtered = TrackerFilters.filterPrograms(state.programs, getCriteria());
    const visiblePrograms = TrackerFilters.sortPrograms(filtered, state.sortField, state.sortDirection);
    renderStats(visiblePrograms.length);
    renderTable(visiblePrograms);
    renderSortIndicators();
  }

  function renderStats(visibleLength) {
    const total = state.programs.length;
    const freeTuition = state.programs.filter((item) => item.tuitionFee === 0).length;
    const applied = state.programs.filter((item) => item.applied).length;
    const vpd = state.programs.filter((item) => item.vpdRequired.toLowerCase() === "yes").length;
    elements.programCount.textContent = total.toLocaleString("en-US");
    elements.visibleCount.textContent = `${visibleLength.toLocaleString("en-US")} visible`;
    elements.freeTuitionCount.textContent = freeTuition.toLocaleString("en-US");
    elements.appliedCount.textContent = applied.toLocaleString("en-US");
    elements.appliedPercent.textContent = `${total ? Math.round((applied / total) * 100) : 0}% complete`;
    elements.vpdCount.textContent = vpd.toLocaleString("en-US");
    elements.resultSummary.textContent = `Showing ${visibleLength.toLocaleString("en-US")} of ${total.toLocaleString("en-US")} programs`;
  }

  function renderTable(programs) {
    elements.programTableBody.replaceChildren();
    elements.emptyState.hidden = programs.length !== 0;
    elements.programTable.hidden = programs.length === 0;
    const fragment = document.createDocumentFragment();
    programs.forEach((program) => fragment.append(createProgramRow(program)));
    elements.programTableBody.append(fragment);
  }

  function createProgramRow(program) {
    const row = document.createElement("tr");
    row.dataset.id = program.id;

    addCell(row, "University", program.universityName, "cell-primary");
    addCell(row, "Course", program.courseName, "cell-course");
    addCell(row, "Intake", program.intake, "cell-nowrap");
    addCell(row, "Start date", formatDate(program.applicationStartDate), "cell-nowrap");
    addCell(row, "End date", formatDate(program.applicationEndDate), "cell-nowrap");
    addCell(row, "Portal", program.applicationPortal);
    addBadgeCell(row, "VPD", program.vpdRequired, badgeClass(program.vpdRequired));
    addBadgeCell(row, "MOI", program.moiAccepted, badgeClass(program.moiAccepted));
    addCell(row, "Tuition fee", formatMoney(program.tuitionFee), "cell-nowrap");
    addCell(row, "Exam / interview", program.entranceExamInterview);
    addCell(row, "Application fee", formatMoney(program.applicationFee), "cell-nowrap");

    const appliedCell = document.createElement("td");
    appliedCell.dataset.label = "Applied";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "applied-check";
    checkbox.checked = program.applied;
    checkbox.dataset.action = "toggle-applied";
    checkbox.setAttribute("aria-label", `Mark ${program.courseName} at ${program.universityName} as applied`);
    appliedCell.append(checkbox);
    row.append(appliedCell);

    addCell(row, "QS ranking", program.qsRanking, "cell-nowrap");
    addCell(row, "GRE / GMAT", program.greGmat);
    addBadgeCell(row, "Restricted", program.restricted, badgeClass(program.restricted));

    const linkCell = document.createElement("td");
    linkCell.dataset.label = "Link";
    if (isSafeHttpUrl(program.applicationLink)) {
      const link = document.createElement("a");
      link.className = "link-button";
      link.href = program.applicationLink;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = "Open";
      linkCell.append(link);
    } else {
      linkCell.append(createMutedDash());
    }
    row.append(linkCell);

    const actionCell = document.createElement("td");
    actionCell.dataset.label = "Actions";
    const actions = document.createElement("div");
    actions.className = "row-actions";
    actions.append(createRowButton("Edit", "edit"), createRowButton("Delete", "delete", true));
    actionCell.append(actions);
    row.append(actionCell);
    return row;
  }

  function addCell(row, label, value, className = "") {
    const cell = document.createElement("td");
    cell.dataset.label = label;
    if (className) cell.className = className;
    if (value === null || value === undefined || value === "" || value === "-") cell.append(createMutedDash());
    else cell.textContent = value;
    row.append(cell);
  }

  function addBadgeCell(row, label, value, className) {
    const cell = document.createElement("td");
    cell.dataset.label = label;
    if (!value || value === "-") {
      cell.append(createMutedDash());
    } else {
      const badge = document.createElement("span");
      badge.className = `badge ${className}`.trim();
      badge.textContent = value;
      cell.append(badge);
    }
    row.append(cell);
  }

  function createMutedDash() {
    const span = document.createElement("span");
    span.className = "muted-value";
    span.textContent = "—";
    return span;
  }

  function createRowButton(label, action, danger = false) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `row-button${danger ? " delete" : ""}`;
    button.dataset.action = action;
    button.textContent = label;
    return button;
  }

  function formatMoney(value) {
    if (value === null || value === undefined || value === "") return "—";
    if (Number(value) === 0) return "Free";
    return moneyFormatter.format(Number(value));
  }

  function formatDate(value) {
    if (!value) return "—";
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date);
  }

  function badgeClass(value) {
    const normalized = cleanText(value).toLowerCase();
    if (["yes", "free", "no-nc"].includes(normalized)) return "badge-success";
    if (["other", "not mentioned"].includes(normalized)) return "badge-warning";
    if (["no", "nc"].includes(normalized)) return "badge-danger";
    return "";
  }

  function isSafeHttpUrl(value) {
    try {
      const url = new URL(value);
      return ["http:", "https:"].includes(url.protocol);
    } catch (_) {
      return false;
    }
  }

  function renderSortIndicators() {
    document.querySelectorAll(".sort-button").forEach((button) => {
      const active = button.dataset.sort === state.sortField;
      if (active) button.dataset.direction = state.sortDirection;
      else delete button.dataset.direction;
      button.closest("th").setAttribute("aria-sort", active ? (state.sortDirection === "asc" ? "ascending" : "descending") : "none");
    });
  }

  function populateFilterOptions() {
    setSelectOptions(elements.universityFilter, TrackerFilters.uniqueValues(state.programs, "universityName"), "All universities");
    setSelectOptions(elements.intakeFilter, TrackerFilters.uniqueValues(state.programs, "intake"), "All intakes");
    setSelectOptions(elements.portalFilter, TrackerFilters.uniqueValues(state.programs, "applicationPortal"), "All portals");
    setSelectOptions(elements.vpdFilter, TrackerFilters.uniqueValues(state.programs, "vpdRequired"), "All VPD statuses");
    setSelectOptions(elements.moiFilter, TrackerFilters.uniqueValues(state.programs, "moiAccepted"), "All MOI statuses");
    setSelectOptions(elements.restrictedFilter, TrackerFilters.uniqueValues(state.programs, "restricted"), "All restrictions");
  }

  function setSelectOptions(select, values, firstLabel) {
    const current = select.value;
    select.replaceChildren(new Option(firstLabel, ""));
    values.forEach((value) => select.add(new Option(value, value)));
    if ([...select.options].some((option) => option.value === current)) select.value = current;
  }

  function handleTableClick(event) {
    const sortButton = event.target.closest(".sort-button");
    if (sortButton) {
      const field = sortButton.dataset.sort;
      if (state.sortField === field) state.sortDirection = state.sortDirection === "asc" ? "desc" : "asc";
      else {
        state.sortField = field;
        state.sortDirection = "asc";
      }
      elements.sortField.value = state.sortField;
      elements.sortDirection.value = state.sortDirection;
      render();
      return;
    }

    const actionButton = event.target.closest("[data-action]");
    if (!actionButton || actionButton.dataset.action === "toggle-applied") return;
    const row = actionButton.closest("tr");
    const program = state.programs.find((item) => item.id === row?.dataset.id);
    if (!program) return;
    if (actionButton.dataset.action === "edit") openProgramDialog(program);
    if (actionButton.dataset.action === "delete") deleteProgram(program);
  }

  function handleTableChange(event) {
    if (event.target.dataset.action !== "toggle-applied") return;

    const id = event.target.closest("tr")?.dataset.id;
    const program = state.programs.find((item) => item.id === id);

    if (!program) return;

    const wasApplied = program.applied;
    program.applied = event.target.checked;

    persistDataset();

    /*
     * Show the celebration only when changing:
     * Not applied -> Applied
     *
     * Nothing appears when changing:
     * Applied -> Not applied
     */
    if (!wasApplied && program.applied) {
      showAppliedCelebration();
    }

    /*
     * Re-render so an active Applied / Not applied filter stays accurate
     * immediately after the checkbox changes.
     */
    render();

    showToast(
      program.applied
        ? "Marked as applied."
        : "Marked as not applied."
    );
  }

  function openProgramDialog(program = null) {
    state.editingId = program?.id || null;
    elements.programForm.reset();
    elements.dialogTitle.textContent = program ? "Edit program" : "Add program";
    if (program) {
      Object.entries(program).forEach(([key, value]) => {
        const field = elements.programForm.elements.namedItem(key);
        if (!field) return;
        if (field.type === "checkbox") field.checked = Boolean(value);
        else field.value = value ?? "";
      });
    }
    elements.programDialog.showModal();
    elements.programForm.elements.namedItem("universityName").focus();
  }

  function closeProgramDialog() {
    elements.programDialog.close();
    state.editingId = null;
  }

  function saveProgramFromForm(event) {
    event.preventDefault();
    if (!elements.programForm.reportValidity()) return;
    const form = new FormData(elements.programForm);
    const numberOrNull = (name) => form.get(name) === "" ? null : Number(form.get(name));
    const program = normalizeProgram({
      id: state.editingId || createId(),
      universityName: form.get("universityName"),
      courseName: form.get("courseName"),
      intake: form.get("intake"),
      applicationStartDate: form.get("applicationStartDate"),
      applicationEndDate: form.get("applicationEndDate"),
      applicationPortal: form.get("applicationPortal"),
      vpdRequired: form.get("vpdRequired"),
      moiAccepted: form.get("moiAccepted"),
      tuitionFee: numberOrNull("tuitionFee"),
      entranceExamInterview: form.get("entranceExamInterview"),
      greGmat: form.get("greGmat"),
      applied: elements.programForm.elements.namedItem("applied").checked,
      qsRanking: form.get("qsRanking"),
      applicationFee: numberOrNull("applicationFee"),
      restricted: form.get("restricted"),
      applicationLink: form.get("applicationLink"),
    });

    const existingIndex = state.programs.findIndex((item) => item.id === state.editingId);
    if (existingIndex >= 0) state.programs.splice(existingIndex, 1, program);
    else state.programs.push(program);
    persistDataset();
    populateFilterOptions();
    render();
    closeProgramDialog();
    showToast(existingIndex >= 0 ? "Program updated." : "Program added.");
  }

  function deleteProgram(program) {
    if (!confirm(`Delete ${program.courseName} at ${program.universityName}?`)) return;
    state.programs = state.programs.filter((item) => item.id !== program.id);
    persistDataset();
    populateFilterOptions();
    render();
    showToast("Program deleted.");
  }

  function clearFilters() {
    [elements.searchInput, elements.tuitionFeeMin, elements.tuitionFeeMax, elements.startDateFrom, elements.startDateTo].forEach((input) => { input.value = ""; });
    [elements.universityFilter, elements.intakeFilter, elements.portalFilter, elements.vpdFilter, elements.moiFilter, elements.restrictedFilter, elements.feeTypeFilter, elements.appliedFilter]
      .forEach((select) => { select.value = ""; });
    render();
  }

  function toggleFilters() {
    const willHide = !elements.filterPanel.hidden;
    elements.filterPanel.hidden = willHide;
    elements.filterToggle.setAttribute("aria-expanded", String(!willHide));
    elements.filterToggle.textContent = willHide ? "Show Filters" : "Hide Filters";
  }

  async function resetDataset() {
    if (!confirm("Discard all temporary changes and restore the original public dataset?")) return;
    const original = structuredCloneSafe(state.originalDataset || window.TRACKER_SEED_DATA);
    applyDataset(original);
    clearFilters();
    populateFilterOptions();
    render();
    updateSaveStatus("Temporary session", "Original data restored");
    showToast("Temporary changes were discarded.");
  }

  async function exportFilteredPdf() {
    state.sortField = elements.sortField.value;
    state.sortDirection = elements.sortDirection.value;

    const filteredPrograms = TrackerFilters.filterPrograms(state.programs, getCriteria());
    const visiblePrograms = TrackerFilters.sortPrograms(filteredPrograms, state.sortField, state.sortDirection);

    if (visiblePrograms.length === 0) {
      showToast("There are no visible programs to export.", true);
      return;
    }

    const originalLabel = elements.exportButton.textContent;
    elements.exportButton.disabled = true;
    elements.exportButton.textContent = "Preparing PDF...";

    try {
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const pdfBytes = buildProgramsPdf(visiblePrograms);
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = createPdfFilename();
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      showToast(`PDF downloaded with ${visiblePrograms.length} visible program${visiblePrograms.length === 1 ? "" : "s"}.`);
    } catch (error) {
      console.error("PDF export failed", error);
      showToast(`PDF export failed: ${error.message}`, true);
    } finally {
      elements.exportButton.disabled = false;
      elements.exportButton.textContent = originalLabel;
    }
  }

  function createPdfFilename() {
    const criteria = getCriteria();
    const date = new Date().toISOString().slice(0, 10);
    let scope = "filtered-programs";

    if (criteria.university) scope = criteria.university;
    else if (criteria.applied === "applied") scope = "applied-programs";
    else if (criteria.applied === "not-applied") scope = "not-applied-programs";
    else if (!hasActiveFilters(criteria)) scope = "all-programs";

    const safeScope = cleanText(scope)
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 70) || "programs";

    return `germany-university-${safeScope}-${date}.pdf`;
  }

  function hasActiveFilters(criteria) {
    return Object.values(criteria).some((value) => cleanText(value) !== "");
  }

  function buildProgramsPdf(programs) {
    const PAGE_WIDTH = 841.89;
    const PAGE_HEIGHT = 595.28;
    const MARGIN = 34;
    const CARD_GAP_X = 12;
    const CARD_GAP_Y = 10;
    const CARD_HEIGHT = 150;
    const CARDS_PER_PAGE = 6;
    const CARD_WIDTH = (PAGE_WIDTH - (MARGIN * 2) - CARD_GAP_X) / 2;
    const CARD_START_TOP = 77;

    const pages = [];
    const pageCount = Math.ceil(programs.length / CARDS_PER_PAGE);
    const filterSummary = getPdfFilterSummary();
    const sortSummary = getPdfSortSummary();
    const generatedDate = dateFormatter.format(new Date());

    for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
      const pagePrograms = programs.slice(pageIndex * CARDS_PER_PAGE, (pageIndex + 1) * CARDS_PER_PAGE);
      let stream = "";

      stream += pdfFillRect(0, 0, PAGE_WIDTH, 54, [16, 42, 67], PAGE_HEIGHT);
      stream += pdfText(34, 21, "Germany University Application Tracker", 17, "F2", [255, 255, 255], PAGE_HEIGHT);
      stream += pdfText(34, 40, `${programs.length} currently visible program${programs.length === 1 ? "" : "s"} | Generated ${generatedDate}`, 8.5, "F1", [217, 234, 242], PAGE_HEIGHT);

      const filterLines = wrapPdfText(`Filters: ${filterSummary}`, PAGE_WIDTH - 240, 7.5, 2);
      filterLines.forEach((line, lineIndex) => {
        stream += pdfText(34, 61 + (lineIndex * 9), line, 7.5, "F1", [72, 101, 129], PAGE_HEIGHT);
      });
      stream += pdfText(PAGE_WIDTH - 205, 61, sortSummary, 7.5, "F1", [72, 101, 129], PAGE_HEIGHT);

      pagePrograms.forEach((program, localIndex) => {
        const column = localIndex % 2;
        const row = Math.floor(localIndex / 2);
        const x = MARGIN + column * (CARD_WIDTH + CARD_GAP_X);
        const top = CARD_START_TOP + row * (CARD_HEIGHT + CARD_GAP_Y);
        stream += buildProgramCard(program, x, top, CARD_WIDTH, CARD_HEIGHT, PAGE_HEIGHT);
      });

      stream += pdfLine(MARGIN, PAGE_HEIGHT - 25, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 25, [217, 226, 236]);
      stream += pdfText(MARGIN, PAGE_HEIGHT - 12, "Maintained and Developed by Boishik Barua Tinu", 7.3, "F1", [98, 125, 152], PAGE_HEIGHT);
      const pageLabel = `Page ${pageIndex + 1} of ${pageCount}`;
      stream += pdfText(PAGE_WIDTH - MARGIN - measurePdfText(pageLabel, 7.3), PAGE_HEIGHT - 12, pageLabel, 7.3, "F1", [98, 125, 152], PAGE_HEIGHT);

      pages.push(stream);
    }

    return assemblePdf(pages, PAGE_WIDTH, PAGE_HEIGHT);
  }

  function buildProgramCard(program, x, top, width, height, pageHeight) {
    let stream = "";
    stream += pdfFillRect(x, top, width, height, [255, 255, 255], pageHeight);
    stream += pdfStrokeRect(x, top, width, height, [201, 214, 226], 0.7, pageHeight);
    stream += pdfFillRect(x, top, 4, height, program.applied ? [21, 115, 71] : [11, 114, 133], pageHeight);
    stream += pdfFillRect(x + 4, top, width - 4, 46, [245, 248, 251], pageHeight);

    const universityLines = wrapPdfText(pdfDisplayValue(program.universityName), width - 22, 10.4, 2);
    universityLines.forEach((line, index) => {
      stream += pdfText(x + 12, top + 14 + (index * 11), line, 10.4, "F2", [16, 42, 67], pageHeight);
    });

    const courseTop = top + (universityLines.length === 2 ? 35 : 27);
    const courseLines = wrapPdfText(pdfDisplayValue(program.courseName), width - 22, 8.2, universityLines.length === 2 ? 1 : 2);
    courseLines.forEach((line, index) => {
      stream += pdfText(x + 12, courseTop + (index * 9), line, 8.2, "F1", [11, 114, 133], pageHeight);
    });

    const leftFields = [
      ["Intake", program.intake],
      ["Start date", formatDate(program.applicationStartDate)],
      ["End date", formatDate(program.applicationEndDate)],
      ["Portal", program.applicationPortal],
      ["VPD", program.vpdRequired],
      ["MOI", program.moiAccepted],
      ["Tuition fee", formatMoney(program.tuitionFee)],
    ];

    const rightFields = [
      ["Exam / interview", program.entranceExamInterview],
      ["Application fee", formatMoney(program.applicationFee)],
      ["Applied", program.applied ? "Yes" : "No"],
      ["QS ranking", program.qsRanking],
      ["GRE / GMAT", program.greGmat],
      ["Restricted", program.restricted],
      ["Link", program.applicationLink],
    ];

    const fieldTop = top + 57;
    const fieldGap = 12.3;
    const innerGap = 12;
    const fieldWidth = (width - 28 - innerGap) / 2;
    const rightX = x + 14 + fieldWidth + innerGap;

    leftFields.forEach(([label, value], index) => {
      stream += pdfLabelValue(x + 14, fieldTop + (index * fieldGap), label, value, fieldWidth, pageHeight);
    });

    rightFields.forEach(([label, value], index) => {
      stream += pdfLabelValue(rightX, fieldTop + (index * fieldGap), label, value, fieldWidth, pageHeight);
    });

    return stream;
  }

  function pdfLabelValue(x, top, label, value, maxWidth, pageHeight) {
    const labelText = `${label}:`;
    const labelSize = 6.7;
    const valueSize = 7.1;
    const labelWidth = measurePdfText(labelText, labelSize) + 6;
    const available = Math.max(24, maxWidth - labelWidth);
    const valueText = truncatePdfText(pdfDisplayValue(value), available, valueSize);

    return pdfText(x, top, labelText, labelSize, "F2", [72, 101, 129], pageHeight)
      + pdfText(x + labelWidth, top, valueText, valueSize, "F1", [16, 42, 67], pageHeight);
  }

  function getPdfFilterSummary() {
    const criteria = getCriteria();
    const parts = [];

    if (criteria.query) parts.push(`Search = ${criteria.query}`);
    appendSelectedFilter(parts, elements.universityFilter, "University");
    appendSelectedFilter(parts, elements.intakeFilter, "Intake");
    appendSelectedFilter(parts, elements.portalFilter, "Portal");
    appendSelectedFilter(parts, elements.vpdFilter, "VPD");
    appendSelectedFilter(parts, elements.moiFilter, "MOI");
    appendSelectedFilter(parts, elements.restrictedFilter, "Admission");
    appendSelectedFilter(parts, elements.feeTypeFilter, "Application fee");
    if (criteria.tuitionFeeMin) {
      parts.push(`Minimum tuition fee = EUR ${criteria.tuitionFeeMin}`);
    }
    if (criteria.tuitionFeeMax) {
      parts.push(`Maximum tuition fee = EUR ${criteria.tuitionFeeMax}`);
    }
    if (criteria.startFrom) parts.push(`Start from = ${criteria.startFrom}`);
    if (criteria.startTo) parts.push(`Start to = ${criteria.startTo}`);
    appendSelectedFilter(parts, elements.appliedFilter, "Application status");

    return parts.length ? parts.join(" | ") : "None - all programs are included";
  }

  function appendSelectedFilter(parts, select, label) {
    if (!select.value) return;
    const selectedText = select.options[select.selectedIndex]?.textContent || select.value;
    parts.push(`${label} = ${selectedText}`);
  }

  function getPdfSortSummary() {
    const fieldText = elements.sortField.options[elements.sortField.selectedIndex]?.textContent || state.sortField;
    const directionText = state.sortDirection === "desc" ? "Descending" : "Ascending";
    return `Sort: ${fieldText} (${directionText})`;
  }

  function pdfDisplayValue(value) {
    if (value === null || value === undefined || value === "" || value === "-") return "Not provided";
    return cleanText(value);
  }

  function wrapPdfText(value, maxWidth, fontSize, maxLines) {
    const text = pdfDisplayValue(value);
    const words = text.split(/\s+/);
    const lines = [];
    let current = "";

    words.forEach((word) => {
      const candidate = current ? `${current} ${word}` : word;
      if (measurePdfText(candidate, fontSize) <= maxWidth) {
        current = candidate;
      } else if (current) {
        lines.push(current);
        current = word;
      } else {
        lines.push(truncatePdfText(word, maxWidth, fontSize));
        current = "";
      }
    });

    if (current) lines.push(current);
    if (lines.length <= maxLines) return lines;

    const limited = lines.slice(0, maxLines);
    limited[maxLines - 1] = truncatePdfText(`${limited[maxLines - 1]} ${lines.slice(maxLines).join(" ")}`, maxWidth, fontSize);
    return limited;
  }

  function truncatePdfText(value, maxWidth, fontSize) {
    const text = pdfDisplayValue(value);
    if (measurePdfText(text, fontSize) <= maxWidth) return text;

    const suffix = "...";
    let shortened = text;
    while (shortened.length > 1 && measurePdfText(`${shortened}${suffix}`, fontSize) > maxWidth) {
      shortened = shortened.slice(0, -1);
    }
    return `${shortened.trimEnd()}${suffix}`;
  }

  function measurePdfText(value, fontSize) {
    const text = String(value ?? "");
    let units = 0;
    for (const character of text) {
      if (" .,:;!|iIl'`".includes(character)) units += 0.27;
      else if ("MW@#%&QG".includes(character)) units += 0.82;
      else if (character === character.toUpperCase() && character !== character.toLowerCase()) units += 0.61;
      else units += 0.52;
    }
    return units * fontSize;
  }

  function pdfText(x, top, text, size, font, color, pageHeight) {
    const y = pageHeight - top - size;
    return `BT /${font} ${pdfNumber(size)} Tf ${pdfColor(color)} rg 1 0 0 1 ${pdfNumber(x)} ${pdfNumber(y)} Tm (${escapePdfText(text)}) Tj ET\n`;
  }

  function pdfFillRect(x, top, width, height, color, pageHeight) {
    const y = pageHeight - top - height;
    return `q ${pdfColor(color)} rg ${pdfNumber(x)} ${pdfNumber(y)} ${pdfNumber(width)} ${pdfNumber(height)} re f Q\n`;
  }

  function pdfStrokeRect(x, top, width, height, color, lineWidth, pageHeight) {
    const y = pageHeight - top - height;
    return `q ${pdfColor(color)} RG ${pdfNumber(lineWidth)} w ${pdfNumber(x)} ${pdfNumber(y)} ${pdfNumber(width)} ${pdfNumber(height)} re S Q\n`;
  }

  function pdfLine(x1, y1FromTop, x2, y2FromTop, color) {
    const pageHeight = 595.28;
    const y1 = pageHeight - y1FromTop;
    const y2 = pageHeight - y2FromTop;
    return `q ${pdfColor(color)} RG 0.6 w ${pdfNumber(x1)} ${pdfNumber(y1)} m ${pdfNumber(x2)} ${pdfNumber(y2)} l S Q\n`;
  }

  function pdfColor(color) {
    return color.map((component) => pdfNumber(component / 255)).join(" ");
  }

  function pdfNumber(value) {
    return Number(value.toFixed(3)).toString();
  }

  function escapePdfText(value) {
    return encodeWinAnsi(value)
      .replace(/\\/g, "\\\\")
      .replace(/\(/g, "\\(")
      .replace(/\)/g, "\\)")
      .replace(/[\r\n]+/g, " ");
  }

  function encodeWinAnsi(value) {
    const replacements = {
      "€": 128,
      "‚": 130,
      "ƒ": 131,
      "„": 132,
      "…": 133,
      "†": 134,
      "‡": 135,
      "ˆ": 136,
      "‰": 137,
      "Š": 138,
      "‹": 139,
      "Œ": 140,
      "Ž": 142,
      "‘": 145,
      "’": 146,
      "“": 147,
      "”": 148,
      "•": 149,
      "–": 150,
      "—": 151,
      "˜": 152,
      "™": 153,
      "š": 154,
      "›": 155,
      "œ": 156,
      "ž": 158,
      "Ÿ": 159,
    };

    let result = "";
    for (const character of String(value ?? "")) {
      const code = character.codePointAt(0);
      if ((code >= 32 && code <= 126) || (code >= 160 && code <= 255)) {
        result += String.fromCharCode(code);
      } else if (Object.prototype.hasOwnProperty.call(replacements, character)) {
        result += String.fromCharCode(replacements[character]);
      } else {
        result += "?";
      }
    }
    return result;
  }

  function assemblePdf(pageStreams, pageWidth, pageHeight) {
    const objects = [];
    const pageObjectIds = pageStreams.map((_, index) => 5 + (index * 2));

    objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
    objects[2] = `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageStreams.length} >>`;
    objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
    objects[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";

    pageStreams.forEach((stream, index) => {
      const pageObjectId = 5 + (index * 2);
      const contentObjectId = pageObjectId + 1;
      objects[pageObjectId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pdfNumber(pageWidth)} ${pdfNumber(pageHeight)}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObjectId} 0 R >>`;
      objects[contentObjectId] = `<< /Length ${stream.length} >>\nstream\n${stream}endstream`;
    });

    let pdf = "%PDF-1.4\n%âãÏÓ\n";
    const offsets = [0];

    for (let objectId = 1; objectId < objects.length; objectId += 1) {
      offsets[objectId] = pdf.length;
      pdf += `${objectId} 0 obj\n${objects[objectId]}\nendobj\n`;
    }

    const xrefOffset = pdf.length;
    pdf += `xref\n0 ${objects.length}\n`;
    pdf += "0000000000 65535 f \n";
    for (let objectId = 1; objectId < objects.length; objectId += 1) {
      pdf += `${String(offsets[objectId]).padStart(10, "0")} 00000 n \n`;
    }
    pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

    const bytes = new Uint8Array(pdf.length);
    for (let index = 0; index < pdf.length; index += 1) bytes[index] = pdf.charCodeAt(index) & 0xff;
    return bytes;
  }

  function showAppliedCelebration() {
    // Remove an older animation if the checkbox is clicked again quickly.
    document.querySelector(".celebration-overlay")?.remove();

    const overlay = document.createElement("div");
    overlay.className = "celebration-overlay";
    overlay.setAttribute("aria-hidden", "true");

    const message = document.createElement("div");
    message.className = "celebration-message";
    message.textContent = "Congratulations!";

    overlay.append(message);

    const colors = [
      "#0b7285",
      "#66d9a4",
      "#8fe3eb",
      "#ffd166",
      "#ff7b7b",
      "#ffffff",
      "#7c83fd"
    ];

    const particleCountPerSide = 28;

    ["left", "right"].forEach((side) => {
      for (let index = 0; index < particleCountPerSide; index += 1) {
        const particle = document.createElement("span");

        particle.className =
          `celebration-particle from-${side}`;

        const size = 6 + Math.random() * 10;
        const startY = 15 + Math.random() * 70;
        const travelX =
          Math.max(300, window.innerWidth * (0.35 + Math.random() * 0.35));
        const travelY = -250 + Math.random() * 500;
        const rotation = -720 + Math.random() * 1440;
        const duration = 1.1 + Math.random() * 0.8;
        const delay = Math.random() * 0.22;
        const color =
          colors[Math.floor(Math.random() * colors.length)];

        particle.style.setProperty("--particle-size", `${size}px`);
        particle.style.setProperty("--particle-radius", Math.random() > 0.5 ? "50%" : "2px");
        particle.style.setProperty("--particle-color", color);
        particle.style.setProperty("--start-y", `${startY}%`);
        particle.style.setProperty("--travel-x", `${travelX}px`);
        particle.style.setProperty("--travel-y", `${travelY}px`);
        particle.style.setProperty("--rotation", `${rotation}deg`);
        particle.style.setProperty("--particle-duration", `${duration}s`);
        particle.style.setProperty("--particle-delay", `${delay}s`);

        overlay.append(particle);
      }
    });

    document.body.append(overlay);

    // Remove the complete effect after it finishes.
    window.setTimeout(() => {
      overlay.remove();
    }, 2400);
  }

  function showToast(message, error = false) {
    const toast = document.createElement("div");
    toast.className = `toast${error ? " error" : ""}`;
    toast.textContent = message;
    elements.toastRegion.append(toast);
    setTimeout(() => toast.remove(), 3500);
  }

  function structuredCloneSafe(value) {
    return window.structuredClone ? structuredClone(value) : JSON.parse(JSON.stringify(value));
  }

  async function disableServiceWorkerAndCaches() {
    if ("serviceWorker" in navigator) {
      try {
        const currentScope = new URL("./", window.location.href).href;
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(
          registrations
            .filter((registration) => registration.scope === currentScope)
            .map((registration) => registration.unregister())
        );
      } catch (error) {
        console.warn("Service worker cleanup failed", error);
      }
    }

    if ("caches" in window) {
      try {
        const keys = await caches.keys();
        await Promise.all(
          keys
            .filter((key) => key.startsWith("germany-university-tracker"))
            .map((key) => caches.delete(key))
        );
      } catch (error) {
        console.warn("Cache cleanup failed", error);
      }
    }
  }
})();