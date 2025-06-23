var csInterface = new CSInterface();
var selectedCard = null;

function showStatus(message, type) {
    var status = document.getElementById('status');
    status.textContent = message;
    status.className = 'status ' + type;
    status.style.display = 'block';
    
    setTimeout(function() {
        status.style.display = 'none';
    }, 3000);
}

function searchCards() {
    var query = document.getElementById('cardSearch').value.trim();
    if (!query) {
        showStatus('Please enter a card name', 'error');
        return;
    }
    
    showStatus('Searching...', 'info');
    
    fetch('https://api.scryfall.com/cards/search?q=' + encodeURIComponent(query) + '&unique=cards&order=name')
        .then(response => response.json())
        .then(data => displayResults(data.data || []))
        .catch(error => {
            showStatus('Search failed: ' + error.message, 'error');
        });
}

function displayResults(cards) {
    var resultsDiv = document.getElementById('searchResults');
    resultsDiv.innerHTML = '';
    
    if (cards.length === 0) {
        resultsDiv.innerHTML = '<div class="card-result">No cards found</div>';
        resultsDiv.style.display = 'block';
        return;
    }
    
    cards.forEach(function(card) {
        var cardDiv = document.createElement('div');
        cardDiv.className = 'card-result';
        cardDiv.onclick = function() { selectCard(card); };
        
        // Get PNG image URL (highest quality)
        var imageUrl = card.image_uris?.png || 
                      card.card_faces?.[0]?.image_uris?.png || 
                      card.image_uris?.normal || 
                      card.card_faces?.[0]?.image_uris?.normal;
        
        cardDiv.innerHTML = 
            '<img src="' + imageUrl + '" alt="' + card.name + '" style="width: 60px; height: auto; margin-right: 10px; border-radius: 4px;">' +
            '<div class="card-info" style="flex: 1;">' +
                '<div><strong>' + card.name + '</strong></div>' +
                '<div style="color: #666; font-size: 12px;">' + card.type_line + '</div>' +
                '<div style="color: #888; font-size: 11px;">' + card.set_name + ' (' + card.set.toUpperCase() + ')</div>' +
            '</div>';
        
        // Add hover and click styling
        cardDiv.style.cssText = `
            display: flex;
            align-items: center;
            padding: 10px;
            border: 1px solid #ddd;
            margin-bottom: 5px;
            cursor: pointer;
            border-radius: 4px;
            background: white;
            transition: background-color 0.2s;
        `;
        
        cardDiv.addEventListener('mouseenter', function() {
            this.style.backgroundColor = '#f5f5f5';
        });
        
        cardDiv.addEventListener('mouseleave', function() {
            this.style.backgroundColor = 'white';
        });
        
        resultsDiv.appendChild(cardDiv);
    });
    
    resultsDiv.style.display = 'block';
    showStatus('Found ' + cards.length + ' cards', 'success');
}

function selectCard(card) {
    selectedCard = card;
    showStatus('Selected: ' + card.name, 'success');
    document.getElementById('importBtn').textContent = 'Import ' + card.name;
    document.getElementById('searchResults').style.display = 'none';
}

function importCard() {
    if (!selectedCard) {
        showStatus('Please select a card first', 'error');
        return;
    }
    
    var imageUrl = selectedCard.image_uris?.png || selectedCard.card_faces?.[0]?.image_uris?.png;
    
    if (!imageUrl) {
        showStatus('No PNG image available', 'error');
        return;
    }
    
    openCropEditor({
        cardName: selectedCard.name,
        imageUrl: imageUrl
    });
}

function openCropEditor(cardData) {
    var modal = document.createElement('div');
    modal.id = 'cropModal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.9); display: flex; justify-content: center;
        align-items: center; z-index: 1000;
    `;
    
    modal.innerHTML = `
        <div style="background: #2e2e2e; color: white; padding: 20px; border-radius: 8px; max-width: 90vw; max-height: 90vh; overflow: auto;">
            <h3 style="margin-top: 0;">Crop: ${cardData.cardName}</h3>
            <div id="cropContainer" style="position: relative; display: inline-block; margin: 20px 0;">
                <img id="cropImage" src="${cardData.imageUrl}" style="max-width: 600px; max-height: 500px; display: block;" crossorigin="anonymous">
                <div id="cropBox" style="
                    position: absolute; border: 2px solid #ff4444; background: rgba(255,68,68,0.2);
                    cursor: move; top: 50px; left: 50px; width: 200px; height: 280px;
                ">
                    <div class="resize-handle se" style="position: absolute; bottom: -6px; right: -6px; width: 12px; height: 12px; background: #ff4444; cursor: se-resize; border-radius: 2px;"></div>
                    <div style="position: absolute; top: -25px; left: 0; background: rgba(0,0,0,0.8); color: white; padding: 2px 6px; font-size: 11px;">
                        <span id="cropDimensions">200x280</span>
                    </div>
                </div>
            </div>
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px;">Card Template:</label>
                <input type="file" id="templateUpload" accept=".png,.jpg,.jpeg" style="background: #444; color: white; padding: 8px; border: 1px solid #666; border-radius: 4px; width: 100%;">
                <div style="font-size: 12px; color: #ccc; margin-top: 5px;">Upload a blank card template image (PNG recommended)</div>
            </div>
            <div style="text-align: center;">
                <button id="cropApply" style="background: #4CAF50; color: white; padding: 12px 24px; border: none; border-radius: 4px; margin: 5px; cursor: pointer;">Crop & Import</button>
                <button id="cropCancel" style="background: #f44336; color: white; padding: 12px 24px; border: none; border-radius: 4px; margin: 5px; cursor: pointer;">Cancel</button>
            </div>
            <div style="margin-top: 15px; font-size: 12px; color: #ccc; text-align: center;">
                Drag to move • Drag corner to resize • Left edge will be faded and overlaid on template
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    initializeCropBox(cardData);
}

function initializeCropBox(cardData) {
    var cropBox = document.getElementById('cropBox');
    var cropImage = document.getElementById('cropImage');
    var cropContainer = document.getElementById('cropContainer');
    var cropDimensions = document.getElementById('cropDimensions');
    
    var isDragging = false;
    var isResizing = false;
    var startX, startY, startLeft, startTop, startWidth, startHeight;
    
    function updateDimensions() {
        cropDimensions.textContent = cropBox.offsetWidth + 'x' + cropBox.offsetHeight;
    }
    
    function constrainToImage(left, top, width, height) {
        var maxWidth = cropImage.offsetWidth;
        var maxHeight = cropImage.offsetHeight;
        
        left = Math.max(0, Math.min(left, maxWidth - width));
        top = Math.max(0, Math.min(top, maxHeight - height));
        width = Math.max(50, Math.min(width, maxWidth - left));
        height = Math.max(50, Math.min(height, maxHeight - top));
        
        return { left, top, width, height };
    }
    
    cropContainer.addEventListener('mousedown', function(e) {
        e.preventDefault();
        var rect = cropContainer.getBoundingClientRect();
        var mouseX = e.clientX - rect.left;
        var mouseY = e.clientY - rect.top;
        
        if (e.target.classList.contains('resize-handle')) {
            isResizing = true;
            startX = mouseX;
            startY = mouseY;
            startLeft = parseInt(cropBox.style.left) || 0;
            startTop = parseInt(cropBox.style.top) || 0;
            startWidth = cropBox.offsetWidth;
            startHeight = cropBox.offsetHeight;
        } else if (e.target === cropBox || cropBox.contains(e.target)) {
            isDragging = true;
            startX = mouseX - (parseInt(cropBox.style.left) || 0);
            startY = mouseY - (parseInt(cropBox.style.top) || 0);
        }
    });
    
    document.addEventListener('mousemove', function(e) {
        if (!isDragging && !isResizing) return;
        
        var rect = cropContainer.getBoundingClientRect();
        var mouseX = e.clientX - rect.left;
        var mouseY = e.clientY - rect.top;
        
        if (isDragging) {
            var newLeft = mouseX - startX;
            var newTop = mouseY - startY;
            var constrained = constrainToImage(newLeft, newTop, cropBox.offsetWidth, cropBox.offsetHeight);
            
            cropBox.style.left = constrained.left + 'px';
            cropBox.style.top = constrained.top + 'px';
        } else if (isResizing) {
            var deltaX = mouseX - startX;
            var deltaY = mouseY - startY;
            var newWidth = startWidth + deltaX;
            var newHeight = startHeight + deltaY;
            
            var constrained = constrainToImage(startLeft, startTop, newWidth, newHeight);
            
            cropBox.style.left = constrained.left + 'px';
            cropBox.style.top = constrained.top + 'px';
            cropBox.style.width = constrained.width + 'px';
            cropBox.style.height = constrained.height + 'px';
        }
        
        updateDimensions();
    });
    
    document.addEventListener('mouseup', function() {
        isDragging = false;
        isResizing = false;
    });
    
    document.getElementById('cropApply').addEventListener('click', function() {
        applyCropAndImport(cardData);
    });
    
    document.getElementById('cropCancel').addEventListener('click', function() {
        closeCropModal();
    });
    
    cropImage.onload = function() {
        setTimeout(updateDimensions, 100);
    };
}

function applyCropAndImport(cardData) {
    var cropBox = document.getElementById('cropBox');
    var cropImage = document.getElementById('cropImage');
    var templateUpload = document.getElementById('templateUpload');
    
    // Calculate crop data relative to actual image dimensions
    var scaleX = cropImage.naturalWidth / cropImage.offsetWidth;
    var scaleY = cropImage.naturalHeight / cropImage.offsetHeight;
    
    var cropData = {
        x: Math.round(parseInt(cropBox.style.left) * scaleX),
        y: Math.round(parseInt(cropBox.style.top) * scaleY),
        width: Math.round(cropBox.offsetWidth * scaleX),
        height: Math.round(cropBox.offsetHeight * scaleY)
    };
    
    // Get template file if uploaded
    var templateFile = templateUpload.files[0];
    
    closeCropModal();
    showStatus('Processing...', 'info');
    
    processAndImportCard(cardData, cropData, templateFile);
}

function processAndImportCard(cardData, cropData, templateFile) {
    var templatePromise = templateFile ? 
        saveUploadedTemplate(templateFile, cardData.cardName) : 
        Promise.resolve(null);
    
    Promise.all([
        downloadCardImage(cardData.imageUrl, cardData.cardName),
        templatePromise
    ])
    .then(([cardImagePath, templatePath]) => 
        cropImageWithTransparency(cardImagePath, cropData, cardData.cardName, templatePath)
    )
    .then(processedPath => {
        // Import to After Effects
        var settingsStr = cardData.cardName + '|' + processedPath;
        csInterface.evalScript(
            "importMTGCardWithImage('" + settingsStr.replace(/'/g, "\\'") + "')",
            function(result) {
                if (result === "success") {
                    showStatus('Successfully imported!', 'success');
                    // cleanupTempFile(processedPath);
                } else {
                    showStatus('Import failed: ' + result, 'error');
                }
            }
        );
    })
    .catch(error => {
        showStatus('Failed: ' + error.message, 'error');
    });
}

function saveUploadedTemplate(templateFile, cardName) {
    return new Promise((resolve, reject) => {
        try {
            var fs = require('fs');
            var path = require('path');
            
            var tempDir = csInterface.getSystemPath(SystemPath.USER_DATA) + '/MTGCardHelper/temp/';
            var templateFileName = 'template_' + cardName.replace(/[^a-z0-9]/gi, '_') + '.png';
            var templatePath = tempDir + templateFileName;
            
            // Ensure directory exists
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }
            
            var reader = new FileReader();
            reader.onload = function(e) {
                var buffer = Buffer.from(e.target.result);
                fs.writeFile(templatePath, buffer, function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(templatePath);
                    }
                });
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(templateFile);
            
        } catch (error) {
            reject(error);
        }
    });
}

function downloadCardImage(imageUrl, cardName) {
    return new Promise((resolve, reject) => {
        try {
            var fs = require('fs');
            var https = require('https');
            
            var safeFileName = cardName.replace(/[^a-z0-9]/gi, '_') + '.png';
            var tempDir = csInterface.getSystemPath(SystemPath.USER_DATA) + '/MTGCardHelper/temp/';
            var localPath = tempDir + safeFileName;
            
            // Ensure directory exists
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }
            
            var file = fs.createWriteStream(localPath);
            
            https.get(imageUrl, function(response) {
                if (response.statusCode !== 200) {
                    reject(new Error('Download failed: HTTP ' + response.statusCode));
                    return;
                }
                
                response.pipe(file);
                
                file.on('finish', function() {
                    file.close();
                    resolve(localPath);
                });
                
                file.on('error', reject);
            }).on('error', reject);
            
        } catch (error) {
            reject(error);
        }
    });
}

function cropImageWithTransparency(imagePath, cropData, cardName, templatePath) {
    return new Promise(async (resolve, reject) => {
        try {
            const { Jimp, loadFont } = require('jimp');
            const { SANS_10_BLACK } = require('jimp/fonts');
            var fs = require('fs');
            const font = await loadFont(SANS_10_BLACK);
            
            var outputFileName = cardName.replace(/[^a-z0-9]/gi, '_') + '_final.png';
            var tempDir = csInterface.getSystemPath(SystemPath.USER_DATA) + '/MTGCardHelper/temp/';
            var outputPath = tempDir + outputFileName;
            
            // Load the card image
            Jimp.read(imagePath)
                .then(cardImage => {
                    // Crop the image
                    var x = Math.max(0, Math.min(cropData.x, cardImage.bitmap.width - 1));
                    var y = Math.max(0, Math.min(cropData.y, cardImage.bitmap.height - 1));
                    var width = Math.max(1, Math.min(cropData.width, cardImage.bitmap.width - x));
                    var height = Math.max(1, Math.min(cropData.height, cardImage.bitmap.height - y));
                    
                    return cardImage.crop({ x, y, w: width, h: height });
                })
                .then(croppedImage => {
                    // Apply fade effect to left edge - 20% of cropped width
                    var imageWidth = croppedImage.bitmap.width;
                    var imageHeight = croppedImage.bitmap.height;
                    var fadeWidth = Math.round(imageWidth * 0.2);
                    
                    console.log('Applying fade effect:', {
                        imageWidth: imageWidth,
                        imageHeight: imageHeight,
                        fadeWidth: fadeWidth
                    });
                    
                    // Apply fade effect
                    croppedImage.scan(0, 0, fadeWidth, imageHeight, function(x, y, idx) {
                        var alphaRatio = x / fadeWidth;
                        var easedProgress = alphaRatio * alphaRatio * (3 - 2 * alphaRatio);
                        var currentAlpha = this.bitmap.data[idx + 3] || 255;
                        var newAlpha = Math.round(currentAlpha * easedProgress);
                        this.bitmap.data[idx + 3] = newAlpha;
                    });
                    
                    return croppedImage;
                })
                .then(async fadedImage => {
                    // If template is provided, overlay the faded image onto it
                    if (templatePath) {
                        return Jimp.read(templatePath)
                            .then(async templateImage => {
                                console.log('Template loaded:', {
                                    templateWidth: templateImage.bitmap.width,
                                    templateHeight: templateImage.bitmap.height,
                                    artworkWidth: fadedImage.bitmap.width,
                                    artworkHeight: fadedImage.bitmap.height
                                });

                                var scaleFactor = 0.78;
                                var targetHeight = Math.round(templateImage.bitmap.height * scaleFactor);
                                
                                // Calculate proportional width to maintain aspect ratio
                                var aspectRatio = fadedImage.bitmap.width / fadedImage.bitmap.height;
                                var targetWidth = Math.round(targetHeight * aspectRatio);
                                
                                // Resize the faded image
                                var scaledArtwork = fadedImage.resize({ w: targetWidth, h: targetHeight });
                                
                                // Calculate positioning - you may want to adjust these values
                                // For now, centering the artwork on the template
                                var overlayX = Math.round(templateImage.bitmap.width - fadedImage.bitmap.width - 10);
                                var overlayY = Math.round((templateImage.bitmap.height - fadedImage.bitmap.height) / 2);
                                
                                // Overlay the faded artwork onto the template
                                templateImage.composite(scaledArtwork, overlayX, overlayY);

                
                                templateImage.print({font: font, x: 0, y: 0, text: cardName});
                                return templateImage;
                            });
                    } else {
                        // No template provided, just return the faded image
                        return fadedImage;
                    }
                })
                .then(finalImage => {
                    return finalImage.write(outputPath);
                })
                .then(() => {
                    cleanupTempFile(imagePath);
                    if (templatePath) {
                        cleanupTempFile(templatePath);
                    }
                    resolve(outputPath);
                })
                .catch(reject);
                
        } catch (error) {
            reject(new Error('Image processing failed: ' + error.message));
        }
    });
}

function cleanupTempFile(filePath) {
    try {
        var fs = require('fs');
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    } catch (error) {
        console.warn('Cleanup failed:', error);
    }
}

function closeCropModal() {
    var modal = document.getElementById('cropModal');
    if (modal) {
        document.body.removeChild(modal);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    var searchInput = document.getElementById('cardSearch');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchCards();
            }
        });
    }
});