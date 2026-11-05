const rowsElement = document.querySelector('#student-rows');
const countElement = document.querySelector('#record-count');
const pageSummary = document.querySelector('#page-summary');
const pageIndicator = document.querySelector('#page-indicator');
const previousButton = document.querySelector('#previous-page');
const nextButton = document.querySelector('#next-page');
const searchInput = document.querySelector('#student-search');
const notice = document.querySelector('#notice');
const studentDialog = document.querySelector('#student-dialog');
const detailsDialog = document.querySelector('#details-dialog');
const studentForm = document.querySelector('#student-form');
const formAlert = document.querySelector('#form-alert');
const saveButton = document.querySelector('#save-student-button');
const formFields = ['first_name', 'last_name', 'email', 'phone', 'program', 'year_level', 'enrollment_date', 'status'];

const state = { page: 1, limit: 10, total: 0, totalPages: 0, search: '', editingId: null };
let listController;
let searchTimer;

function showNotice(message, kind = 'success') {
  notice.textContent = message;
  notice.className = `notice notice-${kind}`;
  notice.hidden = !message;
}

function showFormAlert(message) {
  formAlert.textContent = message;
  formAlert.hidden = !message;
}

async function apiRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers }
  });
  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error('The server returned an unreadable response.');
  }
  if (!response.ok || payload.success !== true) {
    const error = new Error(payload.error?.message || 'The request could not be completed.');
    error.fieldErrors = payload.error?.fieldErrors || {};
    error.code = payload.error?.code;
    throw error;
  }
  return payload.data;
}

function makeCell(className) {
  const cell = document.createElement('td');
  if (className) cell.className = className;
  return cell;
}

function createActionButton(label, className, action, student) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.textContent = label;
  button.setAttribute('aria-label', `${label} ${student.first_name} ${student.last_name}`);
  button.addEventListener('click', () => action(student));
  return button;
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(date);
}

function appendStudentRow(student) {
  const row = document.createElement('tr');

  const identity = makeCell('student-cell');
  const name = document.createElement('span');
  name.className = 'student-name';
  name.textContent = `${student.first_name} ${student.last_name}`;
  const email = document.createElement('span');
  email.className = 'student-email';
  email.textContent = student.email;
  identity.append(name, email);

  const program = makeCell();
  program.textContent = student.program;
  const year = makeCell('muted-cell');
  year.textContent = `Year ${student.year_level}`;
  const enrolled = makeCell('muted-cell');
  enrolled.textContent = formatDate(student.enrollment_date);
  const statusCell = makeCell();
  const badge = document.createElement('span');
  const statusClass = student.status === 'On Leave' ? 'on-leave' : student.status.toLowerCase();
  badge.className = `status-pill status-${statusClass}`;
  badge.textContent = student.status;
  statusCell.append(badge);

  const actions = makeCell('actions-cell');
  actions.append(
    createActionButton('View', 'text-button', viewStudent, student),
    createActionButton('Edit', 'text-button', editStudent, student),
    createActionButton('Delete', 'text-button text-button-danger', deleteStudent, student)
  );
  row.append(identity, program, year, enrolled, statusCell, actions);
  rowsElement.append(row);
}

function showTableState(message, withRetry = false) {
  const row = document.createElement('tr');
  const cell = makeCell('table-state');
  cell.colSpan = 6;
  const text = document.createElement('span');
  text.textContent = message;
  cell.append(text);
  if (withRetry) {
    const retry = document.createElement('button');
    retry.type = 'button';
    retry.className = 'text-button retry-button';
    retry.textContent = 'Try again';
    retry.addEventListener('click', loadStudents);
    cell.append(document.createElement('br'), retry);
  } else if (state.search === '' && state.total === 0 && message.startsWith('No students')) {
    const add = document.createElement('button');
    add.type = 'button';
    add.className = 'text-button retry-button';
    add.textContent = 'Add your first student';
    add.addEventListener('click', () => openStudentForm());
    cell.append(document.createElement('br'), add);
  }
  row.append(cell);
  rowsElement.replaceChildren(row);
}

async function loadStudents() {
  if (listController) listController.abort();
  listController = new AbortController();
  const controller = listController;
  const params = new URLSearchParams({ page: String(state.page), limit: String(state.limit), q: state.search });
  rowsElement.replaceChildren();
  showTableState('Loading student records…');
  countElement.textContent = 'Loading records…';
  pageSummary.textContent = '';
  previousButton.disabled = true;
  nextButton.disabled = true;

  try {
    const data = await apiRequest(`/api/students?${params}`, { signal: controller.signal });
    if (controller.signal.aborted) return;
    const { students, pagination } = data;
    const lastPage = Math.max(1, pagination.totalPages);
    if (state.page > lastPage) {
      state.page = lastPage;
      return loadStudents();
    }
    state.total = pagination.total;
    state.totalPages = pagination.totalPages;
    rowsElement.replaceChildren();

    if (students.length === 0) {
      showTableState(state.search ? 'No students match your search.' : 'No students yet. Add a record to get started.');
    } else {
      for (const student of students) appendStudentRow(student);
    }

    countElement.textContent = `${pagination.total} ${pagination.total === 1 ? 'student' : 'students'} total`;
    const first = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
    const last = Math.min(pagination.page * pagination.limit, pagination.total);
    pageSummary.textContent = pagination.total ? `Showing ${first}–${last} of ${pagination.total}` : 'No records to show';
    pageIndicator.textContent = `Page ${pagination.page} of ${Math.max(1, pagination.totalPages)}`;
    previousButton.disabled = pagination.page <= 1;
    nextButton.disabled = pagination.page >= pagination.totalPages;
  } catch (error) {
    if (error.name === 'AbortError') return;
    state.total = 0;
    state.totalPages = 0;
    countElement.textContent = 'Records unavailable';
    pageIndicator.textContent = `Page ${state.page} of ${Math.max(1, state.totalPages)}`;
    showTableState(error.message || 'Could not load student records.', true);
  }
}

function clearFieldErrors() {
  for (const field of formFields) {
    const input = studentForm.elements.namedItem(field);
    input.removeAttribute('aria-invalid');
    document.querySelector(`#${field}-error`).textContent = '';
  }
  showFormAlert('');
}

function displayFieldErrors(fieldErrors = {}) {
  let found = false;
  for (const [field, message] of Object.entries(fieldErrors)) {
    if (formFields.includes(field)) {
      const input = studentForm.elements.namedItem(field);
      input.setAttribute('aria-invalid', 'true');
      document.querySelector(`#${field}-error`).textContent = message;
      found = true;
    }
  }
  if (fieldErrors.form) showFormAlert(fieldErrors.form);
  return found;
}

function openStudentForm(student = null) {
  clearFieldErrors();
  studentForm.reset();
  state.editingId = student ? student.student_id : null;
  document.querySelector('#form-eyebrow').textContent = student ? 'EDIT RECORD' : 'NEW RECORD';
  document.querySelector('#student-dialog-title').textContent = student ? 'Edit student' : 'Add a student';
  saveButton.textContent = student ? 'Save changes' : 'Save student';

  if (student) {
    for (const field of formFields) {
      const input = studentForm.elements.namedItem(field);
      input.value = student[field] ?? '';
    }
  } else {
    studentForm.elements.namedItem('status').value = 'Active';
  }
  studentDialog.showModal();
  studentForm.elements.namedItem('first_name').focus();
}

function closeStudentForm() {
  studentDialog.close();
}

async function editStudent(student) {
  showNotice('');
  try {
    const data = await apiRequest(`/api/students/${encodeURIComponent(student.student_id)}`);
    openStudentForm(data.student);
  } catch (error) {
    showNotice(error.message, 'error');
  }
}

function addDetail(container, label, value) {
  const item = document.createElement('div');
  item.className = 'detail-item';
  const heading = document.createElement('span');
  heading.className = 'detail-label';
  heading.textContent = label;
  const content = document.createElement('span');
  content.className = 'detail-value';
  content.textContent = value === null || value === '' ? '—' : String(value);
  item.append(heading, content);
  container.append(item);
}

async function viewStudent(student) {
  showNotice('');
  try {
    const data = await apiRequest(`/api/students/${encodeURIComponent(student.student_id)}`);
    const record = data.student;
    document.querySelector('#details-title').textContent = `${record.first_name} ${record.last_name}`;
    const details = document.querySelector('#student-details');
    details.replaceChildren();
    addDetail(details, 'Student ID', record.student_id);
    addDetail(details, 'Email', record.email);
    addDetail(details, 'Phone', record.phone);
    addDetail(details, 'Program', record.program);
    addDetail(details, 'Year level', `Year ${record.year_level}`);
    addDetail(details, 'Enrollment date', formatDate(record.enrollment_date));
    addDetail(details, 'Status', record.status);
    addDetail(details, 'Created', record.created_at);
    addDetail(details, 'Last updated', record.updated_at);
    detailsDialog.showModal();
  } catch (error) {
    showNotice(error.message, 'error');
  }
}

async function deleteStudent(student) {
  const name = `${student.first_name} ${student.last_name}`;
  if (!window.confirm(`Delete ${name} (student #${student.student_id})? This action cannot be undone.`)) return;

  showNotice('');
  try {
    await apiRequest(`/api/students/${encodeURIComponent(student.student_id)}`, { method: 'DELETE' });
    showNotice(`${name} was deleted.`, 'success');
    await loadStudents();
  } catch (error) {
    showNotice(error.message, 'error');
  }
}

document.querySelector('#add-student-button').addEventListener('click', () => openStudentForm());
document.querySelector('#close-student-dialog').addEventListener('click', closeStudentForm);
document.querySelector('#cancel-student-form').addEventListener('click', closeStudentForm);
document.querySelector('#close-details-dialog').addEventListener('click', () => detailsDialog.close());
document.querySelector('#details-done').addEventListener('click', () => detailsDialog.close());

studentDialog.addEventListener('click', (event) => {
  if (event.target === studentDialog) studentDialog.close();
});
detailsDialog.addEventListener('click', (event) => {
  if (event.target === detailsDialog) detailsDialog.close();
});

studentForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearFieldErrors();
  if (!studentForm.reportValidity()) return;

  const values = Object.fromEntries(new FormData(studentForm).entries());
  for (const field of ['first_name', 'last_name', 'email', 'phone', 'program']) {
    values[field] = values[field].trim();
  }
  const emptyRequired = ['first_name', 'last_name', 'email', 'program'].filter((field) => !values[field]);
  if (emptyRequired.length) {
    const errors = Object.fromEntries(emptyRequired.map((field) => [field, 'This field is required.']));
    displayFieldErrors(errors);
    studentForm.elements.namedItem(emptyRequired[0]).focus();
    return;
  }

  saveButton.disabled = true;
  saveButton.textContent = state.editingId ? 'Saving…' : 'Adding…';
  const isEditing = Boolean(state.editingId);
  try {
    const url = isEditing ? `/api/students/${encodeURIComponent(state.editingId)}` : '/api/students';
    await apiRequest(url, { method: isEditing ? 'PUT' : 'POST', body: JSON.stringify(values) });
    closeStudentForm();
    showNotice(isEditing ? 'Student changes saved.' : 'Student added.', 'success');
    if (!isEditing) state.page = 1;
    await loadStudents();
  } catch (error) {
    const hasFieldErrors = displayFieldErrors(error.fieldErrors);
    if (!hasFieldErrors) showFormAlert(error.message);
    const firstInvalid = formFields.find((field) => studentForm.elements.namedItem(field).getAttribute('aria-invalid') === 'true');
    if (firstInvalid) studentForm.elements.namedItem(firstInvalid).focus();
  } finally {
    saveButton.disabled = false;
    saveButton.textContent = state.editingId ? 'Save changes' : 'Save student';
  }
});

previousButton.addEventListener('click', () => {
  if (state.page > 1) {
    state.page -= 1;
    loadStudents();
  }
});
nextButton.addEventListener('click', () => {
  if (state.page < state.totalPages) {
    state.page += 1;
    loadStudents();
  }
});
searchInput.addEventListener('input', () => {
  window.clearTimeout(searchTimer);
  searchTimer = window.setTimeout(() => {
    state.search = searchInput.value.trim();
    state.page = 1;
    loadStudents();
  }, 250);
});

loadStudents();
