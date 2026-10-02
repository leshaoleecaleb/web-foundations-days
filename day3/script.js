let notes = [
    { id: 1, text: "Buy milk and bread", category: "personal" },
    { id: 2, text: "Finish the Day 3 assignment", category: "study" },
    { id: 3, text: "Email the project report to Grace", category: "work" },
    { id: 4, text: "Revise JavaScript arrays", category: "study" },
    { id: 5, text: "Call mum", category: "personal" }
];

function searchNotes(word) {
    return notes.filter(n => n.text.toLowerCase().includes(word.toLowerCase()));
}

function longestNote() {
    if (notes.length === 0) return null;
    return notes.reduce((longest, n) =>
        n.text.length > longest.text.length ? n : longest
    );
}

function countByCategory() {
    let count = {};
    for (let n of notes) {
        count[n.category] = (count[n.category] || 0) + 1;
    }
    return count;
}

function getSummary() {
    let c = countByCategory();
    let word = notes.length === 1 ? "note" : "notes";
    return `${notes.length} ${word}: ${c.personal || 0} personal, ${c.work || 0} work, ${c.study || 0} study.`;
}

function isDuplicate(text) {
    let clean = text.trim().toLowerCase();
    return notes.some(n => n.text.trim().toLowerCase() === clean);
}

function addNote(text, category) {
    text = text.trim();

    if (text.length < 1 || text.length > 200) {
        console.log("Invalid length");
        return false;
    }

    if (isDuplicate(text)) {
        console.log("Duplicate note");
        return false;
    }

    if (!["personal", "work", "study"].includes(category)) {
        console.log("Invalid category");
        return false;
    }

    notes.push({
        id: notes.length + 1,
        text,
        category
    });

    return true;
}

// Tests
console.log(searchNotes("day"));       // Expected: 1 result
console.log(searchNotes("pizza"));     // Expected: []

console.log(longestNote());            // Expected: longest note
let saved = notes;
notes = [];
console.log(longestNote());            // Expected: null
notes = saved;

console.log(countByCategory());        // Expected: {personal: 2, study: 2, work: 1}
notes = [];
console.log(countByCategory());        // Expected: {}
notes = saved;

console.log(getSummary());             // Expected: 5 notes: 2 personal, 1 work, 2 study.
notes = [saved[0]];
console.log(getSummary());             // Expected: 1 note: 1 personal, 0 work, 0 study.
notes = saved;

console.log(isDuplicate("Call mum"));  // Expected: true
console.log(isDuplicate("Pizza"));     // Expected: false

console.log(addNote("Buy eggs", "personal")); // Expected: true
console.log(addNote("Call mum", "personal")); // Expected: false