// Mobile voting JavaScript
const socket = io();
let currentPollId = null;
let currentQuestionId = null;
let sessionId = localStorage.getItem('sessionId') || generateSessionId();

// Save session ID
localStorage.setItem('sessionId', sessionId);

// Generate unique session ID
function generateSessionId() {
    return 'sess_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;
    const pathParts = path.split('/').filter(p => p);
    
    if (pathParts[0] === 'mobile' && pathParts[1]) {
        currentPollId = pathParts[1];
        currentQuestionId = pathParts[2] || null;
        
        loadQuestion();
    } else {
        showError('Invalid URL');
    }
});

// Load question data
async function loadQuestion() {
    try {
        showLoading();
        
        // Check if poll is closed
        const pollResponse = await fetch(`/api/polls/${currentPollId}`);
        const poll = await pollResponse.json();
        
        if (poll.closed) {
            showPollClosed();
            return;
        }
        
        // Check if already voted
        const voteCheckResponse = await fetch(`/api/votes/check/${currentPollId}/${sessionId}`);
        const voteCheck = await voteCheckResponse.json();
        
        if (currentQuestionId) {
            // Check if already voted on this specific question
            const hasVotedOnQuestion = voteCheck.votes.some(v => v.question_id == currentQuestionId);
            if (hasVotedOnQuestion) {
                showAlreadyVoted();
                return;
            }
            
            // Load specific question
            const question = poll.questions.find(q => q.id == currentQuestionId);
            if (question) {
                displayQuestion(poll, question);
            } else {
                showError('Question not found');
            }
        } else {
            // Find first unanswered question
            const votedQuestionIds = voteCheck.votes.map(v => v.question_id);
            const unansweredQuestion = poll.questions.find(q => !votedQuestionIds.includes(q.id));
            
            if (unansweredQuestion) {
                currentQuestionId = unansweredQuestion.id;
                displayQuestion(poll, unansweredQuestion);
            } else {
                showAlreadyVoted();
            }
        }
        
    } catch (error) {
        console.error('Error loading question:', error);
        showError('Failed to load question');
    }
}

// Display question
function displayQuestion(poll, question) {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('questionView').style.display = 'block';
    
    // Set poll and question info
    document.getElementById('pollTitle').textContent = poll.title;
    document.getElementById('questionNumber').textContent = 
        `Question ${poll.questions.indexOf(question) + 1} of ${poll.questions.length}`;
    document.getElementById('questionText').textContent = question.question_text;
    
    // Display options
    const optionsList = document.getElementById('optionsList');
    optionsList.innerHTML = question.options.map(option => `
        <div class="option-item">
            <label class="option-label">
                <input type="${question.question_type === 'multiple' ? 'checkbox' : 'radio'}" 
                       name="option" 
                       value="${option.id}"
                       onchange="handleOptionSelect(this)">
                ${option.option_text}
            </label>
        </div>
    `).join('');
    
    // Set up submit button
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.onclick = submitVote;
    
    // Join WebSocket room for updates
    socket.emit('joinPoll', currentPollId);
}

// Handle option selection
function handleOptionSelect(input) {
    const label = input.closest('.option-label');
    
    if (input.type === 'radio') {
        // Remove selected class from all options
        document.querySelectorAll('.option-label').forEach(l => {
            l.classList.remove('selected');
        });
    }
    
    // Toggle selected class
    if (input.checked) {
        label.classList.add('selected');
    } else {
        label.classList.remove('selected');
    }
    
    // Enable/disable submit button
    const anyChecked = document.querySelector('input[name="option"]:checked');
    document.getElementById('submitBtn').disabled = !anyChecked;
}

// Submit vote
async function submitVote() {
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';
    
    // Get selected options
    const selectedInputs = document.querySelectorAll('input[name="option"]:checked');
    const optionIds = Array.from(selectedInputs).map(input => parseInt(input.value));
    
    try {
        const response = await fetch('/api/votes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                optionIds,
                sessionId
            })
        });
        
        if (response.ok) {
            showSuccess();
        } else {
            const error = await response.json();
            throw new Error(error.error || 'Failed to submit vote');
        }
    } catch (error) {
        console.error('Error submitting vote:', error);
        showError(error.message);
    }
}

// Show states
function showLoading() {
    hideAllStates();
    document.getElementById('loadingState').style.display = 'block';
}

function showSuccess() {
    hideAllStates();
    document.getElementById('successState').style.display = 'block';
}

function showAlreadyVoted() {
    hideAllStates();
    document.getElementById('alreadyVotedState').style.display = 'block';
}

function showPollClosed() {
    hideAllStates();
    document.getElementById('pollClosedState').style.display = 'block';
}

function showError(message) {
    hideAllStates();
    document.getElementById('errorState').style.display = 'block';
    document.getElementById('errorMessage').textContent = message;
}

function hideAllStates() {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('questionView').style.display = 'none';
    document.getElementById('successState').style.display = 'none';
    document.getElementById('alreadyVotedState').style.display = 'none';
    document.getElementById('pollClosedState').style.display = 'none';
    document.getElementById('errorState').style.display = 'none';
}

// View results
function viewResults() {
    window.location.href = `/?poll=${currentPollId}&results=true`;
}

// Handle WebSocket updates
socket.on('pollClosed', (data) => {
    if (data.pollId === currentPollId) {
        showPollClosed();
    }
});