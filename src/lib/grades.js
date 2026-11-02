// School-year helpers — grade levels move with the selected school year.

export function currentSchoolYearStart(date = new Date()) {
  const year = date.getFullYear();
  return date.getMonth() >= 6 ? year : year - 1;
}

export function formatSchoolYear(start) {
  return `${start}-${start + 1}`;
}

// The grade a student had in the school year their record is anchored to.
export function gradeAnchor(student) {
  if (student.base_year_start != null && student.base_grade_number != null) {
    return { start: student.base_year_start, grade: student.base_grade_number };
  }
  const promotedStart = student.last_promoted_year ? parseInt(student.last_promoted_year, 10) : null;
  const graduated = student.grade === "Graduated" || (student.grade_number != null && student.grade_number > 12);
  if (graduated) {
    return { start: (promotedStart ?? currentSchoolYearStart()) - 1, grade: 12 };
  }
  return { start: promotedStart ?? currentSchoolYearStart(), grade: student.grade_number ?? null };
}

// Grade the student would have in a given school year (13+ means graduated).
export function gradeForSchoolYear(student, yearStart) {
  const { start, grade } = gradeAnchor(student);
  if (grade == null) return null;
  return grade + (yearStart - start);
}

export function gradeLabel(gradeNumber) {
  if (gradeNumber == null) return null;
  return gradeNumber > 12 ? "Graduated" : `Grade ${gradeNumber}`;
}

// Payload that moves a student to the given school year.
export function applySchoolYear(student, yearStart) {
  const target = gradeForSchoolYear(student, yearStart);
  if (target == null) return null;
  const anchor = gradeAnchor(student);
  const graduated = target > 12;
  return {
    id: student.id,
    grade_number: graduated ? 13 : target,
    grade: gradeLabel(target),
    base_grade_number: anchor.grade,
    base_year_start: anchor.start,
    last_promoted_year: formatSchoolYear(yearStart),
  };
}