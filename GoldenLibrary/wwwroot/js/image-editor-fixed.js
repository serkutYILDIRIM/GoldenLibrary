/**
 * Enhanced Media Handling for GoldenLibrary Blog Editor
 * Handles images with drag-and-drop, captions, resizing, alignment, and galleries
 */

// Main function to initialize all media-related functionality
function initializeMediaHandling() {
    initDragAndDropHandling();
    initImageUploadHandling();
    initImageToolbar();
    initImageResizing();
    initUnsplashIntegration();
    initGalleryHandling();
    initCaptionHandling();
    initFigcaptionEditing();
}

// ===== DRAG AND DROP FUNCTIONALITY =====
function initDragAndDropHandling() {
    const contentEditor = document.getElementById('contentEditor');
    const imageDropArea = document.getElementById('imageDropArea');
    const galleryDropArea = document.getElementById('galleryDropArea');
    
    // Handle drag events directly on the content editor
    if (contentEditor) {
        contentEditor.addEventListener('dragover', (e) => {
            e.preventDefault();
            contentEditor.classList.add('drag-over');
        });
        
        contentEditor.addEventListener('dragleave', (e) => {
            e.preventDefault();
            contentEditor.classList.remove('drag-over');
        });
        
        contentEditor.addEventListener('drop', (e) => {
            e.preventDefault();
            contentEditor.classList.remove('drag-over');
            
            // Check if the dropped items contain files
            if (e.dataTransfer.items) {
                const files = Array.from(e.dataTransfer.items)
                    .filter(item => item.kind === 'file' && item.type.startsWith('image/'))
                    .map(item => item.getAsFile());
                
                if (files.length > 0) {
                    // Handle the dropped files
                    handleDroppedImages(files, e.clientX, e.clientY);
                }
            }
        });
    }
    
    // Handle drag and drop for image upload area
    if (imageDropArea) {
        imageDropArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            imageDropArea.classList.add('active');
        });
        
        imageDropArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            imageDropArea.classList.remove('active');
        });
        
        imageDropArea.addEventListener('drop', (e) => {
            e.preventDefault();
            imageDropArea.classList.remove('active');
            
            // Handle dropped files for single image upload
            if (e.dataTransfer.items) {
                const files = Array.from(e.dataTransfer.items)
                    .filter(item => item.kind === 'file' && item.type.startsWith('image/'))
                    .map(item => item.getAsFile());
                
                if (files.length > 0) {
                    handleImageUpload(files[0]); // Upload the first image
                }
            }
        });
        
        // Make the upload area clickable
        imageDropArea.addEventListener('click', () => {
            document.getElementById('imageFileInput').click();
        });
    }
    
    // Handle drag and drop for gallery upload area
    if (galleryDropArea) {
        galleryDropArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            galleryDropArea.classList.add('active');
        });
        
        galleryDropArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            galleryDropArea.classList.remove('active');
        });
        
        galleryDropArea.addEventListener('drop', (e) => {
            e.preventDefault();
            galleryDropArea.classList.remove('active');
            
            // Handle dropped files for gallery
            if (e.dataTransfer.items) {
                const files = Array.from(e.dataTransfer.items)
                    .filter(item => item.kind === 'file' && item.type.startsWith('image/'))
                    .map(item => item.getAsFile());
                
                if (files.length > 0) {
                    handleGalleryImages(files);
                }
            }
        });
        
        // Make the gallery upload area clickable
        galleryDropArea.addEventListener('click', () => {
            document.getElementById('galleryFileInput').click();
        });
    }
    
    // Handle file input changes
    document.getElementById('imageFileInput')?.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleImageUpload(e.target.files[0]);
        }
    });
    
    document.getElementById('galleryFileInput')?.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleGalleryImages(Array.from(e.target.files));
        }
    });
}

// Process images dropped directly into the editor
function handleDroppedImages(files, clientX, clientY) {
    // Get the position for insertion
    setCaretPositionAtPoint(clientX, clientY);
    
    // For each dropped file, create a FormData and upload
    files.forEach(file => {
        uploadImageAndInsertAtCaret(file);
    });
}

// Helper function to set cursor position at mouse coordinates
function setCaretPositionAtPoint(x, y) {
    const contentEditor = document.getElementById('contentEditor');
    const range = document.caretRangeFromPoint(x, y);
    
    if (range) {
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
    } else {
        // Fallback to focusing and placing cursor at end
        contentEditor.focus();
        const range = document.createRange();
        const selection = window.getSelection();
        range.setStart(contentEditor, contentEditor.childNodes.length || 0);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
    }
}

// ===== IMAGE UPLOAD HANDLING =====
function initImageUploadHandling() {
    // Handle image from URL button
    document.getElementById('insertImageUrlBtn')?.addEventListener('click', () => {
        const urlInput = document.getElementById('imageUrlInput');
        const imageUrl = urlInput.value.trim();
        
        if (imageUrl) {
            insertImageFromUrl(imageUrl);
            urlInput.value = '';
            document.getElementById('mediaDialog').classList.remove('visible');
        }
    });
    
    // Handle alignment buttons in image options
    document.querySelectorAll('.image-options .btn-group button[data-align]').forEach(button => {
        button.addEventListener('click', (e) => {
            const alignButtons = e.target.closest('.btn-group').querySelectorAll('button');
            alignButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
        });
    });
    
    // Handle image size slider
    const sizeRange = document.getElementById('imageSizeRange');
    const sizeLabel = document.getElementById('imageSize');
    
    if (sizeRange && sizeLabel) {
        sizeRange.addEventListener('input', () => {
            sizeLabel.textContent = sizeRange.value + '%';
        });
    }
}

// Upload an image and insert it at current caret position
function uploadImageAndInsertAtCaret(file) {
    if (!file.type.startsWith('image/')) {
        alert('Please select an image file.');
        return;
    }
    
    // Create a temporary preview immediately
    const tempId = 'temp-' + Date.now();
    const tempSrc = URL.createObjectURL(file);
    
    insertTempImage(tempSrc, tempId);
    
    // Create form data
    const formData = new FormData();
    formData.append('mediaFile', file);
    formData.append('mediaType', 'image');
    
    // Get the anti-forgery token
    const token = document.querySelector('input[name="__RequestVerificationToken"]').value;
    
    // Upload the image
    fetch('/Posts/UploadMedia', {
        method: 'POST',
        body: formData,
        headers: {
            'RequestVerificationToken': token
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Replace the temporary image with the uploaded one
            replaceTempImage(tempId, data.mediaUrl);
        } else {
            // Remove temp image and show error
            removeTempImage(tempId);
            alert('Error uploading image: ' + data.message);
        }
    })
    .catch(error => {
        removeTempImage(tempId);
        console.error('Error uploading image:', error);
        alert('Error uploading image. Please try again.');
    });
}

// Insert a temporary image while uploading
function insertTempImage(tempSrc, tempId) {
    const contentEditor = document.getElementById('contentEditor');
    
    // Create HTML for figure with image
    const tempHtml = 
        '<figure class="content-image" id="' + tempId + '">' +
            '<img src="' + tempSrc + '" alt="Uploading..." style="opacity: 0.7;">' +
            '<div class="text-center mt-2">' +
                '<div class="spinner-border spinner-border-sm text-golden" role="status"></div>' +
                '<span class="ms-2">Uploading image...</span>' +
            '</div>' +
        '</figure>' +
        '<p><br></p>';
    
    // Insert at caret position
    insertContentAtCaret(tempHtml);
}

// Replace temporary image with the actual uploaded one
function replaceTempImage(tempId, imageSrc) {
    const tempFigure = document.getElementById(tempId);
    
    if (tempFigure) {
        // Keep whatever alignment was applied
        const currentClass = tempFigure.className.replace('content-image', '').trim();
        
        // Create new figure HTML
        tempFigure.innerHTML = 
            '<img src="' + imageSrc + '" alt="User uploaded image">' +
            '<figcaption contenteditable="true" class="empty-caption"><span class="caption-placeholder">Resim alt yazısı eklemek için tıklayın</span></figcaption>' +
            '<div class="resize-handle top-left"></div>' +
            '<div class="resize-handle top-right"></div>' +
            '<div class="resize-handle bottom-left"></div>' +
            '<div class="resize-handle bottom-right"></div>';
        
        tempFigure.id = '';
        
        // Make sure content-image class remains along with any alignment class
        tempFigure.className = ('content-image ' + currentClass).trim();
        
        // Update form fields
        updateFormFields();
    }
}

// Remove temporary image if upload fails
function removeTempImage(tempId) {
    const tempFigure = document.getElementById(tempId);
    if (tempFigure) {
        tempFigure.parentElement.removeChild(tempFigure);
    }
}

// Insert image from URL
function insertImageFromUrl(url) {
    // Create HTML for figure with image and caption
    const imageHtml = 
        '<figure class="content-image">' +
            '<img src="' + url + '" alt="User added image">' +
            '<figcaption contenteditable="true" class="empty-caption"><span class="caption-placeholder">Resim alt yazısı eklemek için tıklayın</span></figcaption>' +
            '<div class="resize-handle top-left"></div>' +
            '<div class="resize-handle top-right"></div>' +
            '<div class="resize-handle bottom-left"></div>' +
            '<div class="resize-handle bottom-right"></div>' +
        '</figure>' +
        '<p><br></p>';
    
    insertContentAtCaret(imageHtml);
    updateFormFields();
}

// Helper to insert content at current caret position
function insertContentAtCaret(html) {
    const selection = window.getSelection();
    
    if (selection.rangeCount) {
        const range = selection.getRangeAt(0);
        const documentFragment = range.createContextualFragment(html);
        
        range.deleteContents();
        range.insertNode(documentFragment);
        
        // Move caret to the end of inserted content
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
    }
}

// ===== FIGCAPTION EDITING =====
function initFigcaptionEditing() {
    const contentEditor = document.getElementById('contentEditor');
    if (!contentEditor) return;
    
    // Handle clicks on figcaptions - Medium style
    contentEditor.addEventListener('click', (e) => {
        // Check if the clicked element is a figcaption or inside one
        const figcaption = e.target.closest('figcaption[contenteditable="true"]');
        
        if (figcaption) {
            e.stopPropagation(); // Prevent other event handlers
            handleFigcaptionClick(figcaption);
        }
    });
    
    // Handle focus events for figcaptions
    contentEditor.addEventListener('focusin', (e) => {
        const figcaption = e.target.closest('figcaption[contenteditable="true"]');
        if (figcaption) {
            handleFigcaptionFocus(figcaption);
        }
    });
    
    // Handle blur events for figcaptions
    contentEditor.addEventListener('focusout', (e) => {
        const figcaption = e.target.closest('figcaption[contenteditable="true"]');
        if (figcaption) {
            // Use setTimeout to allow time for potential focus switch
            setTimeout(() => {
                if (!figcaption.contains(document.activeElement)) {
                    handleFigcaptionBlur(figcaption);
                }
            }, 10);
        }
    });
    
    // Handle input events for figcaptions
    contentEditor.addEventListener('input', (e) => {
        const figcaption = e.target.closest('figcaption[contenteditable="true"]');
        if (figcaption) {
            handleFigcaptionInput(figcaption);
        }
    });
    
    // Handle keydown for better UX
    contentEditor.addEventListener('keydown', (e) => {
        const figcaption = e.target.closest('figcaption[contenteditable="true"]');
        if (figcaption && e.key === 'Enter') {
            e.preventDefault();
            figcaption.blur(); // Exit caption editing on Enter
        }
    });
}

function handleFigcaptionClick(figcaption) {
    // Clear placeholder if it exists
    if (figcaption.classList.contains('empty-caption')) {
        figcaption.innerHTML = '';
        figcaption.classList.remove('empty-caption');
    }
    
    // Focus the figcaption for editing
    figcaption.focus();
    
    // Place cursor at end of content
    const range = document.createRange();
    const selection = window.getSelection();
    
    if (figcaption.childNodes.length > 0) {
        range.setStartAfter(figcaption.lastChild);
    } else {
        range.setStart(figcaption, 0);
    }
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
}

function handleFigcaptionFocus(figcaption) {
    // Add focused state styling
    const figure = figcaption.closest('figure');
    if (figure) {
        figure.classList.add('caption-editing');
    }
    
    // Clear placeholder if empty
    if (figcaption.classList.contains('empty-caption')) {
        figcaption.innerHTML = '';
        figcaption.classList.remove('empty-caption');
    }
}

function handleFigcaptionBlur(figcaption) {
    // Remove focused state styling
    const figure = figcaption.closest('figure');
    if (figure) {
        figure.classList.remove('caption-editing');
    }
    
    // Check if figcaption is empty and add placeholder if needed
    const text = figcaption.textContent.trim();
    if (!text) {
        figcaption.innerHTML = '<span class="caption-placeholder">Resim alt yazısı eklemek için tıklayın</span>';
        figcaption.classList.add('empty-caption');
    }
    
    // Update form fields when caption changes
    if (typeof updateFormFields === 'function') {
        updateFormFields();
    }
}

function handleFigcaptionInput(figcaption) {
    // Remove empty-caption class if user is typing
    if (figcaption.classList.contains('empty-caption')) {
        figcaption.classList.remove('empty-caption');
    }
    
    // Update form fields in real-time
    if (typeof updateFormFields === 'function') {
        updateFormFields();
    }
}

// ===== IMAGE TOOLBAR =====
function initImageToolbar() {
    const contentEditor = document.getElementById('contentEditor');
    const imageToolbar = document.getElementById('imageToolbar');
    
    if (!contentEditor || !imageToolbar) return;
    
    // Show toolbar when clicking on images
    contentEditor.addEventListener('click', (e) => {
        // Find closest figure or img to the click
        const clickedImg = e.target.closest('img');
        const figure = e.target.closest('figure.content-image');
        
        // Hide toolbar if click is not on an image
        if (!clickedImg && !figure) {
            imageToolbar.classList.remove('visible');
            return;
        }
        
        // Get the figure element (the container of the image)
        const targetFigure = figure || clickedImg.closest('figure') || clickedImg.parentElement;
        
        // Position toolbar above the image
        const figureRect = targetFigure.getBoundingClientRect();
        const editorRect = contentEditor.getBoundingClientRect();
        
        imageToolbar.style.top = (figureRect.top - editorRect.top - imageToolbar.offsetHeight - 10) + 'px';
        imageToolbar.style.left = (figureRect.left - editorRect.left + (figureRect.width / 2) - (imageToolbar.offsetWidth / 2)) + 'px';
        
        // Show toolbar
        imageToolbar.classList.add('visible');
        
        // Store reference to current figure
        imageToolbar.dataset.targetFigure = getElementPath(targetFigure);
        
        // Highlight active alignment button
        updateAlignmentButtonsState(targetFigure);
    });
    
    // Handle toolbar button clicks
    imageToolbar.querySelectorAll('.toolbar-button').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const command = button.getAttribute('data-command');
            const targetFigure = getFigureByPath(imageToolbar.dataset.targetFigure);
            
            if (!targetFigure) return;
            
            switch(command) {
                case 'align-left':
                    setImageAlignment(targetFigure, 'left');
                    break;
                    
                case 'align-center':
                    setImageAlignment(targetFigure, 'center');
                    break;
                    
                case 'align-right':
                    setImageAlignment(targetFigure, 'right');
                    break;
                    
                case 'resize-image':
                    toggleResizeMode(targetFigure);
                    break;
                    
                case 'remove-image':
                    if (confirm('Are you sure you want to remove this image?')) {
                        targetFigure.parentElement.removeChild(targetFigure);
                        imageToolbar.classList.remove('visible');
                        if (typeof updateFormFields === 'function') {
                            updateFormFields();
                        }
                    }
                    break;
            }
        });
    });
    
    // Helper to generate a unique path to an element
    function getElementPath(el) {
        if (!el || !el.parentElement) return '';
        
        const parent = contentEditor;
        const path = [];
        let currentEl = el;
        
        while (currentEl !== parent) {
            const index = Array.from(currentEl.parentElement.children).indexOf(currentEl);
            path.unshift(index);
            currentEl = currentEl.parentElement;
            
            if (!currentEl) return '';
        }
        
        return path.join('.');
    }
    
    // Helper to find element by generated path
    function getFigureByPath(path) {
        if (!path) return null;
        
        const indices = path.split('.').map(Number);
        let current = contentEditor;
        
        for (const index of indices) {
            if (!current.children[index]) return null;
            current = current.children[index];
        }
        
        return current;
    }
    
    // Update visual indication of current alignment
    function updateAlignmentButtonsState(figure) {
        const alignButtons = imageToolbar.querySelectorAll('[data-command^="align-"]');
        alignButtons.forEach(btn => btn.classList.remove('active'));
        
        if (figure.classList.contains('img-align-left')) {
            imageToolbar.querySelector('[data-command="align-left"]').classList.add('active');
        } else if (figure.classList.contains('img-align-right')) {
            imageToolbar.querySelector('[data-command="align-right"]').classList.add('active');
        } else {
            imageToolbar.querySelector('[data-command="align-center"]').classList.add('active');
        }
    }
    
    // Apply alignment to image
    function setImageAlignment(figure, alignment) {
        // Remove all alignment classes
        figure.classList.remove('img-align-left', 'img-align-center', 'img-align-right');
        
        // Add the requested alignment class
        if (alignment !== 'center') {
            figure.classList.add('img-align-' + alignment);
        } else {
            figure.classList.add('img-align-center'); // Default is center
        }
        
        updateAlignmentButtonsState(figure);
        if (typeof updateFormFields === 'function') {
            updateFormFields();
        }
    }
}

// ===== RESIZING FUNCTIONALITY =====
function initImageResizing() {
    const contentEditor = document.getElementById('contentEditor');
    if (!contentEditor) return;
    
    let isResizing = false;
    let currentImage = null;
    let currentHandle = null;
    let startX, startY, startWidth, startHeight;
    
    // Add event listener on the editor to delegate events to resize handles
    contentEditor.addEventListener('mousedown', (e) => {
        const handle = e.target.closest('.resize-handle');
        
        if (handle) {
            // Start resizing
            isResizing = true;
            currentHandle = handle;
            currentImage = handle.closest('figure').querySelector('img');
            
            if (!currentImage) return;
            
            // Add resize-active class to the figure
            currentImage.closest('figure').classList.add('resize-active');
            
            // Store starting position and dimensions
            startX = e.clientX;
            startY = e.clientY;
            startWidth = currentImage.offsetWidth;
            startHeight = currentImage.offsetHeight;
            
            // Prevent text selection during resize
            e.preventDefault();
        }
    });
    
    // Add mouse move event to document
    document.addEventListener('mousemove', (e) => {
        if (!isResizing || !currentImage) return;
        
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        
        // Determine resize direction based on handle
        if (currentHandle.classList.contains('bottom-right')) {
            const newWidth = Math.max(50, startWidth + dx);
            const aspectRatio = startWidth / startHeight;
            const newHeight = newWidth / aspectRatio;
            
            currentImage.style.width = newWidth + 'px';
            currentImage.style.height = newHeight + 'px';
        }
        else if (currentHandle.classList.contains('bottom-left')) {
            const newWidth = Math.max(50, startWidth - dx);
            const aspectRatio = startWidth / startHeight;
            const newHeight = newWidth / aspectRatio;
            
            currentImage.style.width = newWidth + 'px';
            currentImage.style.height = newHeight + 'px';
        }
        else if (currentHandle.classList.contains('top-right')) {
            const newWidth = Math.max(50, startWidth + dx);
            const aspectRatio = startWidth / startHeight;
            const newHeight = newWidth / aspectRatio;
            
            currentImage.style.width = newWidth + 'px';
            currentImage.style.height = newHeight + 'px';
        }
        else if (currentHandle.classList.contains('top-left')) {
            const newWidth = Math.max(50, startWidth - dx);
            const aspectRatio = startWidth / startHeight;
            const newHeight = newWidth / aspectRatio;
            
            currentImage.style.width = newWidth + 'px';
            currentImage.style.height = newHeight + 'px';
        }
    });
    
    // End resize on mouseup
    document.addEventListener('mouseup', () => {
        if (isResizing && currentImage) {
            // Remove active class
            currentImage.closest('figure').classList.remove('resize-active');
            
            // Update form fields
            if (typeof updateFormFields === 'function') {
                updateFormFields();
            }
            
            // Reset state
            isResizing = false;
            currentImage = null;
            currentHandle = null;
        }
    });
    
    // Toggle resize mode from the toolbar
    window.toggleResizeMode = function(figure) {
        figure.classList.toggle('resize-active');
    }
}

// ===== CAPTION HANDLING (DEPRECATED - using direct figcaption editing instead) =====
function initCaptionHandling() {
    // This function is deprecated in favor of direct figcaption editing
    // We keep it for backward compatibility but don't initialize the old system
    console.log('Old caption system disabled - using direct figcaption editing instead');
    return;
}

// ===== UNSPLASH AND GALLERY INTEGRATION =====
function initUnsplashIntegration() {
    // Placeholder for Unsplash integration - can be implemented later
    console.log('Unsplash integration placeholder');
}

function initGalleryHandling() {
    // Placeholder for gallery handling - can be implemented later
    console.log('Gallery handling placeholder');
}

// ===== INITIALIZATION =====
// Initialize everything when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeMediaHandling();
    
    // Apply initial placeholder styling to existing figcaptions
    document.querySelectorAll('figcaption[contenteditable="true"]').forEach(figcaption => {
        const text = figcaption.textContent.trim();
        if (!text) {
            figcaption.innerHTML = '<span class="caption-placeholder">Resim alt yazısı eklemek için tıklayın</span>';
            figcaption.classList.add('empty-caption');
        }
    });
});
