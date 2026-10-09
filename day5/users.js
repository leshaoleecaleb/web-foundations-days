const loadButton = document.querySelector("#load-users");
const filterInput = document.querySelector("#filter-input");
const status = document.querySelector("#status");
const usersList = document.querySelector("#users-list");

let users = [];

async function loadUsers() {
    loadButton.disabled = true;
    status.textContent = "Loading users...";

    try {
        const response = await fetch(
            "https://jsonplaceholder.typicode.com/users"
        );

        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
        }

        users = await response.json();

        displayFilteredUsers();
    } catch (error) {
        users = [];
        usersList.replaceChildren();

        status.textContent = "Error loading users. Please try again.";
        console.error("Failed to load users:", error);
    } finally {
        loadButton.disabled = false;
    }
}

function renderUsers(list) {
    usersList.replaceChildren();

    list.forEach((user) => {
        const item = document.createElement("li");

        const name = document.createElement("h2");
        name.textContent = user.name;

        const email = document.createElement("p");
        email.textContent = `Email: ${user.email}`;

        const city = document.createElement("p");
        city.textContent = `City: ${user.address.city}`;

        const company = document.createElement("p");
        company.textContent = `Company: ${user.company.name}`;

        item.append(name, email, city, company);
        usersList.appendChild(item);
    });
}

function displayFilteredUsers() {
    const searchText = filterInput.value.trim().toLowerCase();

    const filteredUsers = users.filter((user) =>
        user.name.toLowerCase().includes(searchText)
    );

    renderUsers(filteredUsers);

    if (users.length === 0) {
        status.textContent = "No users found.";
    } else if (filteredUsers.length === 0) {
        status.textContent = "No users match your filter.";
    } else {
        status.textContent =
            `Showing ${filteredUsers.length} of ${users.length} users.`;
    }
}

loadButton.addEventListener("click", loadUsers);

filterInput.addEventListener("input", displayFilteredUsers);