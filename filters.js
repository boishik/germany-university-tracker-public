(function () {
  "use strict";

  const normalize = (value) => String(value ?? "").trim().toLocaleLowerCase("en");
  const isBlank = (value) => value === null || value === undefined || value === "";

  function compareNullable(left, right, direction, comparator) {
    const leftBlank = isBlank(left);
    const rightBlank = isBlank(right);
    if (leftBlank && rightBlank) return 0;
    if (leftBlank) return 1;
    if (rightBlank) return -1;
    return comparator(left, right) * (direction === "desc" ? -1 : 1);
  }

  function compareText(left, right) {
    return String(left).localeCompare(String(right), "en", { sensitivity: "base", numeric: true });
  }

  function compareNumber(left, right) {
    return Number(left) - Number(right);
  }

  function compareDate(left, right) {
    return new Date(`${left}T00:00:00`).getTime() - new Date(`${right}T00:00:00`).getTime();
  }

  function sortPrograms(programs, field, direction = "asc") {
    const dateFields = new Set(["applicationStartDate", "applicationEndDate"]);
    const numberFields = new Set(["applicationFee", "tuitionFee"]);
    const comparator = dateFields.has(field) ? compareDate : numberFields.has(field) ? compareNumber : compareText;

    return [...programs].sort((left, right) => {
      const result = compareNullable(left[field], right[field], direction, comparator);
      if (result !== 0) return result;
      return compareText(left.universityName, right.universityName) || compareText(left.courseName, right.courseName);
    });
  }

  function filterPrograms(programs, criteria) {
    const query = normalize(criteria.query);
    const parseOptionalNumber = (value) => {
      if (value === "" || value === null || value === undefined) return null;
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    };

    const tuitionFeeMin = parseOptionalNumber(criteria.tuitionFeeMin);
    const tuitionFeeMax = parseOptionalNumber(criteria.tuitionFeeMax);

    return programs.filter((program) => {
      if (query) {
        const searchable = Object.entries(program)
          .filter(([key]) => key !== "id")
          .map(([, value]) => typeof value === "boolean" ? (value ? "applied" : "not applied") : value)
          .join(" ");
        if (!normalize(searchable).includes(query)) return false;
      }

      if (criteria.university && program.universityName !== criteria.university) return false;
      if (criteria.intake && program.intake !== criteria.intake) return false;
      if (criteria.portal && program.applicationPortal !== criteria.portal) return false;
      if (criteria.vpd && program.vpdRequired !== criteria.vpd) return false;
      if (criteria.moi && program.moiAccepted !== criteria.moi) return false;
      if (criteria.restricted && program.restricted !== criteria.restricted) return false;

      if (criteria.applied === "applied" && !program.applied) return false;
      if (criteria.applied === "not-applied" && program.applied) return false;

      if (criteria.feeType === "free" && program.applicationFee !== 0) return false;
      if (criteria.feeType === "paid" && !(typeof program.applicationFee === "number" && program.applicationFee > 0)) return false;
      if (criteria.feeType === "unknown" && program.applicationFee !== null) return false;

      if (
        tuitionFeeMin !== null &&
        (program.tuitionFee === null || program.tuitionFee < tuitionFeeMin)
      ) return false;

      if (
        tuitionFeeMax !== null &&
        (program.tuitionFee === null || program.tuitionFee > tuitionFeeMax)
      ) return false;

      if (criteria.startFrom && (!program.applicationStartDate || program.applicationStartDate < criteria.startFrom)) return false;
      if (criteria.startTo && (!program.applicationStartDate || program.applicationStartDate > criteria.startTo)) return false;

      return true;
    });
  }

  function uniqueValues(programs, field) {
    return [...new Set(programs.map((program) => program[field]).filter((value) => !isBlank(value)))]
      .sort(compareText);
  }

  window.TrackerFilters = { filterPrograms, sortPrograms, uniqueValues };
})();
