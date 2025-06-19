var csInterface = new CSInterface();
var selectedCard = null;

function showStatus(message, type) {
    var status = document.getElementById('status');
    status.textContent = message;
    status.className = 'status ' + type;
    status.style.display = 'block';
    
    // Hide after 5 seconds
    setTimeout(function() {
        status.style.display = 'none';
    }, 5000);
}

function searchCards() {
    var query = document.getElementById('cardSearch').value.trim();
    if (!query) {
        showStatus('Please enter a card name to search', 'error');
        return;
    }
    
    showStatus('Searching for cards...', 'info');
    
    // Call Scryfall API
    var searchUrl = 'https://api.scryfall.com/cards/search?q=' + encodeURIComponent(query) + '&unique=cards&order=name';
    
    fetch(searchUrl)
        .then(function(response) {
            if (!response.ok) {
                throw new Error('Search failed: ' + response.status);
            }
            return response.json();
        })
        .then(function(data) {
            if (data.data && data.data.length > 0) {
                displaySearchResults(data.data);
            } else {
                displaySearchResults([]);
            }
        })
        .catch(function(error) {
            console.error('Search error:', error);
            showStatus('Search failed: ' + error.message, 'error');
            displaySearchResults([]);
        });
}

function displaySearchResults(cards) {
    var resultsDiv = document.getElementById('searchResults');
    resultsDiv.innerHTML = '';
    
    if (cards.length === 0) {
        resultsDiv.innerHTML = '<div class="card-result">No cards found</div>';
        resultsDiv.style.display = 'block';
        return;
    }
    
    cards.forEach(function(card, index) {
        var cardDiv = document.createElement('div');
        cardDiv.className = 'card-result';
        cardDiv.onclick = function() { selectCard(card); };
        
        // Handle different image URI structures
        var imageUrl = '';
        if (card.image_uris && card.image_uris.normal) {
            imageUrl = card.image_uris.normal;
        } else if (card.card_faces && card.card_faces[0] && card.card_faces[0].image_uris) {
            imageUrl = card.card_faces[0].image_uris.normal;
        }
        
        cardDiv.innerHTML = 
            '<img src="' + imageUrl + '" alt="' + card.name + '" onerror="this.style.display=\'none\'">' +
            '<div class="card-info">' +
                '<div><strong>' + card.name + '</strong></div>' +
                '<div>' + card.type_line + '</div>' +
                '<div>' + (card.mana_cost || '') + '</div>' +
                '<div class="set-info">' + card.set_name + ' (' + card.set.toUpperCase() + ')</div>' +
            '</div>';
        
        resultsDiv.appendChild(cardDiv);
    });
    
    resultsDiv.style.display = 'block';
    showStatus('Found ' + cards.length + ' card(s)', 'success');
}

function selectCard(card) {
    selectedCard = card;
    showStatus('Selected: ' + card.name, 'success');
    
    // Update button text
    document.getElementById('importBtn').textContent = 'Import ' + card.name;
    
    // Hide search results after selection
    document.getElementById('searchResults').style.display = 'none';
}

function getCardSize() {
    var sizeOption = document.getElementById('cardSize').value;
    
    switch (sizeOption) {
        case 'small':
            return { width: 244, height: 340 };
        case 'large':
            return { width: 732, height: 1020 };
        case 'custom':
            return {
                width: parseInt(document.getElementById('customWidth').value) || 488,
                height: parseInt(document.getElementById('customHeight').value) || 680
            };
        default:
            return { width: 488, height: 680 };
    }
}

function importRandomCard() {
    if (!selectedCard) {
        showStatus('Please search for and select a card first', 'error');
        return;
    }
    
    var size = getCardSize();
    var position = document.getElementById('cardPosition').value;
    
    // Handle different image URI structures
    var imageUrl = '';
    if (selectedCard.image_uris && selectedCard.image_uris.normal) {
        imageUrl = selectedCard.image_uris.normal;
    } else if (selectedCard.card_faces && selectedCard.card_faces[0] && selectedCard.card_faces[0].image_uris) {
        imageUrl = selectedCard.card_faces[0].image_uris.normal;
    }
    
    if (!imageUrl) {
        showStatus('No image available for this card', 'error');
        return;
    }
    
    var cardData = {
        cardName: selectedCard.name,
        imageUrl: imageUrl,
        width: size.width,
        height: size.height,
        position: position
    };
    
    // Open crop editor before importing
    openCropEditor(cardData);
}

function openCropEditor(cardData) {
    showStatus('Loading image editor...', 'info');
    
    // Create modal overlay
    var modal = document.createElement('div');
    modal.id = 'cropModal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    `;
    
    // Create modal content
    var modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background: white;
        padding: 20px;
        border-radius: 8px;
        max-width: 90vw;
        max-height: 90vh;
        overflow: auto;
    `;
    
    modalContent.innerHTML = `
        <h3>Crop Image: ${cardData.cardName}</h3>
        <div id="cropContainer" style="position: relative; display: inline-block; margin: 20px 0;">
            <img id="cropImage" src="${cardData.imageUrl}" style="max-width: 600px; max-height: 400px; display: block;" crossorigin="anonymous">
            <div id="cropBox" style="
                position: absolute;
                border: 2px solid #ff0000;
                background: rgba(255,0,0,0.1);
                cursor: move;
                min-width: 50px;
                min-height: 50px;
                top: 50px;
                left: 50px;
                width: 200px;
                height: 280px;
            ">
                <div class="resize-handle" data-direction="nw" style="position: absolute; top: -5px; left: -5px; width: 10px; height: 10px; background: #ff0000; cursor: nw-resize;"></div>
                <div class="resize-handle" data-direction="ne" style="position: absolute; top: -5px; right: -5px; width: 10px; height: 10px; background: #ff0000; cursor: ne-resize;"></div>
                <div class="resize-handle" data-direction="sw" style="position: absolute; bottom: -5px; left: -5px; width: 10px; height: 10px; background: #ff0000; cursor: sw-resize;"></div>
                <div class="resize-handle" data-direction="se" style="position: absolute; bottom: -5px; right: -5px; width: 10px; height: 10px; background: #ff0000; cursor: se-resize;"></div>
            </div>
        </div>
        <div style="margin-top: 20px;">
            <button id="cropApply" style="background: #4CAF50; color: white; padding: 10px 20px; border: none; border-radius: 4px; margin-right: 10px; cursor: pointer;">Apply Crop & Import</button>
            <button id="cropSkip" style="background: #2196F3; color: white; padding: 10px 20px; border: none; border-radius: 4px; margin-right: 10px; cursor: pointer;">Skip Crop & Import</button>
            <button id="cropCancel" style="background: #f44336; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer;">Cancel</button>
        </div>
    `;
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // Initialize crop functionality
    initializeCropBox(cardData);
}

function cropImage(imagePath, cropData, cardName) {
    return new Promise(function(resolve, reject) {
        // Try Jimp first (better quality), fallback to Canvas
        tryJimpCrop(imagePath, cropData, cardName)
            .then(resolve)
            .catch(function(jimpError) {
                console.warn('Jimp failed, falling back to Canvas:', jimpError.message);
                showStatus('Using fallback image processing...', 'info');
                cropImageWithCanvas(imagePath, cropData, cardName)
                    .then(resolve)
                    .catch(reject);
            });
    });
}

// Fixed resize handle event handling
function initializeCropBox(cardData) {
    var cropBox = document.getElementById('cropBox');
    var cropImage = document.getElementById('cropImage');
    var isDragging = false;
    var isResizing = false;
    var dragStart = { x: 0, y: 0 };
    var resizeDirection = null;
    var initialBoxState = {};
    
    // Wait for image to load
    cropImage.onload = function() {
        // Center the crop box initially
        var imageRect = cropImage.getBoundingClientRect();
        var containerRect = cropImage.parentElement.getBoundingClientRect();
        
        var centerX = (imageRect.width - 200) / 2;
        var centerY = (imageRect.height - 280) / 2;
        
        cropBox.style.left = Math.max(0, centerX) + 'px';
        cropBox.style.top = Math.max(0, centerY) + 'px';
    };
    
    // Drag and resize functionality
    cropBox.addEventListener('mousedown', function(e) {
        e.preventDefault();
        
        if (e.target.classList.contains('resize-handle')) {
            isResizing = true;
            resizeDirection = e.target.dataset.direction;
            
            // Store initial state for resize calculations
            initialBoxState = {
                left: parseInt(cropBox.style.left) || 0,
                top: parseInt(cropBox.style.top) || 0,
                width: cropBox.offsetWidth,
                height: cropBox.offsetHeight
            };
            
            dragStart.x = e.clientX;
            dragStart.y = e.clientY;
        } else {
            isDragging = true;
            dragStart.x = e.clientX - parseInt(cropBox.style.left);
            dragStart.y = e.clientY - parseInt(cropBox.style.top);
        }
    });
    
    document.addEventListener('mousemove', function(e) {
        if (isDragging) {
            var newX = e.clientX - dragStart.x;
            var newY = e.clientY - dragStart.y;
            
            // Constrain to image bounds
            var imageRect = cropImage.getBoundingClientRect();
            var containerRect = cropImage.parentElement.getBoundingClientRect();
            
            newX = Math.max(0, Math.min(newX, imageRect.width - cropBox.offsetWidth));
            newY = Math.max(0, Math.min(newY, imageRect.height - cropBox.offsetHeight));
            
            cropBox.style.left = newX + 'px';
            cropBox.style.top = newY + 'px';
        } else if (isResizing && resizeDirection) {
            handleResize(e, resizeDirection, initialBoxState);
        }
    });
    
    document.addEventListener('mouseup', function() {
        isDragging = false;
        isResizing = false;
        resizeDirection = null;
        initialBoxState = {};
    });
    
    // Button event listeners
    document.getElementById('cropApply').addEventListener('click', function() {
        applyCropAndImport(cardData);
    });
    
    document.getElementById('cropSkip').addEventListener('click', function() {
        closeCropModal();
        downloadAndImportCard(cardData);
    });
    
    document.getElementById('cropCancel').addEventListener('click', function() {
        closeCropModal();
    });
}

function handleResize(e, direction, initialState) {
    var cropBox = document.getElementById('cropBox');
    var cropImage = document.getElementById('cropImage');
    var imageRect = cropImage.getBoundingClientRect();
    
    var deltaX = e.clientX - dragStart.x;
    var deltaY = e.clientY - dragStart.y;
    
    var newWidth = initialState.width;
    var newHeight = initialState.height;
    var newLeft = initialState.left;
    var newTop = initialState.top;
    
    switch (direction) {
        case 'nw':
            newWidth = Math.max(50, initialState.width - deltaX);
            newHeight = Math.max(50, initialState.height - deltaY);
            newLeft = Math.max(0, initialState.left + (initialState.width - newWidth));
            newTop = Math.max(0, initialState.top + (initialState.height - newHeight));
            break;
        case 'ne':
            newWidth = Math.max(50, initialState.width + deltaX);
            newHeight = Math.max(50, initialState.height - deltaY);
            newTop = Math.max(0, initialState.top + (initialState.height - newHeight));
            break;
        case 'sw':
            newWidth = Math.max(50, initialState.width - deltaX);
            newHeight = Math.max(50, initialState.height + deltaY);
            newLeft = Math.max(0, initialState.left + (initialState.width - newWidth));
            break;
        case 'se':
            newWidth = Math.max(50, initialState.width + deltaX);
            newHeight = Math.max(50, initialState.height + deltaY);
            break;
    }
    
    // Constrain to image bounds
    if (newLeft + newWidth > imageRect.width) {
        newWidth = imageRect.width - newLeft;
    }
    if (newTop + newHeight > imageRect.height) {
        newHeight = imageRect.height - newTop;
    }
    if (newLeft < 0) {
        newWidth += newLeft;
        newLeft = 0;
    }
    if (newTop < 0) {
        newHeight += newTop;
        newTop = 0;
    }
    
    // Apply the new dimensions
    cropBox.style.width = newWidth + 'px';
    cropBox.style.height = newHeight + 'px';
    cropBox.style.left = newLeft + 'px';
    cropBox.style.top = newTop + 'px';
}

function applyCropAndImport(cardData) {
    var cropBox = document.getElementById('cropBox');
    var cropImage = document.getElementById('cropImage');
    
    // Get crop dimensions relative to the actual image
    var imageNaturalWidth = cropImage.naturalWidth;
    var imageNaturalHeight = cropImage.naturalHeight;
    var imageDisplayWidth = cropImage.offsetWidth;
    var imageDisplayHeight = cropImage.offsetHeight;
    
    var scaleX = imageNaturalWidth / imageDisplayWidth;
    var scaleY = imageNaturalHeight / imageDisplayHeight;
    
    var cropData = {
        x: parseInt(cropBox.style.left) * scaleX,
        y: parseInt(cropBox.style.top) * scaleY,
        width: cropBox.offsetWidth * scaleX,
        height: cropBox.offsetHeight * scaleY
    };
    
    closeCropModal();
    showStatus('Downloading and cropping ' + cardData.cardName + '...', 'info');
    
    // Download and crop the image
    downloadAndCropCard(cardData, cropData);
}

function closeCropModal() {
    var modal = document.getElementById('cropModal');
    if (modal) {
        document.body.removeChild(modal);
    }
}

function downloadAndCropCard(cardData, cropData) {
    downloadCardImage(cardData.imageUrl, cardData.cardName)
        .then(function(localPath) {
            return cropImage(localPath, cropData, cardData.cardName);
        })
        .then(function(croppedPath) {
            var settings = {
                cardName: cardData.cardName,
                imagePath: croppedPath,
                width: cardData.width,
                height: cardData.height,
                position: cardData.position
            };
            
            var settingsJson = JSON.stringify(settings);
            csInterface.evalScript('importMTGCardWithImage("' + settingsJson.replace(/"/g, '\\"') + '")', function(result) {
                if (result === "success") {
                    showStatus('Successfully imported ' + cardData.cardName + '!', 'success');
                    cleanupTempFile(croppedPath);
                } else {
                    showStatus('Import failed: ' + result, 'error');
                }
            });
        })
        .catch(function(error) {
            showStatus('Processing failed: ' + error.message, 'error');
        });
}

function downloadAndImportCard(cardData) {
    downloadCardImage(cardData.imageUrl, cardData.cardName)
        .then(function(localPath) {
            var settings = {
                cardName: cardData.cardName,
                imagePath: localPath,
                width: cardData.width,
                height: cardData.height,
                position: cardData.position
            };
            
            var settingsJson = JSON.stringify(settings);
            csInterface.evalScript('importMTGCardWithImage("' + settingsJson.replace(/"/g, '\\"') + '")', function(result) {
                if (result === "success") {
                    showStatus('Successfully imported ' + cardData.cardName + '!', 'success');
                    cleanupTempFile(localPath);
                } else {
                    showStatus('Import failed: ' + result, 'error');
                }
            });
        })
        .catch(function(error) {
            showStatus('Download failed: ' + error.message, 'error');
        });
}

function tryJimpCrop(imagePath, cropData, cardName) {
    return new Promise(function(resolve, reject) {
        try {
            // Try to require Jimp - this will work if you've installed it
            var Jimp = require('jimp');
            var path = require('path');
            var fs = require('fs');
            
            console.log('Starting Jimp crop process...');
            console.log('Image path:', imagePath);
            console.log('Crop data:', cropData);
            
            // Check if input file exists
            if (!fs.existsSync(imagePath)) {
                reject(new Error('Input image file not found: ' + imagePath));
                return;
            }
            
            var croppedFileName = cardName.replace(/[^a-z0-9]/gi, '_') + '_cropped.jpg';
            var tempDir = csInterface.getSystemPath(SystemPath.USER_DATA) + '/MTGCardHelper/temp/';
            var croppedPath = tempDir + croppedFileName;
            
            // Ensure directory exists
            if (!fs.existsSync(path.dirname(croppedPath))) {
                fs.mkdirSync(path.dirname(croppedPath), { recursive: true });
            }
            
            console.log('Output path:', croppedPath);
            console.log('Reading image with Jimp...');
            
            Jimp.read(imagePath)
                .then(function(image) {
                    console.log('Image loaded successfully');
                    console.log('Original image dimensions:', image.bitmap.width, 'x', image.bitmap.height);
                    
                    // Validate crop coordinates
                    var x = Math.max(0, Math.round(cropData.x));
                    var y = Math.max(0, Math.round(cropData.y));
                    var width = Math.max(1, Math.round(cropData.width));
                    var height = Math.max(1, Math.round(cropData.height));
                    
                    // Ensure crop doesn't exceed image boundaries
                    if (x + width > image.bitmap.width) {
                        width = image.bitmap.width - x;
                    }
                    if (y + height > image.bitmap.height) {
                        height = image.bitmap.height - y;
                    }
                    
                    console.log('Crop parameters:', { x: x, y: y, width: width, height: height });
                    
                    // Perform the crop
                    return image.crop(x, y, width, height).quality(95);
                })
                .then(function(croppedImage) {
                    console.log('Crop completed, saving...');
                    return croppedImage.writeAsync(croppedPath);
                })
                .then(function() {
                    console.log('Image saved successfully to:', croppedPath);
                    
                    // Verify the file was created
                    if (fs.existsSync(croppedPath)) {
                        console.log('File verification successful');
                        // Clean up original file
                        cleanupTempFile(imagePath);
                        resolve(croppedPath);
                    } else {
                        reject(new Error('Cropped file was not created'));
                    }
                })
                .catch(function(error) {
                    console.error('Jimp processing error:', error);
                    reject(new Error('Jimp processing failed: ' + error.message));
                });
                
        } catch (requireError) {
            console.error('Jimp require error:', requireError);
            reject(new Error('Jimp not available: ' + requireError.message));
        }
    });
}


function cropImageWithCanvas(imagePath, cropData, cardName) {
    return new Promise(function(resolve, reject) {
        var fs = require('fs');
        var path = require('path');
        
        // Create a canvas element
        var canvas = document.createElement('canvas');
        var ctx = canvas.getContext('2d');
        var img = new Image();
        
        img.onload = function() {
            // Set canvas size to crop dimensions
            canvas.width = Math.round(cropData.width);
            canvas.height = Math.round(cropData.height);
            
            // Draw the cropped portion
            ctx.drawImage(img, 
                Math.round(cropData.x), Math.round(cropData.y), Math.round(cropData.width), Math.round(cropData.height),
                0, 0, Math.round(cropData.width), Math.round(cropData.height)
            );
            
            // Get image data as base64
            try {
                var dataURL = canvas.toDataURL('image/jpeg', 0.95);
                var base64Data = dataURL.replace(/^data:image\/jpeg;base64,/, '');
                var buffer = Buffer.from(base64Data, 'base64');
                
                var croppedFileName = cardName.replace(/[^a-z0-9]/gi, '_') + '_cropped.jpg';
                var tempDir = csInterface.getSystemPath(SystemPath.USER_DATA) + '/MTGCardHelper/temp/';
                var croppedPath = tempDir + croppedFileName;
                
                // Ensure directory exists
                if (!fs.existsSync(path.dirname(croppedPath))) {
                    fs.mkdirSync(path.dirname(croppedPath), { recursive: true });
                }
                
                fs.writeFile(croppedPath, buffer, function(err) {
                    if (err) {
                        reject(new Error('Failed to save cropped image: ' + err.message));
                    } else {
                        // Clean up original file
                        cleanupTempFile(imagePath);
                        resolve(croppedPath);
                    }
                });
            } catch (canvasError) {
                reject(new Error('Canvas processing failed: ' + canvasError.message));
            }
        };
        
        img.onerror = function() {
            reject(new Error('Failed to load image for cropping'));
        };
        
        // Load the image (try different methods for CEF compatibility)
        try {
            if (fs.existsSync(imagePath)) {
                var imageData = fs.readFileSync(imagePath);
                var base64 = imageData.toString('base64');
                img.src = 'data:image/jpeg;base64,' + base64;
            } else {
                reject(new Error('Image file not found: ' + imagePath));
            }
        } catch (error) {
            reject(new Error('Failed to read image file: ' + error.message));
        }
    });
}

function downloadCardImage(imageUrl, cardName) {
    return new Promise(function(resolve, reject) {
        var safeFileName = cardName.replace(/[^a-z0-9]/gi, '_') + '.jpg';
        var tempDir = csInterface.getSystemPath(SystemPath.USER_DATA) + '/MTGCardHelper/temp/';
        var localPath = tempDir + safeFileName;
        
        var fs = require('fs');
        var path = require('path');
        
        if (!fs.existsSync(path.dirname(localPath))) {
            fs.mkdirSync(path.dirname(localPath), { recursive: true });
        }
        
        var https = require('https');
        var http = require('http');
        var file = fs.createWriteStream(localPath);
        
        var protocol = imageUrl.startsWith('https:') ? https : http;
        
        protocol.get(imageUrl, function(response) {
            if (response.statusCode !== 200) {
                reject(new Error('HTTP ' + response.statusCode));
                return;
            }
            
            response.pipe(file);
            
            file.on('finish', function() {
                file.close();
                resolve(localPath);
            });
            
            file.on('error', function(err) {
                fs.unlink(localPath, function() {});
                reject(err);
            });
        }).on('error', function(err) {
            reject(err);
        });
    });
}

function cleanupTempFile(filePath) {
    try {
        var fs = require('fs');
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    } catch (error) {
        console.warn('Failed to cleanup temp file:', error);
    }
}

function testJimpDetailed() {
    try {
        var Jimp = require('jimp');
        console.log('Jimp loaded successfully');
        console.log('Jimp version:', Jimp.version || 'version unknown');
        
        // Test creating a simple image
        var testImage = new Jimp(100, 100, 0xFF0000FF);
        console.log('Test image created:', testImage.bitmap.width, 'x', testImage.bitmap.height);
        
        showStatus('Jimp is working properly!', 'success');
        return true;
    } catch (error) {
        console.error('Jimp detailed test failed:', error);
        showStatus('Jimp test failed: ' + error.message, 'error');
        return false;
    }
}

// Initialize event listeners when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Show/hide custom size inputs
    var cardSizeSelect = document.getElementById('cardSize');
    if (cardSizeSelect) {
        cardSizeSelect.addEventListener('change', function() {
            var customInputs = document.getElementById('customSizeInputs');
            if (customInputs) {
                if (this.value === 'custom') {
                    customInputs.style.display = 'block';
                } else {
                    customInputs.style.display = 'none';
                }
            }
        });
    }
    
    // Add event listener for Enter key on search input
    var searchInput = document.getElementById('cardSearch');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchCards();
            }
        });
    }
    
    // Test Jimp availability on load
    setTimeout(testJimpDetailed, 1000);
});