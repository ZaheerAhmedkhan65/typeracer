document.addEventListener('DOMContentLoaded', () => {
    const socket = io();

    const targetTextElement = document.getElementById('target-text');
    const typingInput = document.getElementById('typing-input');
    const startButton = document.getElementById('start-button');
    const raceTrack = document.getElementById('race-track');
    const result = document.getElementById('result');
    const carSelection = document.getElementById('car-selection'); // Div container for car options
    const mainContent = document.querySelector('.main-content');
    let targetText = "Typing is fun! Let's race to complete this text.";

    let playerCars = {};
    let selectedCar = null;
    const userName = window.userName;
    const userId = window.userId;
    let players = {};
    console.log("username: ", userName);
    console.log("userId: ", userId);
    let totalDistance = 0;

    // Sample car options
    const carOptions = [
        { car: 'car1', image: '/images/car1.png' },
        { car: 'car2', image: '/images/car2.png' }
    ];

    // Display car options for selection
    carSelection.innerHTML = carOptions.map(option => `
        <div class="car-option" data-car="${option.car}">
            <img src="${option.image}" alt="${option.car}" class="car-image">
        </div>
    `).join('');

    function updateTotalDistance() {
        const containerWidth = raceTrack.offsetWidth;
        const sampleCar = document.querySelector('.car-option img');
        const carWidth = sampleCar ? sampleCar.offsetWidth : 0;
        console.log("containerWidth: ", containerWidth, "carWidth: ", carWidth);
        totalDistance = containerWidth - carWidth; // Ensure the car stays within bounds
        console.log("totalDistance: ", totalDistance);
    }

    window.addEventListener('resize', updateTotalDistance);

    const renderTargetText = (typedLength) => {
        targetTextElement.innerHTML = targetText.split("")
            .map((char, index) => {
                if (index < typedLength) {
                    return `<span class="matched">${char}</span>`;
                } else if (index === typedLength) {
                    return `<span class="unmatched cursor">${char}</span>`;
                } else {
                    return `<span class="unmatched">${char}</span>`;
                }
            }).join("");
    };
    renderTargetText(0);

    // Add click event listeners to car options
    const carOptionElements = document.querySelectorAll('.car-option');
    carOptionElements.forEach(option => {
        option.addEventListener('click', () => {
            // Remove 'selected' class from all options
            carOptionElements.forEach(car => car.classList.remove('selected'));

            // Add 'selected' class to the clicked option
            option.classList.add('selected');

            // Update selected car
            selectedCar = option.dataset.car;

            // Notify server about the selected car
            socket.emit('select-car', selectedCar);

            // Display start button
            startButton.style.display = "block";
            startButton.disabled = false;
        });
    });

    // Handle game start
    startButton.addEventListener('click', () => {
        carSelection.style.display = "none";
        startButton.style.display = "none";
        mainContent.style.display = "block";
        updateTotalDistance();
        socket.emit('start-game');
        startGame();
    });

    socket.on('start-game', () => {
        startGame();
        startButton.disabled = true;
    });

    function startGame() {
        typingInput.disabled = false;
        typingInput.value = "";
        typingInput.focus();
        result.textContent = "";
        players[userId] = userName;
    }

    // Handle typing input
    typingInput.addEventListener('input', () => {
        const typedText = typingInput.value;
        let correctChars = 0;
        let incorrectChars = 0;
        let progress = 0;

        const targetTextSpans = targetTextElement.querySelectorAll("span");
       
        for (let i = 0; i < targetText.length; i++) {
            const char = targetText[i];
            if (i < typedText.length) {
                if (typedText[i] === char) {
                    targetTextSpans[i].className = "matched";
                    correctChars++;
                    if (targetText === typedText) {
                        console.log("players: ", players);
                        socket.emit('game-won', { winnerId: userId, players: players });
                    }
                } else {
                    targetTextSpans[i].className = "error";
                    incorrectChars++;
                }
            } else {
                targetTextSpans[i].className = "unmatched";
            }
            console.log("incorrect :" + incorrectChars);
            if (incorrectChars >= 5) {
                alert("Please type correct character.")
                return;
            }
        }

        // Update progress only if the typed text matches correctly
        if (correctChars === typedText.length) {
            progress = (typedText.length / targetText.length) * totalDistance;
            // Move the car based on the correct progress
            console.log(progress);
            socket.emit('update-progress', { progress });
        }
    });

    // Handle car selection broadcasted from server
    socket.on('car-selected', (data) => {
        const { playerId, carType } = data;

        if (!playerCars[playerId]) {
            const car = document.createElement('div');
            const carImage = document.createElement('img');
            const carUser = document.createElement('span');
            carUser.classList.add("carUser");
            // Append the image and username to the car
            carImage.src = `/images/${carType}.png`;
            if (playerId === socket.id) {
                carUser.textContent = `(You)`;
            } else {
                carUser.textContent = `${userName}`;
            }
            carImage.alt = `Car for player ${userName}`;
            carImage.style.width = '50px';
            car.appendChild(carImage);
            car.appendChild(carUser);

            // Style and position the car
            car.style.position = 'absolute';
            car.style.top = `${Object.keys(playerCars).length * 40}px`; // Position cars vertically
            car.style.left = '0px';
            car.style.width = 'fit-content';
            car.classList.add('d-flex', 'align-items-center', 'gap-1');
            raceTrack.appendChild(car);

            playerCars[playerId] = car;
        }
    });


    // Handle progress updates from server
    socket.on('update-progress', (data) => {
        const { id, progress } = data;

        const car = playerCars[id];
        if (car) {
            car.style.left = `${progress}px`;
        }
    });

    // Handle game-won event
    socket.on('game-won', (data) => {
        const { winnerId, players } = data;

        if (winnerId === socket.id || winnerId === userId) {
            document.querySelector('#result').textContent = "You won the game!";
        } else {
            document.querySelector('#result').textContent = `${userName} won the game!`;
        }

        // Disabled typing input after the game ends
        document.querySelector('#typing-input').disabled = true;
    });


    // Handle the list of all players to display their car selection
    socket.on('update-players', (players) => {
        console.log(players);
    });
});