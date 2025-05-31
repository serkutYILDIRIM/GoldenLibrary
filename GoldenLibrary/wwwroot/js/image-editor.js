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
            sizeLabel.textContent = `${sizeRange.value}%`;
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
    const tempHtml = `
        <figure class="content-image" id="${tempId}">
            <img src="${tempSrc}" alt="Uploading..." style="opacity: 0.7;">
            <div class="text-center mt-2">
                <div class="spinner-border spinner-border-sm text-golden" role="status"></div>
                <span class="ms-2">Uploading image...</span>
            </div>
        </figure>
        <p><br></p>
    `;
    
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
        tempFigure.innerHTML = `
            <img src="${imageSrc}" alt="User uploaded image">
            <figcaption contenteditable="true" data-placeholder="Add a caption (optional)"></figcaption>
            <div class="resize-handle top-left"></div>
            <div class="resize-handle top-right"></div>
            <div class="resize-handle bottom-left"></div>
            <div class="resize-handle bottom-right"></div>
        `;
        tempFigure.id = '';
        
        // Make sure content-image class remains along with any alignment class
        tempFigure.className = `content-image ${currentClass}`.trim();
        
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
    const imageHtml = `
        <figure class="content-image">
            <img src="${url}" alt="User added image">
            <figcaption contenteditable="true" data-placeholder="Add a caption (optional)"></figcaption>
            <div class="resize-handle top-left"></div>
            <div class="resize-handle top-right"></div>
            <div class="resize-handle bottom-left"></div>
            <div class="resize-handle bottom-right"></div>
        </figure>
        <p><br></p>
    `;
    
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
                    
                case 'edit-caption':
                    showCaptionInput(targetFigure);
                    break;
                    
                case 'resize-image':
                    toggleResizeMode(targetFigure);
                    break;
                    
                case 'remove-image':
                    if (confirm('Are you sure you want to remove this image?')) {
                        targetFigure.parentElement.removeChild(targetFigure);
                        imageToolbar.classList.remove('visible');
                        updateFormFields();
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
            figure.classList.add(`img-align-${alignment}`);
        } else {
            figure.classList.add('img-align-center'); // Default is center
        }
        
        updateAlignmentButtonsState(figure);
        updateFormFields();
    }
}

// ===== CAPTION HANDLING =====
function initCaptionHandling() {
    const captionInput = document.getElementById('captionInputContainer');
    const captionTextField = document.getElementById('captionInput');
    const saveButton = document.getElementById('saveCaptionBtn');
    const cancelButton = document.getElementById('cancelCaptionBtn');
    
    if (!captionInput || !captionTextField) return;
    
    // Save caption
    saveButton.addEventListener('click', () => {
        const figurePath = captionInput.dataset.targetFigure;
        const figure = getFigureByPath(figurePath);
        
        if (figure) {
            const caption = captionTextField.value.trim();
            const figcaption = figure.querySelector('figcaption');
            
            if (figcaption) {
                figcaption.textContent = caption;
                if (!caption) {
                    figcaption.setAttribute('data-placeholder', 'Add a caption (optional)');
                } else {
                    figcaption.removeAttribute('data-placeholder');
                }
            }
            
            updateFormFields();
        }
        
        captionInput.classList.remove('visible');
    });
    
    // Cancel caption editing
    cancelButton.addEventListener('click', () => {
        captionInput.classList.remove('visible');
    });
    
    // Helper function - used from toolbar
    window.showCaptionInput = function(figure) {
        if (!figure) return;
        
        const figCaption = figure.querySelector('figcaption');
        const figureRect = figure.getBoundingClientRect();
        const contentEditor = document.getElementById('contentEditor');
        const editorRect = contentEditor.getBoundingClientRect();
        
        // Position caption input below the image
        captionInput.style.top = (figureRect.bottom - editorRect.top + 10) + 'px';
        captionInput.style.left = (figureRect.left - editorRect.left + (figureRect.width / 2) - (captionInput.offsetWidth / 2)) + 'px';
        
        // Set initial value
        captionTextField.value = figCaption ? figCaption.textContent : '';
        
        // Store reference to figure
        captionInput.dataset.targetFigure = getElementPath(figure);
        
        // Show caption input
        captionInput.classList.add('visible');
        captionTextField.focus();
    }
    
    // Helper to generate a unique path to an element
    function getElementPath(el) {
        if (!el || !el.parentElement) return '';
        
        const parent = document.getElementById('contentEditor');
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
        let current = document.getElementById('contentEditor');
        
        for (const index of indices) {
            if (!current.children[index]) return null;
            current = current.children[index];
        }
        
        return current;
    }
}

// ===== IMAGE RESIZING =====
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
            updateFormFields();
            
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

// ===== UNSPLASH INTEGRATION =====
function initUnsplashIntegration() {
    const searchInput = document.getElementById('unsplashSearchInput');
    const searchButton = document.getElementById('unsplashSearchBtn');
    const resultsContainer = document.getElementById('unsplashResults');
    const loadingIndicator = document.getElementById('unsplashLoading');
    const paginationContainer = document.getElementById('unsplashPagination');
    const prevBtn = document.getElementById('unsplashPrevBtn');
    const nextBtn = document.getElementById('unsplashNextBtn');
    const pageInfo = document.getElementById('unsplashPageInfo');
    
    if (!searchInput || !searchButton) return;
    
    let currentPage = 1;
    let totalPages = 1;
    let currentQuery = '';
    let selectedUnsplashImage = null;
    
    // Search button click
    searchButton.addEventListener('click', () => {
        const query = searchInput.value.trim();
        if (query) {
            currentQuery = query;
            currentPage = 1;
            searchUnsplashImages(query, 1);
        }
    });
    
    // Enter key in search input
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const query = searchInput.value.trim();
            if (query) {
                currentQuery = query;
                currentPage = 1;
                searchUnsplashImages(query, 1);
            }
        }
    });
    
    // Pagination
    prevBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            searchUnsplashImages(currentQuery, currentPage);
        }
    });
    
    nextBtn.addEventListener('click', () => {
        if (currentPage < totalPages) {
            currentPage++;
            searchUnsplashImages(currentQuery, currentPage);
        }
    });
    
    // Search Unsplash API
    function searchUnsplashImages(query, page) {
        // Show loading indicator
        resultsContainer.style.display = 'none';
        loadingIndicator.style.display = 'block';
        paginationContainer.style.display = 'none';
        
        // Create form data for the request
        const formData = new FormData();
        formData.append('query', query);
        formData.append('page', page);
        
        // Get the anti-forgery token
        const token = document.querySelector('input[name="__RequestVerificationToken"]').value;
        
        // Send request to our backend, which will proxy to Unsplash API
        fetch('/Posts/SearchUnsplash', {
            method: 'POST',
            body: formData,
            headers: {
                'RequestVerificationToken': token
            }
        })
        .then(response => response.json())
        .then(data => {
            // Hide loading indicator
            loadingIndicator.style.display = 'none';
            resultsContainer.style.display = 'grid';
            
            if (data.success && data.results.length > 0) {
                // Update pagination
                totalPages = data.totalPages || 1;
                updatePagination();
                
                // Display results
                displayUnsplashResults(data.results);
            } else {
                // Show no results message
                resultsContainer.innerHTML = `
                    <div class="text-center text-muted my-5 col-12">
                        <i class="bi bi-x-circle" style="font-size: 2rem;"></i>
                        <p class="mt-3">No images found for "${query}".</p>
                    </div>
                `;
            }
        })
        .catch(error => {
            console.error('Error searching Unsplash:', error);
            loadingIndicator.style.display = 'none';
            resultsContainer.style.display = 'block';
            resultsContainer.innerHTML = `
                <div class="text-center text-muted my-5 col-12">
                    <i class="bi bi-exclamation-triangle" style="font-size: 2rem;"></i>
                    <p class="mt-3">Error connecting to Unsplash. Please try again later.</p>
                </div>
            `;
        });
    }
    
    // Display search results
    function displayUnsplashResults(images) {
        resultsContainer.innerHTML = '';
        
        images.forEach(image => {
            const imageElement = document.createElement('div');
            imageElement.className = 'unsplash-image';
            imageElement.innerHTML = `
                <img src="${image.urls.small}" alt="${image.alt_description || 'Unsplash image'}" data-url="${image.urls.regular}" data-unsplash-id="${image.id}">
                <div class="photographer">
                    Photo by <a href="${image.user.links.html}?utm_source=goldenlibrary&utm_medium=referral" target="_blank">${image.user.name}</a> on <a href="https://unsplash.com/?utm_source=goldenlibrary&utm_medium=referral" target="_blank">Unsplash</a>
                </div>
            `;
            
            // Add click event to select image
            imageElement.addEventListener('click', () => {
                // Reset previously selected image
                document.querySelectorAll('.unsplash-image.selected').forEach(el => el.classList.remove('selected'));
                
                // Select this image
                imageElement.classList.add('selected');
                selectedUnsplashImage = image;
                
                // Show insert button
                const insertButton = document.createElement('button');
                insertButton.className = 'btn btn-golden btn-sm position-absolute top-0 end-0 m-2';
                insertButton.textContent = 'Insert';
                insertButton.addEventListener('click', (e) => {
                    e.stopPropagation();
                    insertUnsplashImage(image);
                });
                
                // Remove existing insert buttons
                document.querySelectorAll('.unsplash-image button').forEach(btn => btn.remove());
                imageElement.appendChild(insertButton);
            });
            
            resultsContainer.appendChild(imageElement);
        });
    }
    
    // Update pagination UI
    function updatePagination() {
        pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
        prevBtn.disabled = currentPage <= 1;
        nextBtn.disabled = currentPage >= totalPages;
        paginationContainer.style.display = totalPages > 1 ? 'flex' : 'none';
    }
    
    // Insert selected Unsplash image
    function insertUnsplashImage(image) {
        const imageUrl = image.urls.regular;
        const photographerName = image.user.name;
        const photographerLink = image.user.links.html + '?utm_source=goldenlibrary&utm_medium=referral';
        const unsplashLink = 'https://unsplash.com/?utm_source=goldenlibrary&utm_medium=referral';
        
        // Create HTML for figure with caption containing attribution
        const imageHtml = `
            <figure class="content-image">
                <img src="${imageUrl}" alt="${image.alt_description || 'Photo from Unsplash'}">
                <figcaption contenteditable="true">
                    Photo by <a href="${photographerLink}" target="_blank" rel="noopener">${photographerName}</a> on <a href="${unsplashLink}" target="_blank" rel="noopener">Unsplash</a>
                </figcaption>
                <div class="resize-handle top-left"></div>
                <div class="resize-handle top-right"></div>
                <div class="resize-handle bottom-left"></div>
                <div class="resize-handle bottom-right"></div>
            </figure>
            <p><br></p>
        `;
        
        // Restore selection from before dialog was opened
        restoreSelection();
        
        // Insert at caret position
        insertContentAtCaret(imageHtml);
        
        // Update form fields
        updateFormFields();
        
        // Close dialog
        document.getElementById('mediaDialog').classList.remove('visible');
    }
    
    // Save selection before opening dialog
    let savedSelection = null;
    
    window.saveSelection = function() {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            savedSelection = selection.getRangeAt(0).cloneRange();
        }
    }
    
    function restoreSelection() {
        if (savedSelection) {
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(savedSelection);
        }
    }
}

// ===== GALLERY HANDLING =====
function initGalleryHandling() {
    const galleryFileInput = document.getElementById('galleryFileInput');
    const galleryContainer = document.getElementById('galleryImagesContainer');
    const galleryOptions = document.querySelector('.gallery-options');
    const insertGalleryBtn = document.getElementById('insertGalleryBtn');
    const galleryStyleSelect = document.getElementById('galleryStyleSelect');
    
    if (!galleryFileInput || !galleryContainer || !insertGalleryBtn) return;
    
    let galleryImages = [];
    
    // Handle gallery image uploads
    window.handleGalleryImages = function(files) {
        if (files.length === 0) return;
        
        // Check if files are images
        const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
        
        if (imageFiles.length === 0) {
            alert('Please select only image files.');
            return;
        }
        
        // Upload each image
        Promise.all(imageFiles.map(uploadGalleryImage))
            .then(results => {
                // Filter out failed uploads
                const successfulUploads = results.filter(result => result.success);
                
                // Add to gallery images array
                galleryImages = galleryImages.concat(successfulUploads);
                
                // Update gallery preview
                updateGalleryPreview();
                
                // Show options and enable insert button
                if (galleryImages.length > 0) {
                    galleryOptions.style.display = 'block';
                    insertGalleryBtn.disabled = false;
                }
            });
    }
    
    // Upload a single gallery image
    function uploadGalleryImage(file) {
        return new Promise((resolve) => {
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
                    resolve({
                        success: true,
                        url: data.mediaUrl,
                        filename: data.fileName
                    });
                } else {
                    console.error('Error uploading gallery image:', data.message);
                    resolve({ success: false });
                }
            })
            .catch(error => {
                console.error('Error uploading gallery image:', error);
                resolve({ success: false });
            });
        });
    }
    
    // Update gallery preview
    function updateGalleryPreview() {
        if (galleryImages.length === 0) {
            galleryContainer.innerHTML = `
                <div class="text-center text-muted p-4">
                    <p>No images selected yet</p>
                </div>
            `;
            return;
        }
        
        galleryContainer.innerHTML = '';
        
        galleryImages.forEach((image, index) => {
            const imageItem = document.createElement('div');
            imageItem.className = 'gallery-image-item';
            imageItem.innerHTML = `
                <img src="${image.url}" alt="Gallery image ${index + 1}">
                <button type="button" class="remove-gallery-image" data-index="${index}">
                    <i class="bi bi-x"></i>
                </button>
            `;
            
            galleryContainer.appendChild(imageItem);
        });
        
        // Add remove button event listeners
        galleryContainer.querySelectorAll('.remove-gallery-image').forEach(button => {
            button.addEventListener('click', () => {
                const index = parseInt(button.getAttribute('data-index'));
                galleryImages.splice(index, 1);
                updateGalleryPreview();
                
                // Hide options and disable insert button if no images
                if (galleryImages.length === 0) {
                    galleryOptions.style.display = 'none';
                    insertGalleryBtn.disabled = true;
                }
            });
        });
    }
    
    // Handle insert gallery button
    insertGalleryBtn.addEventListener('click', () => {
        if (galleryImages.length === 0) return;
        
        const galleryStyle = galleryStyleSelect.value;
        const galleryCaption = document.getElementById('galleryCaption').value;
        
        // Get alignment
        let alignment = 'center'; // Default
        document.querySelectorAll('.gallery-options .btn-group button').forEach(btn => {
            if (btn.classList.contains('active')) {
                alignment = btn.getAttribute('data-align');
            }
        });
        
        // Create gallery HTML based on style
        let galleryHtml = '';
        
        if (galleryStyle === 'grid') {
            galleryHtml = createGridGallery(galleryImages, alignment, galleryCaption);
        } else if (galleryStyle === 'carousel') {
            galleryHtml = createCarouselGallery(galleryImages, alignment, galleryCaption);
        } else {
            galleryHtml = createSlideshowGallery(galleryImages, alignment, galleryCaption);
        }
        
        // Restore selection from before dialog was opened
        restoreSelection();
        
        // Insert gallery at caret position
        insertContentAtCaret(galleryHtml);
        
        // Update form fields
        updateFormFields();
        
        // Reset gallery state
        galleryImages = [];
        updateGalleryPreview();
        galleryOptions.style.display = 'none';
        insertGalleryBtn.disabled = true;
        document.getElementById('galleryCaption').value = '';
        
        // Close dialog
        document.getElementById('mediaDialog').classList.remove('visible');
        
        // Initialize any carousels in the editor
        initializeCarousels();
    });
    
    // Create grid gallery HTML
    function createGridGallery(images, alignment, caption) {
        const galleryId = 'gallery-' + Date.now();
        
        let html = `
            <div class="gallery-container ${alignment !== 'center' ? 'img-align-' + alignment : ''}" id="${galleryId}">
                <div class="gallery-grid">
        `;
        
        images.forEach(image => {
            html += `<img src="${image.url}" alt="Gallery image">`;
        });
        
        html += `
                </div>
                ${caption ? `<div class="gallery-caption">${caption}</div>` : ''}
            </div>
            <p><br></p>
        `;
        
        return html;
    }
    
    // Create carousel gallery HTML
    function createCarouselGallery(images, alignment, caption) {
        const galleryId = 'gallery-' + Date.now();
        
        let html = `
            <div class="gallery-container ${alignment !== 'center' ? 'img-align-' + alignment : ''}" id="${galleryId}">
                <div class="gallery-carousel">
                    <div class="carousel-inner">
        `;
        
        images.forEach((image, index) => {
            html += `
                <div class="carousel-item ${index === 0 ? 'active' : ''}" data-index="${index}">
                    <img src="${image.url}" alt="Gallery image ${index + 1}">
                </div>
            `;
        });
        
        html += `
                    </div>
                    <button type="button" class="carousel-control prev" aria-label="Previous">
                        <i class="bi bi-chevron-left"></i>
                    </button>
                    <button type="button" class="carousel-control next" aria-label="Next">
                        <i class="bi bi-chevron-right"></i>
                    </button>
                </div>
                ${caption ? `<div class="gallery-caption">${caption}</div>` : ''}
            </div>
            <p><br></p>
        `;
        
        return html;
    }
    
    // Create slideshow gallery HTML
    function createSlideshowGallery(images, alignment, caption) {
        // Slideshow is similar to carousel but with full-screen option
        const galleryId = 'gallery-' + Date.now();
        
        let html = `
            <div class="gallery-container ${alignment !== 'center' ? 'img-align-' + alignment : ''}" id="${galleryId}">
                <div class="gallery-carousel slideshow">
                    <div class="carousel-inner">
        `;
        
        images.forEach((image, index) => {
            html += `
                <div class="carousel-item ${index === 0 ? 'active' : ''}" data-index="${index}">
                    <img src="${image.url}" alt="Gallery image ${index + 1}">
                </div>
            `;
        });
        
        html += `
                    </div>
                    <button type="button" class="carousel-control prev" aria-label="Previous">
                        <i class="bi bi-chevron-left"></i>
                    </button>
                    <button type="button" class="carousel-control next" aria-label="Next">
                        <i class="bi bi-chevron-right"></i>
                    </button>
                    <div class="slideshow-counter">1/${images.length}</div>
                </div>
                ${caption ? `<div class="gallery-caption">${caption}</div>` : ''}
            </div>
            <p><br></p>
        `;
        
        return html;
    }
    
    // Initialize carousels in the editor
    function initializeCarousels() {
        const contentEditor = document.getElementById('contentEditor');
        const carousels = contentEditor.querySelectorAll('.gallery-carousel');
        
        carousels.forEach(carousel => {
            const prevButton = carousel.querySelector('.prev');
            const nextButton = carousel.querySelector('.next');
            const slides = carousel.querySelectorAll('.carousel-item');
            let currentIndex = 0;
            
            if (!prevButton || !nextButton || slides.length === 0) return;
            
            // Show counter for slideshows
            const counter = carousel.querySelector('.slideshow-counter');
            
            // Previous button click
            prevButton.addEventListener('click', () => {
                currentIndex = (currentIndex === 0) ? slides.length - 1 : currentIndex - 1;
                updateCarousel();
            });
            
            // Next button click
            nextButton.addEventListener('click', () => {
                currentIndex = (currentIndex === slides.length - 1) ? 0 : currentIndex + 1;
                updateCarousel();
            });
            
            // Update carousel display
            function updateCarousel() {
                const translateValue = -currentIndex * 100;
                carousel.querySelector('.carousel-inner').style.transform = `translateX(${translateValue}%)`;
                
                // Update active class
                slides.forEach(slide => slide.classList.remove('active'));
                slides[currentIndex].classList.add('active');
                
                // Update counter if exists
                if (counter) {
                    counter.textContent = `${currentIndex + 1}/${slides.length}`;
                }
            }
        });
    }
}

// Initialize everything when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeMediaHandling();
});
