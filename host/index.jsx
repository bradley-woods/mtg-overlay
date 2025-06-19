// After Effects ExtendScript for MTG Card Helper - Updated with actual image import

function importMTGCardWithImage(settingsJson) {
    try {
        var settings = JSON.parse(settingsJson);
        
        // Ensure we have an active composition
        if (!app.project.activeItem || !(app.project.activeItem instanceof CompItem)) {
            return "Error: No active composition found";
        }
        
        var comp = app.project.activeItem;
        
        // Import the actual image file
        var cardLayer = importCardImageFromFile(settings, comp);
        
        if (cardLayer) {
            return "success";
        } else {
            return "Error: Failed to create card layer";
        }
        
    } catch (error) {
        return "Error: " + error.toString();
    }
}

function importCardImageFromFile(settings, comp) {
    try {
        // Check if file exists
        var imageFile = new File(settings.imagePath);
        if (!imageFile.exists) {
            throw new Error("Image file not found: " + settings.imagePath);
        }
        
        // Get or create MTG Cards folder
        var mtgFolder = getOrCreateFolder("MTG Cards");
        
        // Import the image file
        var importOptions = new ImportOptions();
        importOptions.file = imageFile;
        importOptions.forceAlphabetical = false;
        
        var footageItem = app.project.importFile(importOptions);
        
        if (!footageItem) {
            throw new Error("Failed to import image file");
        }
        
        // Move the imported item to the MTG folder
        footageItem.parentFolder = mtgFolder;
        footageItem.name = settings.cardName;
        
        // Add the footage to the composition
        var cardLayer = comp.layers.add(footageItem);
        
        // Set layer properties
        cardLayer.name = settings.cardName + " (MTG Card)";
        
        // Scale the layer if needed (maintain aspect ratio)
        if (settings.width && settings.height) {
            var scaleX = (settings.width / footageItem.width) * 100;
            var scaleY = (settings.height / footageItem.height) * 100;
            var uniformScale = Math.min(scaleX, scaleY); // Maintain aspect ratio
            
            cardLayer.transform.scale.setValue([uniformScale, uniformScale]);
        }
        
        // Position the layer
        var position = getLayerPosition(settings.position, comp, footageItem.width, footageItem.height);
        cardLayer.transform.position.setValue(position);
        
        // Set some useful defaults
        cardLayer.transform.anchorPoint.setValue([footageItem.width/2, footageItem.height/2]);
        
        return cardLayer;
        
    } catch (error) {
        throw new Error("Failed to import card image: " + error.toString());
    }
}

function importMultipleMTGCards(settingsJson) {
    try {
        var settingsArray = JSON.parse(settingsJson);
        var results = [];
        
        if (!app.project.activeItem || !(app.project.activeItem instanceof CompItem)) {
            return "Error: No active composition found";
        }
        
        var comp = app.project.activeItem;
        
        // Begin undo group for batch import
        app.beginUndoGroup("Import MTG Cards");
        
        for (var i = 0; i < settingsArray.length; i++) {
            try {
                var cardLayer = importCardImageFromFile(settingsArray[i], comp);
                if (cardLayer) {
                    results.push("SUCCESS: " + settingsArray[i].cardName);
                } else {
                    results.push("FAILED: " + settingsArray[i].cardName);
                }
            } catch (error) {
                results.push("ERROR: " + settingsArray[i].cardName + " - " + error.toString());
            }
        }
        
        app.endUndoGroup();
        
        return results.join("; ");
        
    } catch (error) {
        app.endUndoGroup();
        return "Error in batch import: " + error.toString();
    }
}

function getLayerPosition(positionType, comp, layerWidth, layerHeight) {
    var centerX = comp.width / 2;
    var centerY = comp.height / 2;
    
    switch (positionType) {
        case "center":
            return [centerX, centerY];
        case "top-left":
            return [layerWidth/2, layerHeight/2];
        case "top-right":
            return [comp.width - layerWidth/2, layerHeight/2];
        case "bottom-left":
            return [layerWidth/2, comp.height - layerHeight/2];
        case "bottom-right":
            return [comp.width - layerWidth/2, comp.height - layerHeight/2];
        case "cursor":
            // In a real implementation, you'd need to get cursor position from CEP
            // For now, default to center
            return [centerX, centerY];
        case "random":
            var maxX = comp.width - layerWidth/2;
            var maxY = comp.height - layerHeight/2;
            var minX = layerWidth/2;
            var minY = layerHeight/2;
            return [
                minX + Math.random() * (maxX - minX),
                minY + Math.random() * (maxY - minY)
            ];
        case "sequence":
            // Arrange cards in a grid pattern
            var cardsPerRow = Math.floor(comp.width / layerWidth);
            var currentIndex = comp.layers.length - 1; // Since we just added this layer
            var row = Math.floor(currentIndex / cardsPerRow);
            var col = currentIndex % cardsPerRow;
            
            return [
                (col * layerWidth) + layerWidth/2,
                (row * layerHeight) + layerHeight/2
            ];
        default:
            return [centerX, centerY];
    }
}

// Utility function to create folders in project (improved)
function getOrCreateFolder(folderName) {
    var folder = null;
    
    // Check if folder already exists
    for (var i = 1; i <= app.project.numItems; i++) {
        var item = app.project.item(i);
        if (item instanceof FolderItem && item.name === folderName) {
            folder = item;
            break;
        }
    }
    
    // Create folder if it doesn't exist
    if (!folder) {
        folder = app.project.items.addFolder(folderName);
    }
    
    return folder;
}

// Utility function to get composition bounds for positioning
function getCompBounds(comp) {
    return {
        width: comp.width,
        height: comp.height,
        centerX: comp.width / 2,
        centerY: comp.height / 2
    };
}

// Advanced positioning function with offset support
function positionLayer(layer, positionType, offsetX, offsetY) {
    offsetX = offsetX || 0;
    offsetY = offsetY || 0;
    
    var comp = layer.containingComp;
    var bounds = getCompBounds(comp);
    var layerWidth = layer.source ? layer.source.width : 100;
    var layerHeight = layer.source ? layer.source.height : 100;
    
    var position = getLayerPosition(positionType, comp, layerWidth, layerHeight);
    position[0] += offsetX;
    position[1] += offsetY;
    
    layer.transform.position.setValue(position);
}