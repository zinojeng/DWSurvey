// Global variables
const socket = io();
let currentPollId = null;
let sessionId = localStorage.getItem('sessionId') || generateSessionId();

// Save session ID
localStorage.setItem('sessionId', sessionId);

// Generate unique session ID
function generateSessionId() {
    return 'sess_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadPolls();
});

// Load all active polls
async function loadPolls() {
    try {
        const response = await fetch('/api/polls');
        const polls = await response.json();
        displayPolls(polls);
    } catch (error) {
        console.error('Error loading polls:', error);
        document.getElementById('pollsContainer').innerHTML = 
            '<div class="error-message">Error loading polls. Please refresh the page.</div>';
    }
}

// Display polls list
function displayPolls(polls) {
    const container = document.getElementById('pollsContainer');
    
    if (polls.length === 0) {
        container.innerHTML = '<p>No active polls at the moment.</p>';
        return;
    }

    container.innerHTML = polls.map(poll => `
        <div class="poll-card" onclick="viewPoll(${poll.id})">
            <h3>${poll.title}</h3>
            <p>${poll.description || 'Click to participate'}</p>
            <div class="poll-meta">
                <span>Created: ${new Date(poll.created_at).toLocaleDateString()}</span>
                <span class="view-results" onclick="viewResults(${poll.id}, event)">View Results →</span>
            </div>
        </div>
    `).join('');
}

// View poll for voting
async function viewPoll(pollId) {
    currentPollId = pollId;
    
    try {
        // Check if already voted
        const voteCheckResponse = await fetch(`/api/votes/check/${pollId}/${sessionId}`);
        const voteCheck = await voteCheckResponse.json();
        
        if (voteCheck.hasVoted) {
            viewResults(pollId);
            return;
        }

        // Load poll details
        const response = await fetch(`/api/polls/${pollId}`);
        const poll = await response.json();
        
        displayPollVoting(poll);
        
        // Hide poll list, show poll view
        document.getElementById('pollList').style.display = 'none';
        document.getElementById('pollView').style.display = 'block';
        document.getElementById('resultsView').style.display = 'none';
        
    } catch (error) {
        console.error('Error loading poll:', error);
        alert('Error loading poll. Please try again.');
    }
}

// Display poll voting interface
function displayPollVoting(poll) {
    const content = document.getElementById('pollContent');
    
    content.innerHTML = `
        <h2>${poll.title}</h2>
        ${poll.description ? `<p>${poll.description}</p>` : ''}
        <form id="voteForm" onsubmit="submitVote(event)">
            ${poll.questions.map((question, qIndex) => `
                <div class="question-block">
                    <h3>${question.question_text}</h3>
                    <ul class="options-list">
                        ${question.options.map((option, oIndex) => `
                            <li class="option-item">
                                <label class="option-label">
                                    <input type="${question.question_type === 'multiple' ? 'checkbox' : 'radio'}" 
                                           name="question_${question.id}" 
                                           value="${option.id}"
                                           onchange="updateOptionStyle(this)">
                                    ${option.option_text}
                                </label>
                            </li>
                        `).join('')}
                    </ul>
                </div>
            `).join('')}
            <button type="submit" class="submit-btn">Submit Vote</button>
        </form>
    `;
}

// Update option style when selected
function updateOptionStyle(input) {
    const label = input.closest('.option-label');
    
    if (input.type === 'radio') {
        // For radio buttons, remove selected class from all options in the same question
        const questionBlock = input.closest('.question-block');
        questionBlock.querySelectorAll('.option-label').forEach(l => {
            l.classList.remove('selected');
        });
    }
    
    // Toggle selected class
    if (input.checked) {
        label.classList.add('selected');
    } else {
        label.classList.remove('selected');
    }
}

// Submit vote
async function submitVote(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    const optionIds = [];
    
    // Collect all selected options
    for (let [name, value] of formData.entries()) {
        optionIds.push(parseInt(value));
    }
    
    if (optionIds.length === 0) {
        alert('Please select at least one option');
        return;
    }
    
    // Disable submit button
    const submitBtn = form.querySelector('.submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';
    
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
        
        const result = await response.json();
        
        if (response.ok) {
            // Show success message and redirect to results
            showSuccessMessage();
            setTimeout(() => {
                viewResults(currentPollId);
            }, 1500);
        } else {
            throw new Error(result.error || 'Failed to submit vote');
        }
    } catch (error) {
        console.error('Error submitting vote:', error);
        alert('Error submitting vote: ' + error.message);
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Vote';
    }
}

// Show success message
function showSuccessMessage() {
    const content = document.getElementById('pollContent');
    content.innerHTML = '<div class="success-message">✓ Vote submitted successfully! Redirecting to results...</div>';
}

// View results
async function viewResults(pollId, event) {
    if (event) {
        event.stopPropagation();
    }
    
    currentPollId = pollId;
    
    // Join WebSocket room for real-time updates
    socket.emit('joinPoll', pollId);
    
    // Load initial results
    await loadResults(pollId);
    
    // Hide other views, show results
    document.getElementById('pollList').style.display = 'none';
    document.getElementById('pollView').style.display = 'none';
    document.getElementById('resultsView').style.display = 'block';
}

// Load and display results
async function loadResults(pollId) {
    try {
        const [resultsResponse, pollResponse] = await Promise.all([
            fetch(`/api/polls/${pollId}/results`),
            fetch(`/api/polls/${pollId}`)
        ]);
        
        const results = await resultsResponse.json();
        const poll = await pollResponse.json();
        
        displayResults(results, poll);
    } catch (error) {
        console.error('Error loading results:', error);
        document.getElementById('resultsContent').innerHTML = 
            '<div class="error-message">Error loading results. Please try again.</div>';
    }
}

// Display results
function displayResults(results, pollInfo = null) {
    const content = document.getElementById('resultsContent');
    
    let statusBanner = '';
    if (pollInfo) {
        if (pollInfo.closed) {
            statusBanner = '<div class="poll-status final">🔒 Voting Closed - Final Results</div>';
        } else {
            statusBanner = '<div class="poll-status live">🔴 Live Results - Voting in Progress</div>';
        }
    }
    
    content.innerHTML = statusBanner + results.map(question => {
        const totalVotes = question.options.reduce((sum, opt) => sum + opt.vote_count, 0);
        
        return `
            <div class="result-question">
                <h3>${question.question_text}</h3>
                <div class="total-votes">Total votes: ${totalVotes}</div>
                ${question.options.map(option => {
                    const percentage = totalVotes > 0 
                        ? Math.round((option.vote_count / totalVotes) * 100) 
                        : 0;
                    
                    return `
                        <div class="result-option">
                            <div class="result-header">
                                <span>${option.option_text}</span>
                                <span>${option.vote_count} votes (${percentage}%)</span>
                            </div>
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${percentage}%">
                                    ${percentage > 10 ? percentage + '%' : ''}
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }).join('');
}

// Show poll list
function showPollList() {
    // Leave WebSocket room if in results view
    if (currentPollId) {
        socket.emit('leavePoll', currentPollId);
        currentPollId = null;
    }
    
    document.getElementById('pollList').style.display = 'block';
    document.getElementById('pollView').style.display = 'none';
    document.getElementById('resultsView').style.display = 'none';
    
    // Reload polls
    loadPolls();
}

// WebSocket event listeners
socket.on('voteUpdate', (data) => {
    if (data.pollId === currentPollId && document.getElementById('resultsView').style.display === 'block') {
        loadResults(currentPollId);
    }
});

socket.on('resultsUpdate', (results) => {
    if (document.getElementById('resultsView').style.display === 'block') {
        displayResults(results);
    }
});