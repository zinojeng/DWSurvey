// Admin panel JavaScript
let adminPassword = '';
let questionCounter = 0;

// Admin login
async function adminLogin(event) {
    event.preventDefault();
    
    adminPassword = document.getElementById('adminPassword').value;
    
    // Test authentication by trying to fetch admin polls
    try {
        const response = await fetch('/api/admin/polls/list', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ password: adminPassword })
        });
        
        if (response.ok) {
            document.getElementById('loginForm').style.display = 'none';
            document.getElementById('adminDashboard').style.display = 'block';
            loadAdminPolls();
        } else {
            alert('Invalid password');
        }
    } catch (error) {
        alert('Login failed: ' + error.message);
    }
}

// Load admin polls
async function loadAdminPolls() {
    try {
        const response = await fetch('/api/admin/polls/list', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ password: adminPassword })
        });
        
        if (response.ok) {
            const polls = await response.json();
            displayAdminPolls(polls);
        } else {
            throw new Error('Failed to load polls');
        }
    } catch (error) {
        console.error('Error loading polls:', error);
        document.getElementById('adminPollsContainer').innerHTML = 
            '<div class="error-message">Error loading polls</div>';
    }
}

// Display admin polls
function displayAdminPolls(polls) {
    const container = document.getElementById('adminPollsContainer');
    
    if (polls.length === 0) {
        container.innerHTML = '<p>No polls created yet.</p>';
        return;
    }
    
    container.innerHTML = polls.map(poll => `
        <div class="admin-poll-card">
            <div class="poll-info">
                <h4>${poll.title}</h4>
                <div class="poll-stats">
                    Status: ${poll.active ? (poll.closed ? 'Closed' : 'Active') : 'Inactive'} | 
                    Participants: ${poll.participant_count || 0} | 
                    Created: ${new Date(poll.created_at).toLocaleDateString()}
                </div>
            </div>
            <div class="poll-actions">
                <button class="view-btn" onclick="window.open('/?poll=${poll.id}', '_blank')">View</button>
                <button class="qr-btn" onclick="showQRCodes(${poll.id}, '${poll.title}')">QR Codes</button>
                <button class="edit-btn" onclick="editPoll(${poll.id})">Edit</button>
                <button class="toggle-btn ${poll.active ? '' : 'inactive'}" 
                        onclick="togglePollStatus(${poll.id}, ${!poll.active})">
                    ${poll.active ? 'Deactivate' : 'Activate'}
                </button>
                ${poll.active && !poll.closed ? 
                    `<button class="delete-btn" onclick="closePoll(${poll.id})">Close Voting</button>` : 
                    `<button class="delete-btn" onclick="deletePoll(${poll.id})">Delete</button>`
                }
            </div>
        </div>
    `).join('');
}

// Show create form
function showCreateForm() {
    document.getElementById('createPollForm').style.display = 'block';
    questionCounter = 0;
    document.getElementById('questionsContainer').innerHTML = '<h4>Questions</h4>';
    addQuestion(); // Add first question by default
}

// Cancel create
function cancelCreate() {
    document.getElementById('createPollForm').style.display = 'none';
    document.getElementById('pollTitle').value = '';
    document.getElementById('pollDescription').value = '';
}

// Add question
function addQuestion() {
    questionCounter++;
    const questionsContainer = document.getElementById('questionsContainer');
    
    const questionDiv = document.createElement('div');
    questionDiv.className = 'question-item';
    questionDiv.id = `question_${questionCounter}`;
    
    questionDiv.innerHTML = `
        <button class="remove-question" onclick="removeQuestion(${questionCounter})">×</button>
        <div class="question-header">
            <input type="text" id="questionText_${questionCounter}" 
                   placeholder="Enter question" required>
            <select id="questionType_${questionCounter}">
                <option value="single">Single Choice</option>
                <option value="multiple">Multiple Choice</option>
            </select>
        </div>
        <div class="options-container" id="optionsContainer_${questionCounter}">
            <h5>Options</h5>
        </div>
        <button type="button" class="add-btn" onclick="addOption(${questionCounter})">+ Add Option</button>
    `;
    
    questionsContainer.appendChild(questionDiv);
    
    // Add two default options
    addOption(questionCounter);
    addOption(questionCounter);
}

// Remove question
function removeQuestion(questionId) {
    const questionDiv = document.getElementById(`question_${questionId}`);
    questionDiv.remove();
}

// Add option
function addOption(questionId) {
    const optionsContainer = document.getElementById(`optionsContainer_${questionId}`);
    const optionCount = optionsContainer.querySelectorAll('.option-item').length + 1;
    
    const optionDiv = document.createElement('div');
    optionDiv.className = 'option-item';
    
    optionDiv.innerHTML = `
        <input type="text" placeholder="Option ${optionCount}" required>
        <button type="button" class="remove-option" onclick="removeOption(this)">×</button>
    `;
    
    optionsContainer.appendChild(optionDiv);
}

// Remove option
function removeOption(button) {
    button.parentElement.remove();
}

// Create poll
async function createPoll(event) {
    event.preventDefault();
    
    const title = document.getElementById('pollTitle').value;
    const description = document.getElementById('pollDescription').value;
    
    // Collect questions
    const questions = [];
    const questionItems = document.querySelectorAll('.question-item');
    
    questionItems.forEach((item, index) => {
        const questionId = item.id.split('_')[1];
        const questionText = document.getElementById(`questionText_${questionId}`).value;
        const questionType = document.getElementById(`questionType_${questionId}`).value;
        
        // Collect options
        const options = [];
        const optionInputs = item.querySelectorAll('.option-item input');
        optionInputs.forEach(input => {
            if (input.value.trim()) {
                options.push(input.value.trim());
            }
        });
        
        if (questionText && options.length >= 2) {
            questions.push({
                text: questionText,
                type: questionType,
                options: options
            });
        }
    });
    
    if (questions.length === 0) {
        alert('Please add at least one question with options');
        return;
    }
    
    try {
        const response = await fetch('/api/admin/polls', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                password: adminPassword,
                title,
                description,
                questions
            })
        });
        
        if (response.ok) {
            alert('Poll created successfully!');
            cancelCreate();
            loadAdminPolls();
        } else {
            const error = await response.json();
            throw new Error(error.error || 'Failed to create poll');
        }
    } catch (error) {
        alert('Error creating poll: ' + error.message);
    }
}

// Toggle poll status
async function togglePollStatus(pollId, active) {
    try {
        const response = await fetch(`/api/admin/polls/${pollId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                password: adminPassword,
                active
            })
        });
        
        if (response.ok) {
            loadAdminPolls();
        } else {
            throw new Error('Failed to update poll status');
        }
    } catch (error) {
        alert('Error updating poll: ' + error.message);
    }
}

// Delete poll
async function deletePoll(pollId) {
    if (!confirm('Are you sure you want to delete this poll? This action cannot be undone.')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/admin/polls/${pollId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                password: adminPassword
            })
        });
        
        if (response.ok) {
            loadAdminPolls();
        } else {
            throw new Error('Failed to delete poll');
        }
    } catch (error) {
        alert('Error deleting poll: ' + error.message);
    }
}

// Show QR codes for a poll
async function showQRCodes(pollId, pollTitle) {
    try {
        const response = await fetch(`/api/qr/poll/${pollId}/questions`);
        if (!response.ok) {
            throw new Error('Failed to generate QR codes');
        }
        
        const qrCodes = await response.json();
        
        // Create modal
        const modal = document.createElement('div');
        modal.className = 'qr-modal';
        modal.innerHTML = `
            <div class="qr-modal-content">
                <button class="qr-modal-close" onclick="closeQRModal()">&times;</button>
                <h3>QR Codes for "${pollTitle}"</h3>
                <p>Participants can scan these codes to vote on each question</p>
                <button class="print-qr-btn" onclick="printQRCodes(${pollId})">Print All QR Codes</button>
                <div class="qr-grid">
                    ${qrCodes.map((qr, index) => `
                        <div class="qr-item">
                            <h4>Question ${index + 1}</h4>
                            <p>${qr.questionText}</p>
                            <img src="${qr.qrCode}" alt="QR Code">
                            <div class="qr-url">${qr.url}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        modal.id = 'qrModal';
        
        // Close on click outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeQRModal();
            }
        });
        
    } catch (error) {
        alert('Error generating QR codes: ' + error.message);
    }
}

// Close QR modal
function closeQRModal() {
    const modal = document.getElementById('qrModal');
    if (modal) {
        modal.remove();
    }
}

// Print QR codes
function printQRCodes(pollId) {
    window.open(`/api/qr/poll/${pollId}/print`, '_blank');
}

// Edit poll
async function editPoll(pollId) {
    try {
        // Get poll data
        const response = await fetch(`/api/admin/polls/${pollId}/edit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                password: adminPassword
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to load poll');
        }
        
        const poll = await response.json();
        showEditForm(poll);
    } catch (error) {
        alert('Error loading poll: ' + error.message);
    }
}

// Show edit form
function showEditForm(poll) {
    // Hide other forms
    document.getElementById('createPollForm').style.display = 'none';
    
    // Create edit form if doesn't exist
    let editForm = document.getElementById('editPollForm');
    if (!editForm) {
        editForm = document.createElement('div');
        editForm.id = 'editPollForm';
        editForm.className = 'admin-form';
        // Insert after the dashboard header or create form
        const dashboard = document.getElementById('adminDashboard');
        const createForm = document.getElementById('createPollForm');
        if (createForm) {
            createForm.after(editForm);
        } else {
            dashboard.appendChild(editForm);
        }
    }
    
    editForm.innerHTML = `
        <h3>Edit Poll</h3>
        <form onsubmit="updatePoll(event, ${poll.id})">
            <div class="form-group">
                <label>Poll Title</label>
                <input type="text" id="editPollTitle" value="${poll.title}" required>
            </div>
            <div class="form-group">
                <label>Description (optional)</label>
                <textarea id="editPollDescription" rows="3">${poll.description || ''}</textarea>
            </div>
            
            <div id="editQuestionsContainer">
                <h4>Questions</h4>
                ${poll.questions.map((q, qIndex) => `
                    <div class="question-block" data-question-id="${q.id}">
                        <div class="question-header">
                            <span>Question ${qIndex + 1}</span>
                            <button type="button" class="delete-btn" onclick="deleteQuestion(${q.id})">Delete Question</button>
                        </div>
                        <input type="text" value="${q.question_text}" 
                               onchange="updateQuestion(${q.id}, this.value)" 
                               class="question-input" required>
                        <div class="options-container">
                            ${q.options.map((opt, optIndex) => `
                                <div class="option-item" data-option-id="${opt.id}">
                                    <input type="text" value="${opt.option_text}" 
                                           onchange="updateOption(${opt.id}, this.value)" 
                                           class="option-input" required>
                                    <button type="button" class="delete-option-btn" 
                                            onclick="deleteOption(${opt.id})">×</button>
                                </div>
                            `).join('')}
                            <button type="button" class="add-option-btn" 
                                    onclick="addOption(${q.id})">+ Add Option</button>
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <button type="button" class="add-question-btn" onclick="addQuestion(${poll.id})">+ Add Question</button>
            
            <div class="form-actions">
                <button type="submit" class="submit-btn">Save Changes</button>
                <button type="button" class="cancel-btn" onclick="hideEditForm()">Cancel</button>
            </div>
        </form>
    `;
    
    editForm.style.display = 'block';
    editForm.scrollIntoView({ behavior: 'smooth' });
}

// Hide edit form
function hideEditForm() {
    const editForm = document.getElementById('editPollForm');
    if (editForm) {
        editForm.style.display = 'none';
    }
}

// Update poll details
async function updatePoll(event, pollId) {
    event.preventDefault();
    
    try {
        const response = await fetch(`/api/admin/polls/${pollId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                password: adminPassword,
                title: document.getElementById('editPollTitle').value,
                description: document.getElementById('editPollDescription').value
            })
        });
        
        if (response.ok) {
            alert('Poll updated successfully');
            hideEditForm();
            loadAdminPolls();
        } else {
            throw new Error('Failed to update poll');
        }
    } catch (error) {
        alert('Error updating poll: ' + error.message);
    }
}

// Update question
async function updateQuestion(questionId, text) {
    try {
        const response = await fetch(`/api/admin/questions/${questionId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                password: adminPassword,
                question_text: text
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to update question');
        }
    } catch (error) {
        alert('Error updating question: ' + error.message);
    }
}

// Update option
async function updateOption(optionId, text) {
    try {
        const response = await fetch(`/api/admin/options/${optionId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                password: adminPassword,
                option_text: text
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to update option');
        }
    } catch (error) {
        alert('Error updating option: ' + error.message);
    }
}

// Add new question
async function addQuestion(pollId) {
    const questionText = prompt('Enter question text:');
    if (!questionText) return;
    
    try {
        const response = await fetch(`/api/admin/polls/${pollId}/questions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                password: adminPassword,
                question_text: questionText,
                question_type: 'single',
                options: ['Option 1', 'Option 2']
            })
        });
        
        if (response.ok) {
            editPoll(pollId); // Reload edit form
        } else {
            throw new Error('Failed to add question');
        }
    } catch (error) {
        alert('Error adding question: ' + error.message);
    }
}

// Add new option
async function addOption(questionId) {
    const optionText = prompt('Enter option text:');
    if (!optionText) return;
    
    try {
        const response = await fetch(`/api/admin/questions/${questionId}/options`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                password: adminPassword,
                option_text: optionText
            })
        });
        
        if (response.ok) {
            // Find poll ID and reload edit form
            const questionElement = document.querySelector('[data-question-id="' + questionId + '"]');
            if (questionElement) {
                const form = questionElement.closest('form');
                if (form) {
                    const onsubmit = form.getAttribute('onsubmit');
                    const pollId = onsubmit.match(/\d+/)[0];
                    editPoll(pollId);
                }
            }
        } else {
            throw new Error('Failed to add option');
        }
    } catch (error) {
        alert('Error adding option: ' + error.message);
    }
}

// Delete question
async function deleteQuestion(questionId) {
    if (!confirm('Delete this question? This cannot be undone.')) return;
    
    try {
        const response = await fetch(`/api/admin/questions/${questionId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                password: adminPassword
            })
        });
        
        if (response.ok) {
            // Find poll ID and reload edit form
            const questionElement = document.querySelector('[data-question-id="' + questionId + '"]');
            if (questionElement) {
                const form = questionElement.closest('form');
                if (form) {
                    const onsubmit = form.getAttribute('onsubmit');
                    const pollId = onsubmit.match(/\d+/)[0];
                    editPoll(pollId);
                }
            }
        } else {
            throw new Error('Failed to delete question');
        }
    } catch (error) {
        alert('Error deleting question: ' + error.message);
    }
}

// Delete option
async function deleteOption(optionId) {
    if (!confirm('Delete this option?')) return;
    
    try {
        const response = await fetch(`/api/admin/options/${optionId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                password: adminPassword
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            if (error.voteCount) {
                alert(`Cannot delete: This option has ${error.voteCount} votes.`);
                return;
            }
            throw new Error('Failed to delete option');
        }
        
        // Find poll ID and reload edit form
        const optionElement = document.querySelector('[data-option-id="' + optionId + '"]');
        if (optionElement) {
            const form = optionElement.closest('form');
            if (form) {
                const onsubmit = form.getAttribute('onsubmit');
                const pollId = onsubmit.match(/\d+/)[0];
                editPoll(pollId);
            }
        }
    } catch (error) {
        alert('Error deleting option: ' + error.message);
    }
}

// Close poll voting
async function closePoll(pollId) {
    if (!confirm('Are you sure you want to close voting for this poll? This action cannot be undone.')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/admin/polls/${pollId}/close`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                password: adminPassword
            })
        });
        
        if (response.ok) {
            loadAdminPolls();
        } else {
            throw new Error('Failed to close poll');
        }
    } catch (error) {
        alert('Error closing poll: ' + error.message);
    }
}