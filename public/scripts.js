const calendarElement = document.getElementById('calendar');
const calendarContainer = document.getElementById('calendar-container');
const registrationForm = document.getElementById('registration');
const loginForm = document.getElementById('login');
const logoutButton = document.getElementById('logout-button');

function register() {
    const username = document.getElementById('reg-username').value;
    const password = document.getElementById('reg-password').value;
    const confirmPassword = document.getElementById('reg-confirm-password').value;
    const whatsapp = document.getElementById('reg-whatsapp').value;

    if (username && password && confirmPassword && whatsapp) {
        if (password !== confirmPassword) {
            alert("Passwords do not match!");
            return;
        }

        const user = { username, password, whatsapp };
        localStorage.setItem('user_' + username, JSON.stringify(user));
        alert("Registration successful. Please login.");
    } else {
        alert("Please fill in all fields.");
    }
}

function login() {
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;

    const storedUser = localStorage.getItem('user_' + username);

    if (storedUser) {
        const user = JSON.parse(storedUser);
        if (user.password === password) {
            localStorage.setItem('current_user', JSON.stringify(user));
            console.log('User logged in:', user);
            loadCalendar();
        } else {
            alert("Invalid password.");
        }
    } else {
        alert("User not found. Please register.");
    }
}

function logout() {
    localStorage.removeItem('current_user');
    console.log('User logged out');
    loginForm.style.display = 'block';
    registrationForm.style.display = 'block';
    calendarContainer.style.display = 'none';
}

async function loadCalendar() {
    const user = JSON.parse(localStorage.getItem('current_user'));
    if (user) {
        registrationForm.style.display = 'none';
        loginForm.style.display = 'none';
        calendarContainer.style.display = 'block';
        // Load calendar with current month
        const date = new Date();
        const year = date.getFullYear();
        const month = date.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        calendarElement.innerHTML = ''; // Clear previous calendar

        for (let day = 1; day <= daysInMonth; day++) {
            const dayElement = document.createElement('div');
            dayElement.classList.add('day');
            dayElement.textContent = day;
            dayElement.onclick = () => showShiftRequestForm(day);
            calendarElement.appendChild(dayElement);
        }

        // Load existing shift requests from the server
        try {
            const response = await fetch('http://localhost:3000/shift-requests');
            const shiftRequests = await response.json();
            shiftRequests.forEach(request => {
                if (request.day <= daysInMonth) {
                    const dayElement = calendarElement.children[request.day - 1];
                    displayShiftRequest(dayElement, request);
                }
            });
        } catch (error) {
            console.error('Error loading shift requests:', error);
        }
    }
}

function showShiftRequestForm(day) {
    const originalShift = prompt("Enter your original shift:");
    const requestedShift = prompt("Enter your requested shift:");

    if (originalShift && requestedShift) {
        requestShift(day, originalShift, requestedShift);
    }
}

async function requestShift(day, originalShift, requestedShift) {
    const user = JSON.parse(localStorage.getItem('current_user'));
    const shiftRequest = { username: user.username, whatsapp: user.whatsapp, day, originalShift, requestedShift };

    try {
        const response = await fetch('http://localhost:3000/shift-request', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(shiftRequest)
        });

        if (response.ok) {
            console.log('Shift request submitted:', shiftRequest);
            // Add to calendar UI
            const dayElement = calendarElement.children[day - 1];
            displayShiftRequest(dayElement, shiftRequest);
        } else {
            console.error('Failed to submit shift request:', response.statusText);
        }
    } catch (error) {
        console.error('Error submitting shift request:', error);
    }
}

function displayShiftRequest(dayElement, shiftRequest) {
    const shiftInfo = document.createElement('div');
    shiftInfo.classList.add('shift-request');

    // Generate a random color for the shift request
    const randomColor = getRandomColor();
    shiftInfo.style.backgroundColor = randomColor;

    shiftInfo.innerHTML = `
        <div><strong>User:</strong> ${shiftRequest.username}</div>
        <div class="shift-info"><strong>Original Shift:</strong> ${shiftRequest.originalShift}</div>
        <div class="shift-info"><strong>Requested Shift:</strong> ${shiftRequest.requestedShift}</div>
    `;

    // Add delete button if the current user is the owner of the request
    const currentUser = JSON.parse(localStorage.getItem('current_user'));
    if (currentUser.username === shiftRequest.username) {
        const deleteButton = document.createElement('button');
        deleteButton.classList.add('delete-button');
        deleteButton.textContent = 'Delete';
        deleteButton.onclick = (event) => {
            event.stopPropagation(); // Prevent click event from bubbling up to the day element
            confirmDelete(shiftRequest);
        };
        shiftInfo.appendChild(deleteButton);
    }

    shiftInfo.onclick = () => {
        contactUser(shiftRequest);
    };

    dayElement.appendChild(shiftInfo);
}

function getRandomColor() {
    // Generate random values for red, green, and blue components
    const red = Math.floor(Math.random() * 56) + 200; // 200 to 255
    const green = Math.floor(Math.random() * 56) + 200; // 200 to 255
    const blue = Math.floor(Math.random() * 56) + 200; // 200 to 255
    // Construct the color in RGB format
    return `rgb(${red}, ${green}, ${blue})`;
}





function contactUser(shiftRequest) {
    const currentUser = JSON.parse(localStorage.getItem('current_user'));
    if (currentUser.username !== shiftRequest.username) {
        const message = `Hi, I'm interested in your shift request for day ${shiftRequest.day}. Original shift: ${shiftRequest.originalShift}, Requested shift: ${shiftRequest.requestedShift}.`;
        const whatsappUrl = `https://wa.me/${shiftRequest.whatsapp}?text=${encodeURIComponent(message)}`;
        window.location.href = whatsappUrl;
    }
}

function confirmDelete(shiftRequest) {
    if (confirm("Are you sure you want to delete this shift request?")) {
        deleteShiftRequest(shiftRequest);
    }
}



async function deleteShiftRequest(shiftRequest) {
    try {
        const response = await fetch('http://localhost:3000/shift-request', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(shiftRequest)
        });

        if (response.ok) {
            console.log('Shift request deleted:', shiftRequest);
            // Remove from calendar UI
            const dayElement = calendarElement.children[shiftRequest.day - 1];
            removeShiftRequest(dayElement);
        } else {
            console.error('Failed to delete shift request:', response.statusText);
        }
    } catch (error) {
        console.error('Error deleting shift request:', error);
    }
}

function removeShiftRequest(dayElement) {
    const shiftInfo = dayElement.querySelector('.shift-request');
    dayElement.removeChild(shiftInfo);
}

function showShiftRequestForm(day) {
    const originalShift = prompt("Enter your original shift:");
    const requestedShift = prompt("Enter your requested shift:");

    if (originalShift !== null && requestedShift !== null) {
        requestShift(day, originalShift, requestedShift);
    }
}

function contactUser(shiftRequest) {
    const currentUser = JSON.parse(localStorage.getItem('current_user'));
    if (currentUser.username !== shiftRequest.username) {
        const offeredShift = prompt("What shift can you offer?");
        if (offeredShift !== null) {
            const message = `Hi, this is ${currentUser.username}, I'm interested in your shift request for day ${shiftRequest.day}. Original shift: ${shiftRequest.originalShift}, Requested shift: ${shiftRequest.requestedShift}. I can offer: ${offeredShift}`;
            const whatsappUrl = `https://wa.me/${shiftRequest.whatsapp}?text=${encodeURIComponent(message)}`;
            window.location.href = whatsappUrl;
        }
    }
}
function promptOfferedShift(day) {
    const offeredShift = prompt("What shift can you offer?");
    if (offeredShift !== null) {
        showShiftRequestForm(day, offeredShift);
    }
}

function showShiftRequestForm(day, offeredShift) {
    const originalShift = prompt("Enter your original shift:");
    const requestedShift = prompt("Enter your requested shift:");

    if (originalShift && requestedShift) {
        requestShift(day, originalShift, requestedShift, offeredShift);
    }
}

// Modify the click event handler for the calendar to prompt for the offered shift first
for (let day = 1; day <= daysInMonth; day++) {
    const dayElement = document.createElement('div');
    dayElement.classList.add('day');
    dayElement.textContent = day;
    dayElement.onclick = () => promptOfferedShift(day);
    calendarElement.appendChild(dayElement);
}
