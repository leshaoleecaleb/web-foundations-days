
const noteForm = document.querySelector("#note-form");
const noteInput = document.querySelector("#note-input");
const noteCategory = document.querySelector("#note-category");
const searchInput = document.querySelector("#search-input");
const notesList = document.querySelector("#notes-list");
const noteCount = document.querySelector("#note-count");
const errorMessage = document.querySelector("#error-message");
const clearAllButton = document.querySelector("#clear-all-button");

const STORAGE_KEY = "quicknotes-day4-notes";

let notes = loadNotes();

function loadNotes() {
  try {
    const savedNotes = localStorage.getItem(STORAGE_KEY);

    if (!savedNotes) {
      return [];
    }

    const parsedNotes = JSON.parse(savedNotes);

    if (!Array.isArray(parsedNotes)) {
      return [];
    }

    return parsedNotes.filter((note) =>
      note &&
      typeof note.id === "string" &&
      typeof note.text === "string" &&
      note.text.trim().length > 0 &&
      note.text.length <= 200 &&
      ["Personal", "Work", "Study"].includes(note.category) &&
      typeof note.createdAt === "string"
    );
  } catch (error) {
    console.error("Could not load saved notes:", error);
    return [];
  }
}

function saveNotes() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  } catch (error) {
    console.error("Could not save notes:", error);
    errorMessage.textContent =
      "Could not save your notes. Check your browser storage.";
  }
}

function updateCount() {
  if (notes.length === 0) {
    noteCount.textContent = "You have no notes yet.";
  } else if (notes.length === 1) {
    noteCount.textContent = "You have 1 note.";
  } else {
    noteCount.textContent = `You have ${notes.length} notes.`;
  }
}

function render() {
  notesList.replaceChildren();

  const searchTerm = searchInput.value.trim().toLowerCase();

  const filteredNotes = notes.filter((note) =>
    note.text.toLowerCase().includes(searchTerm)
  );

  if (filteredNotes.length === 0) {
    const message = document.createElement("li");
    message.className = "empty-message";

    message.textContent = searchTerm
      ? "No notes match your search."
      : "No notes yet. Add your first note above.";

    notesList.appendChild(message);
  } else {
    filteredNotes.forEach((note) => {
      const noteItem = document.createElement("li");
      noteItem.classList.add("note-card");

      noteItem.classList.add(
        `category-${note.category.toLowerCase()}`
      );

      const noteText = document.createElement("p");
      noteText.className = "note-text";
      noteText.textContent = note.text;

      const noteMeta = document.createElement("div");
      noteMeta.className = "note-meta";

      const categoryLabel = document.createElement("span");
      categoryLabel.className = "category-label";
      categoryLabel.textContent = note.category;

      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "delete-button";
      deleteButton.textContent = "Delete";

      deleteButton.addEventListener("click", () => {
        deleteNote(note.id);
      });

      const noteDate = document.createElement("small");
      noteDate.className = "note-date";
      noteDate.textContent = `Created: ${note.createdAt}`;

      noteMeta.append(categoryLabel, deleteButton);
      noteItem.append(noteText, noteMeta, noteDate);
      notesList.appendChild(noteItem);
    });
  }

  updateCount();
}

function addNote(text, category) {
  const note = {
    id: crypto.randomUUID(),
    text: text,
    category: category,
    createdAt: new Date().toLocaleString()
  };

  notes.unshift(note);
  saveNotes();
  render();
}

function deleteNote(id) {
  notes = notes.filter((note) => note.id !== id);
  saveNotes();
  render();
}

noteForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const text = noteInput.value.trim();
  const category = noteCategory.value;

  if (text.length === 0) {
    errorMessage.textContent = "Please type a note first.";
    noteInput.focus();
    return;
  }

  if (text.length > 200) {
    errorMessage.textContent =
      "Notes must be 200 characters or fewer.";
    noteInput.focus();
    return;
  }

  if (!["Personal", "Work", "Study"].includes(category)) {
    errorMessage.textContent = "Please select a valid category.";
    return;
  }

  errorMessage.textContent = "";

  addNote(text, category);

  noteInput.value = "";
  noteInput.focus();
});

searchInput.addEventListener("input", () => {
  render();
});

clearAllButton.addEventListener("click", () => {
  if (notes.length === 0) {
    return;
  }

  if (confirm("Delete all notes?")) {
    notes = [];
    saveNotes();
    render();
    errorMessage.textContent = "";
  }
});

// Display saved notes when the page opens.
render();
