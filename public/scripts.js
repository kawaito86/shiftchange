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

        // Calculate current roster period
        const today = new Date();
        let startDate = new Date(today);
        startDate.setDate(today.getDate() - today.getDay() + 1); // Start of current week (Monday)
        const dayOfRoster = startDate.getDate();
        if (dayOfRoster % 14 >= 7) {
            startDate.setDate(startDate.getDate() + 7); // Move to start of next roster period
        }
        
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 13); // End of 14-day period

        calendarElement.innerHTML = ''; // Clear previous calendar

        for (let day = new Date(startDate); day <= endDate; day.setDate(day.getDate() + 1)) {
            const dayElement = document.createElement('div');
            dayElement.classList.add('day');
            dayElement.textContent = day.getDate();
            dayElement.dataset.date = day.toISOString().split('T')[0]; // Store full date for reference
            dayElement.onclick = () => showShiftRequestForm(dayElement);
            calendarElement.appendChild(dayElement);
        }

        // Load existing shift requests from the server
        try {
            const response = await fetch('http://localhost:3000/shift-requests');
            const shiftRequests = await response.json();
            shiftRequests.forEach(request => {
                const requestDate = new Date(request.date);
                if (requestDate >= startDate && requestDate <= endDate) {
                    const dayElement = calendarElement.querySelector(`[data-date='${request.date}']`);
                    if(dayElement) {
                        displayShiftRequest(dayElement, request);
                    } else {
                        console.error(`Day element for date ${request.date} not found.`);
                    }
                }
            });
        } catch (error) {
            console.error('Error loading shift requests:', error);
        }
    }
}

function showShiftRequestForm(dayElement) {
    const originalShift = prompt("Enter your original shift:");
    const requestedShift = prompt("Enter your requested shift:");

    if (originalShift && requestedShift) {
        requestShift(dayElement.dataset.date, originalShift, requestedShift);
    }
}

async function requestShift(date, originalShift, requestedShift) {
    const user = JSON.parse(localStorage.getItem('current_user'));
    const shiftRequest = { username: user.username, whatsapp: user.whatsapp, date, originalShift, requestedShift };

    try {
        const response = await fetch('http://localhost:3000/shift-request', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(shiftRequest)
        });

        if (response.ok) {
            console.log('Shift request submitted:', shiftRequest);
            // Add to calendar UI
            const dayElement = calendarElement.querySelector(`[data-date='${date}']`);
            displayShiftRequest(dayElement, shiftRequest);
        } else {
            console.error('Failed to submit shift request:', response.statusText);
        }
    } catch (error) {
        console.error('Error submitting shift request:', error);
    }
}

function displayShiftRequest(dayElement, shiftRequest) {
    // Check if the dayElement is null
    if (!dayElement) {
        console.error("dayElement is null");
        return;
    }

    const currentUser = JSON.parse(localStorage.getItem('current_user'));
    const shiftInfo = document.createElement('div');
    shiftInfo.classList.add('shift-request');
    shiftInfo.innerHTML = `
        <div><strong>User:</strong> ${shiftRequest.username}</div>
        <div class="shift-info"><strong>Original Shift:</strong> ${shiftRequest.originalShift}</div>
        <div class="shift-info"><strong>Requested Shift:</strong> ${shiftRequest.requestedShift}</div>
    `;
    shiftInfo.onclick = (e) => {
        e.stopPropagation();
        contactUser(shiftRequest);
    };

    // Generate a random color
    const randomColor = `#${Math.floor(Math.random()*16777215).toString(16)}`;
    shiftInfo.style.backgroundColor = randomColor;

    // Add delete button if the request belongs to the current user
    if (currentUser && shiftRequest.username === currentUser.username) {
        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete';
        deleteButton.onclick = () => deleteShiftRequest(shiftRequest.date, shiftRequest.username, shiftRequest.originalShift, shiftRequest.requestedShift);
        shiftInfo.appendChild(deleteButton);
    }

    dayElement.appendChild(shiftInfo);
}



function contactUser(shiftRequest) {
    const currentUser = JSON.parse(localStorage.getItem('current_user'));
    if (currentUser.username !== shiftRequest.username) {
        const offerShift = prompt("What shift can you offer?");
        if (offerShift) {
            const message = `Hi, I'm interested in your shift request for ${shiftRequest.date}. Original shift: ${shiftRequest.originalShift}, Requested shift: ${shiftRequest.requestedShift}. I can offer: ${offerShift}.`;
            const whatsappUrl = `https://wa.me/${shiftRequest.whatsapp}?text=${encodeURIComponent(message)}`;
            window.location.href = whatsappUrl;
        }
    }
}
async function deleteShiftRequest(date, username, originalShift, requestedShift) {
    const currentUser = JSON.parse(localStorage.getItem('current_user'));
    if (currentUser.username === username) {
        const response = confirm("Are you sure you want to delete your shift request for " + date + "?");

        if (response) {
            try {
                const deleteResponse = await fetch('http://localhost:3000/shift-request', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, date, originalShift, requestedShift })
                });

                if (deleteResponse.ok) {
                    console.log('Shift request deleted for date ' + date);
                    // Remove from calendar UI
                    const dayElement = calendarElement.querySelector(`[data-date='${date}']`);
                    removeShiftRequest(dayElement, { username, originalShift, requestedShift });
                } else {
                    console.error('Failed to delete shift request:', deleteResponse.statusText);
                }
            } catch (error) {
                console.error('Error deleting shift request:', error);
            }
        }
    }
}

function removeShiftRequest(dayElement, shiftRequest) {
    const shiftInfo = Array.from(dayElement.querySelectorAll('.shift-request')).find(element => {
        return element.querySelector('.shift-info').textContent.includes(shiftRequest.originalShift) &&
               element.querySelector('.shift-info').textContent.includes(shiftRequest.requestedShift);
    });
    if (shiftInfo) {
        dayElement.removeChild(shiftInfo);
    }
}

// Initialize the calendar if already logged in
if (localStorage.getItem('current_user')) {
    loadCalendar();
}
