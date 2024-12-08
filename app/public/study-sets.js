document.addEventListener("DOMContentLoaded", () => {
    let studyset = [];
    let currentStudySetID;
    let currentStudySetTitle;

    const sidebar = document.getElementById("sidebar");
    const toggleSidebarButton = document.getElementById("toggle-sidebar");
    const studySetList = document.getElementById('study-set-list');
    const flashcardContainer = document.getElementById("flashcard-container");

    async function fetchStudySets() {
        try {
            const response = await fetch('/study-sets');
            if (!response.ok) throw new Error('Failed to fetch study sets.');

            const studySets = await response.json();
            renderStudySets(studySets);
        } catch (error) {
            console.error('Error:', error);
        }
    }

    function renderStudySets(studySets) {
        studySetList.innerHTML = '';

        studySets.forEach((set) => {
            const listItem = document.createElement('li');
            listItem.textContent = set.title;
            listItem.classList.add('study-set-item');

            listItem.addEventListener('click', () => {
                loadStudySet(set.title);
            });

            studySetList.appendChild(listItem);
        });
    }

    toggleSidebarButton.addEventListener("click", () => {
        sidebar.classList.toggle("active");
    });

    document.getElementById("add-study-set").addEventListener("click", async () => {
        const title = prompt("Enter the name of the study set:");
        if (title) {
            try {
                const response = await fetch("/study-sets/add", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ title })
                });
                if (response.ok) {
                    const list = document.getElementById("study-set-list");
                    const li = document.createElement("li");
                    li.textContent = title;
                    li.addEventListener("click", () => loadStudySet(title));
                    list.appendChild(li);
                    alert("Study set added successfully.");
                } else {
                    alert("Failed to add study set.");
                }
            } catch (error) {
                console.error("Error adding study set:", error);
            }
        }
    });

    document.getElementById("delete-study-set").addEventListener("click", async () => {
        const title = prompt("Enter the name of the study set to delete:");
        if (title) {
            try {
                const response = await fetch("/study-sets", {
                    method: "DELETE",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ title })
                });
                if (response.ok) {
                    const list = document.getElementById("study-set-list");
                    Array.from(list.children).forEach((li) => {
                        if (li.textContent === title) {
                            list.removeChild(li);
                        }
                    });

                    flashcardContainer.innerHTML=`
                        <h2 id="study-set-title">Select a Study Set</h2>
                        <div id="flashcard" class="flashcard">
                        <p id="flashcard-text">Click a study set to start.</p>
                        `
                    alert("Study set deleted successfully.");
                } else {
                    alert("Failed to delete study set.");
                }
            } catch (error) {
                console.error("Error deleting study set:", error);
            }
        }
    });

    async function loadStudySet(title) {
        try {
            const response = await fetch(`/study-sets/show?title=${title}`);
            if (!response.ok) {
                throw new Error(`Failed to load study set: ${response.statusText}`);
            }
            studyset = await response.json();
            currentStudySetID = studyset[0].studyset_id;
            currentStudySetTitle = title;
            displayFlashcard(studyset, 0);
        } catch (error) {
            console.error("Error loading study set:", error);
            alert("Study set not found.");
        }
    }

    function displayFlashcard(studyset, index) {
        if (!studyset || studyset.length === 0) {
            flashcardContainer.innerHTML = "<p>No flashcards available.</p>";
            return;
        }

        index = Math.max(0, Math.min(index, studyset.length - 1));
        const card = studyset[index];

        flashcardContainer.innerHTML = `
            <h2 id="study-set-title">${currentStudySetTitle}</h2>
            <div id="flashcard">
                ${card.front}
            </div>
            <div class="controls">
                <button id="prev-card" ${index === 0 ? "disabled" : ""}>Previous</button>
                <button id="flip-card">Flip</button>
                <button id="next-card" ${index === studyset.length - 1 ? "disabled" : ""}>Next</button>
            </div>
            <div class="edit-controls">
                <button id="add-flashcard">Add Flashcard</button>
                <button id="edit-flashcard">Edit Flashcard</button>
                <button id="delete-flashcard">Delete Flashcard</button>
            </div>
        `;

        document.getElementById("flip-card").addEventListener("click", () => {
            const flashcard = document.getElementById("flashcard");
            flashcard.textContent = flashcard.textContent === card.front ? card.back : card.front;
        });

        document.getElementById("prev-card").addEventListener("click", () => {
            if (index > 0) {
                displayFlashcard(studyset, index - 1);
            }
        });

        document.getElementById("next-card").addEventListener("click", () => {
            if (index < studyset.length - 1) {
                displayFlashcard(studyset, index + 1);
            }
        });

        document.getElementById("add-flashcard").addEventListener("click", async () => {
            const front = prompt("Enter the front of the flashcard:");
            const back = prompt("Enter the back of the flashcard:");

            if (front && back) {
                try {
                    const response = await fetch("flashcards/add", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            studysetId:currentStudySetID,
                            front,
                            back,
                        }),
                    });
                    if (!response.ok) throw new Error("Failed to add flashcard");
                    const newCard = await response.json();
                    studyset.push(newCard);
                    displayFlashcard(studyset, studyset.length - 1);
                } catch (error) {
                    console.error("Error adding flashcard:", error);
                }
            }
        });

        document.getElementById("edit-flashcard").addEventListener("click", async () => {
            const card = studyset[index];
            const front = prompt("Edit the front of the flashcard:", card.front);
            const back = prompt("Edit the back of the flashcard:", card.back);
            if (front && back) {
                try {
                    const response = await fetch("flashcards/edit", {
                        method: "PUT",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            flashcardId: card.id,
                            front,
                            back,
                        }),
                    });
                    if (!response.ok) throw new Error("Failed to edit flashcard");
                    card.front = front;
                    card.back = back;
                    displayFlashcard(studyset, index);
                } catch (error) {
                    console.error("Error editing flashcard:", error);
                }
            }
        });

        document.getElementById("delete-flashcard").addEventListener("click", async () => {
            const card = studyset[index];
            if (confirm("Are you sure you want to delete this flashcard?")) {
                try {
                    const response = await fetch("flashcards/delete", {
                        method: "DELETE",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            flashcardId: card.id,
                        }),
                    });
                    if (!response.ok) throw new Error("Failed to delete flashcard");
                    studyset.splice(index, 1);
                    currentIndex = Math.min(currentIndex, studyset.length - 1);
                    displayFlashcard(studyset, currentIndex);
                } catch (error) {
                    console.error("Error deleting flashcard:", error);
                }
            }
        });
    }

    fetchStudySets();
});
