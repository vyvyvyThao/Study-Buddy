// Simulated database records
const simulatedStudySets = [
    { id: 1, title: "Math", creator_id: 1 },
    { id: 2, title: "French", creator_id: 2 },
];

const simulatedFlashcards = [
    { studyset_id: 1, front: "2 + 2?", back: "4" },
    { studyset_id: 1, front: "3 x 3?", back: "9" },
    { studyset_id: 2, front: "Bonjour", back: "Hello" },
    { studyset_id: 2, front: "Merci", back: "Thank you" },
];

document.addEventListener("DOMContentLoaded", () => {
    const sidebar = document.getElementById("sidebar");
    const toggleSidebarButton = document.getElementById("toggle-sidebar");
    const flashcardContainer = document.getElementById("flashcard-container");

    const flashcards = [{ front: "Default Front", back: "Default Back" }];
    let currentIndex = 0;

    toggleSidebarButton.addEventListener("click", () => {
        sidebar.classList.toggle("active");
    });

    document.getElementById("add-study-set").addEventListener("click", () => {
        const name = prompt("Enter the name of the study set:");
        if (name) {
            const list = document.getElementById("study-set-list");
            const li = document.createElement("li");
            li.textContent = name;
            li.addEventListener("click", () => loadStudySet(name));
            list.appendChild(li);
        }
    });

    document.getElementById("delete-study-set").addEventListener("click", () => {
        const name = prompt("Enter the name of the study set to delete:");
        if (name) {
            const list = document.getElementById("study-set-list");
            Array.from(list.children).forEach((li) => {
                if (li.textContent === name) {
                    list.removeChild(li);
                }
            });
        }
    });

    function loadStudySet(name) {
        alert(`Loading study set: ${name}`);
        const studySet = simulatedStudySets.find((set) => set.title === name);
        if (!studySet) {
            alert("Study set not found!");
            return;
        }
        
        currentStudySet = simulatedFlashcards.filter(
            (card) => card.studyset_id === studySet.id
        );
    
        currentFlashcardIndex = 0;
        displayFlashcard(currentIndex);
    }
    

    document.getElementById("add-flashcard").addEventListener("click", () => {
        const front = prompt("Enter the front of the flashcard:");
        const back = prompt("Enter the back of the flashcard:");
        if (front && back) {
            flashcards.push({ front, back });
            alert("Flashcard added successfully.");
            displayFlashcard(currentIndex);
        }
    });

    document.getElementById("edit-flashcard").addEventListener("click", () => {
        if (flashcards.length === 0) return;

        const front = prompt("Edit the front of the flashcard:", flashcards[currentIndex].front);
        const back = prompt("Edit the back of the flashcard:", flashcards[currentIndex].back);

        if (front && back) {
            flashcards[currentIndex] = { front, back };
            alert("Flashcard updated successfully.");
            displayFlashcard(currentIndex);
        }
    });

    document.getElementById("delete-flashcard").addEventListener("click", () => {
        if (flashcards.length === 0) return;

        flashcards.splice(currentIndex, 1);
        alert("Flashcard removed successfully.");

        if (currentIndex >= flashcards.length) {
            currentIndex = flashcards.length - 1;
        }

        displayFlashcard(currentIndex);
    });

    function displayFlashcard(index) {
        if (flashcards.length === 0) {
            flashcardContainer.innerHTML = "<p>No flashcards available.</p>";
            return;
        }

        const card = flashcards[index];
        flashcardContainer.innerHTML = `
            <div id="flashcard">
                ${card.front}
            </div>
            <div class="controls">
                <button id="prev-card">Previous</button>
                <button id="flip-card">Flip</button>
                <button id="next-card">Next</button>
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
            if (currentIndex > 0) {
                currentIndex--;
                displayFlashcard(currentIndex);
            }
        });

        document.getElementById("next-card").addEventListener("click", () => {
            if (currentIndex < flashcards.length - 1) {
                currentIndex++;
                displayFlashcard(currentIndex);
            }
        });
    }
});
