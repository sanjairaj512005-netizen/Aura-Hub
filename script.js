// =====================================================
// 💎 AURA HUB - SCRIPT.JS
// =====================================================

const API = "http://localhost:3001/api";

let currentUser = null;
let tasks = [];
let notes = [];
let calcValue = "";


// =====================================================
// CLOCK
// =====================================================

function updateClock() {
    const clock = document.getElementById("clock");

    if (clock) {
        clock.textContent = new Date().toLocaleTimeString();
    }
}

setInterval(updateClock, 1000);
updateClock();


// =====================================================
// LOGIN
// =====================================================

async function loginUser() {

    const nameInput = document.getElementById("loginName");
    const emailInput = document.getElementById("loginEmail");

    if (!nameInput || !emailInput) return;

    const name = nameInput.value.trim();
    const email = emailInput.value.trim().toLowerCase();

    if (!name || !email) {
        alert("Please enter your name and email.");
        return;
    }

    if (!email.includes("@")) {
        alert("Please enter a valid email.");
        return;
    }

    try {

        const response = await fetch(`${API}/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                name,
                email
            })
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.message || "Login failed.");
            return;
        }

        currentUser = data.user;

        // Save session
        localStorage.setItem(
            "auraUser",
            JSON.stringify(currentUser)
        );

        showApp();

    } catch (error) {

        console.error("Login error:", error);

        alert(
            "Cannot connect to AURA Hub server.\n\n" +
            "Please make sure server.js is running."
        );
    }
}


// =====================================================
// SHOW APP
// =====================================================

function showApp() {

    if (!currentUser) return;

    const loginScreen =
        document.getElementById("loginScreen");

    const appScreen =
        document.getElementById("appScreen");

    if (loginScreen) {
        loginScreen.classList.add("hidden");
    }

    if (appScreen) {
        appScreen.classList.remove("hidden");
    }

    const userName =
        document.getElementById("userName");

    const profileName =
        document.getElementById("profileName");

    const profileEmail =
        document.getElementById("profileEmail");

    if (userName) {
        userName.textContent = currentUser.name;
    }

    if (profileName) {
        profileName.textContent = currentUser.name;
    }

    if (profileEmail) {
        profileEmail.textContent = currentUser.email;
    }

    loadAllData();
}


// =====================================================
// LOGOUT
// =====================================================

function logoutUser() {

    // Completely remove login session
    localStorage.removeItem("auraUser");

    currentUser = null;
    tasks = [];
    notes = [];

    const nameInput =
        document.getElementById("loginName");

    const emailInput =
        document.getElementById("loginEmail");

    if (nameInput) {
        nameInput.value = "";
    }

    if (emailInput) {
        emailInput.value = "";
    }

    const appScreen =
        document.getElementById("appScreen");

    const loginScreen =
        document.getElementById("loginScreen");

    if (appScreen) {
        appScreen.classList.add("hidden");
    }

    if (loginScreen) {
        loginScreen.classList.remove("hidden");
    }

    closeApp();

    const search =
        document.getElementById("searchApps");

    if (search) {
        search.value = "";
    }

    document
        .querySelectorAll(".app-card")
        .forEach(card => {
            card.style.display = "";
        });

    clearStudyChat();
}


// =====================================================
// AUTO LOGIN
// =====================================================

window.addEventListener("load", () => {

    const savedUser =
        localStorage.getItem("auraUser");

    if (!savedUser) {
        return;
    }

    try {

        const user =
            JSON.parse(savedUser);

        if (
            user &&
            user.id &&
            user.name &&
            user.email
        ) {

            currentUser = user;
            showApp();

        } else {

            localStorage.removeItem("auraUser");
        }

    } catch (error) {

        console.error("Saved login error:", error);

        localStorage.removeItem("auraUser");
    }
});


// =====================================================
// OPEN APP
// =====================================================

function openApp(appName) {

    const modal =
        document.getElementById("modal");

    if (!modal) return;

    modal.classList.remove("hidden");

    document
        .querySelectorAll(".app-window")
        .forEach(app => {
            app.classList.add("hidden");
        });

    const selected =
        document.getElementById(
            appName + "App"
        );

    if (selected) {
        selected.classList.remove("hidden");
    }

    if (appName === "notes") {
        renderNotes();
    }

    if (appName === "tasks") {
        renderTasks();
    }

    if (appName === "dashboard") {
        updateDashboard();
    }

    if (appName === "study") {
        focusStudyInput();
    }
}


// =====================================================
// CLOSE APP
// =====================================================

function closeApp() {

    const modal =
        document.getElementById("modal");

    if (modal) {
        modal.classList.add("hidden");
    }
}


// =====================================================
// SEARCH APPS
// =====================================================

function searchApps() {

    const input =
        document.getElementById("searchApps");

    if (!input) return;

    const search =
        input.value.trim().toLowerCase();

    document
        .querySelectorAll(".app-card")
        .forEach(card => {

            const name =
                (
                    card.dataset.name ||
                    card.textContent ||
                    ""
                ).toLowerCase();

            card.style.display =
                name.includes(search)
                    ? ""
                    : "none";
        });
}


// =====================================================
// LOAD ALL DATA
// =====================================================

async function loadAllData() {

    if (!currentUser) return;

    try {

        const taskResponse =
            await fetch(
                `${API}/tasks/${currentUser.id}`
            );

        if (taskResponse.ok) {
            tasks = await taskResponse.json();
        } else {
            tasks = [];
        }


        const noteResponse =
            await fetch(
                `${API}/notes/${currentUser.id}`
            );

        if (noteResponse.ok) {
            notes = await noteResponse.json();
        } else {
            notes = [];
        }

        renderTasks();
        renderNotes();
        updateDashboard();

    } catch (error) {

        console.error(
            "Data loading error:",
            error
        );
    }
}


// =====================================================
// NOTES - SAVE
// =====================================================

async function saveNote() {

    if (!currentUser) {
        alert("Please login first.");
        return;
    }

    const titleInput =
        document.getElementById("noteTitle");

    const contentInput =
        document.getElementById("noteContent");

    if (!titleInput || !contentInput) return;

    const title =
        titleInput.value.trim();

    const content =
        contentInput.value.trim();

    if (!title || !content) {
        alert("Please enter both title and note.");
        return;
    }

    try {

        const response =
            await fetch(`${API}/notes`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    userId: currentUser.id,
                    title,
                    content
                })
            });

        const data =
            await response.json();

        if (!response.ok) {
            alert(
                data.message ||
                "Could not save note."
            );
            return;
        }

        notes.unshift(data);

        titleInput.value = "";
        contentInput.value = "";

        renderNotes();

    } catch (error) {

        console.error(
            "Save note error:",
            error
        );

        alert("Could not connect to server.");
    }
}


// =====================================================
// NOTES - RENDER
// =====================================================

function renderNotes() {

    const container =
        document.getElementById("notesList");

    if (!container) return;

    container.innerHTML = "";

    if (notes.length === 0) {

        container.innerHTML =
            "<p>No saved notes yet.</p>";

        return;
    }

    notes.forEach(note => {

        const div =
            document.createElement("div");

        div.className = "note-item";

        div.innerHTML = `
            <h4>${escapeHTML(note.title)}</h4>

            <p>${escapeHTML(note.content)}</p>

            <button
                onclick="deleteNote(${note.id})"
            >
                🗑️ Delete
            </button>
        `;

        container.appendChild(div);
    });
}


// =====================================================
// NOTES - DELETE
// =====================================================

async function deleteNote(id) {

    if (!confirm("Delete this note?")) {
        return;
    }

    try {

        const response =
            await fetch(
                `${API}/notes/${id}`,
                {
                    method: "DELETE"
                }
            );

        if (!response.ok) {
            alert("Could not delete note.");
            return;
        }

        notes =
            notes.filter(
                note => note.id !== id
            );

        renderNotes();

    } catch (error) {

        console.error(
            "Delete note error:",
            error
        );

        alert("Could not connect to server.");
    }
}


// =====================================================
// TASKS - ADD
// =====================================================

async function addTask() {

    if (!currentUser) {
        alert("Please login first.");
        return;
    }

    const input =
        document.getElementById("taskInput");

    if (!input) return;

    const title =
        input.value.trim();

    if (!title) {
        alert("Enter a task.");
        return;
    }

    try {

        const response =
            await fetch(`${API}/tasks`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    userId: currentUser.id,
                    title
                })
            });

        const task =
            await response.json();

        if (!response.ok) {

            alert(
                task.message ||
                "Could not add task."
            );

            return;
        }

        tasks.unshift(task);

        input.value = "";

        renderTasks();
        updateDashboard();

    } catch (error) {

        console.error(
            "Add task error:",
            error
        );

        alert("Could not connect to server.");
    }
}


// =====================================================
// TASKS - TOGGLE
// =====================================================

async function toggleTask(id, completed) {

    try {

        const response =
            await fetch(
                `${API}/tasks/${id}`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type":
                            "application/json"
                    },
                    body: JSON.stringify({
                        completed: !completed
                    })
                }
            );

        if (!response.ok) {

            alert(
                "Could not update task."
            );

            return;
        }

        const task =
            tasks.find(
                item => item.id === id
            );

        if (task) {
            task.completed = !completed;
        }

        renderTasks();
        updateDashboard();

    } catch (error) {

        console.error(
            "Update task error:",
            error
        );

        alert("Could not connect to server.");
    }
}


// =====================================================
// TASKS - DELETE
// =====================================================

async function deleteTask(id) {

    if (!confirm("Delete this task?")) {
        return;
    }

    try {

        const response =
            await fetch(
                `${API}/tasks/${id}`,
                {
                    method: "DELETE"
                }
            );

        if (!response.ok) {

            alert(
                "Could not delete task."
            );

            return;
        }

        tasks =
            tasks.filter(
                task => task.id !== id
            );

        renderTasks();
        updateDashboard();

    } catch (error) {

        console.error(
            "Delete task error:",
            error
        );

        alert("Could not connect to server.");
    }
}


// =====================================================
// TASKS - RENDER
// =====================================================

function renderTasks() {

    const container =
        document.getElementById("taskList");

    if (!container) return;

    container.innerHTML = "";

    if (tasks.length === 0) {

        container.innerHTML =
            "<p>No tasks yet. Add your first task!</p>";

        return;
    }

    tasks.forEach(task => {

        const div =
            document.createElement("div");

        div.className =
            "task-item" +
            (
                task.completed
                    ? " completed"
                    : ""
            );

        div.innerHTML = `
            <span>
                ${escapeHTML(task.title)}
            </span>

            <div class="task-actions">

                <button
                    onclick="
                        toggleTask(
                            ${task.id},
                            ${task.completed}
                        )
                    "
                >
                    ${
                        task.completed
                            ? "↩️"
                            : "✓"
                    }
                </button>

                <button
                    onclick="deleteTask(${task.id})"
                >
                    🗑️
                </button>

            </div>
        `;

        container.appendChild(div);
    });
}


// =====================================================
// DASHBOARD
// =====================================================

function updateDashboard() {

    const total = tasks.length;

    const completed =
        tasks.filter(
            task => task.completed
        ).length;

    const pending =
        total - completed;

    const progress =
        total === 0
            ? 0
            : Math.round(
                (completed / total) * 100
            );

    const totalElement =
        document.getElementById("totalTasks");

    const completedElement =
        document.getElementById("completedTasks");

    const pendingElement =
        document.getElementById("pendingTasks");

    const progressElement =
        document.getElementById("progress");

    if (totalElement) {
        totalElement.textContent = total;
    }

    if (completedElement) {
        completedElement.textContent = completed;
    }

    if (pendingElement) {
        pendingElement.textContent = pending;
    }

    if (progressElement) {
        progressElement.textContent =
            progress + "%";
    }
}


// =====================================================
// CALCULATOR
// =====================================================

function calcInput(value) {

    calcValue += value;

    const display =
        document.getElementById("calcDisplay");

    if (display) {
        display.value = calcValue;
    }
}


function calculate() {

    if (!calcValue) return;

    try {

        if (
            !/^[0-9+\-*/().\s]+$/
                .test(calcValue)
        ) {
            throw new Error("Invalid expression");
        }

        const result =
            Function(
                `"use strict"; return (${calcValue})`
            )();

        if (
            typeof result !== "number" ||
            !Number.isFinite(result)
        ) {
            throw new Error("Invalid result");
        }

        calcValue = String(result);

        const display =
            document.getElementById("calcDisplay");

        if (display) {
            display.value = calcValue;
        }

    } catch {

        const display =
            document.getElementById("calcDisplay");

        if (display) {
            display.value = "Error";
        }

        calcValue = "";
    }
}


function clearCalculator() {

    calcValue = "";

    const display =
        document.getElementById("calcDisplay");

    if (display) {
        display.value = "";
    }
}


// =====================================================
// CALCULATOR KEYBOARD
// =====================================================

document.addEventListener(
    "keydown",
    event => {

        const active =
            document.activeElement;

        const activeTag =
            active
                ? active.tagName
                : "";

        if (
            activeTag === "INPUT" ||
            activeTag === "TEXTAREA"
        ) {
            return;
        }

        const key = event.key;

        if (
            "0123456789+-*/()."
                .includes(key)
        ) {
            calcInput(key);
        }

        if (key === "Enter") {
            calculate();
        }

        if (key === "Backspace") {

            calcValue =
                calcValue.slice(0, -1);

            const display =
                document.getElementById(
                    "calcDisplay"
                );

            if (display) {
                display.value = calcValue;
            }
        }

        if (key === "Escape") {
            clearCalculator();
        }
    }
);


// =====================================================
// 🤖 STUDY AI
// =====================================================

function focusStudyInput() {

    setTimeout(() => {

        const input =
            document.getElementById(
                "studyQuestion"
            );

        if (input) {
            input.focus();
        }

    }, 150);
}


// =====================================================
// ASK STUDY AI
// =====================================================

async function askStudyAI() {

    const input =
        document.getElementById(
            "studyQuestion"
        );

    const chat =
        document.getElementById(
            "chatBox"
        );

    if (!input || !chat) return;

    const question =
        input.value.trim();

    if (!question) return;


    // USER MESSAGE
    const userMessage =
        document.createElement("div");

    userMessage.className =
        "user-message";

    userMessage.textContent =
        question;

    chat.appendChild(userMessage);

    input.value = "";


    // LOADING
    const loading =
        document.createElement("div");

    loading.className =
        "bot-message";

    loading.id =
        "aiLoading";

    loading.textContent =
        "🤖 AURA is thinking...";

    chat.appendChild(loading);

    chat.scrollTop =
        chat.scrollHeight;


    try {

        const response =
            await fetch(
                `${API}/study-ai`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        question
                    })
                }
            );


        const data =
            await response.json();


        if (loading) {
            loading.remove();
        }


        const botMessage =
            document.createElement("div");

        botMessage.className =
            "bot-message";


        if (!response.ok) {

            botMessage.textContent =
                data.answer ||
                data.message ||
                "Sorry, I couldn't answer that.";

        } else {

            botMessage.textContent =
                data.answer ||
                "Sorry, I couldn't answer that.";
        }


        chat.appendChild(botMessage);

        chat.scrollTop =
            chat.scrollHeight;


    } catch (error) {

        console.error(
            "Study AI error:",
            error
        );

        if (loading) {
            loading.remove();
        }

        const errorMessage =
            document.createElement("div");

        errorMessage.className =
            "bot-message";

        errorMessage.textContent =
            "⚠️ Cannot connect to AURA Study AI.";

        chat.appendChild(errorMessage);

        chat.scrollTop =
            chat.scrollHeight;
    }
}


// =====================================================
// CLEAR STUDY CHAT
// =====================================================

function clearStudyChat() {

    const chat =
        document.getElementById("chatBox");

    if (!chat) return;

    chat.innerHTML = `
        <div class="bot-message">
            👋 Hi! I'm AURA Study Assistant.
            <br><br>
            Ask me anything about your studies,
            programming, DBMS, Java, Python,
            Data Structures, Algorithms,
            Operating Systems, exams,
            or any general question.
            <br><br>
            💡 I'll try to explain it in a
            simple and easy-to-understand way.
        </div>
    `;
}


// =====================================================
// STUDY CHAT ENTER
// =====================================================

document.addEventListener(
    "keydown",
    event => {

        const target =
            event.target;

        if (
            target &&
            target.id === "studyQuestion" &&
            event.key === "Enter"
        ) {

            event.preventDefault();

            askStudyAI();
        }
    }
);


// =====================================================
// CREATIVE ZONE
// =====================================================

function saveCreative() {

    const input =
        document.getElementById(
            "creativeText"
        );

    const status =
        document.getElementById(
            "creativeStatus"
        );

    if (!input || !status) return;

    const text =
        input.value.trim();

    if (!text) {

        status.textContent =
            "Write something first.";

        return;
    }

    localStorage.setItem(
        "auraCreative",
        text
    );

    status.textContent =
        "✅ Idea saved!";
}


// =====================================================
// LOAD CREATIVE
// =====================================================

window.addEventListener(
    "load",
    () => {

        const saved =
            localStorage.getItem(
                "auraCreative"
            );

        const input =
            document.getElementById(
                "creativeText"
            );

        if (saved && input) {
            input.value = saved;
        }
    }
);


// =====================================================
// ESCAPE HTML
// =====================================================

function escapeHTML(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


// =====================================================
// GLOBAL FUNCTIONS
// =====================================================

window.loginUser = loginUser;
window.logoutUser = logoutUser;

window.openApp = openApp;
window.closeApp = closeApp;
window.searchApps = searchApps;

window.saveNote = saveNote;
window.deleteNote = deleteNote;

window.addTask = addTask;
window.toggleTask = toggleTask;
window.deleteTask = deleteTask;

window.calcInput = calcInput;
window.calculate = calculate;
window.clearCalculator = clearCalculator;

window.askStudyAI = askStudyAI;
window.clearStudyChat = clearStudyChat;

window.saveCreative = saveCreative;