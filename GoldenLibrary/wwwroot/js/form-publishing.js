/**
 * Form Publishing and Validation Module
 * Contains functionality for post creation, tag validation, and form management
 */

// Publish button handler - enhanced with better validation
function initializePublishButton() {
    const publishBtn = document.getElementById('publishBtn');
    if (publishBtn) {
        publishBtn.addEventListener('click', function(e) {
            e.preventDefault();
            updateFormFields();
            
            // Validate tag selection and show appropriate UI feedback
            if (!validateTagSelection()) {
                // Scroll to tag selection area with a highlight effect
                document.querySelector('.tag-selection-area').scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center' 
                });
                
                // Add a temporary highlight effect to draw attention
                const tagCloud = document.querySelector('.tag-cloud');
                tagCloud.style.transition = 'background-color 0.3s ease';
                tagCloud.style.backgroundColor = 'rgba(220, 53, 69, 0.1)';
                
                setTimeout(() => {
                    tagCloud.style.backgroundColor = '';
                }, 1000);
                
                return;
            }
            
            document.getElementById('formAction').value = 'publish';
            
            // Submit the form
            const form = document.getElementById('storyForm');
            
            // Get final list of selected tags
            const selectedTagIds = getSelectedTagIds();
            
            // Ensure hidden tags input is updated with latest selections
            document.getElementById('Tags').value = selectedTagIds.join(',');
            
            // Create hidden inputs for each selected tag
            selectedTagIds.forEach(tagId => {
                // First check if this hidden input already exists to avoid duplicates
                const existingInput = form.querySelector(`input[name="tagIds"][value="${tagId}"]`);
                if (!existingInput || existingInput.checked === undefined) {
                    // Remove any old hidden input for this tag that might be unchecked now
                    const oldInput = form.querySelector(`input[type="hidden"][name="tagIds"][value="${tagId}"]`);
                    if (oldInput) {
                        oldInput.remove();
                    }
                    
                    // Create a new hidden input
                    const hiddenInput = document.createElement('input');
                    hiddenInput.type = 'hidden';
                    hiddenInput.name = 'tagIds';
                    hiddenInput.value = tagId;
                    form.appendChild(hiddenInput);
                }
            });
            
            // Mark draft as published BEFORE submitting
            if (typeof localStorageDraft !== 'undefined') {
                localStorageDraft.markAsPublished();
            }
            
            // Set up a success flag to clear localStorage after submission
            const publishedPostId = document.getElementById('postId').value;
            
            // Add event listener for successful form submission
            form.addEventListener('submit', function() {
                // Clear ALL drafts when publishing is successful
                setTimeout(() => {
                    if (typeof localStorageDraft !== 'undefined') {
                        localStorageDraft.clearAllDrafts();
                        console.log('Cleared all drafts after successful publish');
                    }
                }, 200);
            }, { once: true });
            
            // Final verification that all selected tags have corresponding form entries
            const formTagInputs = form.querySelectorAll('input[name="tagIds"]');
            const formTagValues = Array.from(formTagInputs).map(input => input.value);
            console.log(`Submitting form with ${formTagValues.length} tags: ${formTagValues.join(', ')}`);
            
            form.submit();
        });
    }
}

// Helper function to get selected tag IDs - enhanced with validation
function getSelectedTagIds() {
    try {
        // Get all checked tag checkboxes
        const checkedTagElements = document.querySelectorAll('.tag-checkbox:checked');
        
        // Convert to array and extract values
        const tagIds = Array.from(checkedTagElements).map(checkbox => checkbox.value);
        
        return tagIds;
    } catch (error) {
        console.error('Error collecting tag IDs:', error);
        // Return empty array in case of error to prevent breaking the form
        return [];
    }
}

// Validate tag selection and show appropriate UI feedback
function validateTagSelection() {
    const selectedTagIds = getSelectedTagIds();
    const tagValidationMessage = document.getElementById('tagValidationMessage');
    const tagSelectionArea = document.querySelector('.tag-selection-area');
    const infoIcon = tagValidationMessage.previousElementSibling;
    
    if (selectedTagIds.length === 0) {
        // No tags selected - show error
        tagValidationMessage.innerHTML = '<span class="tag-validation-error">Please select at least one tag before publishing</span>';
        tagSelectionArea.classList.add('error');
        infoIcon.classList.add('error-icon');
        return false;
    } else {
        // Tags selected - show success
        tagValidationMessage.innerHTML = `<span class="tag-selection-complete">${selectedTagIds.length} tag${selectedTagIds.length > 1 ? 's' : ''} selected</span>`;
        tagSelectionArea.classList.remove('error');
        infoIcon.classList.remove('error-icon');
        return true;
    }
}

// Update form fields function - enhanced with tag validation
function updateFormFields() {
    document.getElementById('Title').value = document.getElementById('titleEditor').innerText.trim();
    document.getElementById('Description').value = document.getElementById('descriptionEditor').innerText.trim();
    document.getElementById('Content').value = document.getElementById('contentEditor').innerText.trim();
    
    // Get selected tag IDs using the helper function
    const selectedTagIds = getSelectedTagIds();
    
    // Set the hidden Tags field with comma-separated tag IDs
    document.getElementById('Tags').value = selectedTagIds.join(',');
    
    // Update visual cue for tag selection
    const tagValidationMessage = document.getElementById('tagValidationMessage');
    const tagSelectionArea = document.querySelector('.tag-selection-area');
    const infoIcon = tagValidationMessage.previousElementSibling;
    
    if (selectedTagIds.length > 0) {
        tagValidationMessage.textContent = 
            `${selectedTagIds.length} tag${selectedTagIds.length > 1 ? 's' : ''} selected`;
        tagValidationMessage.classList.remove('text-danger');
        tagSelectionArea.classList.remove('error');
        infoIcon.classList.remove('error-icon');
    } else {
        tagValidationMessage.textContent = 'Add at least one tag to publish your story';
        infoIcon.classList.remove('error-icon');
        tagSelectionArea.classList.remove('error');
    }
}

// Initialize all form publishing functionality
function initializeFormPublishing() {
    // Initialize publish button
    initializePublishButton();
    
    // Initialize any other form-related functionality
    console.log('Form publishing functionality initialized');
}

// Auto-initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeFormPublishing();
});

// Export functions for use in other modules
window.FormPublishing = {
    initializePublishButton,
    getSelectedTagIds,
    validateTagSelection,
    updateFormFields,
    initializeFormPublishing
};
